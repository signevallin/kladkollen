import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
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
const SEASONS = ['Alla', 'Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const COLORS = ['Alla', 'Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']
const STYLE_TAGS = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']

export default function MyOutfits() {
  const [activeTab, setActiveTab] = useState<'kalender' | 'outfits'>('kalender')

  // Outfit state
  const [outfits, setOutfits] = useState<any[]>([])
  const [garments, setGarments] = useState<any[]>([])
  const [wishlist, setWishlist] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
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
    }, [])
  )

  async function fetchOutfits() {
    const { data } = await supabase.from('outfits').select('*').order('created_at', { ascending: false })
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

  async function assignOutfitToDate(outfitId: string) {
    if (!selectedDate) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('outfit_calendar').upsert({
      user_id: user.id,
      outfit_id: outfitId,
      date: selectedDate,
    }, { onConflict: 'user_id,date' })
    setShowOutfitPicker(false)
    setSelectedDate(null)
    fetchCalendarEntries()
  }

  async function removeOutfitFromDate(date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('outfit_calendar').delete().eq('user_id', user.id).eq('date', date)
    setDayDetailDate(null)
    fetchCalendarEntries()
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
      showAlert('Outfit sparad! 🍒')
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
    showAlert('Outfit registrerad! 🍒', `${ids.length} plagg markerade som använda idag.`)
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
                        ? <Image source={{ uri: g.image_url }} style={[styles.selectedImage, g.isWishlist && styles.wishlistImageBorder]} />
                        : <View style={[styles.selectedImageEmpty, g.isWishlist && styles.wishlistImageEmptyBorder]}><Text style={{ fontSize: 20 }}>{g.isWishlist ? '🛍️' : '👗'}</Text></View>
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
          <TextInput style={styles.nameInput} placeholder="t.ex. Fredagslook 🍒" placeholderTextColor="rgba(196,115,122,0.4)" value={outfitName} onChangeText={setOutfitName} />

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
                  {g.image_url ? <Image source={{ uri: g.image_url }} style={styles.garmentImage} /> : <View style={styles.garmentImageEmpty}><Text style={{ fontSize: 22 }}>👗</Text></View>}
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
                      <TouchableOpacity key={g.id} style={[styles.garmentItem, styles.wishlistGarmentItem, selected && styles.garmentItemSelected]} onPress={() => toggleGarment(g)}>
                        {g.image_url ? <Image source={{ uri: g.image_url }} style={[styles.garmentImage, { opacity: 0.85 }]} /> : <View style={[styles.garmentImageEmpty, styles.wishlistImageEmptyStyle]}><Text style={{ fontSize: 22 }}>🛍️</Text></View>}
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
                  <TouchableOpacity key={outfit.id} style={styles.outfitPickerItem} onPress={() => assignOutfitToDate(outfit.id)}>
                    <View style={styles.outfitPickerImages}>
                      {(outfit.image_urls || []).slice(0, 3).map((url: string, i: number) => (
                        <Image key={i} source={{ uri: url }} style={styles.outfitPickerImage} />
                      ))}
                      {(outfit.image_urls || []).length === 0 && (
                        <View style={styles.outfitPickerImageEmpty}><Text style={{ fontSize: 24 }}>👗</Text></View>
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(dayDetailEntry.outfits?.image_urls || []).map((url: string, i: number) => (
                          <Image key={i} source={{ uri: url }} style={styles.dayDetailImage} />
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

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mina outfits</Text>
          {activeTab === 'outfits' && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => setCreating(true)}>
              <Text style={styles.iconBtnText}>＋</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['kalender', 'outfits'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'kalender' ? '📅 Kalender' : '👗 Outfits'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
                    style={[styles.dayCell, todayStyle && styles.dayCellToday, entry && styles.dayCellHasOutfit]}
                    onPress={() => setDayDetailDate(ds)}
                  >
                    <Text style={[styles.dayNumber, todayStyle && styles.dayNumberToday, pastStyle && !entry && styles.dayNumberPast]}>
                      {day.getDate()}
                    </Text>
                    {entry ? (
                      entry.outfits?.image_urls?.[0]
                        ? <Image source={{ uri: entry.outfits.image_urls[0] }} style={styles.dayCellImage} />
                        : <Text style={styles.dayCellOutfitDot}>●</Text>
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
                <View style={[styles.legendDot, { backgroundColor: '#9E2035' }]} />
                <Text style={styles.legendText}>Outfit planerad</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(158,32,53,0.25)' }]} />
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
                <Text style={styles.emptyText}>Inga outfits sparade än!{'\n'}Skapa din första eller generera via AI 🍒</Text>
                <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/outfit')}>
                  <Text style={styles.goBtnText}>✨ Generera med AI</Text>
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
                        <Image key={i} source={{ uri: url }} style={styles.outfitImage} />
                      ))}
                      {(outfit.garment_names || []).filter((_: any, i: number) => !outfit.image_urls?.[i]).map((_: string, i: number) => (
                        <View key={`emoji-${i}`} style={styles.outfitImageEmpty}><Text style={{ fontSize: 24 }}>👗</Text></View>
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
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#9E2035', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDA0A7' },
  iconBtnText: { fontSize: 18, color: '#FBF3EF' },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  tabActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  tabText: { color: '#C4737A', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#FBF3EF', fontWeight: '600' },

  // Calendar
  calendarContainer: { gap: 8 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthNavArrow: { fontSize: 28, color: '#C4737A', paddingHorizontal: 12 },
  monthTitle: { fontSize: 18, fontWeight: '600', color: '#FBF3EF' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: 'rgba(196,115,122,0.6)', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayCellToday: { backgroundColor: 'rgba(158,32,53,0.25)', borderWidth: 1, borderColor: 'rgba(158,32,53,0.5)' },
  dayCellHasOutfit: { backgroundColor: 'rgba(158,32,53,0.15)' },
  dayNumber: { fontSize: 11, color: '#FBF3EF', fontWeight: '500', marginBottom: 2 },
  dayNumberToday: { color: '#DDA0A7', fontWeight: '700' },
  dayNumberPast: { color: 'rgba(196,115,122,0.35)' },
  dayCellImage: { width: 26, height: 26, borderRadius: 6 },
  dayCellOutfitDot: { fontSize: 10, color: '#9E2035' },
  dayCellPlus: { fontSize: 12, color: 'rgba(196,115,122,0.2)' },
  calendarLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: 'rgba(196,115,122,0.6)' },

  // Outfit picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E0509', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FBF3EF', flex: 1 },
  modalClose: { fontSize: 18, color: '#C4737A', paddingLeft: 12 },
  outfitPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  outfitPickerImages: { flexDirection: 'row', gap: 4 },
  outfitPickerImage: { width: 48, height: 48, borderRadius: 10 },
  outfitPickerImageEmpty: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  outfitPickerInfo: { flex: 1 },
  outfitPickerName: { fontSize: 14, fontWeight: '600', color: '#FBF3EF' },
  outfitPickerGarments: { fontSize: 11, color: '#C4737A', marginTop: 2 },
  emptyTab: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTabText: { color: '#C4737A', fontSize: 15, fontWeight: '500' },
  emptyTabHint: { color: 'rgba(196,115,122,0.5)', fontSize: 13, fontStyle: 'italic' },

  // Day detail modal
  dayDetailOutfitName: { fontSize: 20, fontWeight: 'bold', color: '#FBF3EF', marginBottom: 4 },
  dayDetailGarments: { fontSize: 12, color: '#C4737A', fontStyle: 'italic' },
  dayDetailImage: { width: 90, height: 90, borderRadius: 14 },
  dayDetailActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dayDetailChangeBtn: { flex: 1, backgroundColor: 'rgba(122,24,40,0.4)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  dayDetailChangeBtnText: { color: '#C4737A', fontSize: 14, fontWeight: '600' },
  dayDetailRemoveBtn: { flex: 1, backgroundColor: 'rgba(122,24,40,0.2)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  dayDetailRemoveBtnText: { color: 'rgba(196,115,122,0.6)', fontSize: 14 },
  dayDetailEmpty: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  dayDetailEmptyText: { color: 'rgba(196,115,122,0.5)', fontSize: 14, fontStyle: 'italic' },
  dayDetailAddBtn: { backgroundColor: '#9E2035', borderRadius: 14, padding: 14, paddingHorizontal: 24 },
  dayDetailAddBtnText: { color: '#FBF3EF', fontSize: 15, fontWeight: '600' },

  // Outfits
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
  garmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  garmentItem: { width: '30%', alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  garmentItemSelected: { borderColor: '#9E2035', borderWidth: 2, backgroundColor: 'rgba(158,32,53,0.25)' },
  garmentImage: { width: '100%', height: 70, borderRadius: 10, marginBottom: 4 },
  garmentImageEmpty: { width: '100%', height: 70, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  checkmark: { position: 'absolute', top: 6, right: 6, backgroundColor: '#9E2035', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { color: '#FBF3EF', fontSize: 11, fontWeight: 'bold' },
  garmentName: { fontSize: 10, color: '#C4737A', textAlign: 'center' },
  wishlistGarmentItem: { borderColor: 'rgba(201,169,110,0.35)', backgroundColor: 'rgba(201,169,110,0.06)' },
  wishlistImageEmptyStyle: { backgroundColor: 'rgba(201,169,110,0.1)' },
  notOwnedBadge: { backgroundColor: 'rgba(201,169,110,0.25)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 2, alignSelf: 'center' },
  notOwnedBadgeText: { fontSize: 8, color: '#C9A96E', fontWeight: '700', letterSpacing: 0.3 },
  wishlistToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(201,169,110,0.1)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(201,169,110,0.25)' },
  wishlistToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wishlistToggleIcon: { fontSize: 22 },
  wishlistToggleTitle: { fontSize: 14, fontWeight: '600', color: '#FBF3EF' },
  wishlistToggleSub: { fontSize: 11, color: 'rgba(201,169,110,0.6)', marginTop: 1 },
  wishlistToggleArrow: { color: '#C9A96E', fontSize: 13 },
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
  holdToDelete: { fontSize: 9, color: 'rgba(196,115,122,0.3)', textAlign: 'center' },
})