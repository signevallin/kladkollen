import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'

const CATEGORIES = ['Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SUBCATEGORIES: Record<string, string[]> = {
  'Toppar': ['Linne', 'T-shirt', 'Långärmad topp', 'Body', 'Blus', 'Skjorta'],
  'Tröjor': ['Sweatshirt', 'Hoodie', 'Stickad tröja', 'Collegetröja', 'Kofta'],
  'Byxor': ['Jeans', 'Chinos', 'Kostymbyxor', 'Leggings', 'Shorts', 'Mjukisbyxor'],
  'Kjolar': ['Minikjol', 'Midikjol', 'Maxikjol', 'Plisserad kjol', 'Pennkjol'],
  'Klänningar': ['Miniklänning', 'Midiklänning', 'Maxiklänning', 'Festklänning', 'Vardagsklänning'],
  'Kavajer': ['Kavaj', 'Blazer', 'Kostymjacka'],
  'Ytterkläder': ['Vinterjacka', 'Regnrock', 'Trenchcoat', 'Pufferjacka', 'Läderjacka', 'Dunjacka'],
  'Skor': ['Sneakers', 'Boots', 'Pumps', 'Sandaler', 'Loafers', 'Ballerinaskor'],
  'Väskor': ['Handväska', 'Ryggsäck', 'Tote bag', 'Kuvertväska', 'Crossbody'],
  'Accessoarer': ['Halsduk', 'Sjal', 'Bälte', 'Hatt', 'Mössa', 'Smycken', 'Solglasögon'],
}
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = [
  { name: 'Svart', hex: '#1A1A1A' }, { name: 'Vit', hex: '#F5F5F5' },
  { name: 'Grå', hex: '#9E9E9E' }, { name: 'Beige', hex: '#D4B896' },
  { name: 'Brun', hex: '#795548' }, { name: 'Röd', hex: '#E53935' },
  { name: 'Rosa', hex: '#EC407A' }, { name: 'Lila', hex: '#8E24AA' },
  { name: 'Blå', hex: '#1E88E5' }, { name: 'Ljusblå', hex: '#81D4FA' },
  { name: 'Grön', hex: '#43A047' }, { name: 'Gul', hex: '#FDD835' },
  { name: 'Orange', hex: '#FB8C00' }, { name: 'Guld', hex: '#C9A96E' },
]
const COLOR_NAMES = ['Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']
const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const LOCATIONS = ['Garderoben', 'Källaren', 'Vinden', 'Förrådet', 'Utlånad']

