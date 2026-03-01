
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
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

export default function AddGarment() {
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [category, setCategory] = useState('')
  const [seasons, setSeasons] = useState<string[]>([])
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      
      quality: 0.8,
    })
    if (!result.canceled) {
      setImage(result.assets[0].uri)
    }
  }
async function uploadImage(uri: string) {
  const filename = `${Date.now()}.jpg`
  const filePath = `public/${filename}`

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const { data, error } = await supabase.storage
    .from('garments')
    .upload(filePath, uint8Array, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('garments')
    .getPublicUrl(filePath)

  return urlData.publicUrl
}
function toggleSeason(s: string) {
  setSeasons(prev => 
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )
}
function decode(base64: string) {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

  async function saveGarment() {
    if (!name || !category) {
      Alert.alert('Fyll i namn och kategori!')
      return
    }
    setLoading(true)

    try {
      let imageUrl = null
     if (image) {
  imageUrl = await uploadImage(image)
  console.log('Bild-URL:', imageUrl)
}


      const { data: { user } } = await supabase.auth.getUser()

const { error } = await supabase
  .from('garments')
  .insert([{ name, category, season: Array.isArray(seasons) ? seasons.join(', ') : seasons, color, image_url: imageUrl, user_id: user?.id }])

      if (error) throw error

      Alert.alert('Plagg sparat! 🍒')
      router.back()
    } catch (error: any) {
      Alert.alert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
  <Text style={styles.backButtonText}>← Tillbaka</Text>
</TouchableOpacity>
        <Text style={styles.title}>Lägg till plagg</Text>

        {/* Foto */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>📷 Välj foto</Text>
          )}
        </TouchableOpacity>

        {/* Namn */}
        <Text style={styles.label}>Namn</Text>
        <TextInput
          style={styles.input}
          placeholder="t.ex. Ullkappa"
          placeholderTextColor="rgba(196,115,122,0.5)"
          value={name}
          onChangeText={setName}
        />

        {/* Kategori */}
        <Text style={styles.label}>Kategori</Text>
        <View style={styles.pills}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, category === cat && styles.pillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Färg */}
<Text style={styles.label}>Färg</Text>
<View style={styles.colorGrid}>
  {COLORS.map((c) => (
    <TouchableOpacity
      key={c.name}
      style={[
        styles.colorDot,
        { backgroundColor: c.hex },
        color === c.name && styles.colorDotActive,
      ]}
      onPress={() => setColor(c.name)}
    >
      {color === c.name && (
        <Text style={styles.colorCheck}>✓</Text>
      )}
    </TouchableOpacity>
  ))}
</View>
{color ? (
  <Text style={styles.colorSelected}>Vald färg: {color}</Text>
) : null}


        {/* Säsong */}
        <Text style={styles.label}>Säsong</Text>
        <View style={styles.pills}>
          {SEASONS.map((s) => (
  <TouchableOpacity
    key={s}
    style={[styles.pill, seasons.includes(s) && styles.pillActive]}
    onPress={() => toggleSeason(s)}
  >
    <Text style={[styles.pillText, seasons.includes(s) && styles.pillTextActive]}>
      {s}
    </Text>
  </TouchableOpacity>
))}
        
        </View>

        {/* Spara */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveGarment}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Sparar...' : 'Spara plagg 🍒'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FBF3EF',
    marginBottom: 24,
  },
  imagePicker: {
    backgroundColor: 'rgba(122,24,40,0.4)',
    borderRadius: 16,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(196,115,122,0.3)',
    borderStyle: 'dashed',
    marginBottom: 20,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'contain',
  },
  imagePickerText: { color: '#C4737A', fontSize: 16 },
  label: {
    color: '#FBF3EF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#FBF3EF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
    marginBottom: 16,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
  },
  pillActive: {
    backgroundColor: '#9E2035',
    borderColor: '#9E2035',
  },
  pillText: { color: '#C4737A', fontSize: 13 },
  pillTextActive: { color: '#FBF3EF' },
  saveButton: {
    backgroundColor: '#9E2035',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  colorGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  marginBottom: 8,
},
colorDot: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: 'transparent',
},
colorDotActive: {
  borderColor: '#FBF3EF',
  transform: [{ scale: 1.15 }],
},
colorCheck: {
  color: '#FBF3EF',
  fontSize: 16,
  fontWeight: 'bold',
  textShadowColor: 'rgba(0,0,0,0.5)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},
colorSelected: {
  color: '#C4737A',
  fontSize: 12,
  fontStyle: 'italic',
  marginBottom: 16,
},
  saveButtonText: {
    color: '#FBF3EF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
  marginBottom: 16,
},
backButtonText: {
  color: '#C4737A',
  fontSize: 15,
},
})


