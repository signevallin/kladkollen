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
import { invalidateGarments } from '../utils/garmentsStore'
import { removeBackground } from '../utils/removeBg'
import { showAlert, showConfirm } from '../utils/alert'
import { toast } from '../components/Toast'
import { apiPost } from '../utils/api'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'
import { loadGarments } from '../utils/garmentsStore'
import { colorPalettePrompt } from '../utils/colorAnalysis'
import PurchaseEvalResult, { type PurchaseEval } from '../components/PurchaseEvalResult'
import { parsePrice } from '../utils/brands'
import { fetchLocations, type Location } from '../utils/locations'
import { goBack } from '../utils/nav'
import { cacheGet } from '../utils/cache'
import { newImageId } from '../utils/id'
import { base64ToBytes, pngToWebp } from '../utils/image'
import { CATEGORIES, COLOR_OPTIONS as COLORS, FITS, SEASONS, SUBCATEGORIES } from '../utils/constants'
import GarmentSetSection from '../components/garment-detail/GarmentSetSection'
import { useSettings } from '../utils/settings'
import { localeFor } from '../utils/i18n'
import { uploadUserImage } from '../utils/storage'
import { resolveImageUrl } from '../utils/signedUrls'
import { loadPartner } from '../utils/household'
import { loadPeople, type Person } from '../utils/people'
import { EU_CHILD_SIZES, EU_SHOE_SIZES, suggestedShoeSize } from '../utils/childSize'
import { useEntitlements, partnerFeaturesEnabled, familyFeaturesEnabled } from '../utils/entitlements'

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
  const { currency, toBaseSEK, fromBaseSEK, t: tr, lang , childSize, shoeSize: shoeSizeLbl, useColorAnalysis } = useSettings()
  const locale = localeFor(lang)
  const { tier } = useEntitlements()
  // Att tilldela plagg till ett barn ligger bakom familjeläget, "får lånas av
  // partner" bakom partnerläget.
  const partnerOn = partnerFeaturesEnabled(tier)
  const familyOn = familyFeaturesEnabled(tier)
  // Normalisera params till strängar (expo-router kan ge string[] vid dubbletter).
  const rawParams = useLocalSearchParams()
  const id = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id
  const wishlistId = Array.isArray(rawParams.wishlistId) ? rawParams.wishlistId[0] : rawParams.wishlistId
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
  const [fit, setFit] = useState('')
  const [lendable, setLendable] = useState(false)
  const [hasPartner, setHasPartner] = useState(false)
  const [maternityFriendly, setMaternityFriendly] = useState(false)
  const [pausedPregnancy, setPausedPregnancy] = useState(false)
  // Gravid-inställningarna visas bara när respektive läge är på (läses ur cachen).
  //
  // De två raderna har OLIKA villkor med flit: "Gravid-/amningsvänligt" är
  // relevant även för den som ammar utan att vara gravid – flaggan används av
  // prompten i båda lägena – medan "Pausa under graviditeten" är just
  // graviditetsspecifik och inte hör hemma under amning.
  // Hopfällbara sektioner, samma mönster som profilen. Storlek/passform är
  // utfällt eftersom det är det man oftast justerar; plats och lägen är
  // ihopfällda så skärmen börjar kort i stället för med sexton fält på rad.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['garderob', 'lagen']))
  const toggleSection = (key: string) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const pregnant = cacheGet<boolean>('profile.pregnant') ?? false
  const nursing = cacheGet<boolean>('profile.nursing') ?? false
  const [location, setLocation] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [link, setLink] = useState('') // produktlänk (bara köplistan)
  // "Smart köp?"-bedömning (köplistan): sparad på raden, kan köras/visas här.
  const [purchaseEval, setPurchaseEval] = useState<PurchaseEval | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [showEval, setShowEval] = useState(false)
  // Användarens färganalys som palett-sträng (tom = ingen analys gjord) + val att
  // väga in den i bedömningen (förvalt från globala inställningen).
  const [colorPalette, setColorPalette] = useState('')
  const [weighColors, setWeighColors] = useState(useColorAnalysis)
  // Familjeläge: vem plagget tillhör + barnstorlek + hand-me-down-status.
  const [children, setChildren] = useState<Person[]>([])
  const [personId, setPersonId] = useState<string | null>(null)
  const [sizeCm, setSizeCm] = useState<number | null>(null)
  const [shoeSize, setShoeSize] = useState<number | null>(null)
  const [familyStatus, setFamilyStatus] = useState<'in_use' | 'stored' | 'outgrown'>('in_use')
  // Barnet plagget tillhör, om något. Styr att storleken visas överst i
  // stället för nere i den ihopfällda garderobssektionen.
  const childOwner = children.find(c => c.id === personId) ?? null
  // Skor mäts varken i XXS–XXL eller i klädernas centimeterskala – de har en
  // egen numrering. Utan det här undantaget kunde ett par barnskor bara få en
  // klädstorlek i cm, alltså inget användbart mått alls.
  const isShoe = category === 'Skor'
  const [ownBrands, setOwnBrands] = useState<string[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [archived, setArchived] = useState(false)
  const [archiveReason, setArchiveReason] = useState<string | null>(null)
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [sold, setSold] = useState(false)

  // Set: plagg som hör ihop (co-ord, kostym ...). Ett plagg tillhör högst ett
  // set. Hela set-hanteringen bor i components/garment-detail/GarmentSetSection.
  const [initialSetId, setInitialSetId] = useState<string | null>(null)

  // Autospar: alla ändringar sparas automatiskt med kort fördröjning.
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [redoing, setRedoing] = useState(false)
  const [cropUri, setCropUri] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hämta när id/wishlistId finns. Vid djuplänk från en notis (särskilt kallstart)
  // kan route-parametern dyka upp en tick EFTER att skärmen monterats – en
  // engångseffekt med [] frågade då med undefined id → tom vy utan bild. Genom
  // att bero på parametrarna (och hoppa över tomma) hämtas plagget när id kommit.
  useEffect(() => {
    if (isWishlistItem) { if (wishlistId) fetchWishlistItem() }
    else if (id) fetchGarment()
  }, [id, wishlistId, isWishlistItem])
  useEffect(() => { loadPartner().then(({ partner }) => setHasPartner(!!partner)) }, [])

  // Barn i hushållet – styr om familjesektionen och barnstorleken visas.
  // MÅSTE bero på familyOn: nivån läses via RPC:n effective_entitlement och är
  // false de första millisekunderna. Hämtningen låg tidigare i fetchGarment(),
  // som kör direkt när id:t finns – hann den före nivån sattes children till en
  // tom lista och hämtades aldrig om, så familjesektionen uteblev tills man
  // lämnade skärmen och kom tillbaka.
  useEffect(() => {
    if (!familyOn) { setChildren([]); return }
    let alive = true
    loadPeople()
      .then(ppl => { if (alive) setChildren(ppl.filter(p => p.type === 'child')) })
      .catch(() => { /* inget hushåll än */ })
    return () => { alive = false }
  }, [familyOn])

  async function fetchWishlistItem() {
    const { data } = await supabase.from('wishlist').select('*').eq('id', wishlistId).single()
    if (data) {
      setName(data.name)
      setBrand(data.brand || '')
      setCategory(data.category || '')
      setSubcategory(data.subcategory || '')
      setColor(data.color || '')
      setSeasons(data.season ? data.season.split(', ').filter(Boolean) : [])
      setPrice(data.price != null ? String(fromBaseSEK(data.price)) : '')
      setLink(data.url || '')
      setImageUrl(data.image_url)
      const saved = (data as any).purchase_eval
      if (saved && typeof saved === 'object') setPurchaseEval(saved as PurchaseEval)
      setLoaded(true)
    }
    // Färganalys (för "väg in min färganalys"-valet i smart köp-bedömningen).
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('color_analysis').eq('id', user.id).maybeSingle()
        setColorPalette(colorPalettePrompt((prof as any)?.color_analysis))
      }
    } catch { /* ingen färganalys – valet döljs */ }
  }

  // Kör "smart köp?"-bedömningen på köplistepostens bild mot egna garderoben,
  // visar resultatet och sparar det på raden så det går att se igen.
  async function runPurchaseEval() {
    if (!imageUrl) { showAlert(tr('Lägg till en bild först'), tr('Bedömningen behöver en bild på plagget.')); return }
    setEvaluating(true)
    try {
      // ImageManipulator läser lokala filer, inte fjärr-URL:er – ladda ner först
      // (samma mönster som CropModal), annars "File ... is not readable".
      const signed = await resolveImageUrl(imageUrl)
      const local = FileSystem.cacheDirectory + `eval-${Date.now()}.jpg`
      await FileSystem.downloadAsync(signed, local)
      const rendered = await ImageManipulator.manipulate(local).resize({ width: 1000 }).renderAsync()
      const { base64 } = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true })
      FileSystem.deleteAsync(local, { idempotent: true }).catch(() => {})
      let wardrobe: any[] = []
      try {
        const all = await loadGarments()
        wardrobe = (all || [])
          .filter((g: any) => g.person_id == null && !g.archived && !g.for_sale)
          .map((g: any) => ({ name: g.name, category: g.category, subcategory: g.subcategory, color: g.color, season: g.season }))
      } catch { /* tom garderob duger */ }
      const data = await apiPost('/api/evaluate-purchase', {
        base64,
        wardrobe,
        colorPalette: weighColors && colorPalette ? colorPalette : undefined,
      }) as PurchaseEval & { error?: string }
      if ((data as any).error) throw new Error((data as any).error)
      setPurchaseEval(data)
      setShowEval(true)
      await supabase.from('wishlist').update({ purchase_eval: data } as any).eq('id', wishlistId)
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e?.message || tr('Försök igen.'))
    } finally {
      setEvaluating(false)
    }
  }

  async function fetchGarment() {
    const { data } = await supabase.from('garments').select('*').eq('id', id).single()
    if (data) {
      setName(data.name); setCategory(data.category || ''); setSubcategory(data.subcategory || ''); setColor(data.color || '')
      setSeasons(data.season ? data.season.split(', ') : [])
      setTimesWorn(data.times_worn || 0); setLastWorn(data.last_worn); setImageUrl(data.image_url)
      setSize(data.size || ''); setFit(data.fit || ''); setLocation(data.location || ''); setLendable(!!data.lendable)
      setMaternityFriendly(!!data.maternity_friendly); setPausedPregnancy(!!data.paused_pregnancy)
      setBrand(data.brand || ''); setPrice(data.price != null ? String(fromBaseSEK(data.price)) : '')
      setArchived(!!data.archived); setSold(!!data.sold)
      setArchiveReason(data.archive_reason || null)
      setPersonId(data.person_id || null)
      setSizeCm(data.size_cm ?? null)
      setShoeSize(data.shoe_size ?? null)
      setFamilyStatus((data.status as any) || 'in_use')
      setInitialSetId(data.set_id || null)
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
          brand: brand.trim() || null,
          price: toBaseSEK(parsePrice(price)),
          category: category || null,
          subcategory: subcategory || null,
          color: color || null,
          season: seasons.join(', '),
          url: link.trim() || null,
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
          fit: fit || null,
          lendable,
          maternity_friendly: maternityFriendly,
          paused_pregnancy: pausedPregnancy,
          location: location.trim() || null,
          brand: brand.trim() || null,
          price: toBaseSEK(parsePrice(price)),
          archived: archivedVal,
          archive_reason: archivedVal ? archiveReason : null,
          ...(archivedVal ? {} : { sold: false }),
          person_id: personId,
          household_id: personId ? (children.find(c => c.id === personId)?.household_id ?? null) : null,
          size_cm: isShoe ? null : (personId ? sizeCm : null),
          shoe_size: isShoe ? shoeSize : null,
          status: personId ? familyStatus : null,
        }).eq('id', id)
        if (error) throw error
        invalidateGarments()
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
  }, [name, category, subcategory, color, seasons, size, fit, lendable, maternityFriendly, pausedPregnancy, location, brand, price, link, archiveReason, personId, sizeCm, shoeSize, familyStatus])

  // Håll arkiv-badgen i synk med vald plats.
  useEffect(() => {
    const matched = locations.find(l => l.name === location)
    if (matched) {
      setArchived(matched.is_archive)
      if (!matched.is_archive) setArchiveReason(null)
    }
  }, [location, locations])

  function toggleSeason(s: string) {
    setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
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
          processed = await removeBackground(asset.base64)
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
      showAlert(tr('Bilden kunde inte sparas'), e.message)
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
      showAlert(tr('Bilden kunde inte sparas'), e.message)
    }
  }

  async function uploadPng(base64: string) {
    // Omkoda till WebP (behåller transparens, mycket mindre fil än PNG).
    const opt = await pngToWebp(base64)
    return uploadUserImage(base64ToBytes(opt.base64), opt.ext, opt.contentType)
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
      const b64 = await removeBackground(base64)
      if (!b64) throw new Error('Bakgrunden kunde inte tas bort just nu. Försök igen om en stund.')
      const newUrl = await uploadPng(b64)
      const table = isWishlistItem ? 'wishlist' : 'garments'
      const rowId = isWishlistItem ? wishlistId : id
      const { error } = await supabase.from(table).update({ image_url: newUrl }).eq('id', rowId)
      if (error) throw error
      setImageUrl(newUrl)
      setNewImage(`data:image/png;base64,${b64}`)
      setSaveState('saved')
    } catch (e: any) {
      setSaveState('error')
      showAlert(tr('Kunde inte ta bort bakgrunden'), e.message)
    } finally {
      setRedoing(false)
    }
  }

  async function uploadImage(uri: string) {
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    return uploadUserImage(new Uint8Array(arrayBuffer), 'jpg', 'image/jpeg')
  }

  async function deleteGarment() {
    showConfirm(tr('Ta bort plagg'), `${tr('Är du säker på att du vill ta bort')} ${name}?`, async () => {
      const { error } = await supabase.from('garments').delete().eq('id', id)
      if (error) showAlert(tr('Något gick fel'), error.message)
      else { invalidateGarments(); back() }
    }, tr('Ta bort'), true)
  }

  async function deleteWishlistItem() {
    showConfirm(tr('Ta bort'), `${tr('Ta bort från köplistan?')} – ${name}`, async () => {
      await supabase.from('wishlist').delete().eq('id', wishlistId)
      back()
    }, tr('Ta bort'), true)
  }

  // Arkiv styrs av platsen: att arkivera = flytta plagget till en arkiv-plats,
  // att ta tillbaka = flytta till en vanlig plats. Autospar sätter archived.
  async function toggleArchive() {
    if (!archived) {
      const archiveLoc = locations.find(l => l.is_archive)
      if (!archiveLoc) {
        showAlert(tr('Ingen arkiv-plats'), tr('Skapa först en plats markerad som Arkiv (t.ex. Källaren) under Min profil → Egna platser.'))
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

  async function sellGarment() {
    try {
      const { error } = await supabase.from('garments').update({ for_sale: true }).eq('id', id)
      if (error) throw error
      invalidateGarments()
      toast(tr('Plagget ligger nu i säljlistan'))
      back()
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
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
      showAlert(tr('Du har redan markerat detta plagg som använt idag!'))
      return
    }
    const newCount = timesWorn + 1
    const { error } = await supabase.from('garments').update({ times_worn: newCount, last_worn: today }).eq('id', id)
    if (error) {
      showAlert(tr('Något gick fel'), error.message)
    } else {
      invalidateGarments()
      setTimesWorn(newCount); setLastWorn(today)
      showAlert(tr('Markerat som använt!'), `${tr('Använt')} ${newCount} ${tr('gånger totalt.')}`)
    }
  }


  // Hopfällbar sektionsrubrik (samma som profilens).
  const sectionHeader = (key: string, title: string) => (
    <TouchableOpacity
      style={styles.sectionHeaderRow}
      activeOpacity={0.7}
      onPress={() => toggleSection(key)}
      accessibilityRole="button"
      accessibilityLabel={tr(title)}
    >
      <Text style={styles.sectionHeaderTitle}>{tr(title)}</Text>
      <Ionicons name={collapsed.has(key) ? 'chevron-down' : 'chevron-up'} size={16} color={t.textFaint} />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={back}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={tr('Gå tillbaka')}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
          </TouchableOpacity>
          {saveState === 'saving' && <Text style={styles.saveStatus}>{tr('Sparar…')}</Text>}
          {saveState === 'saved' && <Text style={styles.saveStatus}>{tr('Sparat ✓')}</Text>}
          {saveState === 'error' && <Text style={[styles.saveStatus, styles.saveStatusError]} numberOfLines={2}>{tr('Kunde inte spara:')} {saveError}</Text>}
        </View>

        {isWishlistItem && (
          <View style={styles.wishlistBadge}>
            <Text style={styles.wishlistBadgeText}>{tr('Köplista – äger ej ännu')}</Text>
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
              <Text style={styles.imageOverlayText}>{tr('Byt foto')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {(imageUrl || newImage) && (
          <View style={styles.imageActionsRow}>
            <TouchableOpacity
              style={[styles.redoBgBtn, { flex: 1 }]}
              onPress={redoBackground}
              disabled={redoing}
              accessibilityLabel={tr('Ta bort bakgrunden igen')}
              accessibilityRole="button"
            >
              {redoing
                ? <ActivityIndicator color={t.textSecondary} size="small" />
                : <><Ionicons name="sparkles-outline" size={16} color={t.textSecondary} /><Text style={styles.redoBgBtnText}>{tr('Ta bort bakgrund')}</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.redoBgBtn, { flex: 1 }]}
              onPress={openCrop}
              accessibilityLabel={tr('Beskär bild')}
              accessibilityRole="button"
            >
              <Ionicons name="crop-outline" size={16} color={t.textSecondary} /><Text style={styles.redoBgBtnText}>{tr('Beskär bild')}</Text>
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
              <Text style={styles.reasonTitle}>{tr('Varför arkiveras plagget?')}</Text>
              {ARCHIVE_REASONS.map(r => (
                <TouchableOpacity key={r.key} style={styles.reasonRow} onPress={() => pickArchiveReason(r.key)}>
                  <Ionicons name={r.icon as any} size={22} color={t.textPrimary} />
                  <Text style={styles.reasonLabel}>{tr(r.label)}</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Text style={styles.label}>{tr('Namn')}</Text>
        <TextInput style={styles.input} placeholderTextColor={t.placeholder} value={name} onChangeText={setName} />

        <Text style={styles.label}>{tr('Märke')}</Text>
        <BrandInput value={brand} onChange={setBrand} ownBrands={ownBrands} />

        <Text style={styles.label}>{tr('Kategori')}</Text>
        <View style={styles.pills}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat} style={[styles.pill, category === cat && styles.pillActive]} onPress={() => { setCategory(cat); setSubcategory('') }}>
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{tr(cat)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {category && SUBCATEGORIES[category] && (
          <>
            <Text style={styles.label}>{tr('Typ')}</Text>
            <View style={styles.pills}>
              {SUBCATEGORIES[category].map((sub) => (
                <TouchableOpacity key={sub} style={[styles.pill, subcategory === sub && styles.pillActive]} onPress={() => setSubcategory(subcategory === sub ? '' : sub)}>
                  <Text style={[styles.pillText, subcategory === sub && styles.pillTextActive]}>{tr(sub)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Färg – swatch-väljare med faktiska färger (både garderob och köplista) */}
        <Text style={styles.label}>{tr('Färg')}</Text>
        <View style={styles.colorGrid}>
          {COLORS.map((c) => (
            <TouchableOpacity key={c.name} style={[styles.colorDot, { backgroundColor: c.hex }, color === c.name && styles.colorDotActive]} onPress={() => setColor(color === c.name ? '' : c.name)}>
              {color === c.name && <Text style={styles.colorCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
        {color ? <Text style={styles.colorSelected}>{tr('Vald färg:')} {tr(color)}</Text> : null}

        {/* Säsong – visas för både garderob och köplista */}
        <Text style={styles.label}>{tr('Säsong')}</Text>
        <View style={styles.pills}>
          {SEASONS.map((s) => (
            <TouchableOpacity key={s} style={[styles.pill, seasons.includes(s) && styles.pillActive]} onPress={() => toggleSeason(s)}>
              <Text style={[styles.pillText, seasons.includes(s) && styles.pillTextActive]}>{tr(s)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pris hör till plagget och gäller båda listorna – låg tidigare som två
            identiska fält i var sin gren. Länken är köplist-specifik. */}
        <Text style={styles.label}>{tr('Pris')} ({currency})</Text>
        <TextInput
          style={styles.input}
          placeholder={tr('t.ex. 299')}
          placeholderTextColor={t.placeholder}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {isWishlistItem && (
          <>
            <Text style={styles.label}>{tr('Länk till plagget')}</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={t.placeholder}
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            {/* Smart köp? – bedöm plagget mot garderoben, spara & visa igen. */}
            <Text style={styles.label}>{tr('Smart köp?')}</Text>
            {colorPalette ? (
              <TouchableOpacity style={styles.evalColorToggle} onPress={() => setWeighColors(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: weighColors }}>
                <Ionicons name={weighColors ? 'checkbox' : 'square-outline'} size={20} color={weighColors ? t.primary : t.textFaint} />
                <Text style={styles.evalColorToggleText}>{tr('Väg in min färganalys')}</Text>
              </TouchableOpacity>
            ) : null}
            {purchaseEval ? (
              <View style={styles.evalRow}>
                <TouchableOpacity style={styles.evalSeeBtn} onPress={() => setShowEval(true)}>
                  <Ionicons name="sparkles-outline" size={16} color={t.onPrimary} />
                  <Text style={styles.evalSeeBtnText}>{tr('Se bedömningen')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.evalRedoBtn} onPress={runPurchaseEval} disabled={evaluating}>
                  <Text style={styles.evalRedoText}>{evaluating ? tr('Bedömer…') : tr('Bedöm igen')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.evalBtn} onPress={runPurchaseEval} disabled={evaluating}>
                {evaluating
                  ? <ActivityIndicator color={t.onPrimary} size="small" />
                  : <Text style={styles.evalBtnText}>{tr('Är det ett smart köp?')}</Text>}
              </TouchableOpacity>
            )}
          </>
        )}

        {/* "Smart köp?"-resultat */}
        <Modal visible={showEval} animationType="slide" transparent onRequestClose={() => setShowEval(false)}>
          <View style={styles.evalModalOverlay}>
            <View style={styles.evalModalContent}>
              <View style={styles.evalModalHeader}>
                <Text style={styles.evalModalTitle}>{tr('Smart köp?')}</Text>
                <TouchableOpacity onPress={() => setShowEval(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.evalModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              {purchaseEval && <PurchaseEvalResult result={purchaseEval} />}
            </View>
          </View>
        </Modal>

        {/* Storlek & plats – bara för egna plagg */}
        {!isWishlistItem && (
          <>
            {sectionHeader('storlek', 'Storlek & passform')}
            {!collapsed.has('storlek') && (
            <>
            {/* Barnplagg: storleken är det man faktiskt öppnar plagget för att
                ändra – barn växer ur kläder, vuxna gör inte det. Den låg
                tidigare under "I garderoben", som är ihopfälld som standard,
                så den viktigaste uppgiften krävde två tryck att nå. Person-
                kopplingen står kvar där nere: den sätts en gång, storleken
                justeras om och om igen. */}
            {childOwner && !isShoe && (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{tr('Barnstorlek')}</Text>
                  <Text style={styles.sizeOwner}>{childOwner.name}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                  {EU_CHILD_SIZES.map((s) => (
                    <TouchableOpacity key={s} style={[styles.pill, sizeCm === s && styles.pillActive]} onPress={() => setSizeCm(sizeCm === s ? null : s)}>
                      <Text style={[styles.pillText, sizeCm === s && styles.pillTextActive]}>{childSize(s)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Vuxenstorlekarna döljs för barnplagg: XXS–XXL och "W29/L32" är
                brus när plagget mäts i centimeter. Fältet töms INTE – ett
                befintligt värde ligger kvar i databasen och kommer tillbaka om
                plagget kopplas loss från barnet. Passform visas för alla, den
                är lika relevant för barnkläder. */}
            {isShoe && (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{tr('Skostorlek')}</Text>
                  {childOwner ? <Text style={styles.sizeOwner}>{childOwner.name}</Text> : null}
                </View>
                {/* Numerisk skala, inte fritext: bara så kan appen räkna ut när
                    skorna blir för små och ta med dem i storlekspåminnelserna.

                    UK/US-etiketter visas BARA för barnskor. Inställningen heter
                    "Barnstorlekar", och omräkningen är bara entydig under EU 32 –
                    över den storleken skiljer sig US dam och herr med ~1,5
                    storlekar, och en sko kan tillhöra vem som helst i hushållet.
                    En siffra som ser exakt ut men är fel är sämre än EU-numret. */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                  {EU_SHOE_SIZES.map((s) => (
                    <TouchableOpacity key={s} style={[styles.pill, shoeSize === s && styles.pillActive]} onPress={() => setShoeSize(shoeSize === s ? null : s)}>
                      <Text style={[styles.pillText, shoeSize === s && styles.pillTextActive]}>{childOwner ? shoeSizeLbl(s) : s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {!childOwner && !isShoe && (
              <>
                <Text style={styles.label}>{tr('Storlek')}</Text>
                <View style={styles.pills}>
                  {SIZES.map((s) => (
                    <TouchableOpacity key={s} style={[styles.pill, size === s && styles.pillActive]} onPress={() => setSize(size === s ? '' : s)}>
                      <Text style={[styles.pillText, size === s && styles.pillTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={tr('Egen storlek, t.ex. 38 eller W29/L32')}
                  placeholderTextColor={t.placeholder}
                  value={SIZES.includes(size) ? '' : size}
                  onChangeText={setSize}
                />
              </>
            )}

            <Text style={styles.label}>{tr('Passform')}</Text>
            <View style={styles.pills}>
              {FITS.map((f) => (
                <TouchableOpacity key={f} style={[styles.pill, fit === f && styles.pillActive]} onPress={() => setFit(fit === f ? '' : f)}>
                  <Text style={[styles.pillText, fit === f && styles.pillTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            </>
            )}

            {sectionHeader('garderob', 'I garderoben')}
            {!collapsed.has('garderob') && (
            <>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{tr('Var finns plagget?')}</Text>
              <TouchableOpacity onPress={() => router.push('/locations')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.manageLink}>{tr('Hantera platser')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pills}>
              {locations.map((l) => (
                <TouchableOpacity key={l.id} style={[styles.pill, location === l.name && styles.pillActive]} onPress={() => setLocation(location === l.name ? '' : l.name)}>
                  <Text style={[styles.pillText, location === l.name && styles.pillTextActive]}>{l.name}{l.is_archive ? tr(' (arkiv)') : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {archived && (
              <>
                <Text style={styles.label}>{tr('Anledning till arkivering')}</Text>
                <View style={styles.pills}>
                  {ARCHIVE_REASONS.map(r => {
                    const on = archiveReason === r.key
                    return (
                      <TouchableOpacity key={r.key} style={[styles.pill, styles.reasonPill, on && styles.pillActive]} onPress={() => setArchiveReason(on ? null : r.key)}>
                        <Ionicons name={r.icon as any} size={14} color={on ? t.onPrimary : t.textSecondary} />
                        <Text style={[styles.pillText, on && styles.pillTextActive]}>{tr(r.label)}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}

            {children.length > 0 && (
              <>
                <Text style={styles.label}>{tr('Tillhör (familj)')}</Text>
                <View style={styles.pills}>
                  {children.map((c) => {
                    const on = personId === c.id
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.pill, on && styles.pillActive]}
                        onPress={() => {
                          setPersonId(on ? null : c.id)
                          if (!on && isShoe && shoeSize == null) {
                            setShoeSize(c.current_shoe_size ?? suggestedShoeSize(c.birthdate))
                          } else if (!on && !isShoe && sizeCm == null) {
                            setSizeCm(c.current_size_cm ?? null)
                          }
                        }}
                      >
                        <Text style={[styles.pillText, on && styles.pillTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {personId && (
                  <>
                    {/* Barnstorleken ligger överst i "Storlek & passform". */}
                    <Text style={styles.label}>{tr('Status')}</Text>
                    <View style={styles.pills}>
                      {([['in_use', 'Används'], ['stored', 'Sparad i låda'], ['outgrown', 'Urvuxen']] as const).map(([v, lbl]) => (
                        <TouchableOpacity key={v} style={[styles.pill, familyStatus === v && styles.pillActive]} onPress={() => setFamilyStatus(v)}>
                          <Text style={[styles.pillText, familyStatus === v && styles.pillTextActive]}>{tr(lbl)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            </>
            )}

            {/* Reglagen samlade sist: de är en annan sorts interaktion än
                fälten ovan, och de är dessutom villkorade – låg de kvar mitt i
                formuläret ändrade skärmen form beroende på partner/gravidläge.
                Rubriken visas bara när minst ett reglage är aktuellt. */}
            {((hasPartner && partnerOn) || pregnant || nursing) && (
              <>
                {sectionHeader('lagen', 'Delning & lägen')}
                {!collapsed.has('lagen') && (
                <>
            {hasPartner && partnerOn && (
              <TouchableOpacity style={styles.lendRow} onPress={() => setLendable(v => !v)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{tr('Får lånas av partner')}</Text>
                  <Text style={styles.lendHint}>{tr('Syns med en lån-markering i din partners vy och kan användas i Matcha-outfits.')}</Text>
                </View>
                <View style={[styles.toggle, lendable && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, lendable && styles.toggleKnobOn]} />
                </View>
              </TouchableOpacity>
            )}

            {(pregnant || nursing) && (
              <TouchableOpacity style={styles.lendRow} onPress={() => setMaternityFriendly(v => !v)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{tr('Gravid-/amningsvänligt')}</Text>
                  <Text style={styles.lendHint}>{tr('Prioriteras i outfit-förslagen under graviditet och amning.')}</Text>
                </View>
                <View style={[styles.toggle, maternityFriendly && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, maternityFriendly && styles.toggleKnobOn]} />
                </View>
              </TouchableOpacity>
            )}

            {pregnant && (
              <TouchableOpacity style={styles.lendRow} onPress={() => setPausedPregnancy(v => !v)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{tr('Pausa under graviditeten')}</Text>
                  <Text style={styles.lendHint}>{tr('Döljs från outfit-förslagen tills du tar tillbaka det. Plagget finns kvar.')}</Text>
                </View>
                <View style={[styles.toggle, pausedPregnancy && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, pausedPregnancy && styles.toggleKnobOn]} />
                </View>
              </TouchableOpacity>
            )}
                </>
                )}
              </>
            )}
          </>
        )}

        {/* Bara för riktiga garderobs-plagg */}
        {!isWishlistItem && (
          <View style={styles.wornSection}>
            <View style={styles.wornInfo}>
              <Text style={styles.wornCount}>{timesWorn} {tr('gånger')}</Text>
              <Text style={styles.wornLabel}>{lastWorn ? `${tr('Senast använd:')} ${new Date(lastWorn).toLocaleDateString(locale)}` : tr('Aldrig använd')}</Text>
            </View>
            <TouchableOpacity style={styles.wornButton} onPress={markAsWorn}>
              <Text style={styles.wornButtonText}>{tr('Använd idag')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isWishlistItem && loaded && (
          <GarmentSetSection garmentId={String(id)} initialSetId={initialSetId} />
        )}

        <Text style={styles.autosaveHint}>{tr('Ändringar sparas automatiskt')}</Text>

        {!isWishlistItem && !sold && (
          <TouchableOpacity style={styles.sellButton} onPress={sellGarment}>
            <Text style={styles.sellButtonText}>{tr('Lägg i säljlistan')}</Text>
          </TouchableOpacity>
        )}

        {!isWishlistItem && (
          <TouchableOpacity style={styles.archiveButton} onPress={toggleArchive}>
            <Text style={styles.archiveButtonText}>
              {archived ? tr('Ta tillbaka till garderoben') : tr('Arkivera (passar inte / används ej)')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={isWishlistItem ? deleteWishlistItem : deleteGarment}>
          <Text style={styles.deleteButtonText}>{isWishlistItem ? tr('Ta bort från köplistan') : tr('Ta bort plagg')}</Text>
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
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12, paddingHorizontal: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border, paddingTop: 20 },
  sectionHeaderTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: t.textSecondary, textTransform: 'uppercase' },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 8, marginTop: 4 },

  evalColorToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginBottom: 4 },
  evalColorToggleText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textPrimary },
  evalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 4 },
  evalBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  evalRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 4 },
  evalSeeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 14, paddingVertical: 14 },
  evalSeeBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  evalRedoBtn: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: t.border },
  evalRedoText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  evalModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  evalModalContent: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  evalModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  evalModalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  evalModalClose: { fontFamily: 'Lora_400Regular', fontSize: 18, color: t.textSecondary, padding: 4 },
  sizeOwner: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13, fontStyle: 'italic', marginBottom: 8, marginTop: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  lendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 8 },
  lendHint: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, fontStyle: 'italic', marginTop: 2, marginRight: 8 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: t.primary, borderColor: t.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.textSecondary },
  toggleKnobOn: { alignSelf: 'flex-end', backgroundColor: t.onPrimary },
  manageLink: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  reasonPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: t.primary, transform: [{ scale: 1.15 }] },
  colorCheck: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  colorSelected: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 16 },
  // Ordentlig luft ovanför: blocket följer direkt efter sista sektionsrubriken
  // och lästes annars som om det låg INUTI den sektionen när den var ihopfälld.
  wornSection: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  wornInfo: { gap: 2 },
  wornCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textSecondary },
  wornLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
  wornButton: { backgroundColor: t.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  wornButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 13 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  saveStatus: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, fontStyle: 'italic' },
  saveStatusError: { color: t.danger },
  autosaveHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 8, marginBottom: 12 },
  sellButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  sellButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  archiveButton: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  archiveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 15 },
  deleteButton: { backgroundColor: 'transparent', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  deleteButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 16 },

  // Set-sektion
})