export default function GarmentDetail() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { id, wishlistId } = useLocalSearchParams()
  const isWishlistItem = !!wishlistId && !id

  // router.back() gör ingenting om det saknas historik (t.ex. efter en
  // omladdning på webben eller djuplänk). Fall då tillbaka till garderoben.
  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/wardrobe')
  }

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [color, setColor] = useState('')
  const [seasons, setSeasons] = useState<string[]>([])
  const [timesWorn, setTimesWorn] = useState(0)
  const [lastWorn, setLastWorn] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [newImage, setNewImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [size, setSize] = useState('')
  const [location, setLocation] = useState('')
  const [archived, setArchived] = useState(false)
  const [sold, setSold] = useState(false)

  useEffect(() => {
    if (isWishlistItem) fetchWishlistItem()
    else fetchGarment()
  }, [])

  async function fetchWishlistItem() {
    const { data } = await supabase.from('wishlist').select('*').eq('id', wishlistId).single()
    if (data) {
      setName(data.name)
      setCategory(data.category || '')
      setColor(data.color || '')
      setSeasons(data.season ? [data.season] : [])
      setImageUrl(data.image_url)
    }
  }

  async function fetchGarment() {
    const { data } = await supabase.from('garments').select('*').eq('id', id).single()
    if (data) {
      setName(data.name); setCategory(data.category); setSubcategory(data.subcategory || ''); setColor(data.color || '')
      setSeasons(data.season ? data.season.split(', ') : [])
      setTimesWorn(data.times_worn || 0); setLastWorn(data.last_worn); setImageUrl(data.image_url)
      setSize(data.size || ''); setLocation(data.location || '')
      setArchived(!!data.archived); setSold(!!data.sold)
    }
  }

  function toggleSeason(s: string) {
    if (isWishlistItem) {
      setSeasons(prev => prev.includes(s) ? [] : [s])
    } else {
      setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled) setNewImage(result.assets[0].uri)
  }

  async function uploadImage(uri: string) {
    const filename = `${Date.now()}.jpg`
    const filePath = `public/${filename}`
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const { error } = await supabase.storage.from('garments').upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  async function saveWishlistChanges() {
    if (!name) { showAlert('Fyll i ett namn!'); return }
    setLoading(true)
    try {
      let updatedImageUrl = imageUrl
      if (newImage) updatedImageUrl = await uploadImage(newImage)
      const { error } = await supabase.from('wishlist').update({
        name,
        category: category || null,
        color: color || null,
        season: seasons[0] || null,
        image_url: updatedImageUrl,
      }).eq('id', wishlistId)
      if (error) throw error
      showAlert('Sparat! 🍒')
      goBack()
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveChanges() {
    if (isWishlistItem) return saveWishlistChanges()
    if (!name || !category) { showAlert('Fyll i namn och kategori!'); return }
    setLoading(true)
    try {
      let updatedImageUrl = imageUrl
      if (newImage) updatedImageUrl = await uploadImage(newImage)
      const { error } = await supabase.from('garments').update({ name, category, subcategory: subcategory || null, season: seasons.join(', '), color, image_url: updatedImageUrl, size: size.trim() || null, location: location.trim() || null }).eq('id', id)
      if (error) throw error
      showAlert('Sparat! 🍒')
      goBack()
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteGarment() {
    showConfirm('Ta bort plagg', `Är du säker på att du vill ta bort ${name}?`, async () => {
      const { error } = await supabase.from('garments').delete().eq('id', id)
      if (error) showAlert('Något gick fel', error.message)
      else goBack()
    }, 'Ta bort', true)
  }

  async function deleteWishlistItem() {
    showConfirm('Ta bort', `Ta bort "${name}" från köplistan?`, async () => {
      await supabase.from('wishlist').delete().eq('id', wishlistId)
      goBack()
    }, 'Ta bort', true)
  }

  async function toggleArchive() {
    if (!archived) {
      showConfirm(
        'Arkivera plagg',
        `"${name}" flyttas till arkivet och föreslås inte i outfits. Perfekt för plagg som inte passar just nu eller är undanpackade. Ange gärna plats så du vet var det finns!`,
        async () => {
          const { error } = await supabase.from('garments').update({
            archived: true,
            for_sale: false,
            size: size.trim() || null,
            location: location.trim() || null,
          }).eq('id', id)
          if (error) showAlert('Något gick fel', error.message)
          else { setArchived(true); showAlert('Arkiverat! 📦', location ? `Plagget finns: ${location}` : 'Tips: ange plats så du hittar det sen.') }
        },
        'Arkivera'
      )
    } else {
      const { error } = await supabase.from('garments').update({ archived: false, sold: false }).eq('id', id)
      if (error) showAlert('Något gick fel', error.message)
      else { setArchived(false); setSold(false); showAlert('Välkommen tillbaka! 🍒', `${name} är nu i garderoben igen.`) }
    }
  }

  async function markAsWorn() {
    const today = new Date().toISOString().split('T')[0]
    if (lastWorn === today) {
      showAlert('Du har redan markerat detta plagg som använt idag! 🍒')
      return
    }
    const newCount = timesWorn + 1
    const { error } = await supabase.from('garments').update({ times_worn: newCount, last_worn: today }).eq('id', id)
    if (error) {
      showAlert('Något gick fel', error.message)
    } else {
      setTimesWorn(newCount); setLastWorn(today)
      showAlert(`Markerat som använt! 🍒`, `Använt ${newCount} gånger totalt.`)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Gå tillbaka"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>

        {isWishlistItem && (
          <View style={styles.wishlistBadge}>
            <Text style={styles.wishlistBadgeText}>🛍️ Köplista – äger ej ännu</Text>
          </View>
        )}

        {archived && (
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedBadgeText}>
              📦 Arkiverad{sold ? ' · Såld' : ''}{location ? ` · Finns: ${location}` : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {newImage || imageUrl ? (
            <SignedImage path={newImage || imageUrl} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerInner}>
              <Text style={styles.imagePickerEmoji}>{isWishlistItem ? '🛍️' : '📷'}</Text>
              <Text style={styles.imagePickerText}>{isWishlistItem ? 'Lägg till bild när du köpt plagget' : 'Välj foto'}</Text>
            </View>
          )}
          {(newImage || imageUrl) && (
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>Byt foto</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Namn</Text>
        <TextInput style={styles.input} placeholderTextColor={t.placeholder} value={name} onChangeText={setName} />

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.pills}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat} style={[styles.pill, category === cat && styles.pillActive]} onPress={() => { setCategory(cat); setSubcategory('') }}>
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {category && SUBCATEGORIES[category] && (
          <>
            <Text style={styles.label}>Typ</Text>
            <View style={styles.pills}>
              {SUBCATEGORIES[category].map((sub) => (
                <TouchableOpacity key={sub} style={[styles.pill, subcategory === sub && styles.pillActive]} onPress={() => setSubcategory(subcategory === sub ? '' : sub)}>
                  <Text style={[styles.pillText, subcategory === sub && styles.pillTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Färg – visas för både garderob och köplista */}
        <Text style={styles.label}>Färg</Text>
        {isWishlistItem ? (
          <View style={styles.pills}>
            {COLOR_NAMES.map((c) => (
              <TouchableOpacity key={c} style={[styles.pill, color === c && styles.pillActive]} onPress={() => setColor(color === c ? '' : c)}>
                <Text style={[styles.pillText, color === c && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.colorGrid}>
              {COLORS.map((c) => (
                <TouchableOpacity key={c.name} style={[styles.colorDot, { backgroundColor: c.hex }, color === c.name && styles.colorDotActive]} onPress={() => setColor(c.name)}>
                  {color === c.name && <Text style={styles.colorCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            {color ? <Text style={styles.colorSelected}>Vald färg: {color}</Text> : null}
          </>
        )}

        {/* Säsong – visas för både garderob och köplista */}
        <Text style={styles.label}>Säsong</Text>
        <View style={styles.pills}>
          {SEASONS.map((s) => (
            <TouchableOpacity key={s} style={[styles.pill, seasons.includes(s) && styles.pillActive]} onPress={() => toggleSeason(s)}>
              <Text style={[styles.pillText, seasons.includes(s) && styles.pillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Storlek & plats – bara för egna plagg */}
        {!isWishlistItem && (
          <>
            <Text style={styles.label}>Storlek</Text>
            <View style={styles.pills}>
              {SIZES.map((s) => (
                <TouchableOpacity key={s} style={[styles.pill, size === s && styles.pillActive]} onPress={() => setSize(size === s ? '' : s)}>
                  <Text style={[styles.pillText, size === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Egen storlek, t.ex. 38 eller W29/L32"
              placeholderTextColor={t.placeholder}
              value={SIZES.includes(size) ? '' : size}
              onChangeText={setSize}
            />

            <Text style={styles.label}>Var finns plagget?</Text>
            <View style={styles.pills}>
              {LOCATIONS.map((l) => (
                <TouchableOpacity key={l} style={[styles.pill, location === l && styles.pillActive]} onPress={() => setLocation(location === l ? '' : l)}>
                  <Text style={[styles.pillText, location === l && styles.pillTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Egen plats, t.ex. Flyttlåda 3 hos mamma"
              placeholderTextColor={t.placeholder}
              value={LOCATIONS.includes(location) ? '' : location}
              onChangeText={setLocation}
            />
          </>
        )}

        {/* Bara för riktiga garderobs-plagg */}
        {!isWishlistItem && (
          <View style={styles.wornSection}>
            <View style={styles.wornInfo}>
              <Text style={styles.wornCount}>{timesWorn} gånger</Text>
              <Text style={styles.wornLabel}>{lastWorn ? `Senast använd: ${new Date(lastWorn).toLocaleDateString('sv-SE')}` : 'Aldrig använd'}</Text>
            </View>
            <TouchableOpacity style={styles.wornButton} onPress={markAsWorn}>
              <Text style={styles.wornButtonText}>👗 Använd idag</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveChanges}
          disabled={loading}
          accessibilityLabel="Spara ändringar"
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color={t.onPrimary} size="small" />
            : <Text style={styles.saveButtonText}>Spara 🍒</Text>
          }
        </TouchableOpacity>

        {!isWishlistItem && (
          <TouchableOpacity style={styles.archiveButton} onPress={toggleArchive}>
            <Text style={styles.archiveButtonText}>
              {archived ? '👗 Ta tillbaka till garderoben' : '📦 Arkivera (passar inte / används ej)'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={isWishlistItem ? deleteWishlistItem : deleteGarment}>
          <Text style={styles.deleteButtonText}>{isWishlistItem ? 'Ta bort från köplistan' : 'Ta bort plagg'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  wishlistBadge: { backgroundColor: t.surfaceMuted, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: t.surfaceMuted },
  wishlistBadgeText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 13 },
  archivedBadge: { backgroundColor: t.surfaceMuted, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: t.border },
  archivedBadgeText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 13 },
  imagePicker: { borderRadius: 20, height: 240, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', marginBottom: 24, overflow: 'hidden', backgroundColor: t.surfaceMuted },
  imagePickerInner: { alignItems: 'center', gap: 8 },
  imagePickerEmoji: { fontFamily: 'Lora_400Regular', fontSize: 40 },
  imagePickerText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'contain', backgroundColor: 'transparent' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, alignItems: 'center' },
  imageOverlayText: { fontFamily: 'Lora_500Medium', color: t.onPrimary, fontSize: 12 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 8, marginTop: 4 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: t.primary, transform: [{ scale: 1.15 }] },
  colorCheck: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  colorSelected: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 16 },
  wornSection: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: t.border },
  wornInfo: { gap: 2 },
  wornCount: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textSecondary },
  wornLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
  wornButton: { backgroundColor: t.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  wornButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 13 },
  saveButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  saveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  archiveButton: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  archiveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 15 },
  deleteButton: { backgroundColor: 'transparent', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  deleteButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 16 },
})