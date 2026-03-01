import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../components/BottomNav'
import { supabase } from '../supabase'

export default function Inspiration() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
  const [inspoImage, setInspoImage] = useState(null)
  const [inspoBase64, setInspoBase64] = useState(null)
  const [outfit, setOutfit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [addedToWishlist, setAddedToWishlist] = useState<string[]>([])

  async function pickInspoImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.6,
      base64: true,
    })
    if (!result.canceled) {
      setInspoImage(result.assets[0].uri)
      setInspoBase64(result.assets[0].base64)
      setOutfit(null)
      setAddedToWishlist([])
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

      const garmentList = garments
        .map(g => `- ${g.name} (${g.category}, ${g.season || 'alla årstider'})`)
        .join('\n')

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Du är en personlig stylist. Analysera inspirationsbilden och matcha stilen mot användarens garderob.

Garderob:
${garmentList}

1. Beskriv stilen i inspirationsbilden kort.
2. Välj 3-4 plagg från garderoben som matchar stilen bäst.
3. Lista upp till 3 specifika plagg som SAKNAS i garderoben för att uppnå denna look. Varje plagg ska vara ett kort namn, t.ex. "Vit linneskjorta".

Svara ENDAST med ett JSON-objekt:
{
  "styleDescription": "beskrivning",
  "outfitName": "namn",
  "items": ["plagg1", "plagg2", "plagg3"],
  "missing": ["Saknat plagg 1", "Saknat plagg 2"],
  "tip": "styling-tips"
}

Om inget saknas, sätt "missing" till [].`,
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${inspoBase64}`, detail: 'low' },
              },
            ],
          }],
          max_tokens: 500,
        }),
      })

      const data = await response.json()
      const text = data.choices[0].message.content
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

      const missingArray = Array.isArray(parsed.missing)
        ? parsed.missing.filter(Boolean)
        : (parsed.missing ? [parsed.missing] : [])

      const itemsWithImages = parsed.items.map((itemName: string) => {
        const match = garments.find(g =>
          g.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(g.name.toLowerCase())
        )
        return { name: itemName, image_url: match?.image_url || null }
      })

      setOutfit({ ...parsed, missing: missingArray, itemsWithImages })
    } catch (error: any) {
      Alert.alert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Inspirationsbild</Text>
        <Text style={[styles.subtitle, fontsLoaded && { fontFamily: 'DancingScript_400Regular', fontSize: 22 }]}>
          Ladda upp & matcha din stil
        </Text>

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
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.outfitItemImage} />
                  ) : (
                    <View style={styles.outfitItemEmptyBox}>
                      <Text style={styles.outfitItemEmoji}>👗</Text>
                    </View>
                  )}
                  <Text style={styles.outfitItemName}>{item.name}</Text>
                </View>
              ))}
            </View>

            {/* Saknas-sektion med köplisteknappar */}
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
          </View>
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
  uploadZone: {
    height: 280, borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1.5, borderColor: 'rgba(196,115,122,0.3)', borderStyle: 'dashed',
    backgroundColor: 'rgba(122,24,40,0.2)',
  },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadIcon: { fontSize: 40 },
  uploadText: { fontSize: 16, color: '#FBF3EF', fontWeight: '500' },
  uploadSub: { fontSize: 12, color: 'rgba(196,115,122,0.6)' },
  inspoImage: { width: '100%', height: '100%' },
  changeImageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, alignItems: 'center',
  },
  changeImageText: { color: '#FBF3EF', fontSize: 13, fontWeight: '500' },
  analyzeButton: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20 },
  analyzeButtonDisabled: { opacity: 0.4 },
  analyzeButtonText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { alignItems: 'center', gap: 10, marginBottom: 20 },
  loadingText: { color: '#C4737A', fontSize: 14, fontStyle: 'italic' },
  resultCard: {
    backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', gap: 16,
  },
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
  missingSection: {
    backgroundColor: 'rgba(201,169,110,0.08)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(201,169,110,0.2)', gap: 10,
  },
  missingSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  missingIcon: { fontSize: 22, marginTop: 2 },
  missingTitle: { fontSize: 15, fontWeight: '600', color: '#FBF3EF' },
  missingSubtitle: { fontSize: 11, color: 'rgba(201,169,110,0.6)', fontStyle: 'italic', marginTop: 2 },
  missingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 10,
  },
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
})












