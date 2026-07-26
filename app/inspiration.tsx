import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from 'expo-router'
import { cacheGet, cacheSet } from '../utils/cache'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import DayToNightShareCard from '../components/DayToNightShareCard'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { toast } from '../components/Toast'
import { supabase } from '../supabase'
import { apiPost } from '../utils/api'
import { showAlert, showConfirm } from '../utils/alert'
import { loadPartner } from '../utils/household'
import { uploadUserImage } from '../utils/storage'
import { pickImageSmart } from '../utils/imagePicker'

const SCREEN_WIDTH = Dimensions.get('window').width
const IMAGE_SIZE = (SCREEN_WIDTH - 48 - 8) / 3

// "Dag till fest"-förvandlingar: bygg en look för dag-kontexten och byt några
// plagg för att nå kvällskontexten.
const JOBB_LOGIC = 'professionellt, snyggt, välskräddat, stilrent, passar arbetsplatsen'
const SKOLA_LOGIC = 'bekvämt men snyggt, ungt och avslappnat, funkar en hel skoldag, effortless casual'
const DATE_LOGIC = 'romantiskt och självsäkert, snyggt utan att vara overdressed, charmigt med en personlig touch'
const AW_LOGIC = 'afterwork – avslappnat men uppklätt för drinkar efter jobbet, lite läckrare och mer social känsla än en vanlig arbetsdag'
const DTN_TRANSITIONS = [
  { key: 'jobb-date', label: 'Jobb → Date', fromLabel: 'Jobb', fromLogic: JOBB_LOGIC, toLabel: 'Date', toLogic: DATE_LOGIC },
  { key: 'jobb-aw', label: 'Jobb → AW', fromLabel: 'Jobb', fromLogic: JOBB_LOGIC, toLabel: 'AW', toLogic: AW_LOGIC },
  { key: 'skola-date', label: 'Skola → Date', fromLabel: 'Skola', fromLogic: SKOLA_LOGIC, toLabel: 'Date', toLogic: DATE_LOGIC },
  { key: 'skola-aw', label: 'Skola → AW', fromLabel: 'Skola', fromLogic: SKOLA_LOGIC, toLabel: 'AW', toLogic: AW_LOGIC },
] as const

