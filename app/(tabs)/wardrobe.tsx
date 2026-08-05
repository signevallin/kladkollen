import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
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
import BottomNav from '../../components/BottomNav'
import AddGarmentChooser from '../../components/AddGarmentChooser'
import SignedImage from '../../components/SignedImage'
import { supabase } from '../../supabase'
import { showAlert, showConfirm } from '../../utils/alert'
import { newImageId } from '../../utils/id'
import { cacheGet, cacheSet } from '../../utils/cache'
import { useSettings } from '../../utils/settings'
import { localeFor } from '../../utils/i18n'
import { affiliateUrl } from '../../utils/affiliate'
import * as WebBrowser from 'expo-web-browser'
import { CATEGORIES as CATEGORY_LIST, COLOR_HEX, COLOR_NAMES, SEASONS as SEASON_LIST, isWashable } from '../../utils/constants'
import WishlistAddModals from '../../components/wardrobe/WishlistAddModals'
import SaleAddModal from '../../components/wardrobe/SaleAddModal'
import ArchiveView from '../../components/wardrobe/ArchiveView'
import WishlistTab from '../../components/wardrobe/WishlistTab'
import SaleTab from '../../components/wardrobe/SaleTab'

const CATEGORIES = ['Alla', ...CATEGORY_LIST]
const SEASONS = ['Alla', ...SEASON_LIST]
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
  const { formatPrice, currency, toBaseSEK, t: tr, lang } = useSettings()
  // Barn-läge: öppnas med ?person=<id> från Mitt hushåll → visar barnets
  // garderob (samma vy, filter, arkiv, sälj) i stället för mina egna plagg.
  const { person, personName } = useLocalSearchParams<{ person?: string; personName?: string }>()
  const isPerson = !!person
  // Seedas från cachen så garderoben ritas direkt vid flikbyte, medan en
  // uppdatering hämtas i bakgrunden.
  const [garments, setGarments] = useState<any[]>(() => cacheGet('wardrobe.garments') ?? [])
  const [forSale, setForSale] = useState<any[]>(() => cacheGet('wardrobe.forSale') ?? [])
  const [archived, setArchived] = useState<any[]>(() => cacheGet('wardrobe.archived') ?? [])
  const [wishlist, setWishlist] = useState<any[]>(() => cacheGet('wardrobe.wishlist') ?? [])
  const [outfitCounts, setOutfitCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  // Multi-select: tom mängd = "Alla" (inget filter). Man kan välja flera värden
  // per filter (t.ex. både Svart och Vit), och listan visar plagg som matchar
  // NÅGOT av de valda värdena inom varje filter.
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [activeSeasons, setActiveSeasons] = useState<Set<string>>(new Set())
  const [activeColors, setActiveColors] = useState<Set<string>>(new Set())
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  // Barnstorlek (bara relevant i barn-läge) – lagras som strängar av size_cm.
  const [activeSizes, setActiveSizes] = useState<Set<string>>(new Set())
  const [laundryFilter, setLaundryFilter] = useState<'all' | 'in' | 'out'>('all')
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  // Gravidläget styr om gravid-markeringar visas i rutnätet (läses ur cachen).
  const pregnant = cacheGet<boolean>('profile.pregnant') ?? false
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('nuvarande')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [sortBy, setSortBy] = useState('recent')
  const [showArchive, setShowArchive] = useState(false)

  // Capsule
  const [capsuleGenerated, setCapsuleGenerated] = useState(false)
  const [generatingCapsule, setGeneratingCapsule] = useState(false)
  const [capsuleSelected, setCapsuleSelected] = useState<Set<string>>(new Set())
  const [showOutfitList, setShowOutfitList] = useState(false)
  const [capsuleSaved, setCapsuleSaved] = useState(false)

  // Wishlist modal
  const [showAddChooser, setShowAddChooser] = useState(false)
  const [showWishChooser, setShowWishChooser] = useState(false)

  // Sale modal
  const [showAddSale, setShowAddSale] = useState(false)
  const [saleGarments, setSaleGarments] = useState<any[]>([])

  useFocusEffect(
    // Beror på `person`: tabben hålls monterad och återanvänds för barn-closet
    // (?person=), så effekten måste köras om när personen ändras – annars visas
    // fel persons plagg.
    useCallback(() => {
      fetchGarments()
      fetchWishlist()
      loadCapsule()
    }, [person])
  )

  // Köp-fliken finns inte i barn-läge – hamna aldrig på den.
  useEffect(() => {
    if (isPerson && activeTab === 'köp') setActiveTab('nuvarande')
  }, [isPerson, activeTab])

  async function fetchGarments() {
    // Deterministisk basordning; display-sorten nedan har dessutom id-tiebreak.
    const { data } = await supabase.from('garments').select('*').order('created_at', { ascending: false })
    if (data) {
      // Barn-läge: visa bara det barnets plagg. Annars mina egna (person_id null);
      // barnens plagg ligger i respektive barns garderob.
      const mine = isPerson ? data.filter(g => g.person_id === person) : data.filter(g => !g.person_id)
      // Garderoben visar bara plagg som varken är arkiverade eller till salu,
      // så ett plagg försvinner ur garderoben när det läggs på säljlistan.
      // Till salu: alla plagg som är till salu (även arkiverade). Arkivet visar
      // bara arkiverade plagg som INTE är till salu, så inget hamnar dubbelt.
      const active = mine.filter(g => !g.archived && !g.for_sale)
      const sale = mine.filter(g => g.for_sale)
      const arch = mine.filter(g => g.archived && !g.for_sale)
      setGarments(active); cacheSet('wardrobe.garments', active)
      setForSale(sale); cacheSet('wardrobe.forSale', sale)
      setArchived(arch); cacheSet('wardrobe.archived', arch)
      // Plagg som kan läggas till salu = garderobens aktiva plagg.
      setSaleGarments(active)
    }
  }

  // Bockar ett plagg i/ur tvätten. Plagg i tvätten stannar i garderoben (med en
  // tvätt-badge) men föreslås inte i genererade outfits. Optimistisk uppdatering.
  async function toggleLaundry(item: any) {
    const next = !item.in_laundry
    setGarments(prev => {
      const nx = prev.map(g => g.id === item.id ? { ...g, in_laundry: next } : g)
      cacheSet('wardrobe.garments', nx)
      return nx
    })
    const { error } = await supabase.from('garments').update({ in_laundry: next }).eq('id', item.id)
    if (error) {
      setGarments(prev => prev.map(g => g.id === item.id ? { ...g, in_laundry: !next } : g))
    }
  }

  // Tömmer hela tvättkorgen på en gång: markerar alla plagg i tvätten som
  // tvättade (in_laundry = false). Optimistisk uppdatering med återställning.
  async function clearLaundry() {
    const ids = garments.filter(g => g.in_laundry).map(g => g.id)
    if (ids.length === 0) return
    showConfirm(
      tr('Töm tvätten'),
      tr('Markera alla {n} plagg som tvättade?').replace('{n}', String(ids.length)),
      async () => {
        setGarments(prev => {
          const nx = prev.map(g => g.in_laundry ? { ...g, in_laundry: false } : g)
          cacheSet('wardrobe.garments', nx)
          return nx
        })
        const { error } = await supabase.from('garments').update({ in_laundry: false }).in('id', ids)
        if (error) {
          setGarments(prev => {
            const nx = prev.map(g => ids.includes(g.id) ? { ...g, in_laundry: true } : g)
            cacheSet('wardrobe.garments', nx)
            return nx
          })
          showAlert(tr('Något gick fel'))
        }
      },
      tr('Töm tvätten'),
    )
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

  // Öppnar produktlänken (affiliate-spårad om konfigurerat) i in-app-webbläsaren.
  async function openWishLink(item: any) {
    const link = affiliateUrl(item.url)
    if (!link) return
    try { await WebBrowser.openBrowserAsync(link) } catch { /* ignorera */ }
  }

  // --- Wardrobe filters ---
  // Härleds från garderoben + aktiva filter så att listan alltid speglar
  // både senaste datan (efter ändringar/omhämtning) och valda filter.
  const filtered = useMemo(() => {
    let result = garments
    if (activeCategories.size) result = result.filter(g => activeCategories.has(g.category))
    if (activeSeasons.size) result = result.filter(g => g.season && [...activeSeasons].some(s => g.season.includes(s)))
    if (activeColors.size) result = result.filter(g => activeColors.has(g.color))
    if (activeTypes.size) result = result.filter(g => activeTypes.has(g.subcategory))
    if (activeSizes.size) result = result.filter(g => g.size_cm != null && activeSizes.has(String(g.size_cm)))
    if (laundryFilter === 'in') result = result.filter(g => g.in_laundry)
    else if (laundryFilter === 'out') result = result.filter(g => !g.in_laundry)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(g =>
        g.name.toLowerCase().includes(q) || g.color?.toLowerCase().includes(q)
      )
    }
    // Sortering (kopiera först så vi inte muterar garments). Alla grenar har ett
    // stabilt id-tiebreak så rutnätet aldrig kastas om beroende på hämtnings-
    // ordningen – t.ex. när man öppnat ett plagg och en autospar bumpat raden,
    // vilket annars ändrade den godtyckliga DB-ordningen för lika sorteringsvärden.
    const sorted = [...result]
    const byId = (a: any, b: any) => String(a.id).localeCompare(String(b.id))
    switch (sortBy) {
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name, 'sv') || byId(a, b)); break
      case 'most': sorted.sort((a, b) => ((b.times_worn || 0) - (a.times_worn || 0)) || byId(a, b)); break
      case 'least': sorted.sort((a, b) => ((a.times_worn || 0) - (b.times_worn || 0)) || byId(a, b)); break
      case 'color': sorted.sort((a, b) => {
        const ai = COLOR_ORDER.indexOf(a.color), bi = COLOR_ORDER.indexOf(b.color)
        return ((ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)) || byId(a, b)
      }); break
      default: sorted.sort((a, b) => // recent
        (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()) || byId(a, b))
    }
    return sorted
  }, [garments, activeCategories, activeSeasons, activeColors, activeTypes, activeSizes, laundryFilter, search, sortBy])

  // Typ-alternativ (subkategorier) som faktiskt finns i garderoben, för filtret.
  const typeOptions = useMemo(() => {
    const set = new Set<string>()
    garments.forEach(g => { if (g.subcategory) set.add(g.subcategory) })
    return ['Alla', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'sv'))]
  }, [garments])

  // Barnstorlekar som faktiskt finns i den här (barn)garderoben, stigande.
  const sizeOptions = useMemo(() => {
    const set = new Set<number>()
    garments.forEach(g => { if (g.size_cm != null) set.add(g.size_cm) })
    return ['Alla', ...Array.from(set).sort((a, b) => a - b).map(String)]
  }, [garments])

  function handleSearch(text: string) { setSearch(text) }
  // Multi-select: "Alla" nollställer mängden, annars växlar valet av/på.
  // Dropdownen hålls öppen så man kan bocka i flera värden.
  function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    if (value === 'Alla') { setter(new Set()); return }
    setter(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value); else next.add(value)
      return next
    })
  }
  function handleCategory(cat: string) { toggleInSet(setActiveCategories, cat) }
  function handleSeason(s: string) { toggleInSet(setActiveSeasons, s) }
  function handleColor(c: string) { toggleInSet(setActiveColors, c) }
  function handleType(ty: string) { toggleInSet(setActiveTypes, ty) }
  function handleSize(s: string) { toggleInSet(setActiveSizes, s) }
  function handleSort(key: string) { setSortBy(key); setOpenDropdown(null) }
  function clearFilters() {
    setActiveCategories(new Set()); setActiveSeasons(new Set()); setActiveColors(new Set()); setActiveTypes(new Set()); setActiveSizes(new Set())
    setLaundryFilter('all')
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
          // Nytt format: arrayer. Gammalt format: en enskild sträng ("Alla" = inget).
          const toSet = (arr: any, legacy: any) =>
            Array.isArray(arr) ? new Set<string>(arr)
              : (legacy && legacy !== 'Alla' ? new Set<string>([legacy]) : new Set<string>())
          setActiveCategories(toSet(p.activeCategories, p.activeCategory))
          setActiveColors(toSet(p.activeColors, p.activeColor))
          setActiveSeasons(toSet(p.activeSeasons, p.activeSeason))
          setActiveTypes(toSet(p.activeTypes, p.activeType))
        } catch { /* strunt i det */ }
      }
      setPrefsLoaded(true)
    })
  }, [])
  useEffect(() => {
    if (!prefsLoaded) return
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({
      sortBy,
      activeCategories: [...activeCategories],
      activeColors: [...activeColors],
      activeSeasons: [...activeSeasons],
      activeTypes: [...activeTypes],
    }))
  }, [prefsLoaded, sortBy, activeCategories, activeColors, activeSeasons, activeTypes])

  async function markAsSold(item: any) {
    showConfirm(tr('Markera som såld'), `${item.name} – ${tr('såld?')}`, async () => {
      await supabase.from('garments').update({ sold: true, archived: true, for_sale: false }).eq('id', item.id)
      fetchGarments()
      showAlert(tr('Sålt!'), `${item.name} ${tr('har arkiverats.')}`)
    }, tr('Ja, arkivera'), true)
  }

  // Tar bort ur säljlistan. Plagget återgår automatiskt dit det hörde hemma:
  // arkivet om det är arkiverat, annars garderoben.
  async function removeFromSale(item: any) {
    await supabase.from('garments').update({ for_sale: false }).eq('id', item.id)
    fetchGarments()
  }


  // Lägger ett arkiverat plagg till salu men behåller arkiv-statusen, så det
  // återgår till arkivet när det tas bort ur säljlistan.

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
    showConfirm(tr('Ta bort'), `${tr('Ta bort från köplistan?')} – ${item.name}`, async () => {
      await supabase.from('wishlist').delete().eq('id', item.id)
      fetchWishlist()
    }, tr('Ta bort'), true)
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
    showAlert(tr('Grattis!'), `${item.name} ${tr('finns nu i garderoben.')}`)
  }

  const hasActiveFilters = activeCategories.size > 0 || activeSeasons.size > 0 || activeColors.size > 0 || activeTypes.size > 0 || activeSizes.size > 0 || laundryFilter !== 'all' || search !== ''
  const laundryCount = garments.filter(g => g.in_laundry).length
  // Etikett för filter-chippen: inget val → filternamnet, ett val → värdet,
  // flera val → "Filternamn (antal)".
  const filterChipValue = (label: string, set: Set<string>) =>
    set.size === 0 ? tr(label) : set.size === 1 ? tr([...set][0]) : `${tr(label)} (${set.size})`

  function generateCapsule() {
    if (garments.length === 0) { showAlert(tr('Garderoben är tom'), tr('Lägg till plagg först!')); return }
    setGeneratingCapsule(true)

    const NEUTRAL_COLORS = ['Svart', 'Vit', 'Grå', 'Beige', 'Brun']
    const MAX_PER_CAT: Record<string, number> = {
      'Ytterkläder': 2, 'Kavajer': 1, 'Tröjor': 3, 'Toppar': 3,
      'Byxor': 2, 'Klänningar': 2, 'Kjolar': 1, 'Skor': 2,
      'Väskor': 1, 'Accessoarer': 2, 'Smycken': 2,
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
      <AddGarmentChooser visible={showAddChooser} onClose={() => setShowAddChooser(false)} person={isPerson ? person : undefined} personName={isPerson ? personName : undefined} />

      {/* Köplistan: valruta + URL + formulär (egen komponent) */}
      <WishlistAddModals
        chooserVisible={showWishChooser}
        onChooserClose={() => setShowWishChooser(false)}
        wishlistCount={wishlist.length}
        onAdded={fetchWishlist}
      />

      {/* Lägg till till salu (egen komponent) */}
      <SaleAddModal
        visible={showAddSale}
        onClose={() => setShowAddSale(false)}
        candidates={saleGarments}
        onAdded={fetchGarments}
      />

      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          {/* Barn-läge: ingen bakåtknapp – man byter vy via bottom-nav. */}
          <Text style={styles.title} numberOfLines={1}>{isPerson ? (personName || tr('Barnet')) : tr('Min garderob')}</Text>
        </View>
        <View style={styles.headerButtons}>
          {activeTab === 'nuvarande' && (
            <TouchableOpacity
              style={[styles.iconBtn, (showFilterPanel || hasActiveFilters) && styles.iconBtnActive]}
              onPress={() => { setShowFilterPanel(s => !s); setOpenDropdown(null) }}
              accessibilityLabel={tr('Filter och sortering')}
              accessibilityRole="button"
            >
              <MaterialIcons name="tune" size={20} color={t.onPrimary} />
            </TouchableOpacity>
          )}
          {(activeTab === 'nuvarande' || activeTab === 'sälj') && (
            <TouchableOpacity
              style={[styles.iconBtn, showArchive && styles.iconBtnActive]}
              onPress={() => setShowArchive(v => !v)}
              accessibilityLabel={tr('Arkiv')}
              accessibilityRole="button"
            >
              <MaterialIcons name="inventory-2" size={20} color={t.onPrimary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(isPerson ? `/stats?person=${person}&personName=${encodeURIComponent(personName || '')}` : '/stats')}
            accessibilityLabel={tr('Statistik')}
            accessibilityRole="button"
          >
            <MaterialIcons name="insights" size={20} color={t.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        {[
          { id: 'nuvarande', label: `${tr('Garderob')}${garments.length > 0 ? ` (${garments.length})` : ''}` },
          // Köplista är per person (mig), inte per barn – dölj den i barn-läge.
          ...(isPerson ? [] : [{ id: 'köp', label: `${tr('Köp')}${wishlist.length > 0 ? ` (${wishlist.length})` : ''}` }]),
          { id: 'sälj', label: `${tr('Sälj')}${forSale.length > 0 ? ` (${forSale.length})` : ''}` },
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
          {showFilterPanel && (
          <>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={18} color={t.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={tr('Sök plagg eller färg...')}
              placeholderTextColor={t.placeholder}
              value={search}
              onChangeText={handleSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRowContent}>
            {[
              { key: 'sort', label: tr('Sortera'), value: tr(SORT_LABEL[sortBy]), on: sortBy !== 'recent' },
              { key: 'category', label: tr('Kategori'), value: filterChipValue('Kategori', activeCategories), on: activeCategories.size > 0 },
              { key: 'type', label: tr('Typ'), value: filterChipValue('Typ', activeTypes), on: activeTypes.size > 0 },
              ...(isPerson ? [{ key: 'size', label: tr('Storlek'), value: filterChipValue('Storlek', activeSizes), on: activeSizes.size > 0 }] : []),
              { key: 'color', label: tr('Färg'), value: filterChipValue('Färg', activeColors), on: activeColors.size > 0 },
              { key: 'season', label: tr('Säsong'), value: filterChipValue('Säsong', activeSeasons), on: activeSeasons.size > 0 },
              { key: 'laundry', label: tr('Tvätt'), value: laundryFilter === 'in' ? tr('I tvätten') : laundryFilter === 'out' ? tr('Ej i tvätten') : tr('Tvätt'), on: laundryFilter !== 'all' },
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
                <Text style={styles.chipClearText}>{tr('Rensa')}</Text>
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
                          <Text style={[styles.dropdownPillText, sortBy === opt.key && styles.dropdownPillTextActive]}>{tr(opt.label)}</Text>
                        </TouchableOpacity>
                      ))
                    : openDropdown === 'laundry'
                    ? ([['all', 'Alla'], ['in', 'I tvätten'], ['out', 'Ej i tvätten']] as const).map(([key, label]) => (
                        <TouchableOpacity
                          key={key}
                          style={[styles.dropdownPill, laundryFilter === key && styles.dropdownPillActive]}
                          onPress={() => { setLaundryFilter(key); setOpenDropdown(null) }}
                        >
                          <Text style={[styles.dropdownPillText, laundryFilter === key && styles.dropdownPillTextActive]}>{tr(label)}</Text>
                        </TouchableOpacity>
                      ))
                    : (openDropdown === 'category' ? CATEGORIES : openDropdown === 'type' ? typeOptions : openDropdown === 'size' ? sizeOptions : openDropdown === 'season' ? SEASONS : COLORS).map(item => {
                        const currentSet = openDropdown === 'category' ? activeCategories : openDropdown === 'type' ? activeTypes : openDropdown === 'size' ? activeSizes : openDropdown === 'season' ? activeSeasons : activeColors
                        const isActive = item === 'Alla' ? currentSet.size === 0 : currentSet.has(item)
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dropdownPill, isActive && styles.dropdownPillActive]}
                            onPress={() => openDropdown === 'category' ? handleCategory(item) : openDropdown === 'type' ? handleType(item) : openDropdown === 'size' ? handleSize(item) : openDropdown === 'season' ? handleSeason(item) : handleColor(item)}
                          >
                            {openDropdown === 'color' && COLOR_HEX[item] && (
                              <View style={[styles.pillColorDot, { backgroundColor: COLOR_HEX[item] }]} />
                            )}
                            <Text style={[styles.dropdownPillText, isActive && styles.dropdownPillTextActive]}>{tr(item)}</Text>
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
            ListHeaderComponent={
              laundryFilter === 'in' && laundryCount > 0 ? (
                <TouchableOpacity style={styles.clearLaundryBtn} onPress={clearLaundry} accessibilityRole="button">
                  <MaterialIcons name="local-laundry-service" size={18} color={t.onPrimary} />
                  <Text style={styles.clearLaundryText}>{tr('Töm tvätten')} · {laundryCount}</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {hasActiveFilters ? tr('Inga plagg hittades') : tr('Din garderob är tom!\nLägg till ditt första plagg')}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
                <View style={styles.itemImageWrap}>
                  {item.image_url
                    ? <SignedImage path={item.image_url} style={[styles.itemImage, pregnant && item.paused_pregnancy && styles.itemPaused]} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                    : null
                  }
                  {pregnant && item.maternity_friendly && (
                    <View style={styles.maternityBadge} accessibilityLabel={tr('Gravid-/amningsvänligt')}>
                      <MaterialIcons name="pregnant-woman" size={13} color={t.onPrimary} />
                    </View>
                  )}
                  {pregnant && item.paused_pregnancy && (
                    <View style={styles.pausedBadge} accessibilityLabel={tr('Pausad under graviditeten')}>
                      <MaterialIcons name="pause" size={18} color={t.onPrimary} />
                    </View>
                  )}
                  {item.lendable && (
                    <View style={styles.lendBadge}>
                      <Ionicons name="swap-horizontal" size={14} color={t.onPrimary} />
                    </View>
                  )}
                  {/* Skor, smycken, väskor och skärp tvättas inte – ingen tvättikon. */}
                  {isWashable(item) && (
                    <TouchableOpacity
                      style={[styles.laundryBadge, item.in_laundry && styles.laundryBadgeOn]}
                      onPress={() => toggleLaundry(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={item.in_laundry ? `${tr('Ta ur tvätten')}: ${item.name}` : `${tr('Lägg i tvätten')}: ${item.name}`}
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="local-laundry-service" size={14} color={item.in_laundry ? t.onPrimary : t.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {item.set_id && (
                    <View style={styles.setBadge} accessibilityLabel={tr('Ingår i ett set')}>
                      <MaterialIcons name="link" size={13} color={t.onPrimary} />
                    </View>
                  )}
                </View>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.brand ? <Text style={styles.itemBrand} numberOfLines={1}>{item.brand}</Text> : null}
                <Text style={styles.itemCategory} numberOfLines={1}>{tr(item.subcategory || item.category)}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {/* KÖP */}
      {activeTab === 'köp' && (
        <WishlistTab
          wishlist={wishlist}
          outfitCounts={outfitCounts}
          onMove={moveWishItem}
          onOpenLink={openWishLink}
          onBought={markWishBought}
          onDelete={deleteWishItem}
        />
      )}

      {/* SÄLJ */}
      {activeTab === 'sälj' && !showArchive && (
        <SaleTab forSale={forSale} onSold={markAsSold} onRemove={removeFromSale} />
      )}

      {/* ARKIV – nås från både Garderob- och Sälj-fliken */}
      {(activeTab === 'nuvarande' || activeTab === 'sälj') && showArchive && (
        <ArchiveView archived={archived} isPerson={isPerson} onRefresh={fetchGarments} />
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
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
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
  clearLaundryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 14, paddingVertical: 12, marginBottom: 4 },
  clearLaundryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.onPrimary },
  item: { width: '31%', margin: '1%', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: t.border },
  itemImageWrap: { width: '100%' },
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
  wishActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  buyBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  boughtBtn: { backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  boughtBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 12 },
  deleteBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },

  // Sälj
  saleScroll: { padding: 16, paddingBottom: 100 },
  saleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  archivedItem: { opacity: 0.7 },
  saleImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'transparent' },
  saleImageEmpty: { width: 60, height: 60, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  archImageWrap: { position: 'relative' },
  reasonBadge: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  lendBadge: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  laundryBadge: { position: 'absolute', top: -6, left: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  setBadge: { position: 'absolute', bottom: 4, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  maternityBadge: { position: 'absolute', bottom: 4, left: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  pausedBadge: { position: 'absolute', top: '50%', left: '50%', width: 32, height: 32, borderRadius: 16, marginTop: -16, marginLeft: -16, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  itemPaused: { opacity: 0.5 },
  laundryBadgeOn: { backgroundColor: t.primary, borderColor: t.primary },
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