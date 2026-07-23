import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../components/BottomNav'
import AddGarmentChooser from '../components/AddGarmentChooser'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'
import { apiPost } from '../utils/api'
import { newImageId } from '../utils/id'
import { cacheGet, cacheSet } from '../utils/cache'
import { pickImageSmart } from '../utils/imagePicker'
import { ARCHIVE_REASONS, reasonFor } from '../utils/archiveReasons'
import { parsePrice } from '../utils/brands'
import { useSettings } from '../utils/settings'
import { CATEGORIES as CATEGORY_LIST, COLOR_HEX, COLOR_NAMES, COLOR_OPTIONS, SEASONS as SEASON_LIST, SUBCATEGORIES } from '../utils/constants'

const CATEGORIES = ['Alla', ...CATEGORY_LIST]
const WISH_CATEGORIES = CATEGORY_LIST
const SEASONS = ['Alla', ...SEASON_LIST]
const WISH_SEASONS = SEASON_LIST
const COLORS = ['Alla', ...COLOR_NAMES]

const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'recent', label: 'Senast tillagd' },
  { key: 'name', label: 'A–Ö' },
  { key: 'most', label: 'Mest använd' },
  { key: 'least', label: 'Minst använd' },
  { key: 'color', label: 'Färg' },
]
const SORT_LABEL: Record<string, string> = Object.fromEntries(SORT_OPTIONS.map(s => [s.key, s.label]))
// Färgordning för sortering på färg (mörkt → ljust → kulörer)
// Samma ordning som färgfiltret / Lägg till plagg (utan "Alla").
const COLOR_ORDER = COLORS.slice(1)