export default function Inspiration() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [activeTab, setActiveTab] = useState<'analys' | 'moodboard' | 'dagtillfest'>('analys')

  // Dag till fest state
  const [dtnKey, setDtnKey] = useState<string | null>(null)
  const [dtnLoading, setDtnLoading] = useState(false)
  const [dtnResult, setDtnResult] = useState<any>(null)
  const [dtnSharing, setDtnSharing] = useState(false)
  const [dtnShareTarget, setDtnShareTarget] = useState<any>(null)
  const [dtnShowDates, setDtnShowDates] = useState(false)
  const [dtnSaving, setDtnSaving] = useState(false)
  const dtnShareRef = useRef<View>(null)

  // AI-analys state
  const [inspoImage, setInspoImage] = useState<string | null>(null)
  const [inspoBase64, setInspoBase64] = useState<string | null>(null)
  const [outfit, setOutfit] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [addedToWishlist, setAddedToWishlist] = useState<string[]>([])
  const [savedInspo, setSavedInspo] = useState(false)
  const [savingInspo, setSavingInspo] = useState(false)

  // Par-matchning (samboläge)
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(null)
  const [myName, setMyName] = useState('Jag')
  const [myGender, setMyGender] = useState('')
  const [partnerGender, setPartnerGender] = useState('')
  const [coupleResult, setCoupleResult] = useState<any | null>(null)
  const [coupleLoading, setCoupleLoading] = useState(false)
  const [coupleSaving, setCoupleSaving] = useState(false)
  const [coupleSaved, setCoupleSaved] = useState(false)

  // Moodboard state
  const [moodboardImages, setMoodboardImages] = useState<any[]>(() => cacheGet('inspo.moodboard') ?? [])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadingMoodboard, setUploadingMoodboard] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { partner: p } = await loadPartner()
      setPartner(p)
      if (user) {
        const { data: me } = await supabase.from('profiles').select('name, gender').eq('id', user.id).single()
        if (me?.name) setMyName(me.name)
        if (me?.gender) setMyGender(me.gender)
      }
      if (p) {
        const { data: pg } = await supabase.from('profiles').select('gender').eq('id', p.id).single()
        if (pg?.gender) setPartnerGender(pg.gender)
      }
    })()
  }, [])

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
    if (data) { setMoodboardImages(data); cacheSet('inspo.moodboard', data) }
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
        const response = await fetch(uri)
        const arrayBuffer = await response.arrayBuffer()
        const publicUrl = await uploadUserImage(new Uint8Array(arrayBuffer), 'jpg', 'image/jpeg')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error: dbError } = await supabase.from('moodboard').insert({
          user_id: user.id,
          image_url: publicUrl,
        })
        if (dbError) throw dbError
        fetchMoodboard()
      } catch (error: any) {
        showAlert('Något gick fel', error.message)
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
    showConfirm('Ta bort bild', 'Vill du ta bort bilden från moodboarden?', async () => {
      await supabase.from('moodboard').delete().eq('id', id)
      setSelectedImage(null)
      fetchMoodboard()
    }, 'Ta bort', true)
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
      showAlert('Något gick fel', error.message)
    } else {
      setAddedToWishlist(prev => [...prev, itemName])
      showAlert('Lagt till!', `"${itemName}" finns nu i din köplista.`)
    }
  }

  async function analyzeAndMatch() {
    if (!inspoBase64) {
      showAlert('Välj en inspirationsbild först!')
      return
    }
    setLoading(true)
    setOutfit(null)
    setAddedToWishlist([])
    try {
      const { data: currentGarments } = await supabase.from('garments').select('id, name, category, subcategory, color, season, archived, for_sale, image_url')
      const garments = (currentGarments || []).filter((g: any) => !g.archived && !g.for_sale)
      // Ta med typ + färg så AI:n kan matcha t.ex. "brun mockaväska" mot ett plagg
      // och inte felaktigt tro att det saknas.
      const garmentList = garments.map(g => {
        const meta = [g.subcategory || g.category, g.color].filter(Boolean).join(', ')
        return `- ${g.name}${meta ? ` (${meta})` : ''}`
      }).join('\n')
      const parsed = await apiPost('/api/analyze-inspo', { base64: inspoBase64, garmentList })
      const missingArray = Array.isArray(parsed.missing) ? parsed.missing.filter(Boolean) : (parsed.missing ? [parsed.missing] : [])
      // Matcha AI:ns plaggnamn mot rätt plagg – exakt först, sedan mest specifikt,
      // och aldrig samma plagg två gånger (samma robusta matchning som hemskärmen).
      const usedIds = new Set<string>()
      const findMatch = (name: string) => {
        const target = name.trim().toLowerCase()
        const free = (g: any) => !g.id || !usedIds.has(g.id)
        let m = garments.find(g => free(g) && (g.name || '').trim().toLowerCase() === target)
        if (!m) m = garments.find(g => free(g) && (g.name || '').toLowerCase().includes(target))
        if (!m) m = garments.filter(g => free(g) && g.name && target.includes(g.name.toLowerCase())).sort((a: any, b: any) => b.name.length - a.name.length)[0]
        if (m?.id) usedIds.add(m.id)
        return m
      }
      const itemsWithImages = parsed.items.map((itemName: string) => {
        const match = findMatch(itemName)
        return { name: itemName, image_url: match?.image_url || null, id: match?.id || null }
      })
      setOutfit({ ...parsed, missing: missingArray, itemsWithImages })
      setSavedInspo(false)
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
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
      showAlert('Outfit sparad!', 'Du hittar den under Outfits.')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setSavingInspo(false)
    }
  }

  // Matchar AI:ns plaggnamn mot rätt plagg i en given pool (för bilder).
  function matchItemsToPool(names: string[], pool: any[]) {
    const used = new Set<string>()
    const find = (name: string) => {
      const target = (name || '').trim().toLowerCase()
      const free = (g: any) => !g.id || !used.has(g.id)
      let m = pool.find(g => free(g) && (g.name || '').trim().toLowerCase() === target)
      if (!m) m = pool.find(g => free(g) && (g.name || '').toLowerCase().includes(target))
      if (!m) m = pool.filter(g => free(g) && g.name && target.includes(g.name.toLowerCase())).sort((a: any, b: any) => b.name.length - a.name.length)[0]
      if (m?.id) used.add(m.id)
      return m
    }
    return (names || []).map((n: string) => {
      const m = find(n)
      return { name: n, image_url: m?.image_url || null, id: m?.id || null }
    })
  }

  function buildGarmentList(garments: any[]) {
    return garments.map(g => {
      const meta = [g.subcategory || g.category, g.color].filter(Boolean).join(', ')
      return `- ${g.name}${meta ? ` (${meta})` : ''}`
    }).join('\n')
  }

  async function runDayToNight(transition: typeof DTN_TRANSITIONS[number], opts?: { vary?: boolean }) {
    // Vill man ha en ny variant (samma förvandling igen) – tala om för AI:n
    // vilka plagg den valde sist så den ger en annan kombination.
    const avoidItems = opts?.vary && dtnResult
      ? [...(dtnResult.dayItems || []), ...(dtnResult.eveningItems || [])].join(', ')
      : ''
    setDtnKey(transition.key)
    setDtnLoading(true)
    setDtnResult(null)
    setDtnShowDates(false)
    try {
      const { data: currentGarments } = await supabase
        .from('garments')
        .select('id, name, category, subcategory, color, season, archived, for_sale, image_url')
        .is('person_id', null)
      const pool = (currentGarments || []).filter((g: any) => !g.archived && !g.for_sale)
      if (pool.length < 4) {
        showAlert('För få plagg', 'Lägg till fler plagg i garderoben så kan jag bygga en dag-till-fest-look.')
        return
      }
      const parsed = await apiPost('/api/day-to-night', {
        fromLabel: transition.fromLabel,
        fromLogic: transition.fromLogic,
        toLabel: transition.toLabel,
        toLogic: transition.toLogic,
        groupedList: buildGarmentList(pool),
        avoidItems,
      })
      if (parsed.error) throw new Error(parsed.error)
      const swapOut = new Set((parsed.swaps || []).map((s: any) => (s.out || '').toLowerCase()))
      const swapIn = new Set((parsed.swaps || []).map((s: any) => (s.in || '').toLowerCase()))
      setDtnResult({
        ...parsed,
        dayImages: matchItemsToPool(parsed.dayItems || [], pool),
        eveningImages: matchItemsToPool(parsed.eveningItems || [], pool),
        // Plaggen som stannar = finns i båda looken och inte är del av ett byte.
        keep: (parsed.dayItems || []).filter((n: string) =>
          (parsed.eveningItems || []).some((e: string) => e.toLowerCase() === n.toLowerCase())
          && !swapOut.has(n.toLowerCase()) && !swapIn.has(n.toLowerCase())),
        swapImages: (parsed.swaps || []).map((s: any) => ({
          out: matchItemsToPool([s.out], pool)[0],
          in: matchItemsToPool([s.in], pool)[0],
        })),
      })
    } catch (e: any) {
      showAlert('Kunde inte skapa looken', e.message || 'Försök igen.')
    } finally {
      setDtnLoading(false)
    }
  }

  function dtnNextDates(n: number): string[] {
    const out: string[] = []
    const base = new Date()
    for (let i = 0; i < n; i++) {
      const x = new Date(base); x.setDate(base.getDate() + i)
      out.push(x.toISOString().slice(0, 10))
    }
    return out
  }

  function dtnDateLabel(dateStr: string): string {
    const today = new Date().toISOString().slice(0, 10)
    const tmw = new Date(); tmw.setDate(tmw.getDate() + 1)
    if (dateStr === today) return 'Idag'
    if (dateStr === tmw.toISOString().slice(0, 10)) return 'Imorgon'
    const d = new Date(dateStr + 'T12:00:00')
    const WD = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör']
    return `${WD[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
  }

  async function shareDayToNight() {
    if (dtnSharing || !dtnResult) return
    setDtnSharing(true)
    const tr = DTN_TRANSITIONS.find(x => x.key === dtnKey)
    setDtnShareTarget({
      fromLabel: tr?.fromLabel || 'Dag', toLabel: tr?.toLabel || 'Fest',
      dayName: dtnResult.dayName, dayItems: dtnResult.dayImages,
      eveningName: dtnResult.eveningName, eveningItems: dtnResult.eveningImages,
    })
    try {
      await new Promise(r => setTimeout(r, 350)) // låt dela-vyn rita klart
      const uri = await captureRef(dtnShareRef, { format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Dela din dag-till-fest' })
      } else {
        showAlert('Delning stöds inte här', 'Öppna appen på telefonen för att dela.')
      }
    } catch (e: any) {
      if (e?.message && !/cancel/i.test(e.message)) showAlert('Kunde inte dela', e.message)
    } finally {
      setDtnSharing(false); setDtnShareTarget(null)
    }
  }

  async function saveDayToNightToCalendar(dateStr: string) {
    if (dtnSaving || !dtnResult) return
    setDtnSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tr = DTN_TRANSITIONS.find(x => x.key === dtnKey)
      const mk = (name: string, imgs: any[], context: string) => ({
        user_id: user.id,
        name,
        garment_ids: imgs.map((i: any) => i.id).filter(Boolean),
        garment_names: imgs.map((i: any) => i.name),
        image_urls: imgs.map((i: any) => i.image_url).filter(Boolean),
        context: (context || '').toLowerCase(),
        saved: true,
      })
      // Spara båda looken som outfits …
      await supabase.from('outfits').insert([mk(`${tr?.fromLabel} (dag)`, dtnResult.dayImages, tr?.fromLabel || '')])
      const { data: evng, error } = await supabase.from('outfits')
        .insert([mk(`${tr?.fromLabel} → ${tr?.toLabel}`, dtnResult.eveningImages, tr?.toLabel || '')])
        .select('id').single()
      if (error) throw error
      // … och lägg kvällslooken (festen) på valt datum i kalendern.
      const { error: calErr } = await supabase.from('outfit_calendar').upsert(
        { user_id: user.id, outfit_id: evng.id, date: dateStr },
        { onConflict: 'user_id,date' })
      if (calErr) throw calErr
      setDtnShowDates(false)
      toast('Sparat!', `Kvällslooken ligger på ${dtnDateLabel(dateStr).toLowerCase()}. Båda looken finns i Outfits.`)
    } catch (e: any) {
      showAlert('Kunde inte spara', e.message || 'Försök igen.')
    } finally {
      setDtnSaving(false)
    }
  }

  async function analyzeCouple() {
    if (!inspoBase64) { showAlert('Välj en inspirationsbild först!'); return }
    if (!partner) return
    setCoupleLoading(true); setCoupleResult(null); setCoupleSaved(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [mine, theirs] = await Promise.all([
        supabase.from('garments').select('id, name, category, subcategory, color, archived, for_sale, image_url').eq('user_id', user!.id),
        supabase.rpc('partner_garments', { target: partner.id }),
      ])
      const myG = (mine.data || []).filter((g: any) => !g.archived && !g.for_sale)
      const parG = (theirs.data || []).filter((g: any) => !g.archived && !g.for_sale)
      if (myG.length === 0 || parG.length === 0) {
        showAlert('För få plagg', 'Ni behöver båda ha plagg i garderoben.')
        return
      }
      const parsed = await apiPost('/api/analyze-inspo-couple', {
        base64: inspoBase64,
        nameA: myName, nameB: partner.name,
        genderA: myGender, genderB: partnerGender,
        listA: buildGarmentList(myG), listB: buildGarmentList(parG),
      })
      const results = (parsed.results || []).map((r: any, idx: number) => ({
        ...r,
        itemsWithImages: matchItemsToPool(r.items || [], idx === 0 ? myG : parG),
      }))
      setCoupleResult({ results })
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setCoupleLoading(false)
    }
  }

  async function saveCouple() {
    if (!coupleResult || !partner) return
    setCoupleSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const mineR = coupleResult.results[0]
      const parR = coupleResult.results[1]
      if (mineR) {
        const { error } = await supabase.from('outfits').insert([{
          user_id: user!.id,
          name: mineR.outfitName,
          garment_ids: mineR.itemsWithImages.map((i: any) => i.id).filter(Boolean),
          garment_names: mineR.itemsWithImages.map((i: any) => i.name),
          image_urls: mineR.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
          saved: true,
        }])
        if (error) throw error
      }
      if (parR) {
        const { error } = await supabase.rpc('save_partner_outfit', {
          target: partner.id,
          p_name: parR.outfitName,
          p_garment_names: parR.itemsWithImages.map((i: any) => i.name),
          p_image_urls: parR.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
        })
        if (error) throw error
      }
      setCoupleSaved(true)
      showAlert('Sparat!', `Outfiten finns nu i både ditt och ${partner.name}s konto.`)
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setCoupleSaving(false)
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
          {(['analys', 'moodboard', 'dagtillfest'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'analys' ? 'AI-analys' : tab === 'moodboard' ? 'Moodboard' : 'Dag till fest'}
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

            {partner && (
              <TouchableOpacity
                style={[styles.coupleMatchBtn, (!inspoBase64 || coupleLoading) && styles.analyzeButtonDisabled]}
                onPress={analyzeCouple}
                disabled={coupleLoading || loading || !inspoBase64}
              >
                <Text style={styles.coupleMatchBtnText}>
                  {coupleLoading ? 'Analyserar paret...' : `Matcha mot min och ${partner.name}s garderob`}
                </Text>
              </TouchableOpacity>
            )}

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

            {/* Par-resultat (två personer, en per garderob) */}
            {coupleResult && (
              <View style={styles.resultCard}>
                {coupleResult.results.map((r: any, ri: number) => (
                  <View key={ri} style={styles.couplePerson}>
                    <Text style={styles.couplePersonName}>{r.person || (ri === 0 ? myName : partner?.name)}</Text>
                    {!!r.styleDescription && <Text style={styles.styleDescription}>{r.styleDescription}</Text>}
                    <Text style={styles.outfitName}>{r.outfitName}</Text>
                    <View style={styles.outfitItems}>
                      {r.itemsWithImages.map((item: any, index: number) => (
                        <View key={index} style={styles.outfitItem}>
                          {item.image_url
                            ? <SignedImage path={item.image_url} style={styles.outfitItemImage} />
                            : <View style={styles.outfitItemEmptyBox} />}
                          <Text style={styles.outfitItemName}>{item.name}</Text>
                        </View>
                      ))}
                    </View>
                    {(r.missing || []).length > 0 && (
                      <Text style={styles.coupleMissing}>Saknas: {r.missing.join(', ')}</Text>
                    )}
                    {!!r.tip && <View style={styles.tipCard}><Text style={styles.tipText}>{r.tip}</Text></View>}
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.saveInspoBtn, coupleSaved && styles.saveInspoBtnDone]}
                  onPress={saveCouple}
                  disabled={coupleSaving || coupleSaved}
                >
                  <Text style={styles.saveInspoBtnText}>
                    {coupleSaving ? '...' : coupleSaved ? '✓ Sparad i båda konton' : 'Spara båda outfits'}
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

        {activeTab === 'dagtillfest' && (
          <>
            <Text style={styles.dtnIntro}>Samma outfit – från dag till kväll. Välj en förvandling så visar jag vilka få plagg du byter ut.</Text>
            <View style={styles.dtnChips}>
              {DTN_TRANSITIONS.map(tr => (
                <TouchableOpacity
                  key={tr.key}
                  style={[styles.dtnChip, dtnKey === tr.key && styles.dtnChipActive]}
                  onPress={() => runDayToNight(tr, { vary: dtnKey === tr.key })}
                  disabled={dtnLoading}
                >
                  <Text style={[styles.dtnChipText, dtnKey === tr.key && styles.dtnChipTextActive]}>{tr.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dtnLoading && <ActivityIndicator color={t.primary} style={{ marginTop: 32 }} />}

            {dtnResult && !dtnLoading && (
              <>
                {/* DAG */}
                <Text style={styles.dtnHeading}>DAG</Text>
                <Text style={styles.outfitName}>{dtnResult.dayName}</Text>
                <View style={styles.outfitItems}>
                  {dtnResult.dayImages.map((item: any, i: number) => (
                    <View key={`d${i}`} style={styles.outfitItem}>
                      {item.image_url ? <SignedImage path={item.image_url} style={styles.outfitItemImage} /> : <View style={styles.outfitItemEmptyBox} />}
                      <Text style={styles.outfitItemName}>{item.name}</Text>
                    </View>
                  ))}
                </View>

                {/* BYT UT */}
                <Text style={styles.dtnHeading}>BYT UT</Text>
                {dtnResult.swapImages.map((s: any, i: number) => (
                  <View key={`s${i}`} style={styles.swapRow}>
                    <View style={styles.swapItem}>
                      {s.out?.image_url ? <SignedImage path={s.out.image_url} style={styles.swapImage} /> : <View style={styles.swapImageEmpty} />}
                      <Text style={styles.swapName} numberOfLines={1}>{s.out?.name}</Text>
                    </View>
                    <Text style={styles.swapArrow}>→</Text>
                    <View style={styles.swapItem}>
                      {s.in?.image_url ? <SignedImage path={s.in.image_url} style={styles.swapImage} /> : <View style={styles.swapImageEmpty} />}
                      <Text style={styles.swapName} numberOfLines={1}>{s.in?.name}</Text>
                    </View>
                  </View>
                ))}
                {dtnResult.keep?.length > 0 && (
                  <Text style={styles.dtnKeep}>Behåll: {dtnResult.keep.join(' · ')}</Text>
                )}

                {/* KVÄLL */}
                <Text style={styles.dtnHeading}>KVÄLL</Text>
                <Text style={styles.outfitName}>{dtnResult.eveningName}</Text>
                <View style={styles.outfitItems}>
                  {dtnResult.eveningImages.map((item: any, i: number) => (
                    <View key={`e${i}`} style={styles.outfitItem}>
                      {item.image_url ? <SignedImage path={item.image_url} style={styles.outfitItemImage} /> : <View style={styles.outfitItemEmptyBox} />}
                      <Text style={styles.outfitItemName}>{item.name}</Text>
                    </View>
                  ))}
                </View>

                {dtnResult.tip ? (
                  <View style={styles.dtnTipBox}><Text style={styles.dtnTipText}>{dtnResult.tip}</Text></View>
                ) : null}

                <TouchableOpacity
                  style={styles.dtnShuffle}
                  onPress={() => { const tr = DTN_TRANSITIONS.find(x => x.key === dtnKey); if (tr) runDayToNight(tr, { vary: true }) }}
                  disabled={dtnLoading}
                >
                  <Text style={styles.dtnShuffleText}>🔀 Blanda om</Text>
                </TouchableOpacity>

                <View style={styles.dtnActions}>
                  <TouchableOpacity style={styles.dtnActionBtn} onPress={shareDayToNight} disabled={dtnSharing}>
                    <Text style={styles.dtnActionText}>{dtnSharing ? 'Delar…' : 'Dela'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dtnActionBtn, styles.dtnActionBtnPrimary]} onPress={() => setDtnShowDates(v => !v)}>
                    <Text style={[styles.dtnActionText, styles.dtnActionTextPrimary]}>Spara till kalender</Text>
                  </TouchableOpacity>
                </View>

                {dtnShowDates && (
                  <>
                    <Text style={styles.dtnKeep}>Välj dag:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dtnDateChips}>
                      {dtnNextDates(14).map(d => (
                        <TouchableOpacity key={d} style={styles.dtnDateChip} disabled={dtnSaving} onPress={() => saveDayToNightToCalendar(d)}>
                          <Text style={styles.dtnDateChipText}>{dtnDateLabel(d)}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Dold dela-vy som fångas som bild */}
      {dtnShareTarget && (
        <View style={styles.hiddenShare} pointerEvents="none">
          <View ref={dtnShareRef} collapsable={false}>
            <DayToNightShareCard {...dtnShareTarget} />
          </View>
        </View>
      )}
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
  coupleMatchBtn: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border, marginTop: -8, marginBottom: 20 },
  coupleMatchBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  couplePerson: { gap: 12, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  couplePersonName: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary },
  coupleMissing: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
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

  dtnIntro: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 16 },
  dtnChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dtnChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  dtnChipActive: { backgroundColor: t.primary, borderColor: t.primary },
  dtnChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  dtnChipTextActive: { color: t.onPrimary },
  dtnHeading: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: t.textSecondary, letterSpacing: 2, marginTop: 24, marginBottom: 4 },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: t.border },
  swapItem: { flex: 1, alignItems: 'center', gap: 4 },
  swapImage: { width: 56, height: 56, borderRadius: 10 },
  swapImageEmpty: { width: 56, height: 56, borderRadius: 10, backgroundColor: t.surface },
  swapName: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textPrimary, textAlign: 'center' },
  swapArrow: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.primary },
  dtnKeep: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', marginTop: 4 },
  dtnTipBox: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border, marginTop: 20 },
  dtnTipText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textPrimary, lineHeight: 21 },
  dtnShuffle: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, marginTop: 20 },
  dtnShuffleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary },
  dtnActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dtnActionBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  dtnActionBtnPrimary: { backgroundColor: t.primary, borderColor: t.primary },
  dtnActionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  dtnActionTextPrimary: { color: t.onPrimary },
  dtnDateChips: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  dtnDateChip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  dtnDateChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary },
  hiddenShare: { position: 'absolute', left: -9999, top: 0 },
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