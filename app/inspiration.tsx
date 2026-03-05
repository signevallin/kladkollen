import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../components/BottomNav'
import { supabase } from '../supabase'

const SCREEN_WIDTH = Dimensions.get('window').width
const IMAGE_SIZE = (SCREEN_WIDTH - 48 - 8) / 3

export default function Inspiration() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
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

  // Pinterest state
  const [pinterestQuery, setPinterestQuery] = useState('')
  const [pinterestPins, setPinterestPins] = useState<any[]>([])
  const [searchingPins, setSearchingPins] = useState(false)
  const [addedPins, setAddedPins] = useState<Set<string>>(new Set())

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
    const result = await ImagePicker.launchImageLibraryAsync({
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

  async function searchPinterest() {
    if (!pinterestQuery.trim()) return
    setSearchingPins(true)
    setPinterestPins([])
    try {
      const res = await fetch('/api/pinterest-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: pinterestQuery }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPinterestPins(data.items || [])
    } catch (e: any) {
      Alert.alert('Något gick fel', e.message)
    } finally {
      setSearchingPins(false)
    }
  }

  function getPinImageUrl(pin: any): string | null {
    const images = pin?.media?.images
    if (!images) return null
    return images['600x']?.url || images['400x300']?.url || images['150x150']?.url || null
  }

  async function addPinToMoodboard(pin: any) {
    const imageUrl = getPinImageUrl(pin)
    if (!imageUrl) { Alert.alert('Kunde inte hämta bilden från denna pin'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('moodboard').insert({ user_id: user.id, image_url: imageUrl })
    if (error) { Alert.alert('Något gick fel', error.message); return }
    setAddedPins(prev => new Set(prev).add(pin.id))
    fetchMoodboard()
  }

  async function pickInspoImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [3, 4],
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
      Alert.alert('🛍️ Lagt till!', `"${itemName}" finns nu i din köplista.`)
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
      const garments = currentGarments || []
      const garmentList = garments.map(g => `- ${g.name} (${g.category}, ${g.season || 'alla årstider'})`).join('\n')
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Du är en personlig stylist. Analysera inspirationsbilden och matcha stilen mot användarens garderob.\n\nGarderob:\n${garmentList}\n\n1. Beskriv stilen i inspirationsbilden kort.\n2. Välj 3-4 plagg från garderoben som matchar stilen bäst.\n3. Lista upp till 3 specifika plagg som SAKNAS i garderoben för att uppnå denna look.\n\nSvara ENDAST med ett JSON-objekt:\n{\n  "styleDescription": "beskrivning",\n  "outfitName": "namn",\n  "items": ["plagg1", "plagg2", "plagg3"],\n  "missing": ["Saknat plagg 1", "Saknat plagg 2"],\n  "tip": "styling-tips"\n}\n\nOm inget saknas, sätt "missing" till [].`,
              },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${inspoBase64}`, detail: 'low' } },
            ],
          }],
          max_tokens: 500,
        }),
      })
      const data = await response.json()
      const text = data.choices[0].message.content
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
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
      Alert.alert('Outfit sparad! 🍒', 'Du hittar den under Outfits.')
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
              <Image
                source={{ uri: selectedImage }}
                style={styles.imageModalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.imageModalDelete}
                onPress={() => {
                  const item = moodboardImages.find(i => i.image_url === selectedImage)
                  if (item) deleteMoodboardImage(item.id)
                }}
              >
                <Text style={styles.imageModalDeleteText}>🗑 Ta bort</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Inspiration</Text>
        <Text style={[styles.subtitle, fontsLoaded && { fontFamily: 'DancingScript_400Regular', fontSize: 22 }]}>
          Utforska din stil
        </Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['analys', 'moodboard'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'analys' ? '✨ AI-analys' : '🖼 Moodboard'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI-ANALYS */}
        {activeTab === 'analys' && (
          <>
            <TouchableOpacity style={styles.uploadZone} onPress={pickInspoImage}>
              {inspoImage ? (
                <Image source={{ uri: inspoImage }} style={styles.inspoImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadIcon}>📸</Text>
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
                {loading ? 'Analyserar...' : '✨ Matcha mot min garderob'}
              </Text>
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#C4737A" />
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
                        ? <Image source={{ uri: item.image_url }} style={styles.outfitItemImage} />
                        : <View style={styles.outfitItemEmptyBox}><Text style={styles.outfitItemEmoji}>👗</Text></View>
                      }
                      <Text style={styles.outfitItemName}>{item.name}</Text>
                    </View>
                  ))}
                </View>
                {outfit.missing.length > 0 && (
                  <View style={styles.missingSection}>
                    <View style={styles.missingSectionHeader}>
                      <Text style={styles.missingIcon}>💡</Text>
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
                  <Text style={styles.tipIcon}>🍒</Text>
                  <Text style={styles.tipText}>{outfit.tip}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.saveInspoBtn, savedInspo && styles.saveInspoBtnDone]}
                  onPress={saveInspoOutfit}
                  disabled={savingInspo || savedInspo}
                >
                  <Text style={styles.saveInspoBtnText}>
                    {savingInspo ? '...' : savedInspo ? '✓ Sparad i outfits' : '🍒 Spara outfit'}
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
                ? <ActivityIndicator color="#FBF3EF" />
                : <Text style={styles.moodboardUploadBtnText}>＋ Lägg till bild</Text>
              }
            </TouchableOpacity>

            {/* Pinterest-sektion */}
            <View style={styles.pinterestSection}>
              <View style={styles.pinterestHeader}>
                <Text style={styles.pinterestTitle}>📌 Pinterest</Text>
              </View>
              <View style={styles.pinterestSearchRow}>
                <TextInput
                  style={styles.pinterestInput}
                  placeholder="Sök t.ex. outfit, minimalist..."
                  placeholderTextColor="rgba(196,115,122,0.5)"
                  value={pinterestQuery}
                  onChangeText={setPinterestQuery}
                  onSubmitEditing={searchPinterest}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[styles.pinterestSearchBtn, (!pinterestQuery.trim() || searchingPins) && styles.pinterestSearchBtnDisabled]}
                  onPress={searchPinterest}
                  disabled={!pinterestQuery.trim() || searchingPins}
                >
                  {searchingPins
                    ? <ActivityIndicator color="#FBF3EF" size="small" />
                    : <Text style={styles.pinterestSearchBtnText}>Sök</Text>
                  }
                </TouchableOpacity>
              </View>

              {pinterestPins.length > 0 && (
                <View style={styles.pinterestGrid}>
                  {pinterestPins.map((pin) => {
                    const imgUrl = getPinImageUrl(pin)
                    if (!imgUrl) return null
                    const added = addedPins.has(pin.id)
                    return (
                      <View key={pin.id} style={styles.pinterestPinWrap}>
                        <Image source={{ uri: imgUrl }} style={styles.pinterestPinImage} resizeMode="cover" />
                        <TouchableOpacity
                          style={[styles.pinterestAddBtn, added && styles.pinterestAddBtnDone]}
                          onPress={() => !added && addPinToMoodboard(pin)}
                          disabled={added}
                        >
                          <Text style={styles.pinterestAddBtnText}>{added ? '✓' : '+'}</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </View>
              )}

              {!searchingPins && pinterestPins.length === 0 && pinterestQuery.trim() && (
                <Text style={styles.pinterestNoResults}>Inga pins hittades – prova ett annat sökord</Text>
              )}
            </View>

            {moodboardImages.length === 0 ? (
              <View style={styles.moodboardEmpty}>
                <Text style={styles.moodboardEmptyIcon}>🖼</Text>
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
                    <Image source={{ uri: item.image_url }} style={styles.moodboardImage} resizeMode="cover" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FBF3EF', letterSpacing: 1 },
  subtitle: { fontSize: 16, color: '#C4737A', marginBottom: 20, marginTop: 2 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  tabActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  tabText: { color: '#C4737A', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#FBF3EF', fontWeight: '600' },

  uploadZone: { height: 280, borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(196,115,122,0.3)', borderStyle: 'dashed', backgroundColor: 'rgba(122,24,40,0.2)' },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadIcon: { fontSize: 40 },
  uploadText: { fontSize: 16, color: '#FBF3EF', fontWeight: '500' },
  uploadSub: { fontSize: 12, color: 'rgba(196,115,122,0.6)' },
  inspoImage: { width: '100%', height: '100%' },
  changeImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, alignItems: 'center' },
  changeImageText: { color: '#FBF3EF', fontSize: 13, fontWeight: '500' },
  analyzeButton: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20 },
  analyzeButtonDisabled: { opacity: 0.4 },
  analyzeButtonText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { alignItems: 'center', gap: 10, marginBottom: 20 },
  loadingText: { color: '#C4737A', fontSize: 14, fontStyle: 'italic' },
  resultCard: { backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', gap: 16 },
  styleSection: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 12 },
  sectionLabel: { fontSize: 9, color: '#C4737A', letterSpacing: 2, marginBottom: 4, fontWeight: '600' },
  styleDescription: { fontSize: 14, color: '#FBF3EF', lineHeight: 20 },
  outfitName: { fontSize: 22, fontWeight: 'bold', color: '#FBF3EF' },
  outfitItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outfitItem: { width: '22%', alignItems: 'center', gap: 4 },
  outfitItemImage: { width: 64, height: 64, borderRadius: 12 },
  outfitItemEmptyBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  outfitItemEmoji: { fontSize: 28 },
  outfitItemName: { fontSize: 9, color: '#C4737A', textAlign: 'center' },
  missingSection: { backgroundColor: 'rgba(201,169,110,0.08)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(201,169,110,0.2)', gap: 10 },
  missingSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  missingIcon: { fontSize: 22, marginTop: 2 },
  missingTitle: { fontSize: 15, fontWeight: '600', color: '#FBF3EF' },
  missingSubtitle: { fontSize: 11, color: 'rgba(201,169,110,0.6)', fontStyle: 'italic', marginTop: 2 },
  missingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 10 },
  missingItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  missingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DDA0A7' },
  missingItemName: { fontSize: 13, color: '#FBF3EF', flex: 1 },
  addBtn: { backgroundColor: '#9E2035', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  addBtnDone: { backgroundColor: 'rgba(122,24,40,0.4)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  addBtnText: { color: '#FBF3EF', fontSize: 12, fontWeight: '600' },
  addBtnTextDone: { color: '#C4737A' },
  tipCard: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIcon: { fontSize: 18 },
  tipText: { fontSize: 13, color: '#DDA0A7', lineHeight: 20, flex: 1, fontStyle: 'italic' },
  saveInspoBtn: { backgroundColor: '#9E2035', borderRadius: 14, padding: 14, alignItems: 'center' },
  saveInspoBtnDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  saveInspoBtnText: { color: '#FBF3EF', fontSize: 15, fontWeight: '600' },

  pinterestSection: { backgroundColor: 'rgba(122,24,40,0.2)', borderRadius: 16, padding: 14, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  pinterestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pinterestTitle: { color: '#FBF3EF', fontSize: 15, fontWeight: '700' },
  pinterestSearchRow: { flexDirection: 'row', gap: 8 },
  pinterestInput: { flex: 1, backgroundColor: 'rgba(122,24,40,0.4)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#FBF3EF', fontSize: 14, borderWidth: 1, borderColor: 'rgba(196,115,122,0.25)' },
  pinterestSearchBtn: { backgroundColor: '#9E2035', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  pinterestSearchBtnDisabled: { opacity: 0.4 },
  pinterestSearchBtnText: { color: '#FBF3EF', fontWeight: '600', fontSize: 14 },
  pinterestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pinterestPinWrap: { width: IMAGE_SIZE, position: 'relative' },
  pinterestPinImage: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 8 },
  pinterestAddBtn: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#9E2035', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pinterestAddBtnDone: { backgroundColor: 'rgba(0,0,0,0.5)' },
  pinterestAddBtnText: { color: '#FBF3EF', fontSize: 16, fontWeight: 'bold', lineHeight: 20 },
  pinterestNoResults: { color: 'rgba(196,115,122,0.6)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  moodboardUploadBtn: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  moodboardUploadBtnText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },
  moodboardEmpty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  moodboardEmptyIcon: { fontSize: 48 },
  moodboardEmptyText: { color: '#C4737A', fontSize: 16, fontWeight: '500' },
  moodboardEmptyHint: { color: 'rgba(196,115,122,0.5)', fontSize: 13, fontStyle: 'italic' },
  moodboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  moodboardItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 8, overflow: 'hidden' },
  moodboardImage: { width: '100%', height: '100%' },

  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 56, right: 24, zIndex: 10, backgroundColor: 'rgba(122,24,40,0.6)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  imageModalCloseText: { color: '#FBF3EF', fontSize: 16 },
  imageModalImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5, maxHeight: '80%' },
  imageModalDelete: { position: 'absolute', bottom: 60, backgroundColor: 'rgba(158,32,53,0.8)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  imageModalDeleteText: { color: '#FBF3EF', fontSize: 15, fontWeight: '600' },
})