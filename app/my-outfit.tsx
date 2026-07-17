import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  Dimensions,
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
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'

const CATEGORIES = ['Alla', 'Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SEASONS = ['Alla', 'Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = ['Alla', 'Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']
const STYLE_TAGS = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']

export default function MyOutfits() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { tab, create } = useLocalSearchParams()
  const [activeTab, setActiveTab] = useState<'kalender' | 'outfits' | 'kollage'>(
    create ? 'outfits' : tab === 'kollage' ? 'kollage' : tab === 'outfits' ? 'outfits' : 'kalender'
  )
  const [collages, setCollages] = useState<any[]>([])

  // Outfit state
  const [outfits, setOutfits] = useState<any[]>([])
  const [garments, setGarments] = useState<any[]>([])
  const [wishlist, setWishlist] = useState<any[]>([])
  const [creating, setCreating] = useState(!!create)

  // Öppnar skapa-outfit direkt när man kommer från "Lägg till outfit" i plusmenyn.
  useEffect(() => {
    if (create) { setActiveTab('outfits'); setCreating(true) }
  }, [create])
  const [selectedGarments, setSelectedGarments] = useState<any[]>([])
  const [outfitName, setOutfitName] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('Alla')
  const [activeSeason, setActiveSeason] = useState('Alla')
  const [activeColor, setActiveColor] = useState('Alla')
  const [activeStyle, setActiveStyle] = useState('Alla')
  const [filteredGarments, setFilteredGarments] = useState<any[]>([])
  const [activeStyleFilter, setActiveStyleFilter] = useState('Alla')
  const [showWishlistItems, setShowWishlistItems] = useState(true)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarEntries, setCalendarEntries] = useState<Record<string, any>>({})
  const [showOutfitPicker, setShowOutfitPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      fetchOutfits()
      fetchGarments()
      fetchWishlist()
      fetchCalendarEntries()
      fetchCollages()
    }, [])
  )

  async function fetchCollages() {
    const { data } = await supabase.from('collages').select('*').order('updated_at', { ascending: false })
    if (data) setCollages(data)
  }

  async function deleteCollage(id: string) {
    showConfirm('Ta bort kollage', 'Vill du ta bort kollaget?', async () => {
      await supabase.from('collages').delete().eq('id', id)
      fetchCollages()
    }, 'Ta bort', true)
  }

  async function fetchOutfits() {
    // Bara aktivt sparade outfits visas – outfits som bara fått ett betyg
    // (feedback till AI:n) ska inte synas här.
    const { data } = await supabase.from('outfits').select('*').eq('saved', true).order('created_at', { ascending: false })
    if (data) setOutfits(data)
  }

  async function fetchGarments() {
    const { data } = await supabase.from('garments').select('*').eq('archived', false)
    if (data) { setGarments(data); setFilteredGarments(data) }
  }

  async function fetchWishlist() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('wishlist').select('*').eq('user_id', user.id).order('sort_order', { ascending: true })
    if (data) setWishlist(data)
  }

  async function fetchCalendarEntries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('outfit_calendar')
      .select('*, outfits(*)')
      .eq('user_id', user.id)
    if (data) {
      const map: Record<string, any> = {}
      data.forEach(entry => { map[entry.date] = entry })
      setCalendarEntries(map)
    }
  }

  // Justerar plaggens användningsräkning (+1/-1). Vid +1 sätts last_worn till
  // datumet om det är senare än det befintliga.
  async function adjustGarmentWear(garmentIds: string[], delta: 1 | -1, wearDate?: string) {
    for (const gid of garmentIds) {
      const { data } = await supabase.from('garments').select('times_worn, last_worn').eq('id', gid).single()
      const update: any = { times_worn: Math.max(0, (data?.times_worn || 0) + delta) }
      if (delta > 0 && wearDate && (!data?.last_worn || wearDate > data.last_worn)) update.last_worn = wearDate
      await supabase.from('garments').update(update).eq('id', gid)
    }
  }

  async function assignOutfitToDate(outfit: any) {
    if (!selectedDate) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const prevEntry = calendarEntries[selectedDate]
    // Samma outfit igen → ingen förändring.
    if (prevEntry?.outfit_id === outfit.id) { setShowOutfitPicker(false); setSelectedDate(null); return }
    // Byter man ut en tidigare outfit på dagen: räkna ner den först.
    if (prevEntry?.outfits?.garment_ids?.length) {
      await adjustGarmentWear(prevEntry.outfits.garment_ids, -1)
    }

    await supabase.from('outfit_calendar').upsert({
      user_id: user.id,
      outfit_id: outfit.id,
      date: selectedDate,
    }, { onConflict: 'user_id,date' })

    // Att lägga en outfit på en dag räknas som att plaggen använts den dagen.
    await adjustGarmentWear(outfit.garment_ids || [], 1, selectedDate)

    setShowOutfitPicker(false)
    setSelectedDate(null)
    fetchCalendarEntries()
    fetchGarments()
  }

  async function removeOutfitFromDate(date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Räkna ner plaggen som var kopplade till dagen.
    const entry = calendarEntries[date]
    if (entry?.outfits?.garment_ids?.length) {
      await adjustGarmentWear(entry.outfits.garment_ids, -1)
    }
    await supabase.from('outfit_calendar').delete().eq('user_id', user.id).eq('date', date)
    setDayDetailDate(null)
    fetchCalendarEntries()
    fetchGarments()
  }

  // Calendar helpers
  function getCalendarDays() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    // Monday-first: 0=Mon ... 6=Sun
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const days: (Date | null)[] = []
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }

   
function dateStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isToday(date: Date) {
  const t = new Date()
  return date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
}

