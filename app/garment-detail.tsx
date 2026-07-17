import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ARCHIVE_REASONS } from '../utils/archiveReasons'
import BrandInput from '../components/BrandInput'
import CropModal from '../components/CropModal'
import { pickImageSmart } from '../utils/imagePicker'
import SignedImage from '../components/SignedImage'
import { router } from 'expo-router'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'
import { apiPost } from '../utils/api'
import { parsePrice } from '../utils/brands'
import { fetchLocations, type Location } from '../utils/locations'
import { goBack } from '../utils/nav'
import { resolveImageUrl } from '../utils/storage'

const CATEGORIES = ['Toppar', 'Tröjor', 'Byxor', 'Shorts', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SUBCATEGORIES: Record<string, string[]> = {
  'Toppar': ['Linne', 'T-shirt', 'Långärmad topp', 'Body', 'Blus', 'Skjorta'],
  'Tröjor': ['Sweatshirt', 'Hoodie', 'Stickad tröja', 'Collegetröja', 'Kofta'],
  'Byxor': ['Jeans', 'Chinos', 'Kostymbyxor', 'Leggings', 'Mjukisbyxor'],
  'Shorts': ['Jeansshorts', 'Chinosshorts', 'Linneshorts', 'Träningsshorts', 'Skräddade shorts'],
  'Kjolar': ['Minikjol', 'Midikjol', 'Maxikjol', 'Plisserad kjol', 'Pennkjol'],
  'Klänningar': ['Miniklänning', 'Midiklänning', 'Maxiklänning', 'Festklänning', 'Vardagsklänning'],
  'Kavajer': ['Kavaj', 'Blazer', 'Kostymjacka'],
  'Ytterkläder': ['Kappa', 'Vinterjacka', 'Regnrock', 'Trenchcoat', 'Pufferjacka', 'Läderjacka', 'Dunjacka'],
  'Skor': ['Sneakers', 'Boots', 'Pumps', 'Sandaler', 'Loafers', 'Ballerinaskor', 'Tofflor'],
  'Väskor': ['Handväska', 'Ryggsäck', 'Tote bag', 'Kuvertväska', 'Crossbody'],
  'Accessoarer': ['Halsduk', 'Sjal', 'Bälte', 'Hatt', 'Keps', 'Mössa', 'Smycken', 'Solglasögon', 'Håraccessoarer'],
}
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = [
  { name: 'Svart', hex: '#1A1A1A' }, { name: 'Vit', hex: '#F5F5F5' },
  { name: 'Grå', hex: '#9E9E9E' }, { name: 'Beige', hex: '#D4B896' },
  { name: 'Brun', hex: '#795548' }, { name: 'Röd', hex: '#E53935' },
  { name: 'Vinröd', hex: '#7B2D3A' }, { name: 'Rosa', hex: '#EC407A' },
  { name: 'Lila', hex: '#8E24AA' }, { name: 'Blå', hex: '#1E88E5' },
  { name: 'Ljusblå', hex: '#81D4FA' }, { name: 'Turkos', hex: '#26C6DA' },
  { name: 'Grön', hex: '#43A047' }, { name: 'Olivgrön', hex: '#708238' },
  { name: 'Gul', hex: '#FDD835' }, { name: 'Orange', hex: '#FB8C00' },
  { name: 'Guld', hex: '#C9A96E' }, { name: 'Silver', hex: '#BFC1C2' },
]
const COLOR_NAMES = ['Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Vinröd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Turkos', 'Grön', 'Olivgrön', 'Gul', 'Orange', 'Guld', 'Silver']
const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']

// Läser en Blob som base64 (utan data:-prefix). Funkar på både native och web.
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const r = reader.result as string
      resolve(r.includes(',') ? r.split(',')[1] : r)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function GarmentDetail() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { id, wishlistId } = useLocalSearchParams()
  const isWishlistItem = !!wishlistId && !id

  const back = () => goBack('/wardrobe')

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [color, setColor] = useState('')
  const [seasons, setSeasons] = useState<string[]>([])
  const [timesWorn, setTimesWorn] = useState(0)
  const [lastWorn, setLastWorn] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [newImage, setNewImage] = useState<string | null>(null)
  const [size, setSize] = useState('')
  const [location, setLocation] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [ownBrands, setOwnBrands] = useState<string[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [archived, setArchived] = useState(false)
  const [archiveReason, setArchiveReason] = useState<string | null>(null)
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [sold, setSold] = useState(false)

  // Autospar: alla ändringar sparas automatiskt med kort fördröjning.
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [redoing, setRedoing] = useState(false)
  const [cropUri, setCropUri] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setLoaded(true)
    }
  }

  async function fetchGarment() {
    const { data } = await supabase.from('garments').select('*').eq('id', id).single()
    if (data) {
      setName(data.name); setCategory(data.category); setSubcategory(data.subcategory || ''); setColor(data.color || '')
      setSeasons(data.season ? data.season.split(', ') : [])
      setTimesWorn(data.times_worn || 0); setLastWorn(data.last_worn); setImageUrl(data.image_url)
      setSize(data.size || ''); setLocation(data.location || '')
      setBrand(data.brand || ''); setPrice(data.price != null ? String(data.price) : '')
      setArchived(!!data.archived); setSold(!!data.sold)
      setArchiveReason(data.archive_reason || null)
      setLoaded(true)
    }
    // Egna märken för autocomplete
    const { data: all } = await supabase.from('garments').select('brand')
    if (all) setOwnBrands([...new Set(all.map((g: any) => g.brand).filter(Boolean))] as string[])
    // Egna platser (för att välja plats + avgöra arkiv)
    setLocations(await fetchLocations())
  }

  async function saveFields() {
    try {
      if (isWishlistItem) {
        const { error } = await supabase.from('wishlist').update({
          name,
          category: category || null,
          color: color || null,
          season: seasons[0] || null,
        }).eq('id', wishlistId)
        if (error) throw error
      } else {
        // Platsen avgör arkivstatus: ligger plagget på en arkiv-plats (t.ex.
        // källaren) räknas det som arkiverat. Okänd/tom plats behåller nuvarande.
        const matchedLoc = locations.find(l => l.name === location)
        const archivedVal = matchedLoc ? matchedLoc.is_archive : archived
        const { error } = await supabase.from('garments').update({
          name, category,
          subcategory: subcategory || null,
          season: seasons.join(', '),
          color,
          size: size.trim() || null,
          location: location.trim() || null,
          brand: brand.trim() || null,
          price: parsePrice(price),
          archived: archivedVal,
          archive_reason: archivedVal ? archiveReason : null,
          ...(archivedVal ? {} : { sold: false }),
        }).eq('id', id)
        if (error) throw error
      }
      setSaveState('saved')
    } catch (e: any) {
      setSaveError(e?.message || 'okänt fel')
      setSaveState('error')
    }
  }

  // Debounce: spara 700 ms efter senaste ändringen, så vi inte skriver till
  // databasen mitt i en pågående textinmatning.
  useEffect(() => {
    if (!loaded) return
    // Spara inte bort obligatoriska fält – vänta tills de är ifyllda igen.
    if (!name.trim() || (!isWishlistItem && !category)) return
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveFields, 700)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [name, category, subcategory, color, seasons, size, location, brand, price, archiveReason])

  // Håll arkiv-badgen i synk med vald plats.
  useEffect(() => {
    const matched = locations.find(l => l.name === location)
    if (matched) setArchived(matched.is_archive)
  }, [location, locations])

  function toggleSeason(s: string) {
    if (isWishlistItem) {
      setSeasons(prev => prev.includes(s) ? [] : [s])
    } else {
      setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    }
  }

  async function pickImage() {
    const result = await pickImageSmart({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    setNewImage(asset.uri) // visa direkt medan uppladdningen pågår
    setSaveState('saving')
    try {
      // Ta bort bakgrunden om möjligt, annars ladda upp originalet.
      let url: string
      let processed: string | null = null
      if (asset.base64) {
        try {
          const data = await apiPost('/api/remove-background', { base64: asset.base64 })
          if (data.base64) processed = data.base64
        } catch { /* misslyckad borttagning → originalbilden */ }
      }
      url = processed ? await uploadPng(processed) : await uploadImage(asset.uri)

      const table = isWishlistItem ? 'wishlist' : 'garments'
      const rowId = isWishlistItem ? wishlistId : id
      const { error } = await supabase.from(table).update({ image_url: url }).eq('id', rowId)
      if (error) throw error
      setImageUrl(url)
      if (processed) setNewImage(`data:image/png;base64,${processed}`)
      setSaveState('saved')
    } catch (e: any) {
      setSaveState('error')
      showAlert('Bilden kunde inte sparas', e.message)
    }
  }

  // Öppnar beskärningsvyn med den nuvarande bilden (löst till en visningsbar URL).
  async function openCrop() {
    const src = imageUrl || newImage
    if (!src) return
    const url = await resolveImageUrl(src)
    setCropUri(url)
  }

  // Sparar den beskurna bilden och uppdaterar plagget.
  async function saveCropped(base64: string) {
    setCropUri(null)
    setSaveState('saving')
    try {
      const newUrl = await uploadPng(base64)
      const table = isWishlistItem ? 'wishlist' : 'garments'
      const rowId = isWishlistItem ? wishlistId : id
      const { error } = await supabase.from(table).update({ image_url: newUrl }).eq('id', rowId)
      if (error) throw error
      setImageUrl(newUrl)
      setNewImage(`data:image/png;base64,${base64}`)
      setSaveState('saved')
    } catch (e: any) {
      setSaveState('error')
      showAlert('Bilden kunde inte sparas', e.message)
    }
  }

  async function uploadPng(base64: string) {
    const filePath = `public/${Date.now()}-${Math.random().toString(36).substring(2)}.png`
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const { error } = await supabase.storage.from('garments').upload(filePath, bytes, { contentType: 'image/png', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  // Kör bakgrundsborttagning igen på den befintliga bilden – utan att behöva
  // ladda upp den på nytt. Läser nuvarande bild, skickar till Replicate och
  // sparar resultatet.
  async function redoBackground() {
    const src = imageUrl || newImage
    if (!src || redoing) return
    setRedoing(true)
    setSaveState('saving')
    try {
      // Hämta bilden själva och läs den som base64. (ImageManipulator kan inte
      // läsa en fjärr-URL på native – därav "File is not readable".)
      const url = await resolveImageUrl(src)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Kunde inte hämta bilden')
      const base64 = await blobToBase64(await res.blob())
      if (!base64) throw new Error('Kunde inte läsa bilden')
      const data = await apiPost('/api/remove-background', { base64 })
      if (!data.base64) throw new Error('Bakgrunden kunde inte tas bort just nu. Försök igen om en stund.')
      const newUrl = await uploadPng(data.base64)
      const table = isWishlistItem ? 'wishlist' : 'garments'
      const rowId = isWishlistItem ? wishlistId : id
      const { error } = await supabase.from(table).update({ image_url: newUrl }).eq('id', rowId)
      if (error) throw error
      setImageUrl(newUrl)
      setNewImage(`data:image/png;base64,${data.base64}`)
      setSaveState('saved')
    } catch (e: any) {
      setSaveState('error')
      showAlert('Kunde inte ta bort bakgrunden', e.message)
    } finally {
      setRedoing(false)
    }
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

  async function deleteGarment() {
    showConfirm('Ta bort plagg', `Är du säker på att du vill ta bort ${name}?`, async () => {
      const { error } = await supabase.from('garments').delete().eq('id', id)
      if (error) showAlert('Något gick fel', error.message)
      else back()
    }, 'Ta bort', true)
  }

  async function deleteWishlistItem() {
    showConfirm('Ta bort', `Ta bort "${name}" från köplistan?`, async () => {
      await supabase.from('wishlist').delete().eq('id', wishlistId)
      back()
    }, 'Ta bort', true)
  }

  // Arkiv styrs av platsen: att arkivera = flytta plagget till en arkiv-plats,
  // att ta tillbaka = flytta till en vanlig plats. Autospar sätter archived.
  async function toggleArchive() {
    if (!archived) {
      const archiveLoc = locations.find(l => l.is_archive)
      if (!archiveLoc) {
        showAlert('Ingen arkiv-plats', 'Skapa först en plats markerad som Arkiv (t.ex. Källaren) under Min profil → Egna platser.')
        return
      }
      // Fråga varför plagget arkiveras innan det flyttas.
      setShowReasonPicker(true)
    } else {
      const homeLoc = locations.find(l => !l.is_archive)
      setArchiveReason(null)
      setLocation(homeLoc ? homeLoc.name : 'Garderoben')
    }
  }

  // Väljer arkiveringsanledning och flyttar plagget till arkiv-platsen.
  function pickArchiveReason(reasonKey: string) {
    const archiveLoc = locations.find(l => l.is_archive)
    setArchiveReason(reasonKey)
    setShowReasonPicker(false)
    if (archiveLoc) setLocation(archiveLoc.name)
  }

  async function markAsWorn() {
    const today = new Date().toISOString().split('T')[0]
    if (lastWorn === today) {
      showAlert('Du har redan markerat detta plagg som använt idag!')
      return
    }
    const newCount = timesWorn + 1
    const { error } = await supabase.from('garments').update({ times_worn: newCount, last_worn: today }).eq('id', id)
    if (error) {
      showAlert('Något gick fel', error.message)
    } else {
      setTimesWorn(newCount); setLastWorn(today)
      showAlert(`Markerat som använt!`, `Använt ${newCount} gånger totalt.`)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={back}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Gå tillbaka"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>← Tillbaka</Text>
          </TouchableOpacity>
          {saveState === 'saving' && <Text style={styles.saveStatus}>Sparar…</Text>}
          {saveState === 'saved' && <Text style={styles.saveStatus}>Sparat ✓</Text>}
          {saveState === 'error' && <Text style={[styles.saveStatus, styles.saveStatusError]} numberOfLines={2}>Kunde inte spara: {saveError}</Text>}
        </View>

        {isWishlistItem && (
          <View style={styles.wishlistBadge}>
            <Text style={styles.wishlistBadgeText}>Köplista – äger ej ännu</Text>
          </View>
        )}

        {archived && (
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedBadgeText}>
              Arkiverad{sold ? ' · Såld' : ''}{location ? ` · Finns: ${location}` : ''}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {newImage || imageUrl ? (
            <SignedImage path={newImage || imageUrl} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerInner}>
              <Text style={styles.imagePickerEmoji}>{isWishlistItem ? '' : ''}</Text>
              <Text style={styles.imagePickerText}>{isWishlistItem ? 'Lägg till bild när du köpt plagget' : 'Välj foto'}</Text>
            </View>
          )}
          {(newImage || imageUrl) && (
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>Byt foto</Text>
            </View>
          )}
        </TouchableOpacity>

        {(imageUrl || newImage) && (
          <View style={styles.imageActionsRow}>
            <TouchableOpacity
              style={[styles.redoBgBtn, { flex: 1 }]}
              onPress={redoBackground}
              disabled={redoing}
              accessibilityLabel="Ta bort bakgrunden igen"
              accessibilityRole="button"
            >
              {redoing
                ? <ActivityIndicator color={t.textSecondary} size="small" />
                : <><Ionicons name="sparkles-outline" size={16} color={t.textSecondary} /><Text style={styles.redoBgBtnText}>Ta bort bakgrund</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.redoBgBtn, { flex: 1 }]}
              onPress={openCrop}
              accessibilityLabel="Beskär bild"
              accessibilityRole="button"
            >
              <Ionicons name="cut-outline" size={16} color={t.textSecondary} /><Text style={styles.redoBgBtnText}>Beskär bild</Text>
            </TouchableOpacity>
          </View>
        )}

        <CropModal
          visible={!!cropUri}
          uri={cropUri}
          onCancel={() => setCropUri(null)}
          onCropped={saveCropped}
        />

        <Modal visible={showReasonPicker} transparent animationType="fade" onRequestClose={() => setShowReasonPicker(false)}>
          <TouchableOpacity style={styles.reasonBackdrop} activeOpacity={1} onPress={() => setShowReasonPicker(false)}>
            <TouchableOpacity style={styles.reasonSheet} activeOpacity={1}>
              <Text style={styles.reasonTitle}>Varför arkiveras plagget?</Text>
              {ARCHIVE_REASONS.map(r => (
                <TouchableOpacity key={r.key} style={styles.reasonRow} onPress={() => pickArchiveReason(r.key)}>
                  <Ionicons name={r.icon as any} size={22} color={t.textPrimary} />
                  <Text style={styles.reasonLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Text style={styles.label}>Namn</Text>
        <TextInput style={styles.input} placeholderTextColor={t.placeholder} value={name} onChangeText={setName} />

        <Text style={styles.label}>Märke</Text>
        <BrandInput value={brand} onChange={setBrand} ownBrands={ownBrands} />

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

            <View style={styles.labelRow}>
              <Text style={styles.label}>Var finns plagget?</Text>
              <TouchableOpacity onPress={() => router.push('/locations')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.manageLink}>Hantera platser</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pills}>
              {locations.map((l) => (
                <TouchableOpacity key={l.id} style={[styles.pill, location === l.name && styles.pillActive]} onPress={() => setLocation(location === l.name ? '' : l.name)}>
                  <Text style={[styles.pillText, location === l.name && styles.pillTextActive]}>{l.name}{l.is_archive ? ' (arkiv)' : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Pris (kr)</Text>
            <TextInput
              style={styles.input}
              placeholder="t.ex. 299"
              placeholderTextColor={t.placeholder}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
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
              <Text style={styles.wornButtonText}>Använd idag</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.autosaveHint}>Ändringar sparas automatiskt</Text>

        {!isWishlistItem && (
          <TouchableOpacity style={styles.archiveButton} onPress={toggleArchive}>
            <Text style={styles.archiveButtonText}>
              {archived ? 'Ta tillbaka till garderoben' : 'Arkivera (passar inte / används ej)'}
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
  backButton: {},
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
  imageActionsRow: { flexDirection: 'row', gap: 10, marginTop: -12, marginBottom: 22 },
  redoBgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  redoBgBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 13 },
  reasonBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reasonSheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  reasonTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary, marginBottom: 16 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  reasonLabel: { fontFamily: 'Lora_500Medium', fontSize: 16, color: t.textPrimary },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 8, marginTop: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  manageLink: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  saveStatus: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, fontStyle: 'italic' },
  saveStatusError: { color: t.danger },
  autosaveHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 8, marginBottom: 12 },
  archiveButton: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  archiveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 15 },
  deleteButton: { backgroundColor: 'transparent', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  deleteButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 16 },
})