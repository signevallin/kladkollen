import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Alert,
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

const CATEGORIES = ['Alla', 'Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SEASONS = ['Alla', 'Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = ['Alla', 'Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']
const STYLE_TAGS = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']

export default function MyOutfits() {
  const [outfits, setOutfits] = useState([])
  const [garments, setGarments] = useState([])        // owned garments
  const [wishlist, setWishlist] = useState([])         // wishlist items
  const [creating, setCreating] = useState(false)
  const [selectedGarments, setSelectedGarments] = useState([])
  const [outfitName, setOutfitName] = useState('')
  const [openDropdown, setOpenDropdown] = useState(null)
  const [activeCategory, setActiveCategory] = useState('Alla')
  const [activeSeason, setActiveSeason] = useState('Alla')
  const [activeColor, setActiveColor] = useState('Alla')
  const [activeStyle, setActiveStyle] = useState('Alla')
  const [filteredGarments, setFilteredGarments] = useState([])
  const [activeStyleFilter, setActiveStyleFilter] = useState('Alla')
  const [showWishlistItems, setShowWishlistItems] = useState(true)

  useFocusEffect(
    useCallback(() => {
      fetchOutfits()
      fetchGarments()
      fetchWishlist()
    }, [])
  )

  async function fetchOutfits() {
    const { data } = await supabase
      .from('outfits')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setOutfits(data)
  }

  async function fetchGarments() {
    const { data } = await supabase.from('garments').select('*').eq('archived', false)
    if (data) {
      setGarments(data)
      setFilteredGarments(data)
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
    if (data) setWishlist(data)
  }

  const filteredOutfits = activeStyleFilter === 'Alla'
    ? outfits
    : outfits.filter(o => o.style === activeStyleFilter)

  function toggleGarment(garment: any) {
    setSelectedGarments(prev => {
      const exists = prev.find(g => g.id === garment.id)
      if (exists) return prev.filter(g => g.id !== garment.id)
      return [...prev, garment]
    })
  }

  async function saveManualOutfit() {
    if (selectedGarments.length === 0) {
      Alert.alert('Välj minst ett plagg!')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const name = outfitName.trim() || `Outfit ${new Date().toLocaleDateString('sv-SE')}`

    const garmentIds = selectedGarments.filter(g => !g.isWishlist).map(g => g.id)
    const garmentNames = selectedGarments.map(g => g.name)
    const imageUrls = selectedGarments.map(g => g.image_url).filter(Boolean)

    const { error } = await supabase.from('outfits').insert([{
      user_id: user?.id,
      name,
      garment_ids: garmentIds,
      garment_names: garmentNames,
      image_urls: imageUrls,
      style: activeStyle !== 'Alla' ? activeStyle : null,
    }])

    if (error) {
      Alert.alert('Något gick fel', error.message)
    } else {
      Alert.alert('Outfit sparad! 🍒')
      setCreating(false)
      setSelectedGarments([])
      setOutfitName('')
      fetchOutfits()
    }
  }

  async function deleteOutfit(id: string) {
    Alert.alert('Ta bort outfit', 'Är du säker?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort', style: 'destructive',
        onPress: async () => {
          await supabase.from('outfits').delete().eq('id', id)
          fetchOutfits()
        }
      }
    ])
  }

  function applyGarmentFilters(category: string, season: string, color: string) {
    let result = garments
    if (category !== 'Alla') result = result.filter(g => g.category === category)
    if (season !== 'Alla') result = result.filter(g => g.season?.includes(season))
    if (color !== 'Alla') result = result.filter(g => g.color === color)
    setFilteredGarments(result)
  }

  function handleCategory(cat: string) { setActiveCategory(cat); setOpenDropdown(null); applyGarmentFilters(cat, activeSeason, activeColor) }
  function handleSeason(s: string) { setActiveSeason(s); setOpenDropdown(null); applyGarmentFilters(activeCategory, s, activeColor) }
  function handleColor(c: string) { setActiveColor(c); setOpenDropdown(null); applyGarmentFilters(activeCategory, activeSeason, c) }

  async function wearOutfit(outfit: any) {
    const today = new Date().toISOString().split('T')[0]
    const ids = outfit.garment_ids || []
    for (const gid of ids) {
      const { data } = await supabase.from('garments').select('times_worn').eq('id', gid).single()
      await supabase.from('garments').update({ times_worn: (data?.times_worn || 0) + 1, last_worn: today }).eq('id', gid)
    }
    Alert.alert('Outfit registrerad! 🍒', `${ids.length} plagg markerade som använda idag.`)
  }

  // Wishlist-items dekorerade med isWishlist-flagga
  const wishlistAsGarments = wishlist.map(w => ({
    ...w,
    isWishlist: true,
    times_worn: 0,
    season: null,
    color: null,
  }))

  if (creating) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.createHeader}>
            <TouchableOpacity onPress={() => { setCreating(false); setSelectedGarments([]) }}>
              <Text style={styles.cancelText}>✕ Avbryt</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Skapa outfit</Text>
            <TouchableOpacity onPress={saveManualOutfit}>
              <Text style={styles.saveText}>Spara</Text>
            </TouchableOpacity>
          </View>

          {selectedGarments.length > 0 && (
            <View style={styles.selectedPreview}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectedRow}>
                  {selectedGarments.map((g: any) => (
                    <View key={g.id} style={styles.selectedItem}>
                      {g.image_url ? (
                        <Image source={{ uri: g.image_url }} style={[styles.selectedImage, g.isWishlist && styles.wishlistImageBorder]} />
                      ) : (
                        <View style={[styles.selectedImageEmpty, g.isWishlist && styles.wishlistImageEmptyBorder]}>
                          <Text style={{ fontSize: 20 }}>{g.isWishlist ? '🛍️' : '👗'}</Text>
                        </View>
                      )}
                      {g.isWishlist && (
                        <View style={styles.notOwnedBadgeTiny}>
                          <Text style={styles.notOwnedBadgeTinyText}>Äger ej</Text>
                        </View>
                      )}
                      <Text style={styles.selectedName} numberOfLines={1}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <Text style={styles.label}>Namnge din outfit</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="t.ex. Fredagslook 🍒"
            placeholderTextColor="rgba(196,115,122,0.4)"
            value={outfitName}
            onChangeText={setOutfitName}
          />

          <Text style={styles.label}>Stil</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {['Alla', ...STYLE_TAGS].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, activeStyle === s && styles.pillActive]}
                  onPress={() => setActiveStyle(s)}
                >
                  <Text style={[styles.pillText, activeStyle === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Välj plagg från garderoben</Text>
          <View style={styles.filterBar}>
            {[
              { key: 'category', label: 'Kategori', active: activeCategory },
              { key: 'season', label: 'Säsong', active: activeSeason },
              { key: 'color', label: 'Färg', active: activeColor },
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

          {/* Garderob-plagg */}
          <View style={styles.garmentGrid}>
            {filteredGarments.map((g: any) => {
              const selected = selectedGarments.find(s => s.id === g.id)
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.garmentItem, selected && styles.garmentItemSelected]}
                  onPress={() => toggleGarment(g)}
                >
                  {g.image_url ? (
                    <Image source={{ uri: g.image_url }} style={styles.garmentImage} />
                  ) : (
                    <View style={styles.garmentImageEmpty}>
                      <Text style={{ fontSize: 22 }}>👗</Text>
                    </View>
                  )}
                  {selected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                  <Text style={styles.garmentName} numberOfLines={1}>{g.name}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Köplista-sektion */}
          {wishlist.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.wishlistToggle}
                onPress={() => setShowWishlistItems(!showWishlistItems)}
              >
                <View style={styles.wishlistToggleLeft}>
                  <Text style={styles.wishlistToggleIcon}>🛍️</Text>
                  <View>
                    <Text style={styles.wishlistToggleTitle}>Köplista ({wishlist.length})</Text>
                    <Text style={styles.wishlistToggleSub}>Plagg du planerar att köpa</Text>
                  </View>
                </View>
                <Text style={styles.wishlistToggleArrow}>{showWishlistItems ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showWishlistItems && (
                <View style={styles.garmentGrid}>
                  {wishlistAsGarments.map((g: any) => {
                    const selected = selectedGarments.find(s => s.id === g.id)
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.garmentItem, styles.wishlistGarmentItem, selected && styles.garmentItemSelected]}
                        onPress={() => toggleGarment(g)}
                      >
                        {g.image_url ? (
                          <Image source={{ uri: g.image_url }} style={[styles.garmentImage, { opacity: 0.85 }]} />
                        ) : (
                          <View style={[styles.garmentImageEmpty, styles.wishlistImageEmptyStyle]}>
                            <Text style={{ fontSize: 22 }}>🛍️</Text>
                          </View>
                        )}
                        {selected && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                        {/* "Äger ej"-badge */}
                        <View style={styles.notOwnedBadge}>
                          <Text style={styles.notOwnedBadgeText}>Äger ej</Text>
                        </View>
                        <Text style={styles.garmentName} numberOfLines={1}>{g.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    )
  }

  // --- LIST VIEW ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mina outfits</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreating(true)}>
            <Text style={styles.createBtnText}>+ Skapa</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
            {['Alla', ...STYLE_TAGS].map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, activeStyleFilter === s && styles.pillActive]}
                onPress={() => setActiveStyleFilter(s)}
              >
                <Text style={[styles.pillText, activeStyleFilter === s && styles.pillTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {outfits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Inga outfits sparade än!{'\n'}Skapa din första eller generera via AI 🍒
            </Text>
            <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/outfit')}>
              <Text style={styles.goBtnText}>✨ Generera med AI</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOutfits.map((outfit: any) => (
            <TouchableOpacity
              key={outfit.id}
              style={styles.outfitCard}
              onPress={() => wearOutfit(outfit)}
              onLongPress={() => deleteOutfit(outfit.id)}
            >
              <View style={styles.outfitCardHeader}>
                <Text style={styles.outfitName}>{outfit.name}</Text>
                <Text style={styles.outfitDate}>
                  {new Date(outfit.created_at).toLocaleDateString('sv-SE')}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.outfitImages}>
                  {(outfit.image_urls || []).map((url: string, i: number) => (
                    <Image key={i} source={{ uri: url }} style={styles.outfitImage} />
                  ))}
                  {(outfit.garment_names || [])
                    .filter((_: any, i: number) => !outfit.image_urls?.[i])
                    .map((name: string, i: number) => (
                      <View key={`emoji-${i}`} style={styles.outfitImageEmpty}>
                        <Text style={{ fontSize: 24 }}>👗</Text>
                      </View>
                    ))}
                </View>
              </ScrollView>
              {outfit.garment_names && (
                <Text style={styles.outfitGarments}>{outfit.garment_names.join(' · ')}</Text>
              )}
              <Text style={styles.holdToDelete}>Håll inne för att ta bort</Text>
              <Text style={styles.tapToWear}>Tryck för att registrera som använd idag</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FBF3EF' },
  createBtn: { backgroundColor: '#9E2035', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  createBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },
  createHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cancelText: { color: '#C4737A', fontSize: 14 },
  saveText: { color: '#DDA0A7', fontSize: 14, fontWeight: '600' },
  nameInput: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 14, color: '#FBF3EF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', marginBottom: 16 },
  label: { color: '#FBF3EF', fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  selectedPreview: { marginBottom: 16, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 12 },
  selectedRow: { flexDirection: 'row', gap: 10 },
  selectedItem: { alignItems: 'center', width: 64 },
  selectedImage: { width: 60, height: 60, borderRadius: 10 },
  selectedImageEmpty: { width: 60, height: 60, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center' },
  wishlistImageBorder: { borderWidth: 2, borderColor: '#C9A96E', borderRadius: 10 },
  wishlistImageEmptyBorder: { borderWidth: 2, borderColor: 'rgba(201,169,110,0.5)', borderStyle: 'dashed' },
  notOwnedBadgeTiny: { backgroundColor: 'rgba(201,169,110,0.3)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  notOwnedBadgeTinyText: { fontSize: 7, color: '#C9A96E', fontWeight: '600' },
  selectedName: { fontSize: 9, color: '#C4737A', marginTop: 4, textAlign: 'center' },

  // Garment grid
  garmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  garmentItem: { width: '30%', alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  garmentItemSelected: { borderColor: '#9E2035', borderWidth: 2, backgroundColor: 'rgba(158,32,53,0.25)' },
  garmentImage: { width: '100%', height: 70, borderRadius: 10, marginBottom: 4 },
  garmentImageEmpty: { width: '100%', height: 70, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  checkmark: { position: 'absolute', top: 6, right: 6, backgroundColor: '#9E2035', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { color: '#FBF3EF', fontSize: 11, fontWeight: 'bold' },
  garmentName: { fontSize: 10, color: '#C4737A', textAlign: 'center' },

  // Wishlist items in grid
  wishlistGarmentItem: {
    borderColor: 'rgba(201,169,110,0.35)',
    backgroundColor: 'rgba(201,169,110,0.06)',
  },
  wishlistImageEmptyStyle: { backgroundColor: 'rgba(201,169,110,0.1)' },
  notOwnedBadge: {
    backgroundColor: 'rgba(201,169,110,0.25)',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
    marginBottom: 2, alignSelf: 'center',
  },
  notOwnedBadgeText: { fontSize: 8, color: '#C9A96E', fontWeight: '700', letterSpacing: 0.3 },

  // Wishlist toggle header
  wishlistToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(201,169,110,0.1)', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(201,169,110,0.25)',
  },
  wishlistToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wishlistToggleIcon: { fontSize: 22 },
  wishlistToggleTitle: { fontSize: 14, fontWeight: '600', color: '#FBF3EF' },
  wishlistToggleSub: { fontSize: 11, color: 'rgba(201,169,110,0.6)', marginTop: 1 },
  wishlistToggleArrow: { color: '#C9A96E', fontSize: 13 },

  // Filters
  filterBar: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  filterBtnText: { color: '#C4737A', fontSize: 12, fontWeight: '500' },
  filterBtnTextActive: { color: '#FBF3EF' },
  dropdown: { marginBottom: 10, backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  dropdownRow: { flexDirection: 'row', gap: 8 },
  dropdownPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  dropdownPillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  dropdownPillText: { color: '#C4737A', fontSize: 12 },
  dropdownPillTextActive: { color: '#FBF3EF' },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  pillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  pillText: { color: '#C4737A', fontSize: 13 },
  pillTextActive: { color: '#FBF3EF' },

  // Outfit cards
  empty: { alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyText: { color: '#C4737A', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  goBtn: { backgroundColor: '#9E2035', borderRadius: 14, padding: 14, paddingHorizontal: 24 },
  goBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },
  outfitCard: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)', gap: 10 },
  outfitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outfitName: { fontSize: 16, fontWeight: '600', color: '#FBF3EF' },
  outfitDate: { fontSize: 11, color: '#C4737A', fontStyle: 'italic' },
  outfitImages: { flexDirection: 'row', gap: 8 },
  outfitImage: { width: 70, height: 70, borderRadius: 12 },
  outfitImageEmpty: { width: 70, height: 70, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  outfitGarments: { fontSize: 11, color: '#C4737A', fontStyle: 'italic' },
  holdToDelete: { fontSize: 9, color: 'rgba(196,115,122,0.3)', textAlign: 'right' },
  tapToWear: { fontSize: 9, color: 'rgba(196,115,122,0.4)', textAlign: 'left', fontStyle: 'italic' },
})