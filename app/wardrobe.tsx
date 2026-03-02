import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  FlatList,
  Image,
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
const SEASONS = ['Alla', 'Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = ['Alla', 'Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']

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

  useFocusEffect(
    useCallback(() => {
      fetchGarments()
      fetchWishlist()
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

  function handleSearch(text: string) {
    setSearch(text)
    applyFilters(text, activeCategory, activeSeason, activeColor, garments)
  }
  function handleCategory(cat: string) {
    setActiveCategory(cat); setOpenDropdown(null)
    applyFilters(search, cat, activeSeason, activeColor, garments)
  }
  function handleSeason(s: string) {
    setActiveSeason(s); setOpenDropdown(null)
    applyFilters(search, activeCategory, s, activeColor, garments)
  }
  function handleColor(c: string) {
    setActiveColor(c); setOpenDropdown(null)
    applyFilters(search, activeCategory, activeSeason, c, garments)
  }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Min garderob</Text>
          <Text style={[styles.subtitle, fontsLoaded && { fontFamily: 'DancingScript_400Regular', fontSize: 22 }]}>
            {garments.length} plagg
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {activeTab === 'nuvarande' && (
            <TouchableOpacity
              style={[styles.iconBtn, showFilters && styles.iconBtnActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.iconBtnText}>🔍</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/add-garment')}>
            <Text style={styles.iconBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        {['nuvarande', 'köp', 'sälj'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); setShowArchive(false) }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'köp' && wishlist.length > 0 ? ` (${wishlist.length})` : ''}
              {tab === 'sälj' && forSale.length > 0 ? ` (${forSale.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      {activeTab === 'köp' && (
        <ScrollView contentContainerStyle={styles.wishScroll}>
          {wishlist.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabIcon}>🛍️</Text>
              <Text style={styles.emptyTabText}>Din köplista är tom</Text>
              <Text style={styles.emptyTabHint}>
                Analysera en inspirationsbild{'\n'}för att lägga till plagg du saknar
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.wishHint}>Tryck ▲▼ för att prioritera · Klicka på ett plagg för att lägga till bild</Text>
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
                      >
                        <Text style={styles.arrowText}>▲</Text>
                      </TouchableOpacity>
                      <Text style={styles.dragDots}>⠿</Text>
                      <TouchableOpacity
                        style={[styles.arrowBtn, index === wishlist.length - 1 && styles.arrowBtnDisabled]}
                        onPress={() => moveWishItem(index, 'down')}
                        disabled={index === wishlist.length - 1}
                      >
                        <Text style={styles.arrowText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityNum}>{index + 1}</Text>
                    </View>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.wishImage} />
                    ) : (
                      <View style={styles.wishImageEmpty}>
                        <Text style={{ fontSize: 22 }}>🛍️</Text>
                      </View>
                    )}
                    <View style={styles.wishInfo}>
                      <Text style={styles.wishName}>{item.name}</Text>
                      {item.category ? <Text style={styles.wishCategory}>{item.category}</Text> : null}
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

      {activeTab === 'sälj' && (
        <ScrollView contentContainerStyle={styles.saleScroll}>
          {!showArchive ? (
            <>
              {forSale.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabText}>💰 Inga plagg till salu ännu</Text>
                  <Text style={styles.emptyTabHint}>Lägg till plagg via Statistik-fliken</Text>
                </View>
              ) : (
                forSale.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.saleItem}
                    onPress={() => router.push(`/garment-detail?id=${item.id}`)}
                  >
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
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.saleItem, styles.archivedItem]}
                    onPress={() => router.push(`/garment-detail?id=${item.id}`)}
                  >
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

      <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingBottom: 12 },
  headerButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9E2035', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDA0A7' },
  iconBtnActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  iconBtnText: { fontSize: 16 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  tabActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  tabText: { color: '#C4737A', fontSize: 12, fontWeight: '500' },
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
  itemImage: { width: '100%', height: 90, borderRadius: 10, marginBottom: 6, resizeMode: 'cover' },
  itemEmoji: { fontSize: 32, marginBottom: 6 },
  itemName: { fontSize: 11, color: '#FBF3EF', textAlign: 'center', fontWeight: '500' },
  itemCategory: { fontSize: 10, color: '#C4737A', textAlign: 'center', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#C4737A', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabIcon: { fontSize: 48, marginBottom: 12 },
  emptyTabText: { color: '#C4737A', fontSize: 16, marginBottom: 8, fontWeight: '500' },
  emptyTabHint: { color: 'rgba(196,115,122,0.5)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
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
  wishImage: { width: 52, height: 52, borderRadius: 10 },
  wishImageEmpty: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)', borderStyle: 'dashed' },
  wishInfo: { flex: 1 },
  wishName: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  wishCategory: { fontSize: 11, color: '#C4737A', marginTop: 2 },
  outfitBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  outfitBadgeText: { fontSize: 10, color: '#DDA0A7' },
  deleteBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.6)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#C4737A', fontSize: 13 },
  saleScroll: { padding: 16, paddingBottom: 100 },
  saleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  archivedItem: { opacity: 0.7 },
  saleImage: { width: 60, height: 60, borderRadius: 12 },
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
})