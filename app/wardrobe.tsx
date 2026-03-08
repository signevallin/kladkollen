
import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  FlatList,
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
import { showAlert, showConfirm } from '../utils/alert'

const CATEGORIES = ['Alla', 'Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const WISH_CATEGORIES = ['Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SEASONS = ['Alla', 'Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const WISH_SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = ['Alla', 'Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']
const WISH_COLORS = ['Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']

export default function Wardrobe() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
  const [garments, setGarments] = useState([])
  const [filtered, setFiltered] = useState([])
  const [forSale, setForSale] = useState([])
  const [archived, setArchived] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [outfitCounts, setOutfitCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Alla')
  const [activeSeason, setActiveSeason] = useState('Alla')
  const [activeColor, setActiveColor] = useState('Alla')
  const [openDropdown, setOpenDropdown] = useState(null)
  const [activeTab, setActiveTab] = useState('nuvarande')
  const [showFilters, setShowFilters] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  // Capsule
  const [capsuleGenerated, setCapsuleGenerated] = useState(false)
  const [generatingCapsule, setGeneratingCapsule] = useState(false)
  const [capsuleSelected, setCapsuleSelected] = useState<Set<string>>(new Set())
  const [showOutfitList, setShowOutfitList] = useState(false)
  const [capsuleSaved, setCapsuleSaved] = useState(false)

  // Wishlist modal
  const [showAddWish, setShowAddWish] = useState(false)
  const [wishName, setWishName] = useState('')
  const [wishCategory, setWishCategory] = useState('')
  const [wishColor, setWishColor] = useState('')
  const [wishSeason, setWishSeason] = useState('')
  const [wishImage, setWishImage] = useState<string | null>(null)
  const [savingWish, setSavingWish] = useState(false)

  // Sale modal
  const [showAddSale, setShowAddSale] = useState(false)
  const [saleSearch, setSaleSearch] = useState('')
  const [saleGarments, setSaleGarments] = useState([])

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
      const active = data.filter(g => !g.archived)
      const sale = data.filter(g => g.for_sale && !g.archived)
      const arch = data.filter(g => g.archived)
      setGarments(active)
      setFiltered(active)
      setForSale(sale)
      setArchived(arch)
      // Garments eligible for sale: active, not already for sale
      setSaleGarments(active.filter(g => !g.for_sale))
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
      setWishlist(data)
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled) setWishImage(result.assets[0].uri)
  }

  async function uploadWishImage(uri: string) {
    const filename = `wish-${Date.now()}.jpg`
    const filePath = `public/${filename}`
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const { error } = await supabase.storage.from('garments').upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  async function addWishItem() {
    if (!wishName.trim()) { showAlert('Fyll i ett namn!'); return }
    setSavingWish(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let imageUrl: string | null = null
      if (wishImage) imageUrl = await uploadWishImage(wishImage)
      const { error } = await supabase.from('wishlist').insert([{
        user_id: user.id,
        name: wishName.trim(),
        category: wishCategory || null,
        color: wishColor || null,
        season: wishSeason || null,
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
    setWishName(''); setWishCategory(''); setWishColor(''); setWishSeason(''); setWishImage(null)
  }

  // --- Sale ---
  async function addToSale(item: any) {
    await supabase.from('garments').update({ for_sale: true }).eq('id', item.id)
    showAlert(`${item.name} är nu till salu! 🍒`)
    setShowAddSale(false)
    setSaleSearch('')
    fetchGarments()
  }

  const filteredSaleGarments = (saleSearch.trim()
    ? saleGarments.filter(g => g.name.toLowerCase().includes(saleSearch.toLowerCase()))
    : saleGarments
  ).sort((a, b) => (a.times_worn || 0) - (b.times_worn || 0))

  // --- Wardrobe filters ---
  function applyFilters(searchText: string, category: string, season: string, color: string, data: any[]) {
    let result = data
    if (category !== 'Alla') result = result.filter(g => g.category === category)
    if (season !== 'Alla') result = result.filter(g => g.season?.includes(season))
    if (color !== 'Alla') result = result.filter(g => g.color === color)
    if (searchText.trim()) {
      result = result.filter(g =>
        g.name.toLowerCase().includes(searchText.toLowerCase()) ||
        g.color?.toLowerCase().includes(searchText.toLowerCase())
      )
    }
    setFiltered(result)
  }

  function handleSearch(text: string) { setSearch(text); applyFilters(text, activeCategory, activeSeason, activeColor, garments) }
  function handleCategory(cat: string) { setActiveCategory(cat); setOpenDropdown(null); applyFilters(search, cat, activeSeason, activeColor, garments) }
  function handleSeason(s: string) { setActiveSeason(s); setOpenDropdown(null); applyFilters(search, activeCategory, s, activeColor, garments) }
  function handleColor(c: string) { setActiveColor(c); setOpenDropdown(null); applyFilters(search, activeCategory, activeSeason, c, garments) }
  function clearFilters() {
    setActiveCategory('Alla'); setActiveSeason('Alla'); setActiveColor('Alla')
    setSearch(''); setFiltered(garments); setOpenDropdown(null)
  }

  async function markAsSold(item: any) {
    showConfirm('Markera som såld', `Är "${item.name}" såld?`, async () => {
      await supabase.from('garments').update({ sold: true, archived: true, for_sale: false }).eq('id', item.id)
      fetchGarments()
      showAlert('🍒 Sålt!', `${item.name} har arkiverats.`)
    }, 'Ja, arkivera', true)
  }

  async function removeFromSale(item: any) {
    await supabase.from('garments').update({ for_sale: false }).eq('id', item.id)
    fetchGarments()
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

  const hasActiveFilters = activeCategory !== 'Alla' || activeSeason !== 'Alla' || activeColor !== 'Alla' || search !== ''

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

    setTimeout(() => {
      const selected = new Set(result.map((g: any) => g.id))
      setCapsuleSelected(selected)
      setCapsuleGenerated(true)
      setGeneratingCapsule(false)
      saveCapsule(selected)
    }, 1400)
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

      {/* Add wishlist modal */}
      <Modal visible={showAddWish} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lägg till på köplistan</Text>
              <TouchableOpacity onPress={closeWishModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Bildväljare */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickWishImage}>
                {wishImage ? (
                  <Image source={{ uri: wishImage }} style={styles.imagePickerPreview} />
                ) : (
                  <View style={styles.imagePickerInner}>
                    <Text style={styles.imagePickerEmoji}>📷</Text>
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
                placeholderTextColor="rgba(196,115,122,0.4)"
                value={wishName}
                onChangeText={setWishName}
              />

              <Text style={styles.modalLabel}>Kategori</Text>
              <View style={styles.pillsWrap}>
                {WISH_CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.pill, wishCategory === c && styles.pillActive]} onPress={() => setWishCategory(wishCategory === c ? '' : c)}>
                    <Text style={[styles.pillText, wishCategory === c && styles.pillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Färg</Text>
              <View style={styles.pillsWrap}>
                {WISH_COLORS.map(c => (
                  <TouchableOpacity key={c} style={[styles.pill, wishColor === c && styles.pillActive]} onPress={() => setWishColor(wishColor === c ? '' : c)}>
                    <Text style={[styles.pillText, wishColor === c && styles.pillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Säsong</Text>
              <View style={styles.pillsWrap}>
                {WISH_SEASONS.map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, wishSeason === s && styles.pillActive]} onPress={() => setWishSeason(wishSeason === s ? '' : s)}>
                    <Text style={[styles.pillText, wishSeason === s && styles.pillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={addWishItem} disabled={savingWish}>
                <Text style={styles.modalSaveBtnText}>{savingWish ? 'Sparar...' : 'Lägg till 🍒'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add to sale modal */}
      <Modal visible={showAddSale} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lägg till till salu</Text>
              <TouchableOpacity onPress={() => { setShowAddSale(false); setSaleSearch('') }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Sök plagg..."
              placeholderTextColor="rgba(196,115,122,0.4)"
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
                      ? <Image source={{ uri: item.image_url }} style={styles.salePickerImage} />
                      : <View style={styles.salePickerImageEmpty}><Text style={{ fontSize: 22 }}>👗</Text></View>
                    }
                    <View style={styles.salePickerInfo}>
                      <Text style={styles.salePickerName}>{item.name}</Text>
                      <Text style={styles.salePickerCategory}>{item.category}{item.color ? ` · ${item.color}` : ''}</Text>
                      <Text style={styles.salePickerStat}>👗 Använd {item.times_worn || 0} gånger</Text>
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
        <View>
          <Text style={styles.title}>Min garderob</Text>
          <Text style={[styles.subtitle, fontsLoaded && { fontFamily: 'DancingScript_400Regular', fontSize: 22 }]}>
            {garments.length} plagg
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {activeTab === 'nuvarande' && (
            <TouchableOpacity style={[styles.iconBtn, showFilters && styles.iconBtnActive]} onPress={() => setShowFilters(!showFilters)}>
              <Text style={styles.iconBtnText}>🔍</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'nuvarande' && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/add-garment')}>
              <Text style={styles.iconBtnText}>＋</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'köp' && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddWish(true)}>
              <Text style={styles.iconBtnText}>＋</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'sälj' && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddSale(true)}>
              <Text style={styles.iconBtnText}>＋</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabRow}>
        {[
          { id: 'nuvarande', label: 'Garderob' },
          { id: 'köp', label: `Köp${wishlist.length > 0 ? ` (${wishlist.length})` : ''}` },
          { id: 'sälj', label: `Sälj${forSale.length > 0 ? ` (${forSale.length})` : ''}` },
          { id: 'capsule', label: '✨ Capsule' },
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
      {activeTab === 'nuvarande' && (
        <>
          {showFilters && (
            <>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Sök plagg eller färg..."
                  placeholderTextColor="rgba(196,115,122,0.4)"
                  value={search}
                  onChangeText={handleSearch}
                />
              </View>
              <View style={styles.filterBar}>
                {[
                  { key: 'category', label: 'Kategori', active: activeCategory },
                  { key: 'color', label: 'Färg', active: activeColor },
                  { key: 'season', label: 'Säsong', active: activeSeason },
                ].map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterBtn, f.active !== 'Alla' && styles.filterBtnActive]}
                    onPress={() => setOpenDropdown(openDropdown === f.key ? null : f.key)}
                  >
                    <Text style={[styles.filterBtnText, f.active !== 'Alla' && styles.filterBtnTextActive]}>
                      {f.active !== 'Alla' ? f.active : f.label} ▾
                    </Text>
                  </TouchableOpacity>
                ))}
                {hasActiveFilters && (
                  <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                    <Text style={styles.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {openDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.dropdownRow}>
                      {(openDropdown === 'category' ? CATEGORIES : openDropdown === 'season' ? SEASONS : COLORS).map(item => {
                        const isActive = openDropdown === 'category' ? activeCategory === item : openDropdown === 'season' ? activeSeason === item : activeColor === item
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dropdownPill, isActive && styles.dropdownPillActive]}
                            onPress={() => openDropdown === 'category' ? handleCategory(item) : openDropdown === 'season' ? handleSeason(item) : handleColor(item)}
                          >
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
                  {hasActiveFilters ? 'Inga plagg hittades 🔍' : 'Din garderob är tom!\nLägg till ditt första plagg 🍒'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
                {item.image_url
                  ? <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                  : <Text style={styles.itemEmoji}>👗</Text>
                }
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
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
              <Text style={styles.emptyTabIcon}>🛍️</Text>
              <Text style={styles.emptyTabText}>Köplistan är tom</Text>
              <Text style={styles.emptyTabHint}>Tryck ＋ för att lägga till plagg du drömmer om</Text>
            </View>
          ) : (
            <>
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
                      <TouchableOpacity style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]} onPress={() => moveWishItem(index, 'up')} disabled={index === 0}>
                        <Text style={styles.arrowText}>▲</Text>
                      </TouchableOpacity>
                      <Text style={styles.dragDots}>⠿</Text>
                      <TouchableOpacity style={[styles.arrowBtn, index === wishlist.length - 1 && styles.arrowBtnDisabled]} onPress={() => moveWishItem(index, 'down')} disabled={index === wishlist.length - 1}>
                        <Text style={styles.arrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityNum}>{index + 1}</Text>
                    </View>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={styles.wishImage} />
                      : <View style={styles.wishImageEmpty}><Text style={{ fontSize: 22 }}>🛍️</Text></View>
                    }
                    <View style={styles.wishInfo}>
                      <Text style={styles.wishName}>{item.name}</Text>
                      <View style={styles.wishMeta}>
                        {item.category ? <Text style={styles.wishMetaText}>{item.category}</Text> : null}
                        {item.color ? <Text style={styles.wishMetaText}>· {item.color}</Text> : null}
                        {item.season ? <Text style={styles.wishMetaText}>· {item.season}</Text> : null}
                      </View>
                      {count > 0 && (
                        <View style={styles.outfitBadge}>
                          <Text style={styles.outfitBadgeText}>👗 {count} outfit{count !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteWishItem(item)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* SÄLJ */}
      {activeTab === 'sälj' && (
        <ScrollView contentContainerStyle={styles.saleScroll}>
          {!showArchive ? (
            <>
              {forSale.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabIcon}>💰</Text>
                  <Text style={styles.emptyTabText}>Inga plagg till salu</Text>
                  <Text style={styles.emptyTabHint}>Tryck ＋ för att lägga ut plagg du inte använder</Text>
                </View>
              ) : (
                forSale.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.saleItem} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={styles.saleImage} />
                      : <View style={styles.saleImageEmpty}><Text style={{ fontSize: 28 }}>👗</Text></View>
                    }
                    <View style={styles.saleInfo}>
                      <Text style={styles.saleName}>{item.name}</Text>
                      <Text style={styles.saleCategory}>{item.category}</Text>
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
              <TouchableOpacity style={styles.archiveToggleBtn} onPress={() => setShowArchive(true)}>
                <Text style={styles.archiveToggleBtnText}>📦 Arkiv ({archived.length})</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backToSale} onPress={() => setShowArchive(false)}>
                <Text style={styles.backToSaleText}>← Tillbaka till säljlistan</Text>
              </TouchableOpacity>
              <Text style={styles.archiveTitle}>Arkiv</Text>
              {archived.length === 0 ? (
                <View style={styles.emptyTab}><Text style={styles.emptyTabText}>📦 Inga arkiverade plagg</Text></View>
              ) : (
                archived.map((item) => (
                  <TouchableOpacity key={item.id} style={[styles.saleItem, styles.archivedItem]} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={[styles.saleImage, { opacity: 0.6 }]} />
                      : <View style={styles.saleImageEmpty}><Text style={{ fontSize: 28 }}>👗</Text></View>
                    }
                    <View style={styles.saleInfo}>
                      <Text style={styles.saleName}>{item.name}</Text>
                      <Text style={styles.saleCategory}>{item.category}</Text>
                      {item.sold && <Text style={styles.soldTag}>Såld 🍒</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* CAPSULE WARDROBE */}
      {activeTab === 'capsule' && (
        <ScrollView contentContainerStyle={styles.capsuleScroll}>

          {/* Hero card */}
          <View style={styles.capsuleHeroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.capsuleHeroTitle}>Capsule Wardrobe</Text>
              <Text style={styles.capsuleHeroStats}>
                {capsuleGenerated
                  ? `${capsuleSelected.size} plagg valda`
                  : `${garments.length} plagg i garderoben`}
              </Text>
              {capsuleSaved && capsuleGenerated && (
                <Text style={styles.capsuleAutoSaved}>✓ Autosparad</Text>
              )}
            </View>
            <Text style={styles.capsuleHeroEmoji}>✨</Text>
          </View>

          {!capsuleGenerated ? (
            /* Generate button */
            <TouchableOpacity
              style={[styles.capsuleGenerateBtn, generatingCapsule && styles.capsuleGenerateBtnLoading]}
              onPress={generateCapsule}
              disabled={generatingCapsule}
            >
              <Text style={styles.capsuleGenerateBtnText}>
                {generatingCapsule ? '✨ Analyserar...' : '✨ Skapa capsule'}
              </Text>
              <Text style={styles.capsuleGenerateBtnSub}>
                {generatingCapsule ? 'Väljer ut dina bästa plagg' : 'AI föreslår – du bestämmer'}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Live outfit counter */}
              <View style={styles.capsuleOutfitBanner}>
                <Text style={styles.capsuleOutfitNum}>{calcOutfits(capsuleSelected)}</Text>
                <Text style={styles.capsuleOutfitLabel}>möjliga outfits</Text>
              </View>

              {/* Toggle outfit list */}
              <TouchableOpacity
                style={styles.capsuleOutfitToggle}
                onPress={() => setShowOutfitList(v => !v)}
              >
                <Text style={styles.capsuleOutfitToggleText}>
                  {showOutfitList ? '▲ Dölj outfits' : `👗 Se alla outfits (${calcOutfits(capsuleSelected)})`}
                </Text>
              </TouchableOpacity>

              {/* Outfit combination list */}
              {showOutfitList && (() => {
                const combos = getOutfitCombinations(capsuleSelected)
                const visible = combos.slice(0, 30)
                const rest = combos.length - visible.length
                return (
                  <View style={styles.outfitListWrap}>
                    {visible.map((outfit, i) => (
                      <View key={i} style={styles.outfitCard}>
                        <Text style={styles.outfitCardNum}>#{i + 1}</Text>
                        <View style={styles.outfitCardPieces}>
                          {outfit.map((piece: any, j: number) => (
                            <View key={j} style={styles.outfitPiece}>
                              {piece.image_url
                                ? <Image source={{ uri: piece.image_url }} style={styles.outfitPieceImage} />
                                : <View style={styles.outfitPieceEmpty}><Text style={{ fontSize: 18 }}>👗</Text></View>
                              }
                              <Text style={styles.outfitPieceName} numberOfLines={1}>{piece.name}</Text>
                              <Text style={styles.outfitPieceCat}>{piece.category}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                    {rest > 0 && (
                      <Text style={styles.outfitListMore}>…och {rest} outfit{rest !== 1 ? 's' : ''} till</Text>
                    )}
                  </View>
                )
              })()}

              {/* Instructions */}
              <Text style={styles.capsuleSelectHint}>
                Tryck på ett plagg för att lägga till eller ta bort det ur din capsule
              </Text>

              {/* Full wardrobe grid – each garment toggleable */}
              <View style={styles.capsuleGrid}>
                {garments.map((item: any) => {
                  const isSelected = capsuleSelected.has(item.id)
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.capsuleGridItem, isSelected && styles.capsuleGridItemSelected]}
                      onPress={() => toggleCapsuleItem(item.id)}
                      activeOpacity={0.7}
                    >
                      {item.image_url
                        ? <Image source={{ uri: item.image_url }} style={[styles.capsuleGridImage, !isSelected && styles.capsuleGridImageDim]} />
                        : <View style={[styles.capsuleGridImageEmpty, !isSelected && { opacity: 0.35 }]}><Text style={{ fontSize: 24 }}>👗</Text></View>
                      }
                      {isSelected && (
                        <View style={styles.capsuleCheckBadge}>
                          <Text style={styles.capsuleCheckText}>✓</Text>
                        </View>
                      )}
                      <Text style={[styles.capsuleGridName, !isSelected && styles.capsuleGridNameDim]} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.capsuleGridCat}>{item.category}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <TouchableOpacity
                style={styles.capsuleRegenBtn}
                onPress={() => {
                  setCapsuleGenerated(false)
                  setCapsuleSelected(new Set())
                  setCapsuleSaved(false)
                  saveCapsule(new Set())
                }}
              >
                <Text style={styles.capsuleRegenBtnText}>🔄 Börja om</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingBottom: 12 },
  headerButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9E2035', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDA0A7' },
  iconBtnActive: { backgroundColor: '#7A1828', borderColor: '#9E2035' },
  iconBtnText: { fontSize: 16 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  tabActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  tabText: { color: '#C4737A', fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: '#FBF3EF', fontWeight: '600' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FBF3EF' },
  subtitle: { color: '#C4737A', marginBottom: 4 },
  searchContainer: { marginHorizontal: 16, marginBottom: 8 },
  searchInput: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 12, color: '#FBF3EF', fontSize: 14, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  filterBtnText: { color: '#C4737A', fontSize: 11, fontWeight: '500' },
  filterBtnTextActive: { color: '#FBF3EF' },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { color: '#C4737A', fontSize: 13 },
  dropdown: { marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  dropdownRow: { flexDirection: 'row', gap: 8 },
  dropdownPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  dropdownPillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  dropdownPillText: { color: '#C4737A', fontSize: 12 },
  dropdownPillTextActive: { color: '#FBF3EF' },
  flatList: { flex: 1 },
  grid: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  item: { width: '31%', margin: '1%', alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  itemImage: { width: '100%', height: 90, borderRadius: 10, marginBottom: 6, resizeMode: 'contain', backgroundColor: 'transparent' },
  itemEmoji: { fontSize: 32, marginBottom: 6 },
  itemName: { fontSize: 11, color: '#FBF3EF', textAlign: 'center', fontWeight: '500' },
  itemCategory: { fontSize: 10, color: '#C4737A', textAlign: 'center', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#C4737A', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabIcon: { fontSize: 48, marginBottom: 12 },
  emptyTabText: { color: '#C4737A', fontSize: 16, marginBottom: 8, fontWeight: '500' },
  emptyTabHint: { color: 'rgba(196,115,122,0.5)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },

  // Capsule
  capsuleScroll: { padding: 16, paddingBottom: 100 },
  capsuleHeroCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.4)', borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(196,115,122,0.25)' },
  capsuleHeroTitle: { fontSize: 18, fontWeight: 'bold', color: '#FBF3EF', marginBottom: 4 },
  capsuleHeroStats: { fontSize: 12, color: '#DDA0A7' },
  capsuleHeroEmoji: { fontSize: 32 },
  capsuleAutoSaved: { fontSize: 10, color: 'rgba(196,115,122,0.5)', marginTop: 4 },
  capsuleGenerateBtn: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(221,160,167,0.3)' },
  capsuleGenerateBtnLoading: { opacity: 0.7 },
  capsuleGenerateBtnText: { color: '#FBF3EF', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  capsuleGenerateBtnSub: { color: 'rgba(251,243,239,0.6)', fontSize: 11 },
  capsuleOutfitBanner: { backgroundColor: 'rgba(158,32,53,0.25)', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  capsuleOutfitNum: { fontSize: 48, fontWeight: '800', color: '#FBF3EF', lineHeight: 54 },
  capsuleOutfitLabel: { fontSize: 13, color: '#DDA0A7', marginTop: 2 },
  capsuleSelectHint: { fontSize: 11, color: 'rgba(196,115,122,0.5)', fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  capsuleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  capsuleGridItem: { width: '30%', alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)', position: 'relative' },
  capsuleGridItemSelected: { borderColor: '#9E2035', borderWidth: 2, backgroundColor: 'rgba(158,32,53,0.35)' },
  capsuleGridImage: { width: '100%', height: 80, borderRadius: 10, marginBottom: 5, resizeMode: 'contain', backgroundColor: 'transparent' },
  capsuleGridImageDim: { opacity: 0.3 },
  capsuleGridImageEmpty: { width: '100%', height: 80, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  capsuleGridName: { fontSize: 10, color: '#FBF3EF', fontWeight: '500', textAlign: 'center' },
  capsuleGridNameDim: { opacity: 0.35 },
  capsuleGridCat: { fontSize: 9, color: '#C4737A', textAlign: 'center', marginTop: 1 },
  capsuleCheckBadge: { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#9E2035', alignItems: 'center', justifyContent: 'center' },
  capsuleCheckText: { color: '#FBF3EF', fontSize: 10, fontWeight: '700' },
  capsuleRegenBtn: { padding: 14, borderRadius: 14, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', alignItems: 'center' },
  capsuleRegenBtnText: { color: '#C4737A', fontSize: 14 },
  capsuleOutfitToggle: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.4)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.25)', alignItems: 'center', marginBottom: 12 },
  capsuleOutfitToggleText: { color: '#DDA0A7', fontSize: 13, fontWeight: '600' },
  outfitListWrap: { marginBottom: 16, gap: 8 },
  outfitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)', gap: 10 },
  outfitCardNum: { fontSize: 11, color: 'rgba(196,115,122,0.5)', fontWeight: '700', minWidth: 24, textAlign: 'center' },
  outfitCardPieces: { flex: 1, flexDirection: 'row', gap: 8 },
  outfitPiece: { flex: 1, alignItems: 'center' },
  outfitPieceImage: { width: '100%', height: 60, borderRadius: 8, resizeMode: 'contain', backgroundColor: 'transparent', marginBottom: 3 },
  outfitPieceEmpty: { width: '100%', height: 60, borderRadius: 8, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  outfitPieceName: { fontSize: 9, color: '#FBF3EF', fontWeight: '500', textAlign: 'center' },
  outfitPieceCat: { fontSize: 8, color: '#C4737A', textAlign: 'center' },
  outfitListMore: { color: 'rgba(196,115,122,0.5)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  capsuleSectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  capsuleSectionTitle: { fontSize: 15, color: '#FBF3EF', fontWeight: '700' },
  capsuleAddBtn: { backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  capsuleAddBtnText: { color: '#C4737A', fontSize: 12, fontWeight: '600' },
  capsuleEmpty: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  capsuleEmptyText: { color: '#C4737A', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  capsuleEmptyHint: { color: 'rgba(196,115,122,0.5)', fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
  capsuleDivider: { height: 1, backgroundColor: 'rgba(196,115,122,0.2)', marginVertical: 20 },

  // Köp
  wishScroll: { padding: 16, paddingBottom: 100 },
  wishHint: { fontSize: 11, color: 'rgba(196,115,122,0.4)', fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  wishItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', minHeight: 76 },
  reorderCol: { alignItems: 'center', gap: 2 },
  dragDots: { color: 'rgba(196,115,122,0.3)', fontSize: 14 },
  arrowBtn: { width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(122,24,40,0.6)', alignItems: 'center', justifyContent: 'center' },
  arrowBtnDisabled: { opacity: 0.15 },
  arrowText: { color: '#C4737A', fontSize: 9, fontWeight: '700' },
  priorityBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#9E2035', alignItems: 'center', justifyContent: 'center' },
  priorityNum: { color: '#FBF3EF', fontSize: 11, fontWeight: '700' },
  wishImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'transparent' },
  wishImageEmpty: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)', borderStyle: 'dashed' },
  wishInfo: { flex: 1 },
  wishName: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  wishMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  wishMetaText: { fontSize: 10, color: '#C4737A' },
  outfitBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  outfitBadgeText: { fontSize: 10, color: '#DDA0A7' },
  deleteBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.6)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#C4737A', fontSize: 13 },

  // Sälj
  saleScroll: { padding: 16, paddingBottom: 100 },
  saleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  archivedItem: { opacity: 0.7 },
  saleImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'transparent' },
  saleImageEmpty: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  saleInfo: { flex: 1 },
  saleName: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  saleCategory: { fontSize: 11, color: '#C4737A', marginTop: 2 },
  soldTag: { fontSize: 11, color: '#DDA0A7', marginTop: 4, fontStyle: 'italic' },
  saleActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  soldBtn: { backgroundColor: '#9E2035', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  soldBtnText: { color: '#FBF3EF', fontSize: 12, fontWeight: '600' },
  removeBtn: { backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  removeBtnText: { color: '#C4737A', fontSize: 12 },
  archiveToggleBtn: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', alignItems: 'center' },
  archiveToggleBtnText: { color: '#C4737A', fontSize: 14 },
  backToSale: { marginBottom: 16 },
  backToSaleText: { color: '#C4737A', fontSize: 15 },
  archiveTitle: { fontSize: 22, fontWeight: 'bold', color: '#FBF3EF', marginBottom: 16 },

  // Sale picker modal
  salePickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  salePickerImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: 'transparent' },
  salePickerImageEmpty: { width: 56, height: 56, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  salePickerInfo: { flex: 1, gap: 2 },
  salePickerName: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  salePickerCategory: { fontSize: 11, color: '#C4737A' },
  salePickerStats: { flexDirection: 'row', gap: 4, marginTop: 2 },
  salePickerStat: { fontSize: 11, color: 'rgba(196,115,122,0.6)', fontStyle: 'italic' },
  addSaleBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#9E2035', alignItems: 'center', justifyContent: 'center' },
  addSaleBtnText: { color: '#FBF3EF', fontSize: 18, fontWeight: '600' },

  // Modal (shared)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E0509', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FBF3EF' },
  modalClose: { fontSize: 18, color: '#C4737A', padding: 4 },
  modalLabel: { color: '#FBF3EF', fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  modalInput: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 14, color: '#FBF3EF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', marginBottom: 4 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  pillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  pillText: { color: '#C4737A', fontSize: 13 },
  pillTextActive: { color: '#FBF3EF' },
  modalSaveBtn: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  modalSaveBtnText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },

  // Image picker in modal
  imagePicker: { borderRadius: 16, height: 160, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(196,115,122,0.3)', borderStyle: 'dashed', marginBottom: 8, overflow: 'hidden', backgroundColor: 'rgba(122,24,40,0.3)' },
  imagePickerPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerInner: { alignItems: 'center', gap: 6 },
  imagePickerEmoji: { fontSize: 32 },
  imagePickerText: { color: '#C4737A', fontSize: 13 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, alignItems: 'center' },
  imageOverlayText: { color: '#FBF3EF', fontSize: 12 },
})