export default function Wardrobe() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { formatPrice, currency } = useSettings()
  // Seedas från cachen så garderoben ritas direkt vid flikbyte, medan en
  // uppdatering hämtas i bakgrunden.
  const [garments, setGarments] = useState<any[]>(() => cacheGet('wardrobe.garments') ?? [])
  const [forSale, setForSale] = useState<any[]>(() => cacheGet('wardrobe.forSale') ?? [])
  const [archived, setArchived] = useState<any[]>(() => cacheGet('wardrobe.archived') ?? [])
  const [wishlist, setWishlist] = useState<any[]>(() => cacheGet('wardrobe.wishlist') ?? [])
  const [outfitCounts, setOutfitCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Alla')
  const [activeSeason, setActiveSeason] = useState('Alla')
  const [activeColor, setActiveColor] = useState('Alla')
  const [activeType, setActiveType] = useState('Alla')
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('nuvarande')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [sortBy, setSortBy] = useState('recent')
  const [showArchive, setShowArchive] = useState(false)
  const [showArchiveHint, setShowArchiveHint] = useState(false)
  // Arkivets egna filter/sortering
  const [archCat, setArchCat] = useState('Alla')
  const [archType, setArchType] = useState('Alla')
  const [archColor, setArchColor] = useState('Alla')
  const [archSeason, setArchSeason] = useState('Alla')
  const [archPlace, setArchPlace] = useState('Alla')
  const [archReason, setArchReason] = useState('Alla')
  const [archSort, setArchSort] = useState('recent')
  const [archDropdown, setArchDropdown] = useState<string | null>(null)

  // Capsule
  const [capsuleGenerated, setCapsuleGenerated] = useState(false)
  const [generatingCapsule, setGeneratingCapsule] = useState(false)
  const [capsuleSelected, setCapsuleSelected] = useState<Set<string>>(new Set())
  const [showOutfitList, setShowOutfitList] = useState(false)
  const [capsuleSaved, setCapsuleSaved] = useState(false)

  // Wishlist modal
  const [showAddWish, setShowAddWish] = useState(false)
  const [wishName, setWishName] = useState('')
  const [wishBrand, setWishBrand] = useState('')
  const [wishPrice, setWishPrice] = useState('')
  const [wishCategory, setWishCategory] = useState('')
  const [wishSubcategory, setWishSubcategory] = useState('')
  const [wishColor, setWishColor] = useState('')
  const [wishSeasons, setWishSeasons] = useState<string[]>([])
  const [wishImage, setWishImage] = useState<string | null>(null)
  const [savingWish, setSavingWish] = useState(false)
  const [showAddChooser, setShowAddChooser] = useState(false)
  const [showWishChooser, setShowWishChooser] = useState(false)
  const [showWishUrl, setShowWishUrl] = useState(false)
  const [wishUrl, setWishUrl] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)

  // Sale modal
  const [showAddSale, setShowAddSale] = useState(false)
  const [saleSearch, setSaleSearch] = useState('')
  const [saleGarments, setSaleGarments] = useState<any[]>([])

  useFocusEffect(
    useCallback(() => {
      fetchGarments()
      fetchWishlist()
      loadCapsule()
    }, [])
  )

  async function fetchGarments() {
    const { data } = await supabase.from('garments').select('*')
    if (data) {
      // Garderoben visar bara plagg som varken är arkiverade eller till salu,
      // så ett plagg försvinner ur garderoben när det läggs på säljlistan.
      // Till salu: alla plagg som är till salu (även arkiverade). Arkivet visar
      // bara arkiverade plagg som INTE är till salu, så inget hamnar dubbelt.
      const active = data.filter(g => !g.archived && !g.for_sale)
      const sale = data.filter(g => g.for_sale)
      const arch = data.filter(g => g.archived && !g.for_sale)
      setGarments(active); cacheSet('wardrobe.garments', active)
      setForSale(sale); cacheSet('wardrobe.forSale', sale)
      setArchived(arch); cacheSet('wardrobe.archived', arch)
      // Plagg som kan läggas till salu = garderobens aktiva plagg.
      setSaleGarments(active)
    }
  }

  async function fetchWishlist() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
    if (data) {
      setWishlist(data); cacheSet('wardrobe.wishlist', data)
      fetchOutfitCounts(data)
    }
  }

  async function loadCapsule() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('capsule_garment_ids').eq('id', user.id).single()
    if (data?.capsule_garment_ids) {
      const ids = data.capsule_garment_ids.split(',').filter(Boolean)
      if (ids.length > 0) {
        setCapsuleSelected(new Set(ids))
        setCapsuleGenerated(true)
        setCapsuleSaved(true)
      }
    }
  }

  async function saveCapsule(ids: Set<string>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, capsule_garment_ids: [...ids].join(',') })
    setCapsuleSaved(true)
  }

  async function fetchOutfitCounts(items: any[]) {
    const { data: outfits } = await supabase.from('outfits').select('garment_names')
    if (!outfits) return
    const counts: Record<string, number> = {}
    items.forEach(wishItem => {
      counts[wishItem.id] = outfits.filter(o => {
        const names: string[] = o.garment_names || []
        return names.some(n =>
          n.toLowerCase().includes(wishItem.name.toLowerCase()) ||
          wishItem.name.toLowerCase().includes(n.toLowerCase())
        )
      }).length
    })
    setOutfitCounts(counts)
  }

  // --- Wishlist image ---
  async function pickWishImage() {
    const result = await pickImageSmart({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled) setWishImage(result.assets[0].uri)
  }

  async function uploadWishImage(uri: string) {
    const filename = `${newImageId()}.jpg`
    const filePath = `public/${filename}`
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const { error } = await supabase.storage.from('garments').upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  // Hämtar produktinfo från en länk och förifyller köp-formuläret.
  async function parseWishUrl() {
    const url = wishUrl.trim()
    if (!url) return
    setFetchingUrl(true)
    try {
      const data = await apiPost('/api/parse-url', { url })
      if (data.error) throw new Error(data.error)
      setWishName(data.name || '')
      setWishImage(data.imageUrl || null)
      setShowWishUrl(false)
      setShowWishChooser(false)
      setWishUrl('')
      setShowAddWish(true)
    } catch (e: any) {
      showAlert('Kunde inte hämta länken', e.message || 'Försök med en annan länk.')
    } finally {
      setFetchingUrl(false)
    }
  }

  async function addWishItem() {
    if (!wishName.trim()) { showAlert('Fyll i ett namn!'); return }
    setSavingWish(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let imageUrl: string | null = null
      if (wishImage) {
        try { imageUrl = await uploadWishImage(wishImage) }
        catch { imageUrl = /^https?:\/\//.test(wishImage) ? wishImage : null }
      }
      const { error } = await supabase.from('wishlist').insert([{
        user_id: user.id,
        name: wishName.trim(),
        brand: wishBrand.trim() || null,
        price: parsePrice(wishPrice),
        category: wishCategory || null,
        subcategory: wishSubcategory || null,
        color: wishColor || null,
        season: wishSeasons.join(', ') || null,
        image_url: imageUrl,
        sort_order: wishlist.length,
      }])
      if (error) throw error
      closeWishModal()
      fetchWishlist()
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
    } finally {
      setSavingWish(false)
    }
  }

  function closeWishModal() {
    setShowAddWish(false)
    setWishName(''); setWishBrand(''); setWishPrice(''); setWishCategory(''); setWishSubcategory(''); setWishColor(''); setWishSeasons([]); setWishImage(null)
  }

  // --- Sale ---
  async function addToSale(item: any) {
    await supabase.from('garments').update({ for_sale: true }).eq('id', item.id)
    showAlert(`${item.name} är nu till salu!`)
    setShowAddSale(false)
    setSaleSearch('')
    fetchGarments()
  }

  const filteredSaleGarments = (saleSearch.trim()
    ? saleGarments.filter(g => g.name.toLowerCase().includes(saleSearch.toLowerCase()))
    : saleGarments
  ).sort((a, b) => (a.times_worn || 0) - (b.times_worn || 0))

  // --- Wardrobe filters ---
  // Härleds från garderoben + aktiva filter så att listan alltid speglar
  // både senaste datan (efter ändringar/omhämtning) och valda filter.
  const filtered = useMemo(() => {
    let result = garments
    if (activeCategory !== 'Alla') result = result.filter(g => g.category === activeCategory)
    if (activeSeason !== 'Alla') result = result.filter(g => g.season?.includes(activeSeason))
    if (activeColor !== 'Alla') result = result.filter(g => g.color === activeColor)
    if (activeType !== 'Alla') result = result.filter(g => g.subcategory === activeType)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) || g.color?.toLowerCase().includes(q)
      )
    }
    // Sortering (kopiera först så vi inte muterar garments)
    const sorted = [...result]
    switch (sortBy) {
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name, 'sv')); break
      case 'most': sorted.sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0)); break
      case 'least': sorted.sort((a, b) => (a.times_worn || 0) - (b.times_worn || 0)); break
      case 'color': sorted.sort((a, b) => {
        const ai = COLOR_ORDER.indexOf(a.color), bi = COLOR_ORDER.indexOf(b.color)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      }); break
      default: sorted.sort((a, b) => // recent
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }
    return sorted
  }, [garments, activeCategory, activeSeason, activeColor, activeType, search, sortBy])

  // Typ-alternativ (subkategorier) som faktiskt finns i garderoben, för filtret.
  const typeOptions = useMemo(() => {
    const set = new Set<string>()
    garments.forEach(g => { if (g.subcategory) set.add(g.subcategory) })
    return ['Alla', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'sv'))]
  }, [garments])

  // Arkivets typ- och platsalternativ (utifrån vad som faktiskt finns i arkivet).
  const archTypeOptions = useMemo(() =>
    ['Alla', ...Array.from(new Set(archived.map(g => g.subcategory).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))],
    [archived])
  const archPlaceOptions = useMemo(() =>
    ['Alla', ...Array.from(new Set(archived.map(g => g.location).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))],
    [archived])

  const filteredArchive = useMemo(() => {
    let r = archived
    if (archCat !== 'Alla') r = r.filter(g => g.category === archCat)
    if (archType !== 'Alla') r = r.filter(g => g.subcategory === archType)
    if (archColor !== 'Alla') r = r.filter(g => g.color === archColor)
    if (archSeason !== 'Alla') r = r.filter(g => g.season?.includes(archSeason))
    if (archPlace !== 'Alla') r = r.filter(g => g.location === archPlace)
    if (archReason !== 'Alla') r = r.filter(g => (g.archive_reason || '') === archReason)
    const sorted = [...r]
    switch (archSort) {
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name, 'sv')); break
      case 'most': sorted.sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0)); break
      case 'least': sorted.sort((a, b) => (a.times_worn || 0) - (b.times_worn || 0)); break
      case 'color': sorted.sort((a, b) => {
        const ai = COLOR_ORDER.indexOf(a.color), bi = COLOR_ORDER.indexOf(b.color)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      }); break
      default: sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }
    return sorted
  }, [archived, archCat, archType, archColor, archSeason, archPlace, archReason, archSort])

  const archHasFilters = archCat !== 'Alla' || archType !== 'Alla' || archColor !== 'Alla' || archSeason !== 'Alla' || archPlace !== 'Alla' || archReason !== 'Alla'
  function clearArchiveFilters() {
    setArchCat('Alla'); setArchType('Alla'); setArchColor('Alla'); setArchSeason('Alla'); setArchPlace('Alla'); setArchReason('Alla'); setArchSort('recent'); setArchDropdown(null)
  }

  function handleSearch(text: string) { setSearch(text) }
  function handleCategory(cat: string) { setActiveCategory(cat); setOpenDropdown(null) }
  function handleSeason(s: string) { setActiveSeason(s); setOpenDropdown(null) }
  function handleColor(c: string) { setActiveColor(c); setOpenDropdown(null) }
  function handleType(ty: string) { setActiveType(ty); setOpenDropdown(null) }
  function handleSort(key: string) { setSortBy(key); setOpenDropdown(null) }
  function clearFilters() {
    setActiveCategory('Alla'); setActiveSeason('Alla'); setActiveColor('Alla'); setActiveType('Alla')
    setSearch(''); setSortBy('recent'); setShowSearch(false); setOpenDropdown(null)
  }

  // Kom ihåg sortering och filter mellan besök tills något annat väljs.
  const PREFS_KEY = 'kladkollen_wardrobe_prefs'
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(raw => {
      if (raw) {
        try {
          const p = JSON.parse(raw)
          if (p.sortBy) setSortBy(p.sortBy)
          if (p.activeCategory) setActiveCategory(p.activeCategory)
          if (p.activeColor) setActiveColor(p.activeColor)
          if (p.activeSeason) setActiveSeason(p.activeSeason)
          if (p.activeType) setActiveType(p.activeType)
        } catch { /* strunt i det */ }
      }
      setPrefsLoaded(true)
    })
  }, [])
  useEffect(() => {
    if (!prefsLoaded) return
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ sortBy, activeCategory, activeColor, activeSeason, activeType }))
  }, [prefsLoaded, sortBy, activeCategory, activeColor, activeSeason, activeType])

  async function markAsSold(item: any) {
    showConfirm('Markera som såld', `Är "${item.name}" såld?`, async () => {
      await supabase.from('garments').update({ sold: true, archived: true, for_sale: false }).eq('id', item.id)
      fetchGarments()
      showAlert('Sålt!', `${item.name} har arkiverats.`)
    }, 'Ja, arkivera', true)
  }

  // Tar bort ur säljlistan. Plagget återgår automatiskt dit det hörde hemma:
  // arkivet om det är arkiverat, annars garderoben.
  async function removeFromSale(item: any) {
    await supabase.from('garments').update({ for_sale: false }).eq('id', item.id)
    fetchGarments()
  }

  async function unarchive(item: any) {
    await supabase.from('garments').update({ archived: false, sold: false }).eq('id', item.id)
    fetchGarments()
    showAlert('Välkommen tillbaka!', `${item.name} är nu i garderoben igen.`)
  }

  // Lägger ett arkiverat plagg till salu men behåller arkiv-statusen, så det
  // återgår till arkivet när det tas bort ur säljlistan.
  async function sellFromArchive(item: any) {
    await supabase.from('garments').update({ for_sale: true, sold: false }).eq('id', item.id)
    fetchGarments()
    showAlert('Lagt till salu!', `${item.name} finns nu på säljlistan.`)
  }

  async function moveWishItem(index: number, direction: 'up' | 'down') {
    const newList = [...wishlist]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newList.length) return
    ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]
    setWishlist([...newList])
    await Promise.all(newList.map((item, i) =>
      supabase.from('wishlist').update({ sort_order: i }).eq('id', item.id)
    ))
  }

  async function deleteWishItem(item: any) {
    showConfirm('Ta bort', `Ta bort "${item.name}" från köplistan?`, async () => {
      await supabase.from('wishlist').delete().eq('id', item.id)
      fetchWishlist()
    }, 'Ta bort', true)
  }

  // Markera som köpt: skapa ett plagg i garderoben och ta bort från köplistan.
  async function markWishBought(item: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('garments').insert([{
      user_id: user.id,
      name: item.name,
      category: item.category || '',
      color: item.color || '',
      season: item.season || 'Alla årstider',
      image_url: item.image_url || null,
    }])
    await supabase.from('wishlist').delete().eq('id', item.id)
    fetchGarments()
    fetchWishlist()
    showAlert('Grattis!', `${item.name} finns nu i garderoben.`)
  }

  const hasActiveFilters = activeCategory !== 'Alla' || activeSeason !== 'Alla' || activeColor !== 'Alla' || activeType !== 'Alla' || search !== ''

  function generateCapsule() {
    if (garments.length === 0) { showAlert('Garderoben är tom', 'Lägg till plagg först!'); return }
    setGeneratingCapsule(true)

    const NEUTRAL_COLORS = ['Svart', 'Vit', 'Grå', 'Beige', 'Brun']
    const MAX_PER_CAT: Record<string, number> = {
      'Ytterkläder': 2, 'Kavajer': 1, 'Tröjor': 3, 'Toppar': 3,
      'Byxor': 2, 'Klänningar': 2, 'Kjolar': 1, 'Skor': 2,
      'Väskor': 1, 'Accessoarer': 2,
    }

    const scored = garments.map((g: any) => {
      let score = 0
      if (NEUTRAL_COLORS.includes(g.color)) score += 3
      score += Math.min((g.times_worn || 0) * 0.5, 5)
      if (!g.for_sale) score += 1
      return { ...g, score }
    })
    scored.sort((a: any, b: any) => b.score - a.score)

    const result: any[] = []
    const catCounts: Record<string, number> = {}
    for (const g of scored) {
      const max = MAX_PER_CAT[g.category] ?? 1
      const current = catCounts[g.category] ?? 0
      if (current < max && result.length < 15) {
        result.push(g)
        catCounts[g.category] = current + 1
      }
    }

    const selected = new Set(result.map((g: any) => g.id))
    setCapsuleSelected(selected)
    setCapsuleGenerated(true)
    setGeneratingCapsule(false)
    saveCapsule(selected)
  }

  function toggleCapsuleItem(id: string) {
    setCapsuleSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveCapsule(next)
      return next
    })
  }

  function calcOutfits(ids: Set<string>): number {
    return getOutfitCombinations(ids).length
  }

  function getOutfitCombinations(ids: Set<string>): any[][] {
    const sel = garments.filter((g: any) => ids.has(g.id))
    const tops = sel.filter((g: any) => ['Toppar', 'Tröjor', 'Kavajer'].includes(g.category))
    const bottoms = sel.filter((g: any) => ['Byxor', 'Kjolar'].includes(g.category))
    const dresses = sel.filter((g: any) => g.category === 'Klänningar')
    const outers = sel.filter((g: any) => g.category === 'Ytterkläder')

    const combos: any[][] = []

    for (const top of tops) {
      for (const bottom of bottoms) {
        combos.push([top, bottom])
        for (const outer of outers) {
          combos.push([top, bottom, outer])
        }
      }
    }
    for (const dress of dresses) {
      combos.push([dress])
      for (const outer of outers) {
        combos.push([dress, outer])
      }
    }

    return combos
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Garderob: välj hur man lägger till plagg (delad valruta med hemskärmen) */}
      <AddGarmentChooser visible={showAddChooser} onClose={() => setShowAddChooser(false)} />

      {/* Köp: välj hur man lägger till */}
      <Modal visible={showWishChooser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lägg till på köplistan</Text>
              <TouchableOpacity onPress={() => setShowWishChooser(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.wishChoiceBtn} onPress={() => { setShowWishChooser(false); closeWishModal(); setShowAddWish(true) }}>
              <Text style={styles.wishChoiceTitle}>Välj foto</Text>
              <Text style={styles.wishChoiceHint}>Ta eller välj en bild och fyll i detaljerna själv</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wishChoiceBtn} onPress={() => { setShowWishChooser(false); router.push('/import-purchases?target=wishlist') }}>
              <Text style={styles.wishChoiceTitle}>Importera via butiker</Text>
              <Text style={styles.wishChoiceHint}>Bläddra i en butik och lägg köpta/önskade plagg på köplistan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wishChoiceBtn} onPress={() => { setShowWishChooser(false); setShowWishUrl(true) }}>
              <Text style={styles.wishChoiceTitle}>Via URL</Text>
              <Text style={styles.wishChoiceHint}>Klistra in en produktlänk – namn och bild hämtas automatiskt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Köp: lägg till via URL */}
      <Modal visible={showWishUrl} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lägg till via URL</Text>
              <TouchableOpacity onPress={() => { setShowWishUrl(false); setWishUrl('') }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Produktlänk</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://..."
              placeholderTextColor={t.placeholder}
              value={wishUrl}
              onChangeText={setWishUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity style={[styles.modalSaveBtn, (!wishUrl.trim() || fetchingUrl) && { opacity: 0.5 }]} onPress={parseWishUrl} disabled={!wishUrl.trim() || fetchingUrl}>
              <Text style={styles.modalSaveBtnText}>{fetchingUrl ? 'Hämtar...' : 'Hämta produkt'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add wishlist modal */}
      <Modal visible={showAddWish} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lägg till på köplistan</Text>
              <TouchableOpacity
                onPress={closeWishModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Stäng"
                accessibilityRole="button"
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Bildväljare */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickWishImage}>
                {wishImage ? (
                  <SignedImage path={wishImage} style={styles.imagePickerPreview} />
                ) : (
                  <View style={styles.imagePickerInner}>
                    <Text style={styles.imagePickerText}>Lägg till bild (valfritt)</Text>
                  </View>
                )}
                {wishImage && (
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText}>Byt foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Namn *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="t.ex. Svart kappa"
                placeholderTextColor={t.placeholder}
                value={wishName}
                onChangeText={setWishName}
              />

              <Text style={styles.modalLabel}>Märke</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="t.ex. Arket"
                placeholderTextColor={t.placeholder}
                value={wishBrand}
                onChangeText={setWishBrand}
              />

              <Text style={styles.modalLabel}>Kategori</Text>
              <View style={styles.pillsWrap}>
                {WISH_CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.pill, wishCategory === c && styles.pillActive]} onPress={() => { setWishCategory(wishCategory === c ? '' : c); setWishSubcategory('') }}>
                    <Text style={[styles.pillText, wishCategory === c && styles.pillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {wishCategory && SUBCATEGORIES[wishCategory] && (
                <>
                  <Text style={styles.modalLabel}>Typ</Text>
                  <View style={styles.pillsWrap}>
                    {SUBCATEGORIES[wishCategory].map(sub => (
                      <TouchableOpacity key={sub} style={[styles.pill, wishSubcategory === sub && styles.pillActive]} onPress={() => setWishSubcategory(wishSubcategory === sub ? '' : sub)}>
                        <Text style={[styles.pillText, wishSubcategory === sub && styles.pillTextActive]}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.modalLabel}>Färg</Text>
              <View style={styles.wishSwatchGrid}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity key={c.name} style={[styles.wishSwatch, { backgroundColor: c.hex }, wishColor === c.name && styles.wishSwatchActive]} onPress={() => setWishColor(wishColor === c.name ? '' : c.name)}>
                    {wishColor === c.name && <Text style={styles.wishSwatchCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              {wishColor ? <Text style={styles.wishSwatchSelected}>Vald färg: {wishColor}</Text> : null}

              <Text style={styles.modalLabel}>Säsong</Text>
              <View style={styles.pillsWrap}>
                {WISH_SEASONS.map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, wishSeasons.includes(s) && styles.pillActive]} onPress={() => setWishSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>
                    <Text style={[styles.pillText, wishSeasons.includes(s) && styles.pillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Pris ({currency})</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="t.ex. 299"
                placeholderTextColor={t.placeholder}
                value={wishPrice}
                onChangeText={setWishPrice}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.modalSaveBtn} onPress={addWishItem} disabled={savingWish}>
                <Text style={styles.modalSaveBtnText}>{savingWish ? 'Sparar...' : 'Lägg till'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add to sale modal */}
      <Modal visible={showAddSale} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lägg till till salu</Text>
              <TouchableOpacity
                onPress={() => { setShowAddSale(false); setSaleSearch('') }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Stäng"
                accessibilityRole="button"
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Sök plagg..."
              placeholderTextColor={t.placeholder}
              value={saleSearch}
              onChangeText={setSaleSearch}
            />
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {filteredSaleGarments.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabText}>Inga plagg att lägga till</Text>
                  <Text style={styles.emptyTabHint}>Alla plagg är redan till salu eller garderoben är tom</Text>
                </View>
              ) : (
                filteredSaleGarments.map((item: any) => (
                  <TouchableOpacity key={item.id} style={styles.salePickerItem} onPress={() => addToSale(item)}>
                    {item.image_url
                      ? <SignedImage path={item.image_url} style={styles.salePickerImage} />
                      : <View style={styles.salePickerImageEmpty} />
                    }
                    <View style={styles.salePickerInfo}>
                      <Text style={styles.salePickerName}>{item.name}</Text>
                      <Text style={styles.salePickerCategory}>{item.category}{item.color ? ` · ${item.color}` : ''}</Text>
                      <Text style={styles.salePickerStat}>Använd {item.times_worn || 0} gånger</Text>
                      <Text style={styles.salePickerStat}>
                        {item.last_worn ? `Senast använd: ${new Date(item.last_worn).toLocaleDateString('sv-SE')}` : 'Aldrig använd'}
                      </Text>
                    </View>
                    <View style={styles.addSaleBtn}>
                      <Text style={styles.addSaleBtnText}>＋</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>Min garderob</Text>
        <View style={styles.headerButtons}>
          {activeTab === 'nuvarande' && (
            <TouchableOpacity
              style={[styles.iconBtn, showSearch && styles.iconBtnActive]}
              onPress={() => { setShowSearch(s => !s); if (showSearch) setSearch('') }}
              accessibilityLabel="Sök"
              accessibilityRole="button"
            >
              <MaterialIcons name="search" size={22} color={t.onPrimary} />
            </TouchableOpacity>
          )}
          {activeTab === 'nuvarande' && (
            <TouchableOpacity
              style={[styles.iconBtn, (showFilterPanel || hasActiveFilters) && styles.iconBtnActive]}
              onPress={() => { setShowFilterPanel(s => !s); setOpenDropdown(null) }}
              accessibilityLabel="Filter och sortering"
              accessibilityRole="button"
            >
              <MaterialIcons name="tune" size={20} color={t.onPrimary} />
            </TouchableOpacity>
          )}
          {(activeTab === 'nuvarande' || activeTab === 'sälj') && (
            <TouchableOpacity
              style={[styles.iconBtn, showArchive && styles.iconBtnActive]}
              onPress={() => setShowArchive(v => !v)}
              accessibilityLabel="Arkiv"
              accessibilityRole="button"
            >
              <MaterialIcons name="inventory-2" size={20} color={t.onPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabRow}>
        {[
          { id: 'nuvarande', label: `Garderob${garments.length > 0 ? ` (${garments.length})` : ''}` },
          { id: 'köp', label: `Köp${wishlist.length > 0 ? ` (${wishlist.length})` : ''}` },
          { id: 'sälj', label: `Sälj${forSale.length > 0 ? ` (${forSale.length})` : ''}` },
        ].map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, activeTab === id && styles.tabActive]}
            onPress={() => { setActiveTab(id); setShowArchive(false) }}
          >
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* NUVARANDE */}
      {activeTab === 'nuvarande' && !showArchive && (
        <>
          {showSearch && (
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={18} color={t.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Sök plagg eller färg..."
                placeholderTextColor={t.placeholder}
                value={search}
                onChangeText={handleSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showFilterPanel && (
          <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRowContent}>
            {[
              { key: 'sort', label: 'Sortera', value: SORT_LABEL[sortBy], on: sortBy !== 'recent' },
              { key: 'category', label: 'Kategori', value: activeCategory, on: activeCategory !== 'Alla' },
              { key: 'type', label: 'Typ', value: activeType, on: activeType !== 'Alla' },
              { key: 'color', label: 'Färg', value: activeColor, on: activeColor !== 'Alla' },
              { key: 'season', label: 'Säsong', value: activeSeason, on: activeSeason !== 'Alla' },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, (f.on || openDropdown === f.key) && styles.chipActive]}
                onPress={() => setOpenDropdown(openDropdown === f.key ? null : f.key)}
              >
                <Text style={[styles.chipText, (f.on || openDropdown === f.key) && styles.chipTextActive]}>
                  {f.key === 'sort' ? `${f.label}: ${f.value}` : (f.on ? f.value : f.label)} ▾
                </Text>
              </TouchableOpacity>
            ))}
            {(hasActiveFilters || sortBy !== 'recent') && (
              <TouchableOpacity style={styles.chipClear} onPress={clearFilters}>
                <Text style={styles.chipClearText}>Rensa</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {openDropdown && (
            <View style={styles.dropdown}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dropdownRow}>
                  {openDropdown === 'sort'
                    ? SORT_OPTIONS.map(opt => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.dropdownPill, sortBy === opt.key && styles.dropdownPillActive]}
                          onPress={() => handleSort(opt.key)}
                        >
                          <Text style={[styles.dropdownPillText, sortBy === opt.key && styles.dropdownPillTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))
                    : (openDropdown === 'category' ? CATEGORIES : openDropdown === 'type' ? typeOptions : openDropdown === 'season' ? SEASONS : COLORS).map(item => {
                        const isActive = openDropdown === 'category' ? activeCategory === item : openDropdown === 'type' ? activeType === item : openDropdown === 'season' ? activeSeason === item : activeColor === item
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dropdownPill, isActive && styles.dropdownPillActive]}
                            onPress={() => openDropdown === 'category' ? handleCategory(item) : openDropdown === 'type' ? handleType(item) : openDropdown === 'season' ? handleSeason(item) : handleColor(item)}
                          >
                            {openDropdown === 'color' && COLOR_HEX[item] && (
                              <View style={[styles.pillColorDot, { backgroundColor: COLOR_HEX[item] }]} />
                            )}
                            <Text style={[styles.dropdownPillText, isActive && styles.dropdownPillTextActive]}>{item}</Text>
                          </TouchableOpacity>
                        )
                      })}
                </View>
              </ScrollView>
            </View>
          )}
          </>
          )}
          <FlatList
            key="garments-grid"
            data={filtered}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            style={styles.flatList}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {hasActiveFilters ? 'Inga plagg hittades' : 'Din garderob är tom!\nLägg till ditt första plagg'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
                {item.image_url
                  ? <SignedImage path={item.image_url} style={styles.itemImage} />
                  : null
                }
                <Text style={styles.itemName}>{item.name}</Text>
                {item.brand ? <Text style={styles.itemBrand} numberOfLines={1}>{item.brand}</Text> : null}
                <Text style={styles.itemCategory} numberOfLines={1}>{item.subcategory || item.category}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {/* KÖP */}
      {activeTab === 'köp' && (
        <ScrollView contentContainerStyle={styles.wishScroll}>
          {wishlist.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>Köplistan är tom</Text>
              <Text style={styles.emptyTabHint}>Tryck ＋ för att lägga till plagg du drömmer om</Text>
            </View>
          ) : (
            <>
              <View style={styles.wishTotalCard}>
                <Text style={styles.wishTotalLabel}>Önskelistans värde</Text>
                <Text style={styles.wishTotalValue}>
                  {formatPrice(wishlist.reduce((s, w) => s + (Number(w.price) || 0), 0))}
                </Text>
              </View>
              <Text style={styles.wishHint}>Tryck ▲▼ för att prioritera · Klicka på ett plagg för att redigera</Text>
              {wishlist.map((item, index) => {
                const count = outfitCounts[item.id] || 0
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.wishItem}
                    onPress={() => router.push(`/garment-detail?wishlistId=${item.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reorderCol}>
                      <TouchableOpacity
                        style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                        onPress={() => moveWishItem(index, 'up')}
                        disabled={index === 0}
                        hitSlop={{ top: 10, bottom: 6, left: 10, right: 10 }}
                        accessibilityLabel="Flytta upp"
                        accessibilityRole="button"
                      >
                        <Text style={styles.arrowText}>▲</Text>
                      </TouchableOpacity>
                      <Text style={styles.dragDots}>⠿</Text>
                      <TouchableOpacity
                        style={[styles.arrowBtn, index === wishlist.length - 1 && styles.arrowBtnDisabled]}
                        onPress={() => moveWishItem(index, 'down')}
                        disabled={index === wishlist.length - 1}
                        hitSlop={{ top: 6, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Flytta ner"
                        accessibilityRole="button"
                      >
                        <Text style={styles.arrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityNum}>{index + 1}</Text>
                    </View>
                    {item.image_url
                      ? <SignedImage path={item.image_url} style={styles.wishImage} />
                      : <View style={styles.wishImageEmpty} />
                    }
                    <View style={styles.wishInfo}>
                      <Text style={styles.wishName}>{item.name}</Text>
                      {item.brand ? <Text style={styles.wishBrand} numberOfLines={1}>{item.brand}</Text> : null}
                      {item.price != null ? <Text style={styles.wishPrice}>{formatPrice(item.price)}</Text> : null}
                      <View style={styles.wishMeta}>
                        {item.category ? <Text style={styles.wishMetaText}>{item.category}</Text> : null}
                        {item.color ? (
                          <View style={styles.wishColorMeta}>
                            <View style={[styles.wishColorDot, { backgroundColor: COLOR_HEX[item.color] || t.surfaceMuted }]} />
                            <Text style={styles.wishMetaText}>{item.color}</Text>
                          </View>
                        ) : null}
                        {item.season ? <Text style={styles.wishMetaText}>· {item.season}</Text> : null}
                      </View>
                      {count > 0 && (
                        <View style={styles.outfitBadge}>
                          <Text style={styles.outfitBadgeText}>{count} outfit{count !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.wishActions}>
                      <TouchableOpacity
                        style={styles.boughtBtn}
                        onPress={() => markWishBought(item)}
                        accessibilityLabel={`Markera ${item.name} som köpt`}
                        accessibilityRole="button"
                      >
                        <Text style={styles.boughtBtnText}>Köpt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteWishItem(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Ta bort ${item.name}`}
                        accessibilityRole="button"
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* SÄLJ */}
      {activeTab === 'sälj' && !showArchive && (
        <ScrollView contentContainerStyle={styles.saleScroll}>
          {forSale.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>Inga plagg till salu</Text>
              <Text style={styles.emptyTabHint}>Tryck ＋ för att lägga ut plagg du inte använder</Text>
            </View>
          ) : (
            forSale.map((item) => (
              <TouchableOpacity key={item.id} style={styles.saleItem} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
                {item.image_url
                  ? <SignedImage path={item.image_url} style={styles.saleImage} />
                  : <View style={styles.saleImageEmpty} />
                }
                <View style={styles.saleInfo}>
                  <Text style={styles.saleName}>{item.name}</Text>
                  <Text style={styles.saleCategory}>{item.category}{item.size ? ` · ${item.size}` : ''}</Text>
                </View>
                <View style={styles.saleActions}>
                  <TouchableOpacity style={styles.soldBtn} onPress={() => markAsSold(item)}>
                    <Text style={styles.soldBtnText}>Såld ✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromSale(item)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ARKIV – nås från både Garderob- och Sälj-fliken */}
      {(activeTab === 'nuvarande' || activeTab === 'sälj') && showArchive && (
        <ScrollView contentContainerStyle={styles.saleScroll}>
          <View style={styles.archiveTitleRow}>
            <Text style={styles.archiveTitle}>Arkiv</Text>
            <TouchableOpacity onPress={() => setShowArchiveHint(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Om arkivet" accessibilityRole="button">
              <Ionicons name="information-circle-outline" size={20} color={t.textSecondary} />
            </TouchableOpacity>
          </View>
          {showArchiveHint && (
            <Text style={styles.archiveHint}>
              Plagg som inte passar just nu, är undanpackade eller sålda. Ange plats på plagget så vet du alltid var det finns.
            </Text>
          )}

          {archived.length > 0 && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRowContent}>
                {[
                  { key: 'place', label: 'Plats', value: archPlace, on: archPlace !== 'Alla' },
                  { key: 'reason', label: 'Anledning', value: reasonFor(archReason)?.label || archReason, on: archReason !== 'Alla' },
                  { key: 'sort', label: 'Sortera', value: SORT_LABEL[archSort], on: archSort !== 'recent' },
                  { key: 'category', label: 'Kategori', value: archCat, on: archCat !== 'Alla' },
                  { key: 'type', label: 'Typ', value: archType, on: archType !== 'Alla' },
                  { key: 'color', label: 'Färg', value: archColor, on: archColor !== 'Alla' },
                  { key: 'season', label: 'Säsong', value: archSeason, on: archSeason !== 'Alla' },
                ].map(f => (
                  <TouchableOpacity key={f.key} style={[styles.chip, (f.on || archDropdown === f.key) && styles.chipActive]} onPress={() => setArchDropdown(archDropdown === f.key ? null : f.key)}>
                    <Text style={[styles.chipText, (f.on || archDropdown === f.key) && styles.chipTextActive]}>
                      {f.key === 'sort' ? `${f.label}: ${f.value}` : (f.on ? f.value : f.label)} ▾
                    </Text>
                  </TouchableOpacity>
                ))}
                {(archHasFilters || archSort !== 'recent') && (
                  <TouchableOpacity style={styles.chipClear} onPress={clearArchiveFilters}>
                    <Text style={styles.chipClearText}>Rensa</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              {archDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.dropdownRow}>
                      {archDropdown === 'sort'
                        ? SORT_OPTIONS.map(opt => (
                            <TouchableOpacity key={opt.key} style={[styles.dropdownPill, archSort === opt.key && styles.dropdownPillActive]} onPress={() => { setArchSort(opt.key); setArchDropdown(null) }}>
                              <Text style={[styles.dropdownPillText, archSort === opt.key && styles.dropdownPillTextActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                          ))
                        : (archDropdown === 'category' ? CATEGORIES : archDropdown === 'type' ? archTypeOptions : archDropdown === 'season' ? SEASONS : archDropdown === 'place' ? archPlaceOptions : archDropdown === 'reason' ? ['Alla', ...ARCHIVE_REASONS.map(r => r.key)] : COLORS).map(item => {
                            const isActive = archDropdown === 'category' ? archCat === item : archDropdown === 'type' ? archType === item : archDropdown === 'season' ? archSeason === item : archDropdown === 'place' ? archPlace === item : archDropdown === 'reason' ? archReason === item : archColor === item
                            const reasonMeta = archDropdown === 'reason' && item !== 'Alla' ? reasonFor(item) : undefined
                            return (
                              <TouchableOpacity key={item} style={[styles.dropdownPill, isActive && styles.dropdownPillActive]} onPress={() => {
                                if (archDropdown === 'category') setArchCat(item)
                                else if (archDropdown === 'type') setArchType(item)
                                else if (archDropdown === 'season') setArchSeason(item)
                                else if (archDropdown === 'place') setArchPlace(item)
                                else if (archDropdown === 'reason') setArchReason(item)
                                else setArchColor(item)
                                setArchDropdown(null)
                              }}>
                                {archDropdown === 'color' && COLOR_HEX[item] && <View style={[styles.pillColorDot, { backgroundColor: COLOR_HEX[item] }]} />}
                                {reasonMeta && <Ionicons name={reasonMeta.icon as any} size={14} color={isActive ? t.onPrimary : t.textSecondary} style={{ marginRight: 4 }} />}
                                <Text style={[styles.dropdownPillText, isActive && styles.dropdownPillTextActive]}>{reasonMeta ? reasonMeta.label : item}</Text>
                              </TouchableOpacity>
                            )
                          })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {archived.length === 0 ? (
            <View style={styles.emptyTab}><Text style={styles.emptyTabText}>Inga arkiverade plagg</Text></View>
          ) : filteredArchive.length === 0 ? (
            <View style={styles.emptyTab}><Text style={styles.emptyTabText}>Inga plagg matchar filtret</Text></View>
          ) : (
            filteredArchive.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.saleItem, item.sold && styles.archivedItem]} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
                <View style={styles.archImageWrap}>
                  {item.image_url
                    ? <SignedImage path={item.image_url} style={[styles.saleImage, item.sold && { opacity: 0.6 }]} />
                    : <View style={styles.saleImageEmpty} />
                  }
                  {!item.sold && reasonFor(item.archive_reason) && (
                    <View style={styles.reasonBadge}>
                      <Ionicons name={reasonFor(item.archive_reason)!.icon as any} size={14} color={t.onPrimary} />
                    </View>
                  )}
                </View>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleName}>{item.name}</Text>
                  <Text style={styles.saleCategory}>{item.subcategory || item.category}{item.size ? ` · ${item.size}` : ''}</Text>
                  {item.location ? (
                    <View style={styles.archMetaRow}>
                      <Ionicons name="location-outline" size={13} color={t.textSecondary} />
                      <Text style={styles.archMetaText}>{item.location}</Text>
                    </View>
                  ) : null}
                  {!item.sold && reasonFor(item.archive_reason) ? (
                    <View style={styles.archMetaRow}>
                      <Ionicons name={reasonFor(item.archive_reason)!.icon as any} size={13} color={t.textSecondary} />
                      <Text style={styles.archMetaText}>{reasonFor(item.archive_reason)!.label}</Text>
                    </View>
                  ) : null}
                  {item.sold && <Text style={styles.soldTag}>Såld</Text>}
                </View>
                {!item.sold && (
                  <View style={styles.archActions}>
                    <TouchableOpacity
                      style={styles.unarchiveBtn}
                      onPress={() => unarchive(item)}
                      accessibilityLabel={`Ta tillbaka ${item.name} till garderoben`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.unarchiveBtnText}>Ta tillbaka</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sellArchiveBtn}
                      onPress={() => sellFromArchive(item)}
                      accessibilityLabel={`Sälj ${item.name}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.sellArchiveBtnText}>Sälj</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <BottomNav
        onAddGarment={() => {
          if (activeTab === 'köp') setShowWishChooser(true)
          else if (activeTab === 'sälj') setShowAddSale(true)
          else setShowAddChooser(true)
        }}
      />
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingBottom: 12 },
  headerButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  iconBtnActive: { backgroundColor: t.primaryActive, borderColor: t.primaryActive },
  iconBtnText: { fontFamily: 'Lora_400Regular', fontSize: 16, color: t.onPrimary },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  tabActive: { backgroundColor: t.primary, borderColor: t.primary },
  tabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  tabTextActive: { color: t.onPrimary, fontWeight: '600' },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: t.surfaceMuted, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: t.border },
  searchInput: { flex: 1, fontFamily: 'Lora_400Regular', paddingVertical: 12, color: t.textPrimary, fontSize: 14 },
  searchClear: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, paddingLeft: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, alignItems: 'center', marginBottom: 10 },
  // Fast höjd så den horisontella listan inte sträcker ut sig vertikalt och
  // centrerar chipsen mitt i tomrummet (gav stora tomma band över/under raden).
  chipScroll: { height: 52, marginBottom: 10, flexGrow: 0 },
  chipRowContent: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  chipActive: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  chipTextActive: { color: t.onPrimary },
  chipClear: { paddingVertical: 8, paddingHorizontal: 12 },
  chipClearText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  dropdown: { marginHorizontal: 16, marginBottom: 8, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: t.border },
  dropdownRow: { flexDirection: 'row', gap: 8 },
  dropdownPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  dropdownPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  dropdownPillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  pillColorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: t.border },
  dropdownPillTextActive: { color: t.onPrimary },
  flatList: { flex: 1 },
  grid: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  item: { width: '31%', margin: '1%', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: t.border },
  itemImage: { width: '100%', height: 90, borderRadius: 10, marginBottom: 6, resizeMode: 'contain', backgroundColor: 'transparent' },
  itemEmoji: { fontFamily: 'Lora_400Regular', fontSize: 32, marginBottom: 6 },
  itemName: { fontFamily: 'Lora_500Medium', fontSize: 12, color: t.textPrimary, textAlign: 'center' },
  itemBrand: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: t.textSecondary, textAlign: 'center', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemCategory: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabIcon: { fontFamily: 'Lora_400Regular', fontSize: 48, marginBottom: 12 },
  emptyTabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 16, marginBottom: 8 },
  emptyTabHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },

  // Capsule
  capsuleScroll: { padding: 16, paddingBottom: 100 },
  capsuleHeroCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  capsuleHeroTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary, marginBottom: 4 },
  capsuleHeroStats: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary },
  capsuleHeroEmoji: { fontFamily: 'Lora_400Regular', fontSize: 32 },
  capsuleAutoSaved: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textFaint, marginTop: 4 },
  capsuleGenerateBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: t.border },
  capsuleGenerateBtnLoading: { opacity: 0.7 },
  capsuleGenerateBtnText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, marginBottom: 2 },
  capsuleGenerateBtnSub: { fontFamily: 'Lora_400Regular', color: 'rgba(64,45,33,0.6)', fontSize: 11 },
  capsuleOutfitBanner: { backgroundColor: 'rgba(64,45,33,0.25)', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: t.border },
  capsuleOutfitNum: { fontFamily: 'Poppins_700Bold', fontSize: 48, color: t.textPrimary, lineHeight: 54 },
  capsuleOutfitLabel: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 2 },
  capsuleSelectHint: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  capsuleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  capsuleGridItem: { width: '30%', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: t.border, position: 'relative' },
  capsuleGridItemSelected: { borderColor: t.primary, borderWidth: 2, backgroundColor: 'rgba(64,45,33,0.35)' },
  capsuleGridImage: { width: '100%', height: 80, borderRadius: 10, marginBottom: 5, resizeMode: 'contain', backgroundColor: 'transparent' },
  capsuleGridImageDim: { opacity: 0.3 },
  capsuleGridImageEmpty: { width: '100%', height: 80, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  capsuleGridName: { fontFamily: 'Lora_500Medium', fontSize: 11, color: t.textPrimary, textAlign: 'center' },
  capsuleGridNameDim: { opacity: 0.35 },
  capsuleGridCat: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center', marginTop: 1 },
  capsuleCheckBadge: { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  capsuleCheckText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 11 },
  capsuleRegenBtn: { padding: 14, borderRadius: 14, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  capsuleRegenBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  capsuleOutfitToggle: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, alignItems: 'center', marginBottom: 12 },
  capsuleOutfitToggleText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 13 },
  outfitListWrap: { marginBottom: 16, gap: 8 },
  outfitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: t.border, gap: 10 },
  outfitCardNum: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: t.textFaint, minWidth: 24, textAlign: 'center' },
  outfitCardPieces: { flex: 1, flexDirection: 'row', gap: 8 },
  outfitPiece: { flex: 1, alignItems: 'center' },
  outfitPieceImage: { width: '100%', height: 60, borderRadius: 8, resizeMode: 'contain', backgroundColor: 'transparent', marginBottom: 3 },
  outfitPieceEmpty: { width: '100%', height: 60, borderRadius: 8, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  outfitPieceName: { fontFamily: 'Lora_500Medium', fontSize: 11, color: t.textPrimary, textAlign: 'center' },
  outfitPieceCat: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center' },
  outfitListMore: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  capsuleSectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  capsuleSectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: t.textPrimary },
  capsuleAddBtn: { backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: t.border },
  capsuleAddBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 12 },
  capsuleEmpty: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  capsuleEmptyText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 14, marginBottom: 4 },
  capsuleEmptyHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
  capsuleDivider: { height: 1, backgroundColor: t.surfaceMuted, marginVertical: 20 },

  // Köp
  wishScroll: { padding: 16, paddingBottom: 100 },
  wishHint: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  wishItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: t.border, minHeight: 76 },
  reorderCol: { alignItems: 'center', gap: 2 },
  dragDots: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 14 },
  arrowBtn: { width: 22, height: 22, borderRadius: 6, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  arrowBtnDisabled: { opacity: 0.15 },
  arrowText: { fontFamily: 'Poppins_700Bold', color: t.textSecondary, fontSize: 9 },
  priorityBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  priorityNum: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 11 },
  wishImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'transparent' },
  wishImageEmpty: { width: 52, height: 52, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, borderStyle: 'dashed' },
  wishInfo: { flex: 1 },
  wishName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  wishBrand: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: t.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },
  wishPrice: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, marginTop: 2 },
  wishTotalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  wishTotalLabel: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textSecondary },
  wishTotalValue: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary },
  wishMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 3 },
  wishMetaText: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary },
  wishColorMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wishColorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: t.border },
  outfitBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: t.surfaceMuted, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: t.border },
  outfitBadgeText: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary },
  wishActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boughtBtn: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
  boughtBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  deleteBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },

  // Sälj
  saleScroll: { padding: 16, paddingBottom: 100 },
  saleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  archivedItem: { opacity: 0.7 },
  saleImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'transparent' },
  saleImageEmpty: { width: 60, height: 60, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  archImageWrap: { position: 'relative' },
  reasonBadge: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.bg },
  archMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  archMetaText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary },
  saleInfo: { flex: 1 },
  saleName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  saleCategory: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 2 },
  soldTag: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 4, fontStyle: 'italic' },
  locationTag: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, marginTop: 4 },
  archActions: { gap: 6, alignItems: 'stretch' },
  unarchiveBtn: { backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  unarchiveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 12 },
  sellArchiveBtn: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  sellArchiveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  saleActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  soldBtn: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  soldBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  removeBtn: { backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: t.border },
  removeBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  archiveToggleBtn: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  archiveToggleBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  backToSale: { marginBottom: 16 },
  backToSaleText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  archiveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  archiveTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: t.textPrimary },
  archiveHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', marginBottom: 16, lineHeight: 18 },

  // Sale picker modal
  salePickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  salePickerImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: 'transparent' },
  salePickerImageEmpty: { width: 56, height: 56, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  salePickerInfo: { flex: 1, gap: 2 },
  salePickerName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  salePickerCategory: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary },
  salePickerStats: { flexDirection: 'row', gap: 4, marginTop: 2 },
  salePickerStat: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic' },
  addSaleBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  addSaleBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 18 },

  // Modal (shared)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  modalClose: { fontFamily: 'Lora_400Regular', fontSize: 18, color: t.textSecondary, padding: 4 },
  modalLabel: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 13, marginBottom: 8, marginTop: 12 },
  wishChoiceBtn: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  wishChoiceTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginBottom: 3 },
  wishChoiceHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 18 },
  modalInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 4 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  colorPill: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: t.border },
  // Färgväljare i köplistans formulär – samma swatch-stil som när man redigerar ett plagg.
  wishSwatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  wishSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  wishSwatchActive: { borderColor: t.primary, transform: [{ scale: 1.15 }] },
  wishSwatchCheck: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  wishSwatchSelected: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 12 },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  modalSaveBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  modalSaveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },

  // Image picker in modal
  imagePicker: { borderRadius: 16, height: 160, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', marginBottom: 8, overflow: 'hidden', backgroundColor: t.surfaceMuted },
  imagePickerPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerInner: { alignItems: 'center', gap: 6 },
  imagePickerEmoji: { fontFamily: 'Lora_400Regular', fontSize: 32 },
  imagePickerText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, alignItems: 'center' },
  imageOverlayText: { fontFamily: 'Lora_400Regular', color: t.onPrimary, fontSize: 12 },
})