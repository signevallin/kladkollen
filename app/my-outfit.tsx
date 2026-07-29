import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { captureRef } from 'react-native-view-shot'
import BottomNav from '../components/BottomNav'
import OutfitShareCard from '../components/OutfitShareCard'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { CATEGORIES as CATEGORY_LIST, COLOR_NAMES, SEASONS as SEASON_LIST } from '../utils/constants'
import { cacheGet, cacheSet } from '../utils/cache'
import { showAlert, showConfirm } from '../utils/alert'
import { apiPost } from '../utils/api'
import { captureError } from '../utils/sentry'
import { loadPartner } from '../utils/household'
import { geocodeDestination, fetchTripWeather } from '../utils/trip'
import { useSettings } from '../utils/settings'

const CATEGORIES = ['Alla', ...CATEGORY_LIST]
const SEASONS = ['Alla', ...SEASON_LIST]
const COLORS = ['Alla', ...COLOR_NAMES]
const STYLE_TAGS = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const MONTHS = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']

const TRIP_KEY = 'kladkollen_trip'
const TRIP_CHECK_KEY = 'kladkollen_trip_checked'

export default function MyOutfits() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang } = useSettings()
  const locale = lang === 'en' ? 'en-GB' : 'sv-SE'
  const { tab, create } = useLocalSearchParams()
  const [activeTab, setActiveTab] = useState<'kalender' | 'outfits' | 'resa'>(
    create ? 'outfits' : tab === 'resa' ? 'resa' : tab === 'outfits' ? 'outfits' : 'kalender'
  )

  // Outfit state
  const [outfits, setOutfits] = useState<any[]>(() => cacheGet('myoutfit.outfits') ?? [])
  const [garments, setGarments] = useState<any[]>(() => cacheGet('myoutfit.garments') ?? [])
  const [wishlist, setWishlist] = useState<any[]>([])
  const [creating, setCreating] = useState(!!create)

  // Öppnar skapa-outfit direkt när man kommer från "Lägg till outfit" i plusmenyn.
  useEffect(() => {
    if (create) { setActiveTab('outfits'); setCreating(true) }
  }, [create])
  const [selectedGarments, setSelectedGarments] = useState<any[]>([])
  const [outfitName, setOutfitName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('Alla')
  const [activeSeason, setActiveSeason] = useState('Alla')
  const [activeColor, setActiveColor] = useState('Alla')
  const [activeStyle, setActiveStyle] = useState('Alla')
  const [filteredGarments, setFilteredGarments] = useState<any[]>(() => cacheGet('myoutfit.garments') ?? [])
  const [activeStyleFilter, setActiveStyleFilter] = useState('Alla')
  const [showOnlyLiked, setShowOnlyLiked] = useState(false)
  const [showWishlistItems, setShowWishlistItems] = useState(true)

  // Delning av en sparad outfit (samma dela-kort som på hemskärmen).
  const [sharing, setSharing] = useState(false)
  const [shareTarget, setShareTarget] = useState<any | null>(null)
  const [partnerLikedIds, setPartnerLikedIds] = useState<Set<string>>(new Set())
  const shareCardRef = useRef<View>(null)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarEntries, setCalendarEntries] = useState<Record<string, any>>(() => cacheGet('myoutfit.calendar') ?? {})
  const [showOutfitPicker, setShowOutfitPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null)

  // Resa (reseplanerare) state
  const [tripDestination, setTripDestination] = useState('')
  const [tripVibe, setTripVibe] = useState('')
  const [tripMonth, setTripMonth] = useState(new Date())
  const [tripStartDate, setTripStartDate] = useState<string | null>(null)
  const [tripEndDate, setTripEndDate] = useState<string | null>(null)
  const [tripLoading, setTripLoading] = useState(false)
  const [tripResult, setTripResult] = useState<any | null>(null)
  const [tripChecked, setTripChecked] = useState<Record<string, boolean>>({})
  const [scheduleOutfit, setScheduleOutfit] = useState<any | null>(null)

  useFocusEffect(
    useCallback(() => {
      fetchOutfits()
      fetchGarments()
      fetchWishlist()
      fetchCalendarEntries()
    }, [])
  )

  // Ladda ev. sparad reseplan (och avprickning) en gång så den överlever
  // flikbyten och appstarter.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIP_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          setTripResult(parsed)
          // Spegla ev. lokalt sparad resa (t.ex. planerad före denna spegling
          // fanns) till databasen så en sambo kan se den i läsläge.
          const { data: { user } } = await supabase.auth.getUser()
          if (user) supabase.from('trips').upsert({ user_id: user.id, data: parsed, updated_at: new Date().toISOString() }).then(() => {}, () => {})
        }
        const chk = await AsyncStorage.getItem(TRIP_CHECK_KEY)
        if (chk) setTripChecked(JSON.parse(chk))
      } catch { /* ignorera */ }
    })()
  }, [])

  async function fetchOutfits() {
    // Bara aktivt sparade outfits visas – outfits som bara fått ett betyg
    // (feedback till AI:n) ska inte synas här.
    const { data } = await supabase.from('outfits').select('*').eq('saved', true).order('created_at', { ascending: false })
    if (data) { setOutfits(data); cacheSet('myoutfit.outfits', data) }
    // Outfits som partnern gillat. Räkna bara likes från den NUVARANDE partnern –
    // efter en isärkoppling finns ingen partner, så inga hjärtan ligger kvar.
    const { data: likes } = await supabase.from('outfit_likes').select('outfit_id, user_id')
    const { partner } = await loadPartner()
    if (partner && likes) {
      setPartnerLikedIds(new Set(likes.filter((l: any) => l.user_id === partner.id).map((l: any) => l.outfit_id)))
    } else {
      setPartnerLikedIds(new Set())
    }
  }

  async function fetchGarments() {
    const { data } = await supabase.from('garments').select('*').eq('archived', false).is('person_id', null)
    if (data) { setGarments(data); setFilteredGarments(data); cacheSet('myoutfit.garments', data) }
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
      setCalendarEntries(map); cacheSet('myoutfit.calendar', map)
    }
  }

  // Justerar plaggens användningsräkning (+1/-1) ATOMISKT via en RPC. Vid +1
  // sätts last_worn till datumet om det är senare än det befintliga. Kastar vid
  // fel så anroparen kan visa ett meddelande (ingen tyst misslyckad skrivning).
  async function adjustGarmentWear(garmentIds: string[], delta: 1 | -1, wearDate?: string) {
    if (!garmentIds?.length) return
    const { error } = await supabase.rpc('adjust_garment_wear', {
      p_ids: garmentIds,
      p_delta: delta,
      p_date: wearDate ?? null,
    })
    if (error) throw error
  }

  // Lägger en outfit på ett datum i kalendern och räknar plaggen som använda
  // den dagen. Delas av kalendern och "registrera som använd" i Outfits-listan.
  async function assignOutfitToDay(outfit: any, date: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const prevEntry = calendarEntries[date]
    // Samma outfit igen → ingen förändring.
    if (prevEntry?.outfit_id === outfit.id) return true
    let ok = false
    try {
      // Byter man ut en tidigare outfit på dagen: räkna ner den först.
      if (prevEntry?.outfits?.garment_ids?.length) {
        await adjustGarmentWear(prevEntry.outfits.garment_ids, -1)
      }
      const { error } = await supabase.from('outfit_calendar').upsert({
        user_id: user.id,
        outfit_id: outfit.id,
        date,
      }, { onConflict: 'user_id,date' })
      if (error) throw error
      // Att lägga en outfit på en dag räknas som att plaggen använts den dagen.
      await adjustGarmentWear(outfit.garment_ids || [], 1, date)
      ok = true
    } catch (e: any) {
      captureError(e, { where: 'assignOutfitToDay' })
      showAlert(tr('Kunde inte spara'), tr('Något gick fel – kontrollera din uppkoppling och försök igen.'))
    } finally {
      // Läs alltid om från databasen så UI:t speglar det faktiska läget.
      fetchCalendarEntries()
      fetchGarments()
    }
    return ok
  }

  async function assignOutfitToDate(outfit: any) {
    if (!selectedDate) return
    await assignOutfitToDay(outfit, selectedDate)
    setShowOutfitPicker(false)
    setSelectedDate(null)
  }

  async function removeOutfitFromDate(date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      // Räkna ner plaggen som var kopplade till dagen.
      const entry = calendarEntries[date]
      if (entry?.outfits?.garment_ids?.length) {
        await adjustGarmentWear(entry.outfits.garment_ids, -1)
      }
      const { error } = await supabase.from('outfit_calendar').delete().eq('user_id', user.id).eq('date', date)
      if (error) throw error
    } catch (e: any) {
      captureError(e, { where: 'removeOutfitFromDate' })
      showAlert(tr('Kunde inte ta bort'), tr('Något gick fel – kontrollera din uppkoppling och försök igen.'))
    } finally {
      setDayDetailDate(null)
      fetchCalendarEntries()
      fetchGarments()
    }
  }

  // Calendar helpers
  function getCalendarDays(month: Date = currentMonth) {
    const year = month.getFullYear()
    const m = month.getMonth()
    const firstDay = new Date(year, m, 1)
    const lastDay = new Date(year, m + 1, 0)
    // Monday-first: 0=Mon ... 6=Sun
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6
    const days: (Date | null)[] = []
    for (let i = 0; i < startDow; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, m, d))
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
  const filteredOutfits = outfits.filter(o => {
    if (activeStyleFilter !== 'Alla' && o.style !== activeStyleFilter) return false
    if (showOnlyLiked && !partnerLikedIds.has(o.id)) return false
    return true
  })

  function toggleGarment(garment: any) {
    setSelectedGarments(prev => {
      const exists = prev.find(g => g.id === garment.id)
      if (exists) return prev.filter(g => g.id !== garment.id)
      return [...prev, garment]
    })
  }

  // Öppnar redigering av en befintlig outfit med dess plagg förvalda.
  function startEditOutfit(outfit: any) {
    const ids: string[] = outfit.garment_ids || []
    const picked = ids.map(id => garments.find(g => g.id === id)).filter(Boolean)
    setSelectedGarments(picked)
    setOutfitName(outfit.name || '')
    setEditingId(outfit.id)
    setCreating(true)
  }

  async function saveManualOutfit() {
    if (selectedGarments.length === 0) { showAlert(tr('Välj minst ett plagg!')); return }
    const { data: { user } } = await supabase.auth.getUser()
    const name = outfitName.trim() || `Outfit ${new Date().toLocaleDateString(locale)}`
    const garmentIds = selectedGarments.filter(g => !g.isWishlist).map(g => g.id)
    const garmentNames = selectedGarments.map(g => g.name)
    const imageUrls = selectedGarments.map(g => g.image_url).filter(Boolean)

    const error = editingId
      ? (await supabase.from('outfits').update({ name, garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls }).eq('id', editingId)).error
      : (await supabase.from('outfits').insert([{
          user_id: user?.id, name, garment_ids: garmentIds, garment_names: garmentNames,
          image_urls: imageUrls, style: activeStyle !== 'Alla' ? activeStyle : null,
        }])).error

    if (error) {
      showAlert(tr('Något gick fel'), error.message)
    } else {
      showAlert(editingId ? tr('Outfit uppdaterad!') : tr('Outfit sparad!'))
      setCreating(false); setSelectedGarments([]); setOutfitName(''); setEditingId(null); fetchOutfits()
    }
  }

  async function deleteOutfit(id: string) {
    showConfirm(tr('Ta bort outfit'), tr('Är du säker?'), async () => {
      await supabase.from('outfits').delete().eq('id', id)
      fetchOutfits()
    }, tr('Ta bort'), true)
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
    // Lägg outfiten på dagens datum i kalendern (och räkna plaggen som använda).
    const ok = await assignOutfitToDay(outfit, today)
    if (ok) showAlert(tr('Outfit registrerad!'), tr('Den ligger nu på dagens datum i kalendern och plaggen räknas som använda.'))
  }

  // Delar en sparad outfit som en bild – samma varumärkta dela-kort som på
  // hemskärmen. Bygger itemsWithImages ur outfitens namn + bilder och renderar
  // dem i en dold vy som fångas och delas.
  async function shareSavedOutfit(outfit: any) {
    if (sharing) return
    setSharing(true)
    const names: string[] = outfit.garment_names || []
    const urls: string[] = outfit.image_urls || []
    const items = names.length
      ? names.map((name, i) => ({ name, image_url: urls[i] ?? null }))
      : urls.map((url) => ({ name: '', image_url: url }))
    setShareTarget({ outfitName: outfit.name, itemsWithImages: items })
    try {
      // Ge den dolda dela-vyn ett ögonblick att rita klart bilderna.
      await new Promise(r => setTimeout(r, 350))
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Dela din outfit' })
      } else if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'Min outfit', text: outfit.name })
      } else {
        showAlert(tr('Delning stöds inte här'), tr('Öppna appen på din telefon för att dela din outfit.'))
      }
    } catch (e: any) {
      if (e?.message && !/cancel/i.test(e.message)) showAlert(tr('Kunde inte dela'), e.message)
    } finally {
      setSharing(false)
      setShareTarget(null)
    }
  }

  // ── Reseplanerare ──────────────────────────────────────────────────────────

  // Matchar ett AI-plaggnamn mot rätt plagg i garderoben (för bilder):
  // exakt → plaggnamnet innehåller AI-namnet → AI-namnet innehåller plaggnamnet.
  function matchGarment(name: string) {
    const target = (name || '').trim().toLowerCase()
    if (!target) return null
    let m = garments.find(g => (g.name || '').trim().toLowerCase() === target)
    if (!m) m = garments.find(g => (g.name || '').toLowerCase().includes(target))
    if (!m) {
      m = garments
        .filter(g => g.name && target.includes(g.name.toLowerCase()))
        .sort((a, b) => b.name.length - a.name.length)[0]
    }
    return m || null
  }

  // Bygger en kategorigrupperad lista av garderoben som AI:n kan packa ur.
  function buildTripGarmentList(list: any[]) {
    const byCat: Record<string, string[]> = {}
    for (const g of list) {
      const cat = g.category || 'Övrigt'
      const parts = [g.subcategory, g.color, Array.isArray(g.season) ? g.season.join('/') : g.season].filter(Boolean).join(', ')
      const line = parts ? `${g.name} (${parts})` : g.name
      ;(byCat[cat] ||= []).push(line)
    }
    return Object.entries(byCat)
      .map(([cat, items]) => `${cat.toUpperCase()}:\n${items.map(i => '- ' + i).join('\n')}`)
      .join('\n\n')
  }

  function handleTripDayPress(day: Date) {
    const ds = dateStr(day)
    if (!tripStartDate || (tripStartDate && tripEndDate)) {
      setTripStartDate(ds); setTripEndDate(null)
    } else if (ds < tripStartDate) {
      setTripStartDate(ds); setTripEndDate(null)
    } else {
      setTripEndDate(ds)
    }
  }

  function tripDayCount() {
    if (!tripStartDate || !tripEndDate) return 0
    const s = new Date(tripStartDate + 'T12:00:00')
    const e = new Date(tripEndDate + 'T12:00:00')
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  }

  async function generateTrip() {
    if (!tripDestination.trim()) { showAlert(tr('Skriv in en destination')); return }
    if (!tripStartDate || !tripEndDate) { showAlert(tr('Välj resans datum'), tr('Tryck på startdatum och sedan slutdatum i kalendern.')); return }
    if (garments.length === 0) { showAlert(tr('Tom garderob'), tr('Lägg till några plagg först så kan jag packa åt dig.')); return }

    setTripLoading(true)
    try {
      const geo = await geocodeDestination(tripDestination)
      if (!geo) {
        showAlert(tr('Hittade inte destinationen'), tr('Prova en annan stavning eller en större stad i närheten.'))
        return
      }
      const weather = await fetchTripWeather(geo.latitude, geo.longitude, tripStartDate, tripEndDate)
      const groupedList = buildTripGarmentList(garments)
      const start = new Date(tripStartDate + 'T12:00:00')
      const end = new Date(tripEndDate + 'T12:00:00')
      const days = tripDayCount()
      const dateLabel = `${start.toLocaleDateString(locale, { day: 'numeric', month: 'long' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`
      const monthLabel = start.getMonth() === end.getMonth() ? MONTHS[start.getMonth()] : `${MONTHS[start.getMonth()]}/${MONTHS[end.getMonth()]}`
      const destinationLabel = geo.country ? `${geo.name}, ${geo.country}` : geo.name

      const parsed = await apiPost('/api/pack-trip', {
        destination: destinationLabel,
        dateLabel,
        monthLabel,
        days,
        weatherSummary: weather.summary,
        groupedList,
        vibe: tripVibe.trim(),
      })

      const result = {
        climateNote: parsed.climateNote || weather.summary || '',
        packingList: Array.isArray(parsed.packingList) ? parsed.packingList : [],
        outfits: Array.isArray(parsed.outfits) ? parsed.outfits : [],
        extras: Array.isArray(parsed.extras) ? parsed.extras : [],
        destinationLabel,
        dateLabel,
        days,
        startDate: tripStartDate,
        endDate: tripEndDate,
      }
      setTripResult(result)
      setTripChecked({})
      await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(result)).catch(() => {})
      await AsyncStorage.removeItem(TRIP_CHECK_KEY).catch(() => {})
      // Spegla resan till databasen så en ev. sambo kan se den (read-only).
      const { data: { user } } = await supabase.auth.getUser()
      if (user) supabase.from('trips').upsert({ user_id: user.id, data: result, updated_at: new Date().toISOString() }).then(() => {}, () => {})
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setTripLoading(false)
    }
  }

  function toggleTripCheck(name: string) {
    setTripChecked(prev => {
      const next = { ...prev, [name]: !prev[name] }
      AsyncStorage.setItem(TRIP_CHECK_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }

  // Dagarna resan sträcker sig över (för att lägga en reseoutfit i kalendern).
  // Faller tillbaka på idag + framåt om en äldre sparad resa saknar datum.
  function tripDays(): string[] {
    const out: string[] = []
    const start = tripResult?.startDate
    const end = tripResult?.endDate
    if (start && end) {
      let d = new Date(start + 'T12:00:00')
      const e = new Date(end + 'T12:00:00')
      while (d <= e) { out.push(dateStr(d)); d = new Date(d.getTime() + 86400000) }
    } else {
      let d = new Date()
      for (let i = 0; i < (tripResult?.days || 1); i++) { out.push(dateStr(d)); d = new Date(d.getTime() + 86400000) }
    }
    return out
  }

  // Sparar en reseoutfit som en riktig outfit och lägger den på vald dag i kalendern.
  async function scheduleTripOutfit(tripOutfit: any, date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const items: string[] = tripOutfit.items || []
    const matched = items.map(n => matchGarment(n)).filter(Boolean) as any[]
    const garmentIds = matched.map(g => g.id).filter(Boolean)
    const imageUrls = matched.map(g => g.image_url).filter(Boolean)
    const name = tripOutfit.name || 'Reseoutfit'
    const { data: inserted, error } = await supabase.from('outfits').insert([{
      user_id: user.id, name, garment_ids: garmentIds, garment_names: items, image_urls: imageUrls, saved: true,
    }]).select().single()
    if (error || !inserted) { showAlert(tr('Något gick fel'), error?.message || tr('Kunde inte spara outfiten.')); return }
    await assignOutfitToDay(inserted, date)
    setScheduleOutfit(null)
    fetchOutfits()
    showAlert(tr('Inlagd i kalendern!'), `${name} ${tr('ligger nu på')} ${new Date(date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`)
  }

  async function resetTrip() {
    setTripResult(null)
    setTripChecked({})
    setTripStartDate(null)
    setTripEndDate(null)
    setTripDestination('')
    setTripVibe('')
    await AsyncStorage.multiRemove([TRIP_KEY, TRIP_CHECK_KEY]).catch(() => {})
    const { data: { user } } = await supabase.auth.getUser()
    if (user) supabase.from('trips').delete().eq('user_id', user.id).then(() => {}, () => {})
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
            <TouchableOpacity onPress={() => { setCreating(false); setSelectedGarments([]); setEditingId(null) }}>
              <Text style={styles.cancelText}>✕ Avbryt</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{editingId ? 'Ändra outfit' : 'Skapa outfit'}</Text>
            <TouchableOpacity onPress={saveManualOutfit}>
              <Text style={styles.saveText}>{tr('Spara')}</Text>
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
                      {g.isWishlist && <View style={styles.notOwnedBadgeTiny}><Text style={styles.notOwnedBadgeTinyText}>{tr('Äger ej')}</Text></View>}
                      <Text style={styles.selectedName} numberOfLines={1}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <Text style={styles.label}>{tr('Namnge din outfit')}</Text>
          <TextInput style={styles.nameInput} placeholder={tr('t.ex. Fredagslook')} placeholderTextColor={t.placeholder} value={outfitName} onChangeText={setOutfitName} />

          <Text style={styles.label}>{tr('Stil')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {['Alla', ...STYLE_TAGS].map(s => (
                <TouchableOpacity key={s} style={[styles.pill, activeStyle === s && styles.pillActive]} onPress={() => setActiveStyle(s)}>
                  <Text style={[styles.pillText, activeStyle === s && styles.pillTextActive]}>{tr(s)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>{tr('Välj plagg från garderoben')}</Text>
          <View style={styles.filterBar}>
            {[{ key: 'category', label: tr('Kategori'), active: activeCategory }, { key: 'season', label: tr('Säsong'), active: activeSeason }, { key: 'color', label: tr('Färg'), active: activeColor }].map(f => (
              <TouchableOpacity key={f.key} style={[styles.filterBtn, f.active !== 'Alla' && styles.filterBtnActive]} onPress={() => setOpenDropdown(openDropdown === f.key ? null : f.key)}>
                <Text style={[styles.filterBtnText, f.active !== 'Alla' && styles.filterBtnTextActive]}>{f.active !== 'Alla' ? tr(f.active) : f.label} ▾</Text>
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
                        <Text style={[styles.dropdownPillText, isActive && styles.dropdownPillTextActive]}>{tr(item)}</Text>
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
                    <Text style={styles.wishlistToggleTitle}>{tr('Köplista')} ({wishlist.length})</Text>
                    <Text style={styles.wishlistToggleSub}>{tr('Plagg du planerar att köpa')}</Text>
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
                        <View style={styles.notOwnedBadge}><Text style={styles.notOwnedBadgeText}>{tr('Äger ej')}</Text></View>
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
                {tr('Välj outfit')}{selectedDate ? ` – ${new Date(selectedDate + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' })}` : ''}
              </Text>
              <TouchableOpacity onPress={() => { setShowOutfitPicker(false); setSelectedDate(null) }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {outfits.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabText}>{tr('Inga outfits sparade ännu')}</Text>
                  <Text style={styles.emptyTabHint}>{tr('Skapa en outfit i Outfits-fliken först')}</Text>
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
                    {new Date(dayDetailDate + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
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
                        <Text style={styles.dayDetailChangeBtnText}>{tr('Byt outfit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dayDetailRemoveBtn} onPress={() => removeOutfitFromDate(dayDetailDate)}>
                        <Text style={styles.dayDetailRemoveBtnText}>{tr('Ta bort')}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.dayDetailEmpty}>
                    <Text style={styles.dayDetailEmptyText}>{tr('Ingen outfit planerad')}</Text>
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

      {/* Välj vilken resedag outfiten ska läggas på i kalendern */}
      <Modal visible={!!scheduleOutfit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tr('Lägg outfit på en dag')}: {scheduleOutfit?.name}</Text>
              <TouchableOpacity onPress={() => setScheduleOutfit(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {tripDays().map(d => (
                <TouchableOpacity key={d} style={styles.dayPickRow} onPress={() => scheduleTripOutfit(scheduleOutfit, d)}>
                  <Ionicons name="calendar-outline" size={18} color={t.textSecondary} />
                  <Text style={styles.dayPickText}>
                    {new Date(d + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Header + Tabs (always visible, outside ScrollView) ── */}
      <View style={styles.topArea}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{tr('Mina outfits')}</Text>
        </View>

        <View style={styles.tabRow}>
          {(['kalender', 'outfits', 'resa'] as const).map(tb => (
            <TouchableOpacity key={tb} style={[styles.tab, activeTab === tb && styles.tabActive]} onPress={() => setActiveTab(tb)}>
              <Text style={[styles.tabText, activeTab === tb && styles.tabTextActive]}>
                {tb === 'kalender' ? tr('Kalender') : tb === 'outfits' ? tr('Outfits') : tr('Resa')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* KALENDER */}
        {activeTab === 'kalender' && (
          <View style={styles.calendarContainer}>
            {/* Month navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                <Text style={styles.monthNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{tr(MONTHS[currentMonth.getMonth()])} {currentMonth.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                <Text style={styles.monthNavArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map(d => <Text key={d} style={styles.weekdayLabel}>{tr(d)}</Text>)}
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
                    <Text style={[styles.dayNumber, todayStyle && styles.dayNumberToday, pastStyle && !entry && styles.dayNumberPast, entry && !pastStyle && styles.dayNumberPlanned]}>
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
                <Text style={styles.legendText}>{tr('Buren')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotPlanned]} />
                <Text style={styles.legendText}>{tr('Planerad')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotToday]} />
                <Text style={styles.legendText}>{tr('Idag')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* OUTFITS */}
        {activeTab === 'outfits' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {partnerLikedIds.size > 0 && (
                  <TouchableOpacity
                    style={[styles.pill, styles.likedPill, showOnlyLiked && styles.pillActive]}
                    onPress={() => setShowOnlyLiked(v => !v)}
                  >
                    <Ionicons name="heart" size={13} color={showOnlyLiked ? t.onPrimary : t.danger} />
                    <Text style={[styles.pillText, showOnlyLiked && styles.pillTextActive]}>{tr('Gillade av partner')}</Text>
                  </TouchableOpacity>
                )}
                {['Alla', ...STYLE_TAGS].map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, activeStyleFilter === s && styles.pillActive]} onPress={() => setActiveStyleFilter(s)}>
                    <Text style={[styles.pillText, activeStyleFilter === s && styles.pillTextActive]}>{tr(s)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {outfits.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{tr('Inga outfits sparade än!')}{'\n'}{tr('Skapa din första eller generera via AI')}</Text>
                <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/home')}>
                  <Text style={styles.goBtnText}>{tr('Generera med AI')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredOutfits.map((outfit: any) => (
                <TouchableOpacity key={outfit.id} style={styles.outfitCard} onPress={() => wearOutfit(outfit)} onLongPress={() => deleteOutfit(outfit.id)}>
                  <View style={styles.outfitCardHeader}>
                    <View style={styles.outfitNameWrap}>
                      {partnerLikedIds.has(outfit.id) && (
                        <Ionicons name="heart" size={16} color={t.danger} style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
                    </View>
                    <View style={styles.outfitCardHeaderRight}>
                      <TouchableOpacity
                        onPress={() => shareSavedOutfit(outfit)}
                        disabled={sharing}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={tr('Dela outfit')}
                        accessibilityRole="button"
                      >
                        <Ionicons name="share-outline" size={20} color={t.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => startEditOutfit(outfit)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={tr('Ändra outfit')}
                        accessibilityRole="button"
                      >
                        <Ionicons name="create-outline" size={20} color={t.primary} />
                      </TouchableOpacity>
                      <Text style={styles.outfitDate}>{new Date(outfit.created_at).toLocaleDateString(locale)}</Text>
                    </View>
                  </View>
                  <View style={styles.outfitImages}>
                    {(outfit.image_urls || []).map((url: string, i: number) => (
                      <SignedImage key={i} path={url} style={styles.outfitImage} />
                    ))}
                    {(outfit.garment_names || []).filter((_: any, i: number) => !outfit.image_urls?.[i]).map((_: string, i: number) => (
                      <View key={`emoji-${i}`} style={styles.outfitImageEmpty} />
                    ))}
                  </View>
                  <Text style={styles.holdToDelete}>{tr('Håll inne för att ta bort · Tryck för att registrera som använd')}</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* RESA */}
        {activeTab === 'resa' && (
          <>
            {!tripResult ? (
              <View>
                <Text style={styles.tripIntro}>{tr('Vart och när ska du resa? Jag kollar upp vädret på plats och sätter ihop vad du ska packa – med outfits och en packlista ur din egen garderob.')}</Text>

                <Text style={styles.label}>{tr('Destination')}</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder={tr('t.ex. Barcelona')}
                  placeholderTextColor={t.placeholder}
                  value={tripDestination}
                  onChangeText={setTripDestination}
                  autoCapitalize="words"
                />

                <Text style={styles.label}>{tr('Datum')}</Text>
                <View style={styles.tripCalCard}>
                  <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => setTripMonth(new Date(tripMonth.getFullYear(), tripMonth.getMonth() - 1, 1))}>
                      <Text style={styles.monthNavArrow}>‹</Text>
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>{MONTHS[tripMonth.getMonth()]} {tripMonth.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => setTripMonth(new Date(tripMonth.getFullYear(), tripMonth.getMonth() + 1, 1))}>
                      <Text style={styles.monthNavArrow}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.weekdayRow}>
                    {WEEKDAYS.map(d => <Text key={d} style={styles.weekdayLabel}>{tr(d)}</Text>)}
                  </View>
                  <View style={styles.daysGrid}>
                    {getCalendarDays(tripMonth).map((day, index) => {
                      if (!day) return <View key={`te-${index}`} style={styles.tripDayCell} />
                      const ds = dateStr(day)
                      const past = isPast(day)
                      const isStart = ds === tripStartDate
                      const isEnd = ds === tripEndDate
                      const endpoint = isStart || isEnd
                      const inRange = !!tripStartDate && !!tripEndDate && ds > tripStartDate && ds < tripEndDate
                      return (
                        <TouchableOpacity
                          key={ds}
                          disabled={past}
                          style={[styles.tripDayCell, inRange && styles.tripDayInRange, endpoint && styles.tripDayEndpoint]}
                          onPress={() => handleTripDayPress(day)}
                        >
                          <Text style={[styles.tripDayNum, past && styles.tripDayNumPast, endpoint && styles.tripDayNumEndpoint]}>
                            {day.getDate()}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {tripStartDate && (
                  <Text style={styles.tripDatesLabel}>
                    {tripEndDate
                      ? `${new Date(tripStartDate + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${new Date(tripEndDate + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}  ·  ${tripDayCount()} ${tr('dagar')}`
                      : 'Startdatum valt – tryck på slutdatum'}
                  </Text>
                )}

                <Text style={styles.label}>{tr('Känsla (valfritt)')}</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder={tr('t.ex. "avslappnad strandsemester", "elegant stadshelg"')}
                  placeholderTextColor={t.placeholder}
                  value={tripVibe}
                  onChangeText={setTripVibe}
                />

                <TouchableOpacity style={[styles.tripGenBtn, tripLoading && { opacity: 0.7 }]} onPress={generateTrip} disabled={tripLoading}>
                  {tripLoading
                    ? <ActivityIndicator color={t.onPrimary} />
                    : <Text style={styles.tripGenBtnText}>{tr('Planera resan')}</Text>}
                </TouchableOpacity>
                {tripLoading && <Text style={styles.tripLoadingHint}>{tr('Kollar vädret och packar väskan…')}</Text>}
              </View>
            ) : (
              <View>
                <View style={styles.tripHeaderCard}>
                  <Text style={styles.tripDest}>{tripResult.destinationLabel}</Text>
                  <Text style={styles.tripDates}>{tripResult.dateLabel} · {tripResult.days} dagar</Text>
                  {!!tripResult.climateNote && <Text style={styles.tripClimate}>{tripResult.climateNote}</Text>}
                </View>

                {tripResult.outfits.length > 0 && (
                  <>
                    <Text style={styles.tripSectionTitle}>{tr('Outfits att ta med')}</Text>
                    {tripResult.outfits.map((o: any, i: number) => (
                      <View key={i} style={styles.outfitCard}>
                        <Text style={styles.outfitName}>{o.name}</Text>
                        <View style={styles.outfitImages}>
                          {(o.items || []).map((name: string, j: number) => {
                            const m = matchGarment(name)
                            return m?.image_url
                              ? <SignedImage key={j} path={m.image_url} style={styles.outfitImage} />
                              : <View key={j} style={styles.outfitImageEmpty} />
                          })}
                        </View>
                        <Text style={styles.outfitGarments}>{(o.items || []).join(' · ')}</Text>
                        <TouchableOpacity style={styles.tripCalBtn} onPress={() => setScheduleOutfit(o)}>
                          <Ionicons name="calendar-outline" size={16} color={t.primary} />
                          <Text style={styles.tripCalBtnText}>{tr('Lägg i kalender')}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}

                <Text style={styles.tripSectionTitle}>{tr('Packlista')}</Text>
                <View style={styles.packCard}>
                  {tripResult.packingList.map((name: string, i: number) => {
                    const m = matchGarment(name)
                    const checked = !!tripChecked[name]
                    return (
                      <TouchableOpacity key={i} style={styles.packRow} onPress={() => toggleTripCheck(name)}>
                        <View style={[styles.packCheck, checked && styles.packCheckOn]}>
                          {checked && <Text style={styles.packCheckMark}>✓</Text>}
                        </View>
                        {m?.image_url
                          ? <SignedImage path={m.image_url} style={styles.packThumb} />
                          : <View style={styles.packThumbEmpty} />}
                        <Text style={[styles.packName, checked && styles.packNameChecked]}>{name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {tripResult.extras.length > 0 && (
                  <>
                    <Text style={styles.tripSectionTitle}>{tr('Glöm inte')}</Text>
                    <View style={styles.packCard}>
                      {tripResult.extras.map((name: string, i: number) => {
                        const checked = !!tripChecked[name]
                        return (
                          <TouchableOpacity key={i} style={styles.packRow} onPress={() => toggleTripCheck(name)}>
                            <View style={[styles.packCheck, checked && styles.packCheckOn]}>
                              {checked && <Text style={styles.packCheckMark}>✓</Text>}
                            </View>
                            <Text style={[styles.packName, checked && styles.packNameChecked]}>{name}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.tripResetBtn} onPress={resetTrip}>
                  <Text style={styles.tripResetBtnText}>{tr('Planera en ny resa')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Dold, varumärkt dela-vy som fångas som bild och delas. */}
      {shareTarget && (
        <View style={styles.shareCardHidden} pointerEvents="none">
          <View ref={shareCardRef} collapsable={false}>
            <OutfitShareCard outfit={shareTarget} />
          </View>
        </View>
      )}
      {sharing && (
        <View style={styles.shareOverlay}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      )}

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
  dayCell: { width: '14.28%', aspectRatio: 0.6, padding: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dayCellToday: { borderWidth: 1.5, borderColor: t.primary },
  // Burna outfits (dagar som passerat) = varm brun ton. Planerade (idag/framåt)
  // = samma ljusblå som plusknappen (fast, oavsett tema).
  dayCellWorn: { backgroundColor: t.primaryActive + '33' },
  dayCellPlanned: { backgroundColor: '#DDE6ED' },
  dayNumber: { fontFamily: 'Lora_500Medium', fontSize: 11, color: t.textPrimary, marginBottom: 2 },
  dayNumberToday: { color: t.textSecondary, fontWeight: '700' },
  dayNumberPast: { color: t.textFaint },
  dayNumberPlanned: { color: '#2B2320' },
  dayCellGrid: { width: 48, height: 48, flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellImage: { width: 46, height: 46, borderRadius: 8 },
  dayCellImageSmall: { width: 23, height: 23, borderRadius: 5 },
  dayCellOutfitDot: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textPrimary },
  dayCellPlus: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint },
  calendarLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  // Måste matcha dagcellernas verkliga fyllning (dayCellWorn/Planned/Today).
  legendDotWorn: { backgroundColor: t.primaryActive + '33', borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
  legendDotPlanned: { backgroundColor: '#DDE6ED', borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
  legendDotToday: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.primary },
  legendText: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint },

  // Outfit picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
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
  dayDetailImage: { width: '31%', height: 104, borderRadius: 14 },
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
  likedPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  empty: { alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  goBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, paddingHorizontal: 24 },
  goBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 14 },
  outfitCard: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: t.border, gap: 10 },
  outfitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  outfitCardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  outfitNameWrap: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  outfitName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, flexShrink: 1 },
  editLink: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.primary },
  outfitDate: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, fontStyle: 'italic' },
  outfitImages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outfitImage: { width: 70, height: 70, borderRadius: 12 },
  outfitImageEmpty: { width: 70, height: 70, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  outfitGarments: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, fontStyle: 'italic' },
  holdToDelete: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textFaint, textAlign: 'center' },

  // Resa (reseplanerare)
  tripIntro: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 16 },
  tripCalCard: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  tripDayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tripDayInRange: { backgroundColor: '#DDE6ED' },
  tripDayEndpoint: { backgroundColor: t.primary, borderRadius: 8 },
  tripDayNum: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textPrimary },
  tripDayNumPast: { color: t.textFaint },
  tripDayNumEndpoint: { color: t.onPrimary, fontWeight: '700' },
  tripDatesLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, textAlign: 'center', marginBottom: 16 },
  tripGenBtn: { backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  tripGenBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  tripLoadingHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  tripHeaderCard: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: t.border, marginBottom: 8 },
  tripDest: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: t.textPrimary },
  tripDates: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textSecondary, marginTop: 2 },
  tripClimate: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20, marginTop: 10 },
  tripSectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary, marginTop: 20, marginBottom: 12 },
  packCard: { backgroundColor: t.surfaceMuted, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: t.border },
  packRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8 },
  packCheck: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  packCheckOn: { backgroundColor: t.primary, borderColor: t.primary },
  packCheckMark: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 13 },
  packThumb: { width: 40, height: 40, borderRadius: 8 },
  packThumbEmpty: { width: 40, height: 40, borderRadius: 8, backgroundColor: t.surface },
  packName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, flex: 1 },
  packNameChecked: { color: t.textFaint, textDecorationLine: 'line-through' },
  tripResetBtn: { backgroundColor: t.surfaceMuted, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 24, borderWidth: 1, borderColor: t.border },
  tripResetBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 15 },
  tripCalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.primary },
  tripCalBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.primary, fontSize: 14 },
  dayPickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  dayPickText: { fontFamily: 'Lora_500Medium', fontSize: 15, color: t.textPrimary, textTransform: 'capitalize' },

  // Delning
  shareCardHidden: { position: 'absolute', left: -9999, top: 0 },
  shareOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
})
