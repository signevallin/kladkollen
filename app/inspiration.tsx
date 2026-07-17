import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../components/BottomNav'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { apiPost } from '../utils/api'
import { pickImageSmart } from '../utils/imagePicker'

const SCREEN_WIDTH = Dimensions.get('window').width
const IMAGE_SIZE = (SCREEN_WIDTH - 48 - 8) / 3

export default function Inspiration() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [activeTab, setActiveTab] = useState<'analys' | 'moodboard'>('analys')

  // AI-analys state
  const [inspoImage, setInspoImage] = useState<string | null>(null)
  const [inspoBase64, setInspoBase64] = useState<string | null>(null)
  const [outfit, setOutfit] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [addedToWishlist, setAddedToWishlist] = useState<string[]>([])
  const [savedInspo, setSavedInspo] = useState(false)
  const [savingInspo, setSavingInspo] = useState(false)

  // Moodboard state
  const [moodboardImages, setMoodboardImages] = useState<any[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadingMoodboard, setUploadingMoodboard] = useState(false)

  useFocusEffect(
    useCallback(() => {
      fetchMoodboard()
    }, [])
  )

  async function fetchMoodboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('moodboard')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setMoodboardImages(data)
  }

  async function pickMoodboardImage() {
    const result = await pickImageSmart({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 0.8,
    })
    if (!result.canceled) {
      setUploadingMoodboard(true)
      try {
        const uri = result.assets[0].uri
        const filename = `moodboard-${Date.now()}.jpg`
        const filePath = `moodboard/${filename}`
        const response = await fetch(uri)
        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const { error: uploadError } = await supabase.storage
          .from('garments')
          .upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error: dbError } = await supabase.from('moodboard').insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
        })
        if (dbError) throw dbError
        fetchMoodboard()
      } catch (error: any) {
        Alert.alert('Något gick fel', error.message)
      } finally {
        setUploadingMoodboard(false)
      }
    }
  }

  // Bläddra till föregående/nästa moodboardbild i helskärmsläget (loopar runt).
  function stepImage(dir: 1 | -1) {
    if (!selectedImage || moodboardImages.length < 2) return
    const idx = moodboardImages.findIndex(i => i.image_url === selectedImage)
    if (idx === -1) return
    const next = (idx + dir + moodboardImages.length) % moodboardImages.length
    setSelectedImage(moodboardImages[next].image_url)
  }

  // Svepgest i helskärmsläget: dra åt vänster = nästa, höger = föregående.
  // Ref så att den (skapad en gång) alltid ser senaste stepImage.
  const stepRef = useRef(stepImage)
  stepRef.current = stepImage
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (g.dx <= -40) stepRef.current(1)
      else if (g.dx >= 40) stepRef.current(-1)
    },
  })).current

  async function deleteMoodboardImage(id: string) {
    Alert.alert('Ta bort bild', 'Vill du ta bort bilden från moodboarden?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort', style: 'destructive',
        onPress: async () => {
          await supabase.from('moodboard').delete().eq('id', id)
          setSelectedImage(null)
          fetchMoodboard()
        }
      }
    ])
  }

  async function pickInspoImage() {
    const result = await pickImageSmart({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    })
    if (!result.canceled) {
      setInspoImage(result.assets[0].uri)
      setInspoBase64(result.assets[0].base64 ?? null)
      setOutfit(null)
      setAddedToWishlist([])
      setSavedInspo(false)
    }
  }

  async function addToWishlist(itemName: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { count } = await supabase
      .from('wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    const { error } = await supabase.from('wishlist').insert({
      user_id: user.id,
      name: itemName,
      sort_order: count || 0,
    })
    if (error) {
      Alert.alert('Något gick fel', error.message)
    } else {
      setAddedToWishlist(prev => [...prev, itemName])
      Alert.alert('Lagt till!', `"${itemName}" finns nu i din köplista.`)
    }
  }

  async function analyzeAndMatch() {
    if (!inspoBase64) {
      Alert.alert('Välj en inspirationsbild först!')
      return
    }
    setLoading(true)
    setOutfit(null)
    setAddedToWishlist([])
    try {
      const { data: currentGarments } = await supabase.from('garments').select('*')
      const garments = (currentGarments || []).filter((g: any) => !g.archived)
      const garmentList = garments.map(g => `- ${g.name} (${g.category}, ${g.season || 'alla årstider'})`).join('\n')
      const parsed = await apiPost('/api/analyze-inspo', { base64: inspoBase64, garmentList })
      const missingArray = Array.isArray(parsed.missing) ? parsed.missing.filter(Boolean) : (parsed.missing ? [parsed.missing] : [])
      const itemsWithImages = parsed.items.map((itemName: string) => {
        const match = garments.find(g =>
          g.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(g.name.toLowerCase())
        )
        return { name: itemName, image_url: match?.image_url || null, id: match?.id || null }
      })
      setOutfit({ ...parsed, missing: missingArray, itemsWithImages })
      setSavedInspo(false)
    } catch (error: any) {
      Alert.alert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveInspoOutfit() {
    if (!outfit) return
    setSavingInspo(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const garmentIds = outfit.itemsWithImages.map((i: any) => i.id).filter(Boolean)
      const garmentNames = outfit.itemsWithImages.map((i: any) => i.name)
      const imageUrls = outfit.itemsWithImages.map((i: any) => i.image_url).filter(Boolean)
      const { error } = await supabase.from('outfits').insert([{
        user_id: user?.id,
        name: outfit.outfitName,
        garment_ids: garmentIds,
        garment_names: garmentNames,
        image_urls: imageUrls,
      }])
      if (error) throw error
      setSavedInspo(true)
      Alert.alert('Outfit sparad!', 'Du hittar den under Outfits.')
    } catch (e: any) {
      Alert.alert('Något gick fel', e.message)
    } finally {
      setSavingInspo(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Fullscreen image modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setSelectedImage(null)}>
            <Text style={styles.imageModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && (
            <>
              {moodboardImages.length > 1 && (
                <TouchableOpacity
                  style={[styles.imageModalArrow, styles.imageModalArrowLeft]}
                  onPress={() => stepImage(-1)}
                  accessibilityLabel="Föregående bild"
                  accessibilityRole="button"
                >
                  <Text style={styles.imageModalArrowText}>‹</Text>
                </TouchableOpacity>
              )}
              <View {...swipe.panHandlers}>
                <SignedImage
                  path={selectedImage}
                  style={styles.imageModalImage}
                  resizeMode="contain"
                />
              </View>
              {moodboardImages.length > 1 && (
                <TouchableOpacity
                  style={[styles.imageModalArrow, styles.imageModalArrowRight]}
                  onPress={() => stepImage(1)}
                  accessibilityLabel="Nästa bild"
                  accessibilityRole="button"
                >
                  <Text style={styles.imageModalArrowText}>›</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.imageModalDelete}
                onPress={() => {
                  const item = moodboardImages.find(i => i.image_url === selectedImage)
                  if (item) deleteMoodboardImage(item.id)
                }}
              >
                <Text style={styles.imageModalDeleteText}>Ta bort</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Inspiration</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['analys', 'moodboard'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'analys' ? 'AI-analys' : 'Moodboard'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI-ANALYS */}
        {activeTab === 'analys' && (
          <>
            <TouchableOpacity style={styles.uploadZone} onPress={pickInspoImage}>
              {inspoImage ? (
                <Image source={{ uri: inspoImage }} style={styles.inspoImage} resizeMode="contain" />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadText}>Ladda upp inspirationsbild</Text>
                  <Text style={styles.uploadSub}>Pinterest · Instagram · Kamera</Text>
                </View>
              )}
              {inspoImage && (
                <View style={styles.changeImageOverlay}>
                  <Text style={styles.changeImageText}>Byt bild</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.analyzeButton, !inspoImage && styles.analyzeButtonDisabled]}
              onPress={analyzeAndMatch}
              disabled={loading || !inspoImage}
            >
              <Text style={styles.analyzeButtonText}>
                {loading ? 'Analyserar...' : 'Matcha mot min garderob'}
              </Text>
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={t.textSecondary} />
                <Text style={styles.loadingText}>AI:n analyserar din bild...</Text>
              </View>
            )}

            {outfit && (
              <View style={styles.resultCard}>
                <View style={styles.styleSection}>
                  <Text style={styles.sectionLabel}>STILEN I BILDEN</Text>
                  <Text style={styles.styleDescription}>{outfit.styleDescription}</Text>
                </View>
                <Text style={styles.outfitName}>{outfit.outfitName}</Text>
                <View style={styles.outfitItems}>
                  {outfit.itemsWithImages.map((item: any, index: number) => (
                    <View key={index} style={styles.outfitItem}>
                      {item.image_url
                        ? <SignedImage path={item.image_url} style={styles.outfitItemImage} />
                        : <View style={styles.outfitItemEmptyBox} />
                      }
                      <Text style={styles.outfitItemName}>{item.name}</Text>
                    </View>
                  ))}
                </View>
                {outfit.missing.length > 0 && (
                  <View style={styles.missingSection}>
                    <View style={styles.missingSectionHeader}>
                      <View>
                        <Text style={styles.missingTitle}>Du saknar i garderoben</Text>
                        <Text style={styles.missingSubtitle}>Lägg till i köplistan för att komplettera</Text>
                      </View>
                    </View>
                    {outfit.missing.map((missingItem: string, index: number) => {
                      const alreadyAdded = addedToWishlist.includes(missingItem)
                      return (
                        <View key={index} style={styles.missingItem}>
                          <View style={styles.missingItemLeft}>
                            <View style={styles.missingDot} />
                            <Text style={styles.missingItemName}>{missingItem}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.addBtn, alreadyAdded && styles.addBtnDone]}
                            onPress={() => !alreadyAdded && addToWishlist(missingItem)}
                            disabled={alreadyAdded}
                          >
                            <Text style={[styles.addBtnText, alreadyAdded && styles.addBtnTextDone]}>
                              {alreadyAdded ? '✓ Tillagd' : '+ Köplista'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )
                    })}
                  </View>
                )}
                <View style={styles.tipCard}>
                  <Text style={styles.tipText}>{outfit.tip}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.saveInspoBtn, savedInspo && styles.saveInspoBtnDone]}
                  onPress={saveInspoOutfit}
                  disabled={savingInspo || savedInspo}
                >
                  <Text style={styles.saveInspoBtnText}>
                    {savingInspo ? '...' : savedInspo ? '✓ Sparad i outfits' : 'Spara outfit'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* MOODBOARD */}
        {activeTab === 'moodboard' && (
          <>
            <TouchableOpacity style={styles.moodboardUploadBtn} onPress={pickMoodboardImage} disabled={uploadingMoodboard}>
              {uploadingMoodboard
                ? <ActivityIndicator color={t.onPrimary} />
                : <Text style={styles.moodboardUploadBtnText}>＋ Lägg till bild</Text>
              }
            </TouchableOpacity>

            {moodboardImages.length === 0 ? (
              <View style={styles.moodboardEmpty}>
                <Text style={styles.moodboardEmptyText}>Din moodboard är tom</Text>
                <Text style={styles.moodboardEmptyHint}>Lägg till bilder som inspirerar dig</Text>
              </View>
            ) : (
              <View style={styles.moodboardGrid}>
                {moodboardImages.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.moodboardItem}
                    onPress={() => setSelectedImage(item.image_url)}
                    activeOpacity={0.85}
                  >
                    <SignedImage path={item.image_url} style={styles.moodboardImage} resizeMode="contain" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 100 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 16 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  tabActive: { backgroundColor: t.primary, borderColor: t.primary },
  tabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  tabTextActive: { color: t.onPrimary, fontWeight: '600' },

  uploadZone: { height: 280, borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', backgroundColor: t.surfaceMuted },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadIcon: { fontFamily: 'Lora_400Regular', fontSize: 40 },
  uploadText: { fontFamily: 'Lora_500Medium', fontSize: 16, color: t.textPrimary },
  uploadSub: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint },
  inspoImage: { width: '100%', height: '100%' },
  changeImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, alignItems: 'center' },
  changeImageText: { fontFamily: 'Lora_500Medium', color: t.onPrimary, fontSize: 13 },
  analyzeButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20 },
  analyzeButtonDisabled: { opacity: 0.4 },
  analyzeButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  loadingContainer: { alignItems: 'center', gap: 10, marginBottom: 20 },
  loadingText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, fontStyle: 'italic' },
  resultCard: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: t.border, gap: 16 },
  styleSection: { backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 12 },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: t.textSecondary, letterSpacing: 2, marginBottom: 4 },
  styleDescription: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textPrimary, lineHeight: 20 },
  outfitName: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: t.textPrimary },
  outfitItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outfitItem: { width: '22%', alignItems: 'center', gap: 4 },
  outfitItemImage: { width: 64, height: 64, borderRadius: 12 },
  outfitItemEmptyBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  outfitItemEmoji: { fontFamily: 'Lora_400Regular', fontSize: 28 },
  outfitItemName: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textSecondary, textAlign: 'center' },
  missingSection: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.surfaceMuted, gap: 10 },
  missingSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  missingIcon: { fontFamily: 'Lora_400Regular', fontSize: 22, marginTop: 2 },
  missingTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  missingSubtitle: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.surfaceMuted, fontStyle: 'italic', marginTop: 2 },
  missingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 10 },
  missingItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  missingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.textSecondary },
  missingItemName: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, flex: 1 },
  addBtn: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  addBtnDone: { backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  addBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  addBtnTextDone: { color: t.textSecondary },
  tipCard: { backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIcon: { fontFamily: 'Lora_400Regular', fontSize: 18 },
  tipText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20, flex: 1, fontStyle: 'italic' },
  saveInspoBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveInspoBtnDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border },
  saveInspoBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },

  moodboardUploadBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  moodboardUploadBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  moodboardEmpty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  moodboardEmptyIcon: { fontFamily: 'Lora_400Regular', fontSize: 48 },
  moodboardEmptyText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 16 },
  moodboardEmptyHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, fontStyle: 'italic' },
  moodboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  moodboardItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 8, overflow: 'hidden' },
  moodboardImage: { width: '100%', height: '100%' },

  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 56, right: 24, zIndex: 10, backgroundColor: t.surfaceMuted, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  imageModalCloseText: { fontFamily: 'Lora_400Regular', color: t.onPrimary, fontSize: 16 },
  imageModalImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5, maxHeight: '80%' },
  imageModalArrow: { position: 'absolute', top: '45%', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 26, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  imageModalArrowLeft: { left: 16 },
  imageModalArrowRight: { right: 16 },
  imageModalArrowText: { fontFamily: 'Lora_400Regular', color: '#fff', fontSize: 34, lineHeight: 38, marginTop: -4 },
  imageModalDelete: { position: 'absolute', bottom: 60, backgroundColor: 'rgba(64,45,33,0.8)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  imageModalDeleteText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
})