function isPast(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return d < today
}

  const calendarDays = getCalendarDays()
  const today = new Date()

  // Outfit functions
  const filteredOutfits = activeStyleFilter === 'Alla' ? outfits : outfits.filter(o => o.style === activeStyleFilter)

  function toggleGarment(garment: any) {
    setSelectedGarments(prev => {
      const exists = prev.find(g => g.id === garment.id)
      if (exists) return prev.filter(g => g.id !== garment.id)
      return [...prev, garment]
    })
  }

  async function saveManualOutfit() {
    if (selectedGarments.length === 0) { showAlert('Välj minst ett plagg!'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const name = outfitName.trim() || `Outfit ${new Date().toLocaleDateString('sv-SE')}`
    const garmentIds = selectedGarments.filter(g => !g.isWishlist).map(g => g.id)
    const garmentNames = selectedGarments.map(g => g.name)
    const imageUrls = selectedGarments.map(g => g.image_url).filter(Boolean)
    const { error } = await supabase.from('outfits').insert([{
      user_id: user?.id, name, garment_ids: garmentIds, garment_names: garmentNames,
      image_urls: imageUrls, style: activeStyle !== 'Alla' ? activeStyle : null,
    }])
    if (error) {
      showAlert('Något gick fel', error.message)
    } else {
      showAlert('Outfit sparad!')
      setCreating(false); setSelectedGarments([]); setOutfitName(''); fetchOutfits()
    }
  }

  async function deleteOutfit(id: string) {
    showConfirm('Ta bort outfit', 'Är du säker?', async () => {
      await supabase.from('outfits').delete().eq('id', id)
      fetchOutfits()
    }, 'Ta bort', true)
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
    showAlert('Outfit registrerad!', `${ids.length} plagg markerade som använda idag.`)
  }

  const wishlistAsGarments = wishlist.map(w => ({ ...w, isWishlist: true, times_worn: 0, season: null, color: null }))

  // Day detail modal
  const dayDetailEntry = dayDetailDate ? calendarEntries[dayDetailDate] : null

  // Create outfit view
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
                      {g.image_url
                        ? <SignedImage path={g.image_url} style={[styles.selectedImage, g.isWishlist && styles.wishlistImageBorder]} />
                        : <View style={[styles.selectedImageEmpty, g.isWishlist && styles.wishlistImageEmptyBorder]}><Text style={{ fontSize: 20 }}>{g.isWishlist ? '' : ''}</Text></View>
                      }
                      {g.isWishlist && <View style={styles.notOwnedBadgeTiny}><Text style={styles.notOwnedBadgeTinyText}>Äger ej</Text></View>}
                      <Text style={styles.selectedName} numberOfLines={1}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <Text style={styles.label}>Namnge din outfit</Text>
          <TextInput style={styles.nameInput} placeholder="t.ex. Fredagslook" placeholderTextColor={t.placeholder} value={outfitName} onChangeText={setOutfitName} />

          <Text style={styles.label}>Stil</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {['Alla', ...STYLE_TAGS].map(s => (
                <TouchableOpacity key={s} style={[styles.pill, activeStyle === s && styles.pillActive]} onPress={() => setActiveStyle(s)}>
                  <Text style={[styles.pillText, activeStyle === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Välj plagg från garderoben</Text>
          <View style={styles.filterBar}>
            {[{ key: 'category', label: 'Kategori', active: activeCategory }, { key: 'season', label: 'Säsong', active: activeSeason }, { key: 'color', label: 'Färg', active: activeColor }].map(f => (
              <TouchableOpacity key={f.key} style={[styles.filterBtn, f.active !== 'Alla' && styles.filterBtnActive]} onPress={() => setOpenDropdown(openDropdown === f.key ? null : f.key)}>
                <Text style={[styles.filterBtnText, f.active !== 'Alla' && styles.filterBtnTextActive]}>{f.active !== 'Alla' ? f.active : f.label} ▾</Text>
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
                      <TouchableOpacity key={item} style={[styles.dropdownPill, isActive && styles.dropdownPillActive]} onPress={() => openDropdown === 'category' ? handleCategory(item) : openDropdown === 'season' ? handleSeason(item) : handleColor(item)}>
                        <Text style={[styles.dropdownPillText, isActive && styles.dropdownPillTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={styles.garmentGrid}>
            {filteredGarments.map((g: any) => {
              const selected = selectedGarments.find(s => s.id === g.id)
              return (
                <TouchableOpacity key={g.id} style={[styles.garmentItem, selected && styles.garmentItemSelected]} onPress={() => toggleGarment(g)}>
                  {g.image_url ? <SignedImage path={g.image_url} style={styles.garmentImage} /> : <View style={styles.garmentImageEmpty} />}
                  {selected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
                  <Text style={styles.garmentName} numberOfLines={1}>{g.name}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {wishlist.length > 0 && (
            <>
              <TouchableOpacity style={styles.wishlistToggle} onPress={() => setShowWishlistItems(!showWishlistItems)}>
                <View style={styles.wishlistToggleLeft}>
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
                      <TouchableOpacity key={g.id} style={[styles.garmentItem, styles.wishlistGarmentItem, selected && styles.garmentItemSelected]} onPress={() => toggleGarment(g)}>
                        {g.image_url ? <SignedImage path={g.image_url} style={[styles.garmentImage, { opacity: 0.85 }]} /> : <View style={[styles.garmentImageEmpty, styles.wishlistImageEmptyStyle]} />}
                        {selected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
                        <View style={styles.notOwnedBadge}><Text style={styles.notOwnedBadgeText}>Äger ej</Text></View>
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

  return (
    <SafeAreaView style={styles.container}>

      {/* Outfit picker modal for calendar */}
      <Modal visible={showOutfitPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Välj outfit{selectedDate ? ` – ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}` : ''}
              </Text>
              <TouchableOpacity onPress={() => { setShowOutfitPicker(false); setSelectedDate(null) }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {outfits.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabText}>Inga outfits sparade ännu</Text>
                  <Text style={styles.emptyTabHint}>Skapa en outfit i Outfits-fliken först</Text>
                </View>
              ) : (
                outfits.map((outfit: any) => (
                  <TouchableOpacity key={outfit.id} style={styles.outfitPickerItem} onPress={() => assignOutfitToDate(outfit)}>
                    <View style={styles.outfitPickerImages}>
                      {(outfit.image_urls || []).slice(0, 3).map((url: string, i: number) => (
                        <SignedImage key={i} path={url} style={styles.outfitPickerImage} />
                      ))}
                      {(outfit.image_urls || []).length === 0 && (
                        <View style={styles.outfitPickerImageEmpty} />
                      )}
                    </View>
                    <View style={styles.outfitPickerInfo}>
                      <Text style={styles.outfitPickerName}>{outfit.name}</Text>
                      {outfit.garment_names && <Text style={styles.outfitPickerGarments} numberOfLines={1}>{outfit.garment_names.join(' · ')}</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Day detail modal */}
      <Modal visible={!!dayDetailDate} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {dayDetailDate && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {new Date(dayDetailDate + 'T12:00:00').toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>
                  <TouchableOpacity onPress={() => setDayDetailDate(null)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                {dayDetailEntry ? (
                  <>
                    <Text style={styles.dayDetailOutfitName}>{dayDetailEntry.outfits?.name}</Text>
                    {dayDetailEntry.outfits?.garment_names && (
                      <Text style={styles.dayDetailGarments}>{dayDetailEntry.outfits.garment_names.join(' · ')}</Text>
                    )}
                    <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12, maxHeight: 360 }}>
                      <View style={styles.dayDetailGrid}>
                        {(dayDetailEntry.outfits?.image_urls || []).map((url: string, i: number) => (
                          <SignedImage key={i} path={url} style={styles.dayDetailImage} resizeMode="contain" />
                        ))}
                      </View>
                    </ScrollView>
                    <View style={styles.dayDetailActions}>
                      <TouchableOpacity style={styles.dayDetailChangeBtn} onPress={() => { setDayDetailDate(null); setSelectedDate(dayDetailDate); setShowOutfitPicker(true) }}>
                        <Text style={styles.dayDetailChangeBtnText}>Byt outfit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dayDetailRemoveBtn} onPress={() => removeOutfitFromDate(dayDetailDate)}>
                        <Text style={styles.dayDetailRemoveBtnText}>Ta bort</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.dayDetailEmpty}>
                    <Text style={styles.dayDetailEmptyText}>Ingen outfit planerad</Text>
                    <TouchableOpacity style={styles.dayDetailAddBtn} onPress={() => { setDayDetailDate(null); setSelectedDate(dayDetailDate); setShowOutfitPicker(true) }}>
                      <Text style={styles.dayDetailAddBtnText}>＋ Välj outfit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Header + Tabs (always visible, outside ScrollView) ── */}
      <View style={styles.topArea}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mina outfits</Text>
          {activeTab === 'outfits' && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => setCreating(true)}>
              <Text style={styles.iconBtnText}>＋</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'kollage' && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/collage')} accessibilityLabel="Nytt kollage" accessibilityRole="button">
              <Text style={styles.iconBtnText}>＋</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabRow}>
          {(['kalender', 'outfits', 'kollage'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'kalender' ? 'Kalender' : tab === 'outfits' ? 'Outfits' : 'Kollage'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Scrollable content for kalender / outfits ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>

        {/* KALENDER */}
        {activeTab === 'kalender' && (
          <View style={styles.calendarContainer}>
            {/* Month navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                <Text style={styles.monthNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                <Text style={styles.monthNavArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map(d => <Text key={d} style={styles.weekdayLabel}>{d}</Text>)}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />
                const ds = dateStr(day)
                const entry = calendarEntries[ds]
                const todayStyle = isToday(day)
                const pastStyle = isPast(day)
                return (
                  <TouchableOpacity
                    key={ds}
                    style={[styles.dayCell, todayStyle && styles.dayCellToday, entry && (pastStyle ? styles.dayCellWorn : styles.dayCellPlanned)]}
                    onPress={() => setDayDetailDate(ds)}
                  >
                    <Text style={[styles.dayNumber, todayStyle && styles.dayNumberToday, pastStyle && !entry && styles.dayNumberPast]}>
                      {day.getDate()}
                    </Text>
                    {entry ? (
                      entry.outfits?.image_urls?.length ? (
                        <View style={styles.dayCellGrid}>
                          {entry.outfits.image_urls.slice(0, 4).map((url: string, i: number) => (
                            <SignedImage
                              key={i}
                              path={url}
                              style={entry.outfits.image_urls.length === 1 ? styles.dayCellImage : styles.dayCellImageSmall}
                              resizeMode="contain"
                            />
                          ))}
                        </View>
                      ) : <Text style={styles.dayCellOutfitDot}>●</Text>
                    ) : (
                      <Text style={styles.dayCellPlus}>＋</Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Legend */}
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotWorn]} />
                <Text style={styles.legendText}>Buren</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotPlanned]} />
                <Text style={styles.legendText}>Planerad</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotToday]} />
                <Text style={styles.legendText}>Idag</Text>
              </View>
            </View>
          </View>
        )}

        {/* OUTFITS */}
        {activeTab === 'outfits' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {['Alla', ...STYLE_TAGS].map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, activeStyleFilter === s && styles.pillActive]} onPress={() => setActiveStyleFilter(s)}>
                    <Text style={[styles.pillText, activeStyleFilter === s && styles.pillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {outfits.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Inga outfits sparade än!{'\n'}Skapa din första eller generera via AI</Text>
                <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/home')}>
                  <Text style={styles.goBtnText}>Generera med AI</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredOutfits.map((outfit: any) => (
                <TouchableOpacity key={outfit.id} style={styles.outfitCard} onPress={() => wearOutfit(outfit)} onLongPress={() => deleteOutfit(outfit.id)}>
                  <View style={styles.outfitCardHeader}>
                    <Text style={styles.outfitName}>{outfit.name}</Text>
                    <Text style={styles.outfitDate}>{new Date(outfit.created_at).toLocaleDateString('sv-SE')}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.outfitImages}>
                      {(outfit.image_urls || []).map((url: string, i: number) => (
                        <SignedImage key={i} path={url} style={styles.outfitImage} />
                      ))}
                      {(outfit.garment_names || []).filter((_: any, i: number) => !outfit.image_urls?.[i]).map((_: string, i: number) => (
                        <View key={`emoji-${i}`} style={styles.outfitImageEmpty} />
                      ))}
                    </View>
                  </ScrollView>
                  {outfit.garment_names && <Text style={styles.outfitGarments}>{outfit.garment_names.join(' · ')}</Text>}
                  <Text style={styles.holdToDelete}>Håll inne för att ta bort · Tryck för att registrera som använd</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* KOLLAGE */}
        {activeTab === 'kollage' && (
          <>
            {collages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Inga kollage än!{'\n'}Skapa moodboards med dina egna plagg</Text>
                <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/collage')}>
                  <Text style={styles.goBtnText}>Skapa kollage</Text>
                </TouchableOpacity>
              </View>
            ) : (
              collages.map((c: any) => {
                const previewW = Dimensions.get('window').width - 48
                const factor = c.canvas_width ? previewW / c.canvas_width : 0.25
                const previewH = Math.min((c.canvas_height || 400) * factor, 240)
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.collageCard}
                    onPress={() => router.push(`/collage?id=${c.id}`)}
                    onLongPress={() => deleteCollage(c.id)}
                  >
                    <View style={styles.outfitCardHeader}>
                      <Text style={styles.outfitName}>{c.name}</Text>
                      <Text style={styles.outfitDate}>{new Date(c.updated_at || c.created_at).toLocaleDateString('sv-SE')}</Text>
                    </View>
                    <View style={[styles.collagePreview, { height: previewH }]} pointerEvents="none">
                      {(c.items || []).map((it: any, i: number) => (
                        <View
                          key={it.key || i}
                          style={{
                            position: 'absolute',
                            left: (it.x || 0) * factor,
                            top: (it.y || 0) * factor,
                            width: (it.size || 140) * factor,
                            height: (it.size || 140) * factor,
                          }}
                        >
                          <SignedImage path={it.image_url} flat style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                        </View>
                      ))}
                    </View>
                    <Text style={styles.holdToDelete}>Tryck för att redigera · Håll inne för att ta bort</Text>
                  </TouchableOpacity>
                )
              })
            )}
          </>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  topArea: { paddingHorizontal: 24, paddingTop: 24 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  iconBtnText: { fontFamily: 'Lora_400Regular', fontSize: 18, color: t.textPrimary },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  tabActive: { backgroundColor: t.primary, borderColor: t.primary },
  tabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  tabTextActive: { color: t.onPrimary, fontWeight: '600' },

  // Calendar
  calendarContainer: { gap: 8 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthNavArrow: { fontFamily: 'Lora_400Regular', fontSize: 28, color: t.textSecondary, paddingHorizontal: 12 },
  monthTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { fontFamily: 'Poppins_600SemiBold', flex: 1, textAlign: 'center', fontSize: 11, color: t.textFaint },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayCellToday: { borderWidth: 1.5, borderColor: t.primary },
  // Burna outfits (dagar som passerat) = varm brun ton. Planerade (idag/framåt) = sval accent.
  dayCellWorn: { backgroundColor: t.primaryActive + '33' },
  dayCellPlanned: { backgroundColor: t.accent },
  dayNumber: { fontFamily: 'Lora_500Medium', fontSize: 11, color: t.textPrimary, marginBottom: 2 },
  dayNumberToday: { color: t.textSecondary, fontWeight: '700' },
  dayNumberPast: { color: t.textFaint },
  dayCellGrid: { width: 30, height: 30, flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellImage: { width: 28, height: 28, borderRadius: 6 },
  dayCellImageSmall: { width: 14, height: 14, borderRadius: 3 },
  dayCellOutfitDot: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textPrimary },
  dayCellPlus: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint },
  calendarLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDotWorn: { backgroundColor: t.primaryActive },
  legendDotPlanned: { backgroundColor: t.accent, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
  legendDotToday: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.primary },
  legendText: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint },

  // Outfit picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E0509', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary, flex: 1 },
  modalClose: { fontFamily: 'Lora_400Regular', fontSize: 18, color: t.textSecondary, paddingLeft: 12 },
  outfitPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  outfitPickerImages: { flexDirection: 'row', gap: 4 },
  outfitPickerImage: { width: 48, height: 48, borderRadius: 10 },
  outfitPickerImageEmpty: { width: 48, height: 48, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  outfitPickerInfo: { flex: 1 },
  outfitPickerName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  outfitPickerGarments: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 2 },
  emptyTab: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 15 },
  emptyTabHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, fontStyle: 'italic' },

  // Day detail modal
  dayDetailOutfitName: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary, marginBottom: 4 },
  dayDetailGarments: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
  dayDetailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  dayDetailImage: { width: '31%', aspectRatio: 1, borderRadius: 14 },
  dayDetailActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dayDetailChangeBtn: { flex: 1, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  dayDetailChangeBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 14 },
  dayDetailRemoveBtn: { flex: 1, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  dayDetailRemoveBtnText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 14 },
  dayDetailEmpty: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  dayDetailEmptyText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 14, fontStyle: 'italic' },
  dayDetailAddBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, paddingHorizontal: 24 },
  dayDetailAddBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },

  // Outfits
  createHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cancelText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  saveText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 14 },
  nameInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 16 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 12, marginTop: 8 },
  selectedPreview: { marginBottom: 16, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12 },
  selectedRow: { flexDirection: 'row', gap: 10 },
  selectedItem: { alignItems: 'center', width: 64 },
  selectedImage: { width: 60, height: 60, borderRadius: 10 },
  selectedImageEmpty: { width: 60, height: 60, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  wishlistImageBorder: { borderWidth: 2, borderColor: t.border, borderRadius: 10 },
  wishlistImageEmptyBorder: { borderWidth: 2, borderColor: t.surfaceMuted, borderStyle: 'dashed' },
  notOwnedBadgeTiny: { backgroundColor: t.surfaceMuted, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  notOwnedBadgeTinyText: { fontFamily: 'Poppins_600SemiBold', fontSize: 7, color: t.textSecondary },
  selectedName: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textSecondary, marginTop: 4, textAlign: 'center' },
  garmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  garmentItem: { width: '30%', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: t.border },
  garmentItemSelected: { borderColor: t.primary, borderWidth: 2, backgroundColor: 'rgba(64,45,33,0.25)' },
  garmentImage: { width: '100%', height: 70, borderRadius: 10, marginBottom: 4 },
  garmentImageEmpty: { width: '100%', height: 70, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  checkmark: { position: 'absolute', top: 6, right: 6, backgroundColor: t.primary, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 11 },
  garmentName: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary, textAlign: 'center' },
  wishlistGarmentItem: { borderColor: t.surfaceMuted, backgroundColor: t.surfaceMuted },
  wishlistImageEmptyStyle: { backgroundColor: t.surfaceMuted },
  notOwnedBadge: { backgroundColor: t.surfaceMuted, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 2, alignSelf: 'center' },
  notOwnedBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: t.textSecondary, letterSpacing: 0.3 },
  wishlistToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.surfaceMuted },
  wishlistToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wishlistToggleIcon: { fontFamily: 'Lora_400Regular', fontSize: 22 },
  wishlistToggleTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  wishlistToggleSub: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.surfaceMuted, marginTop: 1 },
  wishlistToggleArrow: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  filterBar: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  filterBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  filterBtnText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  filterBtnTextActive: { color: t.onPrimary },
  dropdown: { marginBottom: 10, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: t.border },
  dropdownRow: { flexDirection: 'row', gap: 8 },
  dropdownPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  dropdownPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  dropdownPillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  dropdownPillTextActive: { color: t.onPrimary },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  goBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, paddingHorizontal: 24 },
  goBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 14 },
  outfitCard: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: t.border, gap: 10 },
  collageCard: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: t.border, gap: 10 },
  collagePreview: { backgroundColor: 'rgba(248,234,222,0.6)', borderRadius: 14, overflow: 'hidden', position: 'relative' },
  outfitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outfitName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  outfitDate: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, fontStyle: 'italic' },
  outfitImages: { flexDirection: 'row', gap: 8 },
  outfitImage: { width: 70, height: 70, borderRadius: 12 },
  outfitImageEmpty: { width: 70, height: 70, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  outfitGarments: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, fontStyle: 'italic' },
  holdToDelete: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textFaint, textAlign: 'center' },
})