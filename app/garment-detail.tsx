import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert, Image,
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { supabase } from '../supabase'

const CATEGORIES = ['Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = [
  { name: 'Svart', hex: '#1A1A1A' },
  { name: 'Vit', hex: '#F5F5F5' },
  { name: 'Grå', hex: '#9E9E9E' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Brun', hex: '#795548' },
  { name: 'Röd', hex: '#E53935' },
  { name: 'Rosa', hex: '#EC407A' },
  { name: 'Lila', hex: '#8E24AA' },
  { name: 'Blå', hex: '#1E88E5' },
  { name: 'Ljusblå', hex: '#81D4FA' },
  { name: 'Grön', hex: '#43A047' },
  { name: 'Gul', hex: '#FDD835' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Guld', hex: '#C9A96E' },
]

export default function GarmentDetail() {
  const { id, wishlistId } = useLocalSearchParams()
  const isWishlistItem = !!wishlistId && !id

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('')
  const [seasons, setSeasons] = useState<string[]>([])
  const [timesWorn, setTimesWorn] = useState(0)
  const [lastWorn, setLastWorn] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [newImage, setNewImage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isWishlistItem) {
      fetchWishlistItem()
    } else {
      fetchGarment()
    }
  }, [])

  async function fetchWishlistItem() {
    const { data } = await supabase
      .from('wishlist')
      .select('*')
      .eq('id', wishlistId)
      .single()
    if (data) {
      setName(data.name)
      setCategory(data.category || '')
      setImageUrl(data.image_url)
    }
  }

  async function fetchGarment() {
    const { data } = await supabase
      .from('garments')
      .select('*')
      .eq('id', id)
      .single()
    if (data) {
      setName(data.name)
      setCategory(data.category)
      setColor(data.color || '')
      setSeasons(data.season ? data.season.split(', ') : [])
      setTimesWorn(data.times_worn || 0)
      setLastWorn(data.last_worn)
      setImageUrl(data.image_url)
    }
  }

  function toggleSeason(s: string) {
    setSeasons(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      setNewImage(result.assets[0].uri)
    }
  }

  async function uploadImage(uri: string) {
    const filename = `${Date.now()}.jpg`
    const filePath = `public/${filename}`
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const { error } = await supabase.storage
      .from('garments')
      .upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  async function saveWishlistChanges() {
    if (!name) {
      Alert.alert('Fyll i ett namn!')
      return
    }
    setLoading(true)
    try {
      let updatedImageUrl = imageUrl
      if (newImage) updatedImageUrl = await uploadImage(newImage)

      const { error } = await supabase
        .from('wishlist')
        .update({ name, category: category || null, image_url: updatedImageUrl })
        .eq('id', wishlistId)

      if (error) throw error
      Alert.alert('Sparat! 🍒')
      router.back()
    } catch (error: any) {
      Alert.alert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveChanges() {
    if (isWishlistItem) {
      return saveWishlistChanges()
    }
    if (!name || !category) {
      Alert.alert('Fyll i namn och kategori!')
      return
    }
    setLoading(true)
    try {
      let updatedImageUrl = imageUrl
      if (newImage) updatedImageUrl = await uploadImage(newImage)

      const { error } = await supabase
        .from('garments')
        .update({ name, category, season: seasons.join(', '), color, image_url: updatedImageUrl })
        .eq('id', id)

      if (error) throw error
      Alert.alert('Sparat! 🍒')
      router.back()
    } catch (error: any) {
      Alert.alert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteGarment() {
    Alert.alert('Ta bort plagg', `Är du säker på att du vill ta bort ${name}?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('garments').delete().eq('id', id)
          if (error) Alert.alert('Något gick fel', error.message)
          else router.back()
        },
      },
    ])
  }

  async function deleteWishlistItem() {
    Alert.alert('Ta bort', `Ta bort "${name}" från köplistan?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('wishlist').delete().eq('id', wishlistId)
          router.back()
        },
      },
    ])
  }

  async function markAsWorn() {
    const today = new Date().toISOString().split('T')[0]
    if (lastWorn === today) {
      Alert.alert('Du har redan markerat detta plagg som använt idag! 🍒')
      return
    }
    const newCount = timesWorn + 1
    const { error } = await supabase
      .from('garments')
      .update({ times_worn: newCount, last_worn: today })
      .eq('id', id)
    if (error) {
      Alert.alert('Något gick fel', error.message)
    } else {
      setTimesWorn(newCount)
      setLastWorn(today)
      Alert.alert(`Markerat som använt! 🍒\nAnvänt ${newCount} gånger totalt.`)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>

        {/* Wishlist-badge */}
        {isWishlistItem && (
          <View style={styles.wishlistBadge}>
            <Text style={styles.wishlistBadgeText}>🛍️ Köplista – äger ej ännu</Text>
          </View>
        )}

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {newImage || imageUrl ? (
            <Image source={{ uri: newImage || imageUrl }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerInner}>
              <Text style={styles.imagePickerEmoji}>{isWishlistItem ? '🛍️' : '📷'}</Text>
              <Text style={styles.imagePickerText}>
                {isWishlistItem ? 'Lägg till bild när du köpt plagget' : 'Välj foto'}
              </Text>
            </View>
          )}
          {(newImage || imageUrl) && (
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>Byt foto</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Namn</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor="rgba(196,115,122,0.5)"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.pills}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bara för riktiga garderobs-plagg */}
        {!isWishlistItem && (
          <>
            <Text style={styles.label}>Färg</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  style={[styles.colorDot, { backgroundColor: c.hex }, color === c.name && styles.colorDotActive]}
                  onPress={() => setColor(c.name)}
                >
                  {color === c.name && <Text style={styles.colorCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            {color ? <Text style={styles.colorSelected}>Vald färg: {color}</Text> : null}

            <Text style={styles.label}>Säsong</Text>
            <View style={styles.pills}>
              {SEASONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, seasons.includes(s) && styles.pillActive]}
                  onPress={() => toggleSeason(s)}
                >
                  <Text style={[styles.pillText, seasons.includes(s) && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.wornSection}>
              <View style={styles.wornInfo}>
                <Text style={styles.wornCount}>{timesWorn} gånger</Text>
                <Text style={styles.wornLabel}>
                  {lastWorn ? `Senast använd: ${new Date(lastWorn).toLocaleDateString('sv-SE')}` : 'Aldrig använd'}
                </Text>
              </View>
              <TouchableOpacity style={styles.wornButton} onPress={markAsWorn}>
                <Text style={styles.wornButtonText}>👗 Använd idag</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={saveChanges} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Sparar...' : 'Spara 🍒'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={isWishlistItem ? deleteWishlistItem : deleteGarment}
        >
          <Text style={styles.deleteButtonText}>
            {isWishlistItem ? 'Ta bort från köplistan' : 'Ta bort plagg'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#C4737A', fontSize: 15 },
  wishlistBadge: {
    backgroundColor: 'rgba(201,169,110,0.15)',
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14,
    marginBottom: 16, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(201,169,110,0.3)',
  },
  wishlistBadgeText: { color: '#C9A96E', fontSize: 13, fontWeight: '600' },
  imagePicker: {
    borderRadius: 20, height: 240, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(196,115,122,0.3)', borderStyle: 'dashed',
    marginBottom: 24, overflow: 'hidden', backgroundColor: 'rgba(122,24,40,0.3)',
  },
  imagePickerInner: { alignItems: 'center', gap: 8 },
  imagePickerEmoji: { fontSize: 40 },
  imagePickerText: { color: '#C4737A', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, alignItems: 'center',
  },
  imageOverlayText: { color: '#FBF3EF', fontSize: 12, fontWeight: '500' },
  label: { color: '#FBF3EF', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 14,
    color: '#FBF3EF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', marginBottom: 16,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)',
  },
  pillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  pillText: { color: '#C4737A', fontSize: 13 },
  pillTextActive: { color: '#FBF3EF' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: '#FBF3EF', transform: [{ scale: 1.15 }] },
  colorCheck: { color: '#FBF3EF', fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  colorSelected: { color: '#C4737A', fontSize: 12, fontStyle: 'italic', marginBottom: 16 },
  wornSection: {
    backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)',
  },
  wornInfo: { gap: 2 },
  wornCount: { fontSize: 20, fontWeight: 'bold', color: '#DDA0A7' },
  wornLabel: { fontSize: 11, color: '#C4737A', fontStyle: 'italic' },
  wornButton: { backgroundColor: '#9E2035', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  wornButtonText: { color: '#FBF3EF', fontSize: 13, fontWeight: '600' },
  saveButton: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  saveButtonText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: 'transparent', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  deleteButtonText: { color: '#C4737A', fontSize: 16 },
})