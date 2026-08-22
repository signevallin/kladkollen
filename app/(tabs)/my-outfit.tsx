import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
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
import BottomNav from '../../components/BottomNav'
import OutfitShareCard from '../../components/OutfitShareCard'
import SignedImage from '../../components/SignedImage'
import CreateOutfitView from '../../components/my-outfit/CreateOutfitView'
import PersonSwitcher from '../../components/PersonSwitcher'
import Toggle from '../../components/Toggle'
import GarmentPicker from '../../components/home/GarmentPicker'
import SwapSheet from '../../components/home/SwapSheet'
import { loadPeople, type Person } from '../../utils/people'
import { matchItemsToPool, childSizeFits, isBabyChild, ageMonths, renderGarmentGroups, tripSeasons, filterForTrip, sleepwearForTrip } from '../../utils/outfit'
import { FREE_TRIPS_PER_WEEK, useEntitlements, familyFeaturesEnabled } from '../../utils/entitlements'
import { colorPalettePrompt } from '../../utils/colorAnalysis'
import { supabase } from '../../supabase'
import { isWashable, OUTFIT_CONTEXTS } from '../../utils/constants'
import { cacheGet, cacheSet } from '../../utils/cache'
import { loadGarments, invalidateGarments } from '../../utils/garmentsStore'
import { showAlert, showConfirm } from '../../utils/alert'
import { apiPost } from '../../utils/api'
import { captureError } from '../../utils/sentry'
import { loadPartner } from '../../utils/household'
import { geocodeDestination, fetchTripWeather, mirrorLocalTripToDb } from '../../utils/trip'
import { useSettings } from '../../utils/settings'
import { childHeadwearRule } from '../../utils/weather'
import { localeFor } from '../../utils/i18n'
import { markOutfitLoggedToday } from '../../utils/smartPush'

const STYLE_TAGS = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
// Måndagsstartade veckodagsetiketter + fullt månadsnamn på valt språk via Intl
// (inga språklistor att underhålla när nya språk läggs till).
function weekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-01 var en måndag – generera mån…sön.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)))
}
function monthLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
}

const TRIP_KEY = 'kladkollen_trip'
const TRIP_CHECK_KEY = 'kladkollen_trip_checked'
// Användarens egna "glöm inte"-saker (necessär, laddare, pass …). Sparas separat
// och läggs alltid överst i extras-listan när en ny resa planeras.
const TRIP_EXTRAS_KEY = 'kladkollen_trip_extras'
const TRIP_KIDS_KEY = 'kladkollen_trip_include_kids'
// Egna, återkommande "glöm inte"-saker per barn: { [personId]: string[] }.
const TRIP_EXTRAS_CHILD_KEY = 'kladkollen_trip_extras_child'

// Åldersanpassade förnödenheter att skicka som ledtråd till AI:n (svensk källtext;
// AI:n översätter extras till användarens språk). Bygger på barnets ålder.
function childEssentialsHint(months: number | null): string {
  if (months == null) return 'extra ombyten, regnkläder vid behov, egen vattenflaska, ev. gosedjur'
  if (months < 6) return 'blöjor, våtservetter, extra ombyten, haklappar, napp och snuttefilt, filt, solhatt och solskydd om varmt'
  if (months < 24) return 'blöjor, våtservetter, gott om extra ombyten (barn kladdar), napp/snuttefilt, mellanmål, solhatt och solskydd om varmt'
  if (months < 60) return 'extra ombyte, regnkläder, gosedjur/napp vid behov, mellanmål, solskydd'
  return 'extra ombyte, regnkläder, egen vattenflaska, ev. bok/surfplatta för resan'
}

export default function MyOutfits() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang, useColorAnalysis } = useSettings()
  const { tier, tripCreditsLeft, refresh: refreshEntitlements } = useEntitlements()
  const locale = localeFor(lang)
  const { tab, create, partner, partnerName, person, personName } = useLocalSearchParams<{ tab?: string; create?: string; partner?: string; partnerName?: string; person?: string; personName?: string }>()
  // Partner-läge: visa partnerns outfits (läsläge) i stället för mina egna.
  const isPartner = !!partner
  // Barn-läge: visa ett barns sparade/loggade outfits (läsläge). Barnens outfits
  // ägs av föräldern (user_id) men är taggade med person_id, så de hämtas direkt.
  const isPerson = !!person && !partner
  const readOnly = isPartner || isPerson
  const [activeTab, setActiveTab] = useState<'kalender' | 'outfits' | 'resa'>(
    create ? 'outfits' : tab === 'resa' ? 'resa' : tab === 'outfits' ? 'outfits' : 'kalender'
  )

  // Outfit state
  const [outfits, setOutfits] = useState<any[]>(() => cacheGet('myoutfit.outfits') ?? [])
  const [garments, setGarments] = useState<any[]>(() => cacheGet('myoutfit.garments') ?? [])
  const [wishlist, setWishlist] = useState<any[]>([])
  const [creating, setCreating] = useState(!!create)
  // Vilken outfit som redigeras (null = ny). Create-vyn (CreateOutfitView) äger
  // resten av skapa-state själv.
  const [editOutfit, setEditOutfit] = useState<any | null>(null)
  // Datum att lägga en nyskapad outfit på direkt (när man bygger outfit från
  // ett kalenderdatum). null = spara bara i outfit-listan som vanligt.
  const [assignAfterCreate, setAssignAfterCreate] = useState<string | null>(null)

  // Öppnar skapa-outfit direkt när man kommer från "Lägg till outfit" i plusmenyn.
  useEffect(() => {
    if (create) { setActiveTab('outfits'); setEditOutfit(null); setCreating(true) }
  }, [create])
  const [activeStyleFilter, setActiveStyleFilter] = useState('Alla')
  const [showOnlyLiked, setShowOnlyLiked] = useState(false)
  // Filterraden i Outfits-fliken göms bakom en filterknapp i headern (som i
  // garderoben) och visas när man trycker på den.
  const [showOutfitFilter, setShowOutfitFilter] = useState(false)

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
  // Egna, återkommande "glöm inte"-saker + inmatningsfältet för att lägga till.
  const [savedExtras, setSavedExtras] = useState<string[]>([])
  const [newExtra, setNewExtra] = useState('')
  const [scheduleOutfit, setScheduleOutfit] = useState<any | null>(null)
  // Lägg en barn-reseoutfit i barnets kalender (outfit + vilket barn).
  const [scheduleChild, setScheduleChild] = useState<{ outfit: any; personId: string; name: string } | null>(null)
  // Byt ut / lägg till plagg i en reseoutfit (samma UI som på hemskärmen).
  const [tripSwap, setTripSwap] = useState<{ oi: number; ii: number } | null>(null)
  const [tripAddTarget, setTripAddTarget] = useState<{ oi: number } | null>(null)
  // Familjeresa: generera packning/outfits även till barnen. Barn i hushållet
  // (för togglens synlighet) och om toggeln är på (sparas lokalt).
  const [children, setChildren] = useState<Person[]>(() => cacheGet<Person[]>('household.children') ?? [])
  const [tripIncludeKids, setTripIncludeKids] = useState(false)
  // Livssituation = det som slår på familjeläget (seedas ur cachen).
  const [lifeMode, setLifeMode] = useState<string>(() => cacheGet('profile.lifeMode') ?? 'single')
  // Familjeläget aktivt = livssituation Familj + betald åtkomst.
  const familyModeOn = lifeMode === 'family' && familyFeaturesEnabled(tier)
  // Egna sparade "glöm inte"-saker per barn + inmatningsfält per barn.
  const [childSavedExtras, setChildSavedExtras] = useState<Record<string, string[]>>({})
  const [newChildExtra, setNewChildExtra] = useState<Record<string, string>>({})
  // Barnets garderobspool per person (för byt ut/lägg till i reseoutfits) samt
  // vilket plagg som byts/läggs till. ci = index i childPacks, oi/ii = outfit/plagg.
  const [childPools, setChildPools] = useState<Record<string, any[]>>({})
  const [childTripSwap, setChildTripSwap] = useState<{ ci: number; oi: number; ii: number } | null>(null)
  const [childTripAdd, setChildTripAdd] = useState<{ ci: number; oi: number } | null>(null)

  // Partner-läge (läsläge): partnerns data hålls i egen state så den egna aldrig
  // skrivs över. Rendern väljer "disp*"-varianten nedan utifrån isPartner, så
  // designen blir exakt densamma som i det egna läget.
  const [partnerOutfits, setPartnerOutfits] = useState<any[]>([])
  const [partnerGarments, setPartnerGarments] = useState<any[]>([])
  const [partnerCalendar, setPartnerCalendar] = useState<Record<string, any>>({})
  const [partnerTrip, setPartnerTrip] = useState<any | null>(null)
  // Vilka av partnerns outfits JAG har gillat (❤ i partner-läge).
  const [myLikedIds, setMyLikedIds] = useState<Set<string>>(new Set())

  // Barn-läge (läsläge): barnets outfits + "kalender" (härledd ur worn_on, barn
  // har ingen outfit_calendar). Hålls separat precis som partner-datan.
  const [personOutfits, setPersonOutfits] = useState<any[]>([])
  const [personGarments, setPersonGarments] = useState<any[]>([])
  const [personCalendar, setPersonCalendar] = useState<Record<string, any>>({})

  useFocusEffect(
    useCallback(() => {
      if (isPartner) { loadPartnerData(); return }
      if (isPerson) { loadPersonData(); return }
      fetchOutfits()
      fetchGarments()
      fetchWishlist()
      fetchCalendarEntries()
      loadPeople().then(ppl => {
        const kids = ppl.filter(p => p.type === 'child')
        setChildren(kids); cacheSet('household.children', kids)
      }).catch(() => {})
      // Livssituation (familjeläget) för att styra "packa barnen"-toggeln.
      ;(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('life_mode').eq('id', user.id).single()
        const lm = data?.life_mode || 'single'
        setLifeMode(lm); cacheSet('profile.lifeMode', lm)
      })().catch(() => {})
      // Spegla ev. lokal resa till DB vid varje fokus (självläkande) så en
      // sambo kan se den i läsläge – även resor planerade innan speglingen
      // fanns eller på en annan enhet.
      syncLocalTripToDb()
    }, [isPartner, partner, isPerson, person])
  )

  // Hämtar ett barns sparade outfits + härleder en "kalender" ur worn_on (barn
  // har ingen outfit_calendar). Barnens rader ägs av föräldern, så direkt query.
  async function loadPersonData() {
    if (!person) return
    const { data } = await supabase.from('outfits').select('*').eq('person_id', person).order('created_at', { ascending: false })
    const all = (data || []) as any[]
    setPersonOutfits(all.filter(x => x.saved))
    // Barnets kalender ligger i person_outfit_calendar (många datum → outfit).
    // Resilient: om tabellen inte körts än visas en tom kalender i stället för fel.
    const { data: cal, error: calErr } = await supabase
      .from('person_outfit_calendar')
      .select('*, outfits(*)')
      .eq('person_id', person)
    const map: Record<string, any> = {}
    if (!calErr) (cal || []).forEach((row: any) => { if (row.outfits) map[row.date] = row })
    setPersonCalendar(map)
    const g = await loadGarments().catch(() => [] as any[])
    setPersonGarments((g as any[]).filter(x => x.person_id === person))
  }

  // Hämtar partnerns outfits/plagg/kalender/resa via household-vaktade RPC:er.
  async function loadPartnerData() {
    if (!partner) return
    const [o, g, c, tp] = await Promise.all([
      supabase.rpc('partner_outfits', { target: partner }),
      supabase.rpc('partner_garments', { target: partner }),
      supabase.rpc('partner_calendar', { target: partner }),
      supabase.rpc('partner_trip', { target: partner }),
    ])
    const all = (o.data || []) as any[]
    setPartnerOutfits(all.filter(x => x.saved))
    setPartnerGarments((g.data || []) as any[])
    // Bygg kalender-map i samma form som egen (entry.outfits.image_urls).
    const byId: Record<string, any> = Object.fromEntries(all.map(x => [x.id, x]))
    const map: Record<string, any> = {}
    ;(c.data || []).forEach((row: any) => { const ou = byId[row.outfit_id]; if (ou) map[row.date] = { ...row, outfits: ou } })
    setPartnerCalendar(map)
    setPartnerTrip(tp.data || null)
    // "Gillade av partner"-markeringar hör till min egen vy – inte partnerns.
    setPartnerLikedIds(new Set())
    setShowOnlyLiked(false)
    // Vilka av partnerns outfits jag själv gillat (för ❤-knappen).
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: lk } = await supabase.from('outfit_likes').select('outfit_id').eq('user_id', user.id)
      setMyLikedIds(new Set((lk || []).map((l: any) => l.outfit_id)))
    }
  }

  // Gilla/ogilla en av partnerns outfits (optimistiskt, återställs vid fel).
  async function togglePartnerLike(outfitId: string) {
    const flip = (s: Set<string>) => { const n = new Set(s); n.has(outfitId) ? n.delete(outfitId) : n.add(outfitId); return n }
    setMyLikedIds(flip)
    const { error } = await supabase.rpc('toggle_outfit_like', { target_outfit: outfitId })
    if (error) setMyLikedIds(flip)
  }

  // Speglar en lokalt sparad resa till databasen. Körs vid varje fokus och
  // direkt efter att en ny resa genererats.
  // Delad hjälpare (utils/trip) så samma spegling körs vid appstart också.
  async function syncLocalTripToDb() {
    await mirrorLocalTripToDb()
  }

  // Ladda ev. sparad reseplan (och avprickning) en gång så den överlever
  // flikbyten och appstarter.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIP_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          setTripResult(parsed)
          // Återställ barnens garderobspooler så byt ut/lägg till funkar efter omstart.
          if (Array.isArray(parsed?.childPacks) && parsed.childPacks.length) {
            const all = await loadGarments().catch(() => [] as any[])
            const pools: Record<string, any[]> = {}
            for (const cp of parsed.childPacks) {
              pools[cp.personId] = (all as any[]).filter(g => g.person_id === cp.personId && !g.archived)
            }
            setChildPools(pools)
          }
        }
        const chk = await AsyncStorage.getItem(TRIP_CHECK_KEY)
        if (chk) setTripChecked(JSON.parse(chk))
        const ex = await AsyncStorage.getItem(TRIP_EXTRAS_KEY)
        if (ex) setSavedExtras(JSON.parse(ex))
        const ik = await AsyncStorage.getItem(TRIP_KIDS_KEY)
        if (ik === '1') setTripIncludeKids(true)
        const cex = await AsyncStorage.getItem(TRIP_EXTRAS_CHILD_KEY)
        if (cex) setChildSavedExtras(JSON.parse(cex))
      } catch { /* ignorera */ }
    })()
  }, [])

  async function fetchOutfits() {
    // Bara aktivt sparade outfits visas – outfits som bara fått ett betyg
    // (feedback till AI:n) ska inte synas här.
    const { data } = await supabase.from('outfits').select('*').eq('saved', true).is('person_id', null).order('created_at', { ascending: false })
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
    // Delad plagg-hämtning – återanvänds mellan flikarna. Filtrera till egna,
    // icke-arkiverade plagg (som tidigare gjordes i queryn).
    const all = await loadGarments()
    const data = all.filter((g: any) => !g.archived && g.person_id == null)
    setGarments(data); cacheSet('myoutfit.garments', data)
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
      // Utelämna datumet när det saknas så RPC:n använder sitt default (idag).
      p_date: wearDate ?? undefined,
    })
    if (error) throw error
  }

  // Lägger en outfit på ett datum i kalendern och räknar plaggen som använda
  // den dagen. Delas av kalendern och "registrera som använd" i Outfits-listan.
  async function assignOutfitToDay(outfit: any, date: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    // Barn har egen kalender (person_outfit_calendar) – samma outfit kan ligga på
    // flera datum. En outfit per dag via upsert på (person_id, date).
    if (isPerson && person) {
      const prev = personCalendar[date]
      if (prev?.outfit_id === outfit.id) return true
      let ok = false
      try {
        if (prev?.outfits?.garment_ids?.length) await adjustGarmentWear(prev.outfits.garment_ids, -1)
        const { error } = await supabase.from('person_outfit_calendar')
          .upsert({ user_id: user.id, person_id: person, outfit_id: outfit.id, date }, { onConflict: 'person_id,date' })
        if (error) throw error
        await adjustGarmentWear(outfit.garment_ids || [], 1, date)
        ok = true
      } catch (e: any) {
        captureError(e, { where: 'assignOutfitToDay:child' })
        showAlert(tr('Kunde inte spara'), tr('Något gick fel – kontrollera din uppkoppling och försök igen.'))
      } finally {
        loadPersonData()
      }
      return ok
    }
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
      // Loggar man för idag: avboka kvällens logga-påminnelse.
      if (date === new Date().toISOString().split('T')[0]) markOutfitLoggedToday()
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
    // Barn: ta bort raden ur person_outfit_calendar (och räkna ner plaggen).
    if (isPerson && person) {
      try {
        const entry = personCalendar[date]
        if (entry?.outfits?.garment_ids?.length) await adjustGarmentWear(entry.outfits.garment_ids, -1)
        const { error } = await supabase.from('person_outfit_calendar').delete().eq('person_id', person).eq('date', date)
        if (error) throw error
      } catch (e: any) {
        captureError(e, { where: 'removeOutfitFromDate:child' })
        showAlert(tr('Kunde inte ta bort'), tr('Något gick fel – kontrollera din uppkoppling och försök igen.'))
      } finally {
        setDayDetailDate(null)
        loadPersonData()
      }
      return
    }
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

  // Vilken datamängd rendern visar. I partner-läge (läsläge) visas partnerns
  // data, annars den egna – men SAMMA JSX/design används för båda.
  const dispOutfits = isPartner ? partnerOutfits : isPerson ? personOutfits : outfits
  const dispGarments = isPartner ? partnerGarments : isPerson ? personGarments : garments
  const dispCalendarEntries = isPartner ? partnerCalendar : isPerson ? personCalendar : calendarEntries
  const dispTrip = isPartner ? partnerTrip : isPerson ? null : tripResult
  // Barnets del av familjeresan (läsläge) – visas i barnets Resa-flik.
  const childTrip = isPerson ? (tripResult?.childPacks || []).find((cp: any) => cp.personId === person) : null

  // Outfit functions
  // Filtret matchar mot tillfälle (mood/context) ELLER stil, så en och samma
  // rad räcker för både AI-genererade (tillfälle) och egenskapade (stil) outfits.
  const filteredOutfits = dispOutfits.filter(o => {
    if (activeStyleFilter !== 'Alla') {
      const f = activeStyleFilter
      const match = o.mood === f || o.style === f || (o.context && o.context === f.toLowerCase())
      if (!match) return false
    }
    if (showOnlyLiked && !partnerLikedIds.has(o.id)) return false
    return true
  })

  // Öppnar redigering av en befintlig outfit i CreateOutfitView (den plockar
  // fram plaggen från garment_ids själv).
  function startEditOutfit(outfit: any) {
    setEditOutfit(outfit)
    setCreating(true)
  }

  async function deleteOutfit(id: string) {
    showConfirm(tr('Ta bort outfit'), tr('Är du säker?'), async () => {
      await supabase.from('outfits').delete().eq('id', id)
      fetchOutfits()
    }, tr('Ta bort'), true)
  }

  async function wearOutfit(outfit: any) {
    const today = new Date().toISOString().split('T')[0]
    // Barn: lägg outfiten på dagens datum i barnets kalender (person_outfit_calendar).
    if (isPerson) {
      const ok = await assignOutfitToDay(outfit, today)
      if (ok) showAlert(tr('Outfit registrerad!'), tr('Den ligger nu på dagens datum i kalendern och plaggen räknas som använda.'))
      return
    }
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
    const ids: string[] = outfit.garment_ids || []
    // Härled kategori per plagg (via id först, annars namnmatchning) så dela-
    // kollaget kan placera överdelar överst, underdelar under och accessoarer
    // vid sidorna. Utan kategori hamnar allt i mittkolumnen.
    const items = names.length
      ? names.map((name, i) => {
          const g = (ids[i] && dispGarments.find(x => x.id === ids[i])) || matchGarment(name)
          return { name, image_url: urls[i] ?? g?.image_url ?? null, category: g?.category ?? null }
        })
      : urls.map((url) => ({ name: '', image_url: url, category: null }))
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
    let m = dispGarments.find(g => (g.name || '').trim().toLowerCase() === target)
    if (!m) m = dispGarments.find(g => (g.name || '').toLowerCase().includes(target))
    if (!m) {
      m = dispGarments
        .filter(g => g.name && target.includes(g.name.toLowerCase()))
        .sort((a, b) => b.name.length - a.name.length)[0]
    }
    return m || null
  }

  // ── Rese-plagg som {id, name} ────────────────────────────────────────────
  // Reseplanens plagg lagras numera som { id, name } så bild/tvätt/byt löses via
  // plagg-id (pålitligt) i stället för luddig namnmatchning. Bakåtkompatibelt:
  // äldre resor (rena namnsträngar) hanteras via fallback på namn.
  const tripName = (it: any): string => (typeof it === 'string' ? it : (it?.name || ''))
  const tripId = (it: any): string | null => (typeof it === 'string' ? null : (it?.id ?? null))
  // Löser ett reseplagg till ett garderobsplagg: id först, annars namnmatchning.
  function resolveTripGarment(it: any) {
    const id = tripId(it)
    if (id) { const g = dispGarments.find((x: any) => x.id === id); if (g) return g }
    return matchGarment(tripName(it))
  }
  // Gör om ett AI-namn till ett {id, name}-plagg (id null om det inte matchar).
  // AI:n listar ibland plagg som inte finns i garderoben. Tidigare behölls namnet
  // med id: null, så det hamnade i packlistan ändå – och att upptäcka kvällen
  // före avresa att ett plagg på listan inte existerar är värdelöst, man kan
  // inte skaffa det. Omatchade namn slängs därför, precis som barnens packlista
  // redan gjorde. Namnet tas dessutom från garderoben, inte från AI:ns
  // omskrivning, så användaren ser plagget hen känner igen.
  type TripItem = { id: string; name: string }
  const toTripItem = (name: string): TripItem | null => {
    const g = matchGarment(name)
    return g ? { id: g.id, name: g.name } : null
  }
  const toTripItems = (names: any): TripItem[] =>
    (Array.isArray(names) ? names : []).map(toTripItem).filter((x): x is TripItem => !!x)

  // Bygger en kategorigrupperad lista av garderoben som AI:n kan packa ur.
  function buildTripGarmentList(list: any[]) {
    const byCat: Record<string, string[]> = {}
    for (const g of list) {
      const cat = g.category || 'Övrigt'
      const parts = [g.subcategory, g.color, Array.isArray(g.season) ? g.season.join('/') : g.season].filter(Boolean).join(', ')
      const line = parts ? `${g.name} (${parts})` : g.name
      ;(byCat[cat] ||= []).push(line)
    }
    // Samma budgetfördelning som vardagsoutfitsen: utan den kapade servern de
    // sista kategorierna helt, och här finns dessutom ingen fast ordning – vilken
    // kategori som föll bort avgjordes av när plaggen råkade läggas till.
    const prefixed: Record<string, string[]> = {}
    for (const [cat, items] of Object.entries(byCat)) prefixed[cat.toUpperCase()] = items.map(i => '- ' + i)
    return renderGarmentGroups(prefixed)
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
      const geo = await geocodeDestination(tripDestination, lang)
      if (!geo) {
        showAlert(tr('Hittade inte destinationen'), tr('Prova en annan stavning eller en större stad i närheten.'))
        return
      }
      const weather = await fetchTripWeather(geo.latitude, geo.longitude, tripStartDate, tripEndDate)
      // Packa ur en garderob som passar destinationen, inte ur hela. En resa till
      // 28 grader behöver inga vinterkappor i listan – det gör listan kortare OCH
      // förslagen bättre, utan att kosta något extra.
      const seasons = tripSeasons(weather.minTemp, weather.maxTemp)
      const tripPool = filterForTrip(garments, seasons)
      const groupedList = buildTripGarmentList(tripPool)
      const start = new Date(tripStartDate + 'T12:00:00')
      const end = new Date(tripEndDate + 'T12:00:00')
      const days = tripDayCount()
      const dateLabel = `${start.toLocaleDateString(locale, { day: 'numeric', month: 'long' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`
      const monthLabelStr = start.getMonth() === end.getMonth() ? monthLabel(start, locale) : `${monthLabel(start, locale)}/${monthLabel(end, locale)}`
      const destinationLabel = geo.country ? `${geo.name}, ${geo.country}` : geo.name

      // Väg in färganalysen om inställningen är på (samma som outfit-genereringen).
      let colorPalette = ''
      if (useColorAnalysis) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('color_analysis').eq('id', user.id).single()
          colorPalette = colorPalettePrompt(prof?.color_analysis)
        }
      }

      const parsed = await apiPost('/api/pack-trip', {
        destination: destinationLabel,
        dateLabel,
        monthLabel: monthLabelStr,
        days,
        weatherSummary: weather.summary,
        groupedList,
        vibe: tripVibe.trim(),
        colorPalette,
      })

      const result = {
        climateNote: parsed.climateNote || weather.summary || '',
        // Plagg lagras som { id, name } (id löst mot garderoben) för pålitlig
        // bild-/tvätt-/byt-hantering. extras är icke-plagg → rena strängar.
        packingList: toTripItems(parsed.packingList),
        outfits: (Array.isArray(parsed.outfits) ? parsed.outfits : []).map((o: any) => ({ ...o, items: toTripItems(o.items) })),
        // Egna återkommande saker läggs alltid överst, sedan AI:ns förslag (utan dubbletter).
        extras: mergeExtras(savedExtras, Array.isArray(parsed.extras) ? parsed.extras : []),
        destinationLabel,
        dateLabel,
        days,
        startDate: tripStartDate,
        endDate: tripEndDate,
      }

      // Familjeresa: packa även till barnen (opt-in). Ett pack-trip-anrop per
      // barn med barnets storleks-/säsongsanpassade garderob; plaggen bild-löses
      // direkt mot barnets pool (reseresultatet renderar via image_url).
      if (tripIncludeKids && children.length && familyModeOn) {
        const all = await loadGarments().catch(() => [] as any[])
        const childPacks: any[] = []
        const pools: Record<string, any[]> = {}
        // Delade hushållssaker (adapter, powerbank …) ska bara ligga i den vuxnes
        // lista – filtrera bort dem ur barnens extras.
        const parentExtraSet = new Set((result.extras || []).map((e: string) => e.trim().toLowerCase()))
        for (const c of children) {
          try {
            const active = (all as any[]).filter(g => g.person_id === c.id && !g.archived && !g.in_laundry)
            const sized = active.filter(g => childSizeFits(g, c.current_size_cm ?? null))
            const seasonal = filterForTrip(sized.length ? sized : active, seasons)
            const usePool = seasonal.length ? seasonal : (sized.length ? sized : active)
            if (usePool.length === 0) continue
            const baby = isBabyChild(c.birthdate, c.current_size_cm ?? null)
            const cp = await apiPost('/api/pack-trip', {
              destination: destinationLabel, dateLabel, monthLabel: monthLabelStr, days,
              weatherSummary: weather.summary, groupedList: buildTripGarmentList(usePool),
              vibe: tripVibe.trim(), audience: 'child', childName: c.name, babyMode: baby, lang,
              childExtrasHint: childEssentialsHint(ageMonths(c.birthdate)),
              // Samma mössregel som vardagsoutfitsen, annars packas mössan men
              // används aldrig i reseoutfitsen – precis det glappet vi rättade.
              // Resan spänner över flera dagar, så gränsen prövas mot resans
              // KALLASTE temperatur och inte ett medelvärde.
              childHeadwear: childHeadwearRule(ageMonths(c.birthdate), weather.minTemp ?? null, c.cold_sensitivity ?? 3),
            })
            const resolveInPool = (nm: string) => {
              const target = (nm || '').trim().toLowerCase()
              return usePool.find(g => (g.name || '').trim().toLowerCase() === target)
                || usePool.find(g => (g.name || '').toLowerCase().includes(target))
                || usePool.filter(g => g.name && target.includes(g.name.toLowerCase())).sort((a: any, b: any) => b.name.length - a.name.length)[0]
                || null
            }
            // Packlistan visar BARA plagg som faktiskt finns i barnets garderob
            // (AI:n listar ibland plagg som inte finns) → lös mot poolen, släng omatchat.
            const packingItems = Array.from(new Map(
              (Array.isArray(cp.packingList) ? cp.packingList : [])
                .map(resolveInPool).filter(Boolean)
                .map((g: any) => [g.id, { id: g.id, name: g.name, image_url: g.image_url || null }])
            ).values())
            // Pyjamas kan aldrig hamna i en outfit (Sovkläder saknas med flit i
            // outfit-kategorierna), så AI:n nämner dem aldrig i packlistan heller.
            // Lägg till dem deterministiskt – det är bland det första en förälder
            // packar, och att upptäcka att de saknas på plats är för sent.
            const sleepwear = sleepwearForTrip(usePool, days, packingItems)
              .map((g: any) => ({ id: g.id, name: g.name, image_url: g.image_url || null }))
            packingItems.push(...sleepwear)

            // Tvättbara plagg-id:n (packlista + outfits) för "Lägg allt i tvätten".
            const outfitGarments = (Array.isArray(cp.outfits) ? cp.outfits.flatMap((o: any) => o.items || []) : []).map(resolveInPool)
            const garmentIds = Array.from(new Set(
              [...packingItems, ...outfitGarments].filter((g: any) => g && isWashable(g)).map((g: any) => g.id).filter(Boolean)
            ))
            // Egna sparade saker för barnet överst, sedan AI:ns extras – men aldrig
            // sådant som redan finns i den vuxnes lista (delade hushållssaker).
            const extras = mergeExtras(childSavedExtras[c.id] || [], Array.isArray(cp.extras) ? cp.extras : [])
              .filter((e: string) => !parentExtraSet.has(e.trim().toLowerCase()))
            pools[c.id] = usePool
            childPacks.push({
              personId: c.id,
              name: c.name,
              packingItems,
              extras,
              garmentIds,
              outfits: (Array.isArray(cp.outfits) ? cp.outfits : []).map((o: any) => ({
                name: o.name, itemsWithImages: matchItemsToPool(o.items || [], usePool),
              })),
            })
          } catch { /* hoppa över barnet vid fel, resten av resan står kvar */ }
        }
        ;(result as any).childPacks = childPacks
        setChildPools(pools)
      }

      setTripResult(result)
      setTripChecked({})
      await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(result)).catch(() => {})
      await AsyncStorage.removeItem(TRIP_CHECK_KEY).catch(() => {})
      // Spegla resan till databasen så en ev. sambo kan se den (read-only).
      await syncLocalTripToDb()
    } catch (e: any) {
      // Gratiskvoten slut → paywall i stället för ett generiskt fel, samma
      // mönster som outfit-genereringen på hemskärmen.
      if (e?.code === 'quota_exceeded') { router.push('/paywall'); return }
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setTripLoading(false)
      // Uppdatera kvar-räknaren efter varje försök (den ändras serverside).
      // Utan det stod "3 av 3" kvar tills appen startades om, trots att
      // servern räknat ner – samma rad som hemskärmen redan har.
      refreshEntitlements()
    }
  }

  function toggleTripCheck(name: string) {
    setTripChecked(prev => {
      const next = { ...prev, [name]: !prev[name] }
      AsyncStorage.setItem(TRIP_CHECK_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }

  // Slår ihop egna återkommande saker (först) med AI:ns förslag, utan dubbletter.
  function mergeExtras(saved: string[], ai: string[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const e of [...saved, ...ai]) {
      const k = (e || '').trim().toLowerCase()
      if (!k || seen.has(k)) continue
      seen.add(k); out.push(e)
    }
    return out
  }

  // Uppdaterar extras på den aktiva resan (sparar lokalt + speglar till DB).
  function updateTripExtras(fn: (extras: string[]) => string[]) {
    setTripResult((prev: any) => {
      if (!prev) return prev
      const next = { ...prev, extras: fn(prev.extras || []) }
      AsyncStorage.setItem(TRIP_KEY, JSON.stringify(next)).catch(() => {})
      syncLocalTripToDb()
      return next
    })
  }

  // Lägg till en egen "glöm inte"-sak. Kommer alltid tillbaka nästa resa.
  function addTripExtra(name: string) {
    const v = name.trim()
    if (!v) return
    updateTripExtras(extras => extras.some(e => e.toLowerCase() === v.toLowerCase()) ? extras : [...extras, v])
    setSavedExtras(prev => {
      if (prev.some(e => e.toLowerCase() === v.toLowerCase())) return prev
      const next = [...prev, v]
      AsyncStorage.setItem(TRIP_EXTRAS_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
    setNewExtra('')
  }

  // Ta bort en sak – både från resan och (om det var en egen) från de sparade,
  // så den inte dyker upp igen nästa gång.
  function removeTripExtra(name: string) {
    updateTripExtras(extras => extras.filter(e => e !== name))
    setSavedExtras(prev => {
      if (!prev.some(e => e === name)) return prev
      const next = prev.filter(e => e !== name)
      AsyncStorage.setItem(TRIP_EXTRAS_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }

  // ── Egna "glöm inte"-saker per barn (sparas till nästa resa) ──────────────
  function updateChildPackExtras(personId: string, fn: (extras: string[]) => string[]) {
    setTripResult((prev: any) => {
      if (!prev?.childPacks) return prev
      const childPacks = prev.childPacks.map((cp: any) => cp.personId === personId ? { ...cp, extras: fn(cp.extras || []) } : cp)
      const next = { ...prev, childPacks }
      AsyncStorage.setItem(TRIP_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }
  function addChildExtra(personId: string, name: string) {
    const v = name.trim()
    if (!v) return
    updateChildPackExtras(personId, extras => extras.some(e => e.toLowerCase() === v.toLowerCase()) ? extras : [...extras, v])
    setChildSavedExtras(prev => {
      const list = prev[personId] || []
      if (list.some(e => e.toLowerCase() === v.toLowerCase())) return prev
      const next = { ...prev, [personId]: [...list, v] }
      AsyncStorage.setItem(TRIP_EXTRAS_CHILD_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
    setNewChildExtra(prev => ({ ...prev, [personId]: '' }))
  }
  function removeChildExtra(personId: string, name: string) {
    updateChildPackExtras(personId, extras => extras.filter(e => e !== name))
    setChildSavedExtras(prev => {
      const list = prev[personId] || []
      if (!list.some(e => e === name)) return prev
      const next = { ...prev, [personId]: list.filter(e => e !== name) }
      AsyncStorage.setItem(TRIP_EXTRAS_CHILD_KEY, JSON.stringify(next)).catch(() => {})
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
    const items: any[] = tripOutfit.items || []
    const names = items.map(tripName)
    const matched = items.map(resolveTripGarment).filter(Boolean) as any[]
    const garmentIds = matched.map(g => g.id).filter(Boolean)
    const imageUrls = matched.map(g => g.image_url).filter(Boolean)
    const name = tripOutfit.name || 'Reseoutfit'
    const { data: inserted, error } = await supabase.from('outfits').insert([{
      user_id: user.id, name, garment_ids: garmentIds, garment_names: names, image_urls: imageUrls, saved: true,
    }]).select().single()
    if (error || !inserted) { showAlert(tr('Något gick fel'), error?.message || tr('Kunde inte spara outfiten.')); return }
    await assignOutfitToDay(inserted, date)
    setScheduleOutfit(null)
    fetchOutfits()
    showAlert(tr('Inlagd i kalendern!'), `${name} ${tr('ligger nu på')} ${new Date(date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`)
  }

  // Lägg en barn-reseoutfit i barnets kalender: spara som barn-outfit (person_id)
  // och lägg på dagen i person_outfit_calendar (en outfit per barn och dag).
  async function scheduleChildTripOutfit(tripOutfit: any, personId: string, date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const items: any[] = tripOutfit.itemsWithImages || []
    const garmentIds = items.map(i => i.id).filter(Boolean)
    const names = items.map(i => i.name)
    const imageUrls = items.map(i => i.image_url).filter(Boolean)
    const name = tripOutfit.name || 'Reseoutfit'
    try {
      // Räkna ner ev. tidigare outfit på samma dag för barnet.
      const { data: prev } = await supabase.from('person_outfit_calendar')
        .select('outfits(garment_ids)').eq('person_id', personId).eq('date', date).maybeSingle()
      const prevIds = (prev as any)?.outfits?.garment_ids
      if (prevIds?.length) await adjustGarmentWear(prevIds, -1)
      const { data: inserted, error } = await supabase.from('outfits').insert([{
        user_id: user.id, person_id: personId, name, garment_ids: garmentIds, garment_names: names, image_urls: imageUrls, saved: true,
      }]).select('id').single()
      if (error || !inserted) throw error || new Error('insert')
      const { error: cErr } = await supabase.from('person_outfit_calendar')
        .upsert({ user_id: user.id, person_id: personId, outfit_id: inserted.id, date }, { onConflict: 'person_id,date' })
      if (cErr) throw cErr
      if (garmentIds.length) await adjustGarmentWear(garmentIds, 1, date)
      showAlert(tr('Inlagd i kalendern!'), `${name} ${tr('ligger nu på')} ${new Date(date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`)
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e?.message || tr('Kunde inte spara outfiten.'))
    } finally {
      setScheduleChild(null)
    }
  }

  // Sparar en ändrad reseplan lokalt och speglar den till DB (för partnervyn).
  async function persistTripResult(next: any) {
    setTripResult(next)
    await AsyncStorage.setItem(TRIP_KEY, JSON.stringify(next)).catch(() => {})
    syncLocalTripToDb()
  }

  // Efter resan: lägg alla plagg som ingick (outfits + packlista) i tvätten
  // med ett tryck. Namnen matchas mot garderoben via matchGarment. Plagg som
  // inte tvättas (skor, smycken, väskor, skärp) hoppas över.
  function washTripGarments() {
    if (!tripResult) return
    const items: any[] = [
      ...(tripResult.outfits || []).flatMap((o: any) => o.items || []),
      ...(tripResult.packingList || []),
    ]
    const ownIds = items.map(resolveTripGarment).filter(g => g && isWashable(g)).map((g: any) => g.id).filter(Boolean)
    // Även barnens rese-plagg (id:n samlades vid genereringen) läggs i tvätten.
    const childIds = (tripResult.childPacks || []).flatMap((cp: any) => cp.garmentIds || [])
    const ids = Array.from(new Set([...ownIds, ...childIds])) as string[]
    if (ids.length === 0) {
      showAlert(tr('Inga plagg att tvätta'), tr('Reseplanen matchar inga plagg i din garderob.')); return
    }
    showConfirm(
      tr('Lägg allt i tvätten'),
      `${tr('Markera')} ${ids.length} ${tr('plagg från resan som i tvätten?')}`,
      async () => {
        const { error } = await supabase.from('garments').update({ in_laundry: true }).in('id', ids)
        if (error) { showAlert(tr('Något gick fel'), error.message); return }
        invalidateGarments()
        setGarments(prev => prev.map(g => ids.includes(g.id) ? { ...g, in_laundry: true } : g))
        showAlert(tr('Klart!'), `${ids.length} ${tr('plagg ligger nu i tvätten.')}`)
      },
      tr('Lägg i tvätten'),
    )
  }

  // Byt ut / ta bort / lägg till plagg i en reseoutfit. Items lagras som namn;
  // matchGarment löser bilderna. Ändringen sparas och speglas – och packlistan
  // hålls i synk (AI:ns extra-tips som inte är outfit-plagg rörs inte).
  function usedInOutfits(name: string, outfits: any[]): boolean {
    const target = (name || '').toLowerCase()
    return outfits.some((o: any) => (o.items || []).some((it: any) => tripName(it).toLowerCase() === target))
  }
  // Uppdaterar packlistan: tar bort ett borttaget plagg (om det inte används i
  // någon annan outfit) och lägger till ett nytt (om det inte redan finns).
  // Jämför på namn men behåller {id, name}-objekten.
  function syncPacking(list: any[], outfits: any[], removed: any | null, added: any | null): any[] {
    let pl = [...(list || [])]
    if (removed && !usedInOutfits(tripName(removed), outfits)) pl = pl.filter(it => tripName(it).toLowerCase() !== tripName(removed).toLowerCase())
    if (added && !pl.some(it => tripName(it).toLowerCase() === tripName(added).toLowerCase())) pl = [...pl, added]
    return pl
  }

  function replaceTripItem(oi: number, ii: number, garment: any) {
    if (!tripResult) return
    const oldItem = tripResult.outfits?.[oi]?.items?.[ii] ?? null
    const newItem = { id: garment.id, name: garment.name }
    const outfits = tripResult.outfits.map((o: any, i: number) =>
      i !== oi ? o : { ...o, items: (o.items || []).map((it: any, j: number) => j === ii ? newItem : it) })
    const packingList = syncPacking(tripResult.packingList, outfits, oldItem, newItem)
    persistTripResult({ ...tripResult, outfits, packingList })
    setTripSwap(null)
  }
  function removeTripItem(oi: number, ii: number) {
    if (!tripResult) return
    const oldItem = tripResult.outfits?.[oi]?.items?.[ii] ?? null
    const outfits = tripResult.outfits.map((o: any, i: number) =>
      i !== oi ? o : { ...o, items: (o.items || []).filter((_: any, j: number) => j !== ii) })
    const packingList = syncPacking(tripResult.packingList, outfits, oldItem, null)
    persistTripResult({ ...tripResult, outfits, packingList })
    setTripSwap(null)
  }
  function addTripItem(oi: number, garment: any) {
    if (!tripResult) return
    const newItem = { id: garment.id, name: garment.name }
    const outfits = tripResult.outfits.map((o: any, i: number) =>
      i !== oi ? o : { ...o, items: [...(o.items || []), newItem] })
    const packingList = syncPacking(tripResult.packingList, outfits, null, newItem)
    persistTripResult({ ...tripResult, outfits, packingList })
    setTripAddTarget(null)
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

  // Day detail modal
  const dayDetailEntry = dayDetailDate ? dispCalendarEntries[dayDetailDate] : null

  // Byt-ut-arket för en reseoutfit: alternativ i samma kategori som inte redan
  // används i outfiten (och som inte är arkiverade/sålda/i tvätten).
  const tripSwapItem = tripSwap ? (tripResult?.outfits?.[tripSwap.oi]?.items?.[tripSwap.ii] ?? null) : null
  const tripSwapItemName: string | null = tripSwapItem ? tripName(tripSwapItem) : null
  const tripSwapGarment = tripSwapItem ? resolveTripGarment(tripSwapItem) : null
  const tripSwapUsed = new Set(
    (tripSwap ? tripResult?.outfits?.[tripSwap.oi]?.items || [] : []).map((it: any) => tripName(it).toLowerCase())
  )
  const tripSwapAlternatives = tripSwap ? garments.filter(g =>
    !g.archived && !g.for_sale && !g.in_laundry &&
    !tripSwapUsed.has((g.name || '').toLowerCase()) &&
    (tripSwapGarment?.category ? g.category === tripSwapGarment.category : true)
  ) : []
  // Lägg-till-väljaren: aktiva plagg som inte redan finns i outfiten.
  const tripAddUsed = new Set(
    (tripAddTarget ? tripResult?.outfits?.[tripAddTarget.oi]?.items || [] : []).map((it: any) => tripName(it).toLowerCase())
  )
  const tripAddPool = tripAddTarget ? garments.filter(g =>
    !g.archived && !g.for_sale && !g.in_laundry && !tripAddUsed.has((g.name || '').toLowerCase())
  ) : []

  // ── Byt ut / lägg till plagg i en BARN-reseoutfit ─────────────────────────
  // Uppdaterar ett barns reseoutfit och räknar om tvättbara plagg-id:n.
  function updateChildOutfit(ci: number, oi: number, fn: (items: any[]) => any[]) {
    setTripResult((prev: any) => {
      if (!prev?.childPacks) return prev
      const childPacks = prev.childPacks.map((cp: any, i: number) => {
        if (i !== ci) return cp
        const outfits = (cp.outfits || []).map((o: any, j: number) => j === oi ? { ...o, itemsWithImages: fn(o.itemsWithImages || []) } : o)
        const pool = childPools[cp.personId] || []
        const byId = new Map(pool.map((g: any) => [g.id, g]))
        const ids = [
          ...outfits.flatMap((o: any) => (o.itemsWithImages || []).map((it: any) => it.id)),
          ...(cp.packingItems || []).map((it: any) => it.id),
        ]
        const garmentIds = Array.from(new Set(ids)).filter((id: any) => { const g = byId.get(id); return g && isWashable(g) })
        return { ...cp, outfits, garmentIds }
      })
      const next = { ...prev, childPacks }
      AsyncStorage.setItem(TRIP_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }
  function replaceChildTripItem(ci: number, oi: number, ii: number, g: any) {
    updateChildOutfit(ci, oi, items => items.map((it, j) => j === ii ? { id: g.id, name: g.name, image_url: g.image_url || null } : it))
    setChildTripSwap(null)
  }
  function removeChildTripItem(ci: number, oi: number, ii: number) {
    updateChildOutfit(ci, oi, items => items.filter((_, j) => j !== ii))
    setChildTripSwap(null)
  }
  function addChildTripItem(ci: number, oi: number, g: any) {
    updateChildOutfit(ci, oi, items => [...items, { id: g.id, name: g.name, image_url: g.image_url || null }])
    setChildTripAdd(null)
  }

  const childSwapPack = childTripSwap ? tripResult?.childPacks?.[childTripSwap.ci] : null
  const childSwapPool: any[] = childSwapPack ? (childPools[childSwapPack.personId] || []) : []
  const childSwapItem = childTripSwap ? childSwapPack?.outfits?.[childTripSwap.oi]?.itemsWithImages?.[childTripSwap.ii] : null
  const childSwapCategory = childSwapItem ? childSwapPool.find(g => g.id === childSwapItem.id)?.category : null
  const childSwapUsed = new Set((childTripSwap ? childSwapPack?.outfits?.[childTripSwap.oi]?.itemsWithImages || [] : []).map((it: any) => it.id).filter(Boolean))
  const childSwapAlternatives = childSwapPool.filter(g =>
    !g.archived && !g.in_laundry && g.id !== childSwapItem?.id && !childSwapUsed.has(g.id) &&
    (childSwapCategory ? g.category === childSwapCategory : true))
  const childAddPack = childTripAdd ? tripResult?.childPacks?.[childTripAdd.ci] : null
  const childAddUsed = new Set((childTripAdd ? childAddPack?.outfits?.[childTripAdd.oi]?.itemsWithImages || [] : []).map((it: any) => it.id).filter(Boolean))
  const childAddPool: any[] = childAddPack ? (childPools[childAddPack.personId] || []).filter(g => !g.archived && !g.in_laundry && !childAddUsed.has(g.id)) : []

  // Skapa/ändra outfit – egen helskärmsvy.
  if (creating) {
    return (
      <CreateOutfitView
        // Redigerar man ett barns outfit ska plaggväljaren visa barnets garderob.
        garments={isPerson ? personGarments : garments}
        wishlist={isPerson ? [] : wishlist}
        editOutfit={editOutfit}
        locale={locale}
        onClose={() => { setCreating(false); setEditOutfit(null); setAssignAfterCreate(null) }}
        onSaved={async (outfit) => {
          // Barn-outfit: ladda om barnets data (uppdateringen behåller person_id).
          if (isPerson) { loadPersonData(); return }
          // Byggd från ett kalenderdatum? Lägg den nya outfiten direkt på dagen.
          const date = assignAfterCreate
          if (date && outfit) await assignOutfitToDay(outfit, date)
          fetchOutfits()
        }}
      />
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
              {/* Bygg en ny outfit (välj plagg direkt) och lägg den på dagen.
                  Döljs i barn-läge – barn-outfits skapas via "Familjen idag". */}
              {!isPerson && (
                <TouchableOpacity
                  style={styles.pickerCreateBtn}
                  onPress={() => {
                    const date = selectedDate
                    setShowOutfitPicker(false); setSelectedDate(null)
                    setEditOutfit(null); setAssignAfterCreate(date); setCreating(true)
                  }}
                >
                  <Ionicons name="add" size={18} color={t.onPrimary} />
                  <Text style={styles.pickerCreateBtnText}>{tr('Skapa ny outfit')}</Text>
                </TouchableOpacity>
              )}
              {(isPerson ? personOutfits : outfits).length === 0 ? (
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabText}>{tr('Inga sparade outfits ännu')}</Text>
                  {!isPerson && <Text style={styles.emptyTabHint}>{tr('Bygg en ny outfit ovan – eller välj en sparad här sen.')}</Text>}
                </View>
              ) : (
                (isPerson ? personOutfits : outfits).map((outfit: any) => (
                  <TouchableOpacity key={outfit.id} style={styles.outfitPickerItem} onPress={() => assignOutfitToDate(outfit)}>
                    <View style={styles.outfitPickerImages}>
                      {(outfit.image_urls || []).slice(0, 3).map((url: string, i: number) => (
                        <SignedImage key={i} path={url} style={styles.outfitPickerImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
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
                          <SignedImage key={i} path={url} style={styles.dayDetailImage} resizeMode="contain" transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
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
                      <Text style={styles.dayDetailAddBtnText}>＋ {tr('Välj outfit')}</Text>
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

      {/* Välj resedag för en BARN-reseoutfit (läggs i barnets kalender) */}
      <Modal visible={!!scheduleChild} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tr('Lägg outfit på en dag')}: {scheduleChild?.name}</Text>
              <TouchableOpacity onPress={() => setScheduleChild(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {tripDays().map(d => (
                <TouchableOpacity key={d} style={styles.dayPickRow} onPress={() => scheduleChild && scheduleChildTripOutfit(scheduleChild.outfit, scheduleChild.personId, d)}>
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
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>{isPartner ? (partnerName || tr('Partner')) : isPerson ? (personName || tr('Barnet')) : tr('Mina outfits')}</Text>
            {/* Läsläge (partner) markeras med ett litet hänglås. Barnens outfits
                ägs av föräldern och går att redigera – inget lås där. */}
            {isPartner && <MaterialIcons name="lock-outline" size={17} color={t.textFaint} accessibilityLabel={tr('Läsläge – du kan titta men inte ändra')} />}
          </View>
          <View style={styles.headerActions}>
            {activeTab === 'outfits' && (
              <TouchableOpacity
                style={[styles.iconBtn, (showOutfitFilter || activeStyleFilter !== 'Alla' || showOnlyLiked) && styles.iconBtnActive]}
                onPress={() => setShowOutfitFilter(v => !v)}
                accessibilityLabel={tr('Filter')}
                accessibilityRole="button"
              >
                <MaterialIcons name="tune" size={20} color={t.onPrimary} />
              </TouchableOpacity>
            )}
            <PersonSwitcher scope="outfits" current={isPartner ? { kind: 'partner', id: partner } : isPerson ? { kind: 'child', id: person } : { kind: 'me' }} />
          </View>
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
      {/* automaticallyAdjustKeyboardInsets: skjuter upp innehållet när tangent-
          bordet visas (t.ex. destinations-/känsla-fälten i resa) så man ser vad
          man skriver. keyboardDismissMode='interactive' låter en dra ner det. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >

        {/* KALENDER */}
        {activeTab === 'kalender' && (
          <View style={styles.calendarContainer}>
            {/* Month navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                <Text style={styles.monthNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthLabel(currentMonth, locale)} {currentMonth.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                <Text style={styles.monthNavArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {weekdayLabels(locale).map((d, i) => <Text key={i} style={styles.weekdayLabel}>{d}</Text>)}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />
                const ds = dateStr(day)
                const entry = dispCalendarEntries[ds]
                const todayStyle = isToday(day)
                const pastStyle = isPast(day)
                return (
                  <TouchableOpacity
                    key={ds}
                    style={[styles.dayCell, todayStyle && styles.dayCellToday, entry && (pastStyle ? styles.dayCellWorn : styles.dayCellPlanned)]}
                    activeOpacity={isPartner ? 1 : 0.2}
                    onPress={() => { if (!isPartner) setDayDetailDate(ds) }}
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
                      // Läsläge (partner): ingen "+"-ledtråd på tomma dagar.
                      !isPartner ? <Text style={styles.dayCellPlus}>＋</Text> : null
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
            {showOutfitFilter && (
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
                {['Alla', ...OUTFIT_CONTEXTS.map(c => c.label), ...STYLE_TAGS].map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, activeStyleFilter === s && styles.pillActive]} onPress={() => setActiveStyleFilter(s)}>
                    <Text style={[styles.pillText, activeStyleFilter === s && styles.pillTextActive]}>{tr(s)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            )}

            {dispOutfits.length === 0 ? (
              <View style={styles.empty}>
                {isPartner ? (
                  <Text style={styles.emptyText}>{tr('Inga sparade outfits.')}</Text>
                ) : isPerson ? (
                  <Text style={styles.emptyText}>{tr('Inga sparade outfits för barnet än.')}{'\n'}{tr('Generera via "Familjen idag" på hemskärmen.')}</Text>
                ) : (
                  <>
                    <Text style={styles.emptyText}>{tr('Inga outfits sparade än!')}{'\n'}{tr('Skapa din första eller generera via AI')}</Text>
                    <TouchableOpacity style={styles.goBtn} onPress={() => router.push('/home')}>
                      <Text style={styles.goBtnText}>{tr('Generera med AI')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              filteredOutfits.map((outfit: any) => (
                <TouchableOpacity key={outfit.id} style={styles.outfitCard} activeOpacity={isPartner ? 1 : 0.2} onPress={() => { if (!isPartner) wearOutfit(outfit) }} onLongPress={isPartner ? undefined : () => deleteOutfit(outfit.id)}>
                  <View style={styles.outfitCardHeader}>
                    <View style={styles.outfitNameWrap}>
                      {partnerLikedIds.has(outfit.id) && (
                        <Ionicons name="heart" size={16} color={t.danger} style={{ marginRight: 6 }} />
                      )}
                      <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
                    </View>
                    <View style={styles.outfitCardHeaderRight}>
                      {/* Läsläge: gilla partnerns outfit (❤). */}
                      {readOnly && (
                        <TouchableOpacity
                          onPress={() => togglePartnerLike(outfit.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={tr('Gilla outfit')}
                          accessibilityRole="button"
                        >
                          <Ionicons name={myLikedIds.has(outfit.id) ? 'heart' : 'heart-outline'} size={22} color={myLikedIds.has(outfit.id) ? t.danger : t.textSecondary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => shareSavedOutfit(outfit)}
                        disabled={sharing}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={tr('Dela outfit')}
                        accessibilityRole="button"
                      >
                        <Ionicons name="share-outline" size={20} color={t.primary} />
                      </TouchableOpacity>
                      {!isPartner && (
                        <TouchableOpacity
                          onPress={() => startEditOutfit(outfit)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={tr('Ändra outfit')}
                          accessibilityRole="button"
                        >
                          <Ionicons name="create-outline" size={20} color={t.primary} />
                        </TouchableOpacity>
                      )}
                      <Text style={styles.outfitDate}>{new Date(outfit.created_at).toLocaleDateString(locale)}</Text>
                    </View>
                  </View>
                  <View style={styles.outfitImages}>
                    {(outfit.image_urls || []).map((url: string, i: number) => (
                      <SignedImage key={i} path={url} style={styles.outfitImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                    ))}
                    {(outfit.garment_names || []).filter((_: any, i: number) => !outfit.image_urls?.[i]).map((_: string, i: number) => (
                      <View key={`emoji-${i}`} style={styles.outfitImageEmpty} />
                    ))}
                  </View>
                  {!isPartner && <Text style={styles.holdToDelete}>{tr('Håll inne för att ta bort · Tryck för att registrera som använd')}</Text>}
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* RESA */}
        {activeTab === 'resa' && !isPerson && (
          <>
            {!dispTrip ? (
              readOnly ? (
                <View style={styles.empty}><Text style={styles.emptyText}>{tr('Ingen planerad resa.')}</Text></View>
              ) : (
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
                    <Text style={styles.monthTitle}>{monthLabel(tripMonth, locale)} {tripMonth.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => setTripMonth(new Date(tripMonth.getFullYear(), tripMonth.getMonth() + 1, 1))}>
                      <Text style={styles.monthNavArrow}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.weekdayRow}>
                    {weekdayLabels(locale).map((d, i) => <Text key={i} style={styles.weekdayLabel}>{d}</Text>)}
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
                          <Text style={[styles.tripDayNum, past && styles.tripDayNumPast, inRange && styles.tripDayNumInRange, endpoint && styles.tripDayNumEndpoint]}>
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
                      : tr('Startdatum valt – tryck på slutdatum')}
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

                {familyModeOn && children.length > 0 && (
                  <View style={styles.tripKidsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripKidsLabel}>{tr('Packa även till barnen')}</Text>
                      <Text style={styles.tripKidsSub}>{tr('Packlista och outfits för varje barn.')}</Text>
                    </View>
                    <Toggle
                      value={tripIncludeKids}
                      onValueChange={(v) => { setTripIncludeKids(v); AsyncStorage.setItem(TRIP_KIDS_KEY, v ? '1' : '0').catch(() => {}) }}
                    />
                  </View>
                )}

                <TouchableOpacity style={[styles.tripGenBtn, tripLoading && { opacity: 0.7 }]} onPress={generateTrip} disabled={tripLoading}>
                  {tripLoading
                    ? <ActivityIndicator color={t.onPrimary} />
                    : <Text style={styles.tripGenBtnText}>{tr('Planera resan')}</Text>}
                </TouchableOpacity>
                {tripLoading && <Text style={styles.tripLoadingHint}>{tr('Kollar vädret och packar väskan…')}</Text>}
                {/* Gratis-kvot för packningar: dold för Premium (-1). Klickbar → paywall. */}
                {tripCreditsLeft >= 0 && !tripLoading && (
                  <TouchableOpacity style={styles.tripQuotaHint} onPress={() => router.push('/paywall')}>
                    <Text style={styles.tripQuotaText}>
                      {tripCreditsLeft > 0
                        ? tr('{n} av {max} gratis packningar kvar denna vecka').replace('{n}', String(tripCreditsLeft)).replace('{max}', String(FREE_TRIPS_PER_WEEK))
                        : tr('Gratiskvoten för packningar är slut · Uppgradera')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              )
            ) : (
              <View>
                <View style={styles.tripHeaderCard}>
                  <Text style={styles.tripDest}>{dispTrip.destinationLabel}</Text>
                  <Text style={styles.tripDates}>{dispTrip.dateLabel} · {dispTrip.days} {tr('dagar')}</Text>
                  {!!dispTrip.climateNote && <Text style={styles.tripClimate}>{dispTrip.climateNote}</Text>}
                </View>

                {(dispTrip.outfits || []).length > 0 && (
                  <>
                    <Text style={styles.tripSectionTitle}>{tr('Outfits att ta med')}</Text>
                    {(dispTrip.outfits || []).map((o: any, i: number) => (
                      <View key={i} style={styles.outfitCard}>
                        <Text style={styles.outfitName}>{o.name}</Text>
                        <View style={styles.outfitImages}>
                          {(o.items || []).map((it: any, j: number) => {
                            const m = resolveTripGarment(it)
                            return (
                              <TouchableOpacity key={j} style={styles.tripItemWrap} activeOpacity={readOnly ? 1 : 0.2} onPress={() => { if (!readOnly) setTripSwap({ oi: i, ii: j }) }} accessibilityLabel={`${tr('Byt ut')} ${tripName(it)}`}>
                                {m?.image_url
                                  ? <SignedImage path={m.image_url} style={styles.outfitImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                                  : <View style={styles.outfitImageEmpty} />}
                                {!readOnly && <View style={styles.tripSwapBadge}><Text style={styles.tripSwapBadgeText}>⇄</Text></View>}
                              </TouchableOpacity>
                            )
                          })}
                          {!readOnly && (
                            <TouchableOpacity style={styles.tripAddBox} onPress={() => setTripAddTarget({ oi: i })} accessibilityLabel={tr('Lägg till plagg')}>
                              <View style={styles.tripAddCircle}><Ionicons name="add" size={18} color={t.onPrimary} /></View>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.outfitGarments}>{(o.items || []).map(tripName).join(' · ')}</Text>
                        {!readOnly && (
                          <TouchableOpacity style={styles.tripCalBtn} onPress={() => setScheduleOutfit(o)}>
                            <Ionicons name="calendar-outline" size={16} color={t.primary} />
                            <Text style={styles.tripCalBtnText}>{tr('Lägg i kalender')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}

                <Text style={styles.tripSectionTitle}>{tr('Packlista')}</Text>
                <View style={styles.packCard}>
                  {(dispTrip.packingList || []).map((it: any, i: number) => {
                    const nm = tripName(it)
                    const m = resolveTripGarment(it)
                    const checked = !!tripChecked[nm]
                    return (
                      <TouchableOpacity key={i} style={styles.packRow} activeOpacity={readOnly ? 1 : 0.2} onPress={() => { if (!readOnly) toggleTripCheck(nm) }}>
                        <View style={[styles.packCheck, checked && styles.packCheckOn]}>
                          {checked && <Text style={styles.packCheckMark}>✓</Text>}
                        </View>
                        {m?.image_url
                          ? <SignedImage path={m.image_url} style={styles.packThumb} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                          : <View style={styles.packThumbEmpty} />}
                        <Text style={[styles.packName, checked && styles.packNameChecked]}>{nm}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {(!readOnly || (dispTrip.extras || []).length > 0) && (
                  <>
                    <Text style={styles.tripSectionTitle}>{tr('Glöm inte')}</Text>
                    <View style={styles.packCard}>
                      {(dispTrip.extras || []).map((name: string, i: number) => {
                        const checked = !!tripChecked[name]
                        return (
                          <View key={i} style={styles.packRow}>
                            <TouchableOpacity style={styles.packRowMain} activeOpacity={readOnly ? 1 : 0.2} onPress={() => { if (!readOnly) toggleTripCheck(name) }}>
                              <View style={[styles.packCheck, checked && styles.packCheckOn]}>
                                {checked && <Text style={styles.packCheckMark}>✓</Text>}
                              </View>
                              <Text style={[styles.packName, checked && styles.packNameChecked]}>{name}</Text>
                            </TouchableOpacity>
                            {!readOnly && (
                              <TouchableOpacity onPress={() => removeTripExtra(name)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <MaterialIcons name="close" size={18} color={t.textFaint} />
                              </TouchableOpacity>
                            )}
                          </View>
                        )
                      })}
                      {!readOnly && (
                        <View style={styles.extraAddRow}>
                          <TextInput
                            style={styles.extraInput}
                            value={newExtra}
                            onChangeText={setNewExtra}
                            placeholder={tr('Lägg till något eget…')}
                            placeholderTextColor={t.textFaint}
                            returnKeyType="done"
                            onSubmitEditing={() => addTripExtra(newExtra)}
                          />
                          <TouchableOpacity style={styles.extraAddBtn} onPress={() => addTripExtra(newExtra)} disabled={!newExtra.trim()}>
                            <MaterialIcons name="add" size={20} color={t.onPrimary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {!readOnly && (
                      <Text style={styles.extraHint}>{tr('Egna saker sparas och kommer tillbaka nästa resa.')}</Text>
                    )}
                  </>
                )}

                {/* Familjeresa: packning + outfits per barn (läsläge – barnens
                    reseoutfits redigeras inte här). */}
                {(dispTrip.childPacks || []).map((cp: any, ci: number) => (
                  <View key={cp.personId} style={styles.childPackBlock}>
                    <View style={styles.childPackHeader}>
                      <Text style={styles.childPackTitle}>{tr('Packat till')} {cp.name}</Text>
                    </View>
                    {(cp.outfits || []).map((o: any, i: number) => (
                      <View key={i} style={styles.outfitCard}>
                        <Text style={styles.outfitName}>{o.name}</Text>
                        <View style={styles.outfitImages}>
                          {(o.itemsWithImages || []).map((it: any, j: number) => (
                            <TouchableOpacity key={j} style={styles.tripItemWrap} activeOpacity={readOnly ? 1 : 0.2} onPress={() => { if (!readOnly) setChildTripSwap({ ci, oi: i, ii: j }) }} accessibilityLabel={`${tr('Byt ut')} ${it.name}`}>
                              {it.image_url
                                ? <SignedImage path={it.image_url} style={styles.outfitImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                                : <View style={styles.outfitImageEmpty} />}
                              {!readOnly && <View style={styles.tripSwapBadge}><Text style={styles.tripSwapBadgeText}>⇄</Text></View>}
                            </TouchableOpacity>
                          ))}
                          {!readOnly && (
                            <TouchableOpacity style={styles.tripAddBox} onPress={() => setChildTripAdd({ ci, oi: i })} accessibilityLabel={tr('Lägg till plagg')}>
                              <View style={styles.tripAddCircle}><Ionicons name="add" size={18} color={t.onPrimary} /></View>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.outfitGarments}>{(o.itemsWithImages || []).map((it: any) => it.name).join(' · ')}</Text>
                        {!readOnly && (
                          <TouchableOpacity style={styles.tripCalBtn} onPress={() => setScheduleChild({ outfit: o, personId: cp.personId, name: cp.name })}>
                            <Ionicons name="calendar-outline" size={16} color={t.primary} />
                            <Text style={styles.tripCalBtnText}>{tr('Lägg i kalender')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    {(cp.packingItems || []).length > 0 && (
                      <View style={styles.packCard}>
                        {cp.packingItems.map((it: any, i: number) => {
                          const key = `child:${cp.personId}:${it.name}`
                          const checked = !!tripChecked[key]
                          return (
                            <TouchableOpacity key={i} style={styles.packRow} activeOpacity={0.2} onPress={() => toggleTripCheck(key)}>
                              <View style={[styles.packCheck, checked && styles.packCheckOn]}>{checked && <Text style={styles.packCheckMark}>✓</Text>}</View>
                              {it.image_url
                                ? <SignedImage path={it.image_url} style={styles.packThumb} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                                : <View style={styles.packThumbEmpty} />}
                              <Text style={[styles.packName, checked && styles.packNameChecked]}>{it.name}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    )}

                    {/* Glöm inte-saker för barnet (åldersanpassade + egna). */}
                    <Text style={styles.childPackSub}>{tr('Glöm inte')}</Text>
                    <View style={styles.packCard}>
                      {(cp.extras || []).map((name: string, i: number) => {
                        const key = `child:${cp.personId}:x:${name}`
                        const checked = !!tripChecked[key]
                        return (
                          <View key={i} style={styles.packRow}>
                            <TouchableOpacity style={styles.packRowMain} activeOpacity={0.2} onPress={() => toggleTripCheck(key)}>
                              <View style={[styles.packCheck, checked && styles.packCheckOn]}>{checked && <Text style={styles.packCheckMark}>✓</Text>}</View>
                              <Text style={[styles.packName, checked && styles.packNameChecked]}>{name}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => removeChildExtra(cp.personId, name)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                              <MaterialIcons name="close" size={18} color={t.textFaint} />
                            </TouchableOpacity>
                          </View>
                        )
                      })}
                      <View style={styles.extraAddRow}>
                        <TextInput
                          style={styles.extraInput}
                          value={newChildExtra[cp.personId] || ''}
                          onChangeText={(v) => setNewChildExtra(prev => ({ ...prev, [cp.personId]: v }))}
                          placeholder={tr('Lägg till något eget…')}
                          placeholderTextColor={t.textFaint}
                          returnKeyType="done"
                          onSubmitEditing={() => addChildExtra(cp.personId, newChildExtra[cp.personId] || '')}
                        />
                        <TouchableOpacity style={styles.extraAddBtn} onPress={() => addChildExtra(cp.personId, newChildExtra[cp.personId] || '')} disabled={!(newChildExtra[cp.personId] || '').trim()}>
                          <MaterialIcons name="add" size={20} color={t.onPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.extraHint}>{tr('Egna saker sparas och kommer tillbaka nästa resa.')}</Text>
                  </View>
                ))}

                {/* Ändra-/tvätt-/nollställ-åtgärder är dolda i läsläge (partnerns resa). */}
                {!readOnly && (
                  <>
                    {/* Hemkommen? Lägg allt du haft med i tvätten på en gång. */}
                    <TouchableOpacity style={styles.tripWashBtn} onPress={washTripGarments}>
                      <MaterialIcons name="local-laundry-service" size={18} color={t.onPrimary} />
                      <Text style={styles.tripWashBtnText}>{tr('Lägg allt i tvätten')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.tripResetBtn} onPress={resetTrip}>
                      <Text style={styles.tripResetBtnText}>{tr('Planera en ny resa')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </>
        )}

        {/* Barnets del av familjeresan (läsläge). Planeras under förälderns profil. */}
        {activeTab === 'resa' && isPerson && (
          !childTrip ? (
            <View style={styles.empty}><Text style={styles.emptyText}>{tr('Ingen planerad resa för barnet.')}{'\n'}{tr('Planeras i familjeresan under din egen profil.')}</Text></View>
          ) : (
            <View>
              <View style={styles.tripHeaderCard}>
                <Text style={styles.tripDest}>{tripResult?.destinationLabel}</Text>
                <Text style={styles.tripDates}>{tripResult?.dateLabel} · {tripResult?.days} {tr('dagar')}</Text>
              </View>
              {(childTrip.outfits || []).length > 0 && (
                <>
                  <Text style={styles.tripSectionTitle}>{tr('Outfits att ta med')}</Text>
                  {(childTrip.outfits || []).map((o: any, i: number) => (
                    <View key={i} style={styles.outfitCard}>
                      <Text style={styles.outfitName}>{o.name}</Text>
                      <View style={styles.outfitImages}>
                        {(o.itemsWithImages || []).map((it: any, j: number) => (
                          <View key={j} style={styles.tripItemWrap}>
                            {it.image_url
                              ? <SignedImage path={it.image_url} style={styles.outfitImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                              : <View style={styles.outfitImageEmpty} />}
                          </View>
                        ))}
                      </View>
                      <Text style={styles.outfitGarments}>{(o.itemsWithImages || []).map((it: any) => it.name).join(' · ')}</Text>
                    </View>
                  ))}
                </>
              )}
              {(childTrip.packingItems || []).length > 0 && (
                <>
                  <Text style={styles.tripSectionTitle}>{tr('Packlista')}</Text>
                  <View style={styles.packCard}>
                    {childTrip.packingItems.map((it: any, i: number) => (
                      <View key={i} style={styles.packRow}>
                        {it.image_url
                          ? <SignedImage path={it.image_url} style={styles.packThumb} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                          : <View style={styles.packThumbEmpty} />}
                        <Text style={styles.packName}>{it.name}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {(childTrip.extras || []).length > 0 && (
                <>
                  <Text style={styles.tripSectionTitle}>{tr('Glöm inte')}</Text>
                  <View style={styles.packCard}>
                    {childTrip.extras.map((nm: string, i: number) => (
                      <View key={i} style={styles.packRow}><Text style={styles.packName}>{nm}</Text></View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )
        )}
      </ScrollView>

      {/* Byt ut ett plagg i en reseoutfit */}
      <SwapSheet
        visible={tripSwap !== null}
        title={`${tr('Byt ut')}${tripSwapItemName ? ` ${tripSwapItemName}` : ''}`}
        alternatives={tripSwapAlternatives}
        emptyText={tr('Inga andra plagg i samma kategori')}
        onClose={() => setTripSwap(null)}
        onRemove={() => tripSwap && removeTripItem(tripSwap.oi, tripSwap.ii)}
        onReplace={(g) => tripSwap && replaceTripItem(tripSwap.oi, tripSwap.ii, g)}
      />

      {/* Lägg till ett plagg i en reseoutfit */}
      <GarmentPicker
        visible={tripAddTarget !== null}
        title={tr('Lägg till plagg')}
        pool={tripAddPool}
        garments={garments}
        onSelect={(g) => tripAddTarget && addTripItem(tripAddTarget.oi, g)}
        onClose={() => setTripAddTarget(null)}
        accessoriesFirst
      />

      {/* Byt ut / lägg till plagg i en BARN-reseoutfit (barnets garderob) */}
      <SwapSheet
        visible={childTripSwap !== null}
        title={`${tr('Byt ut')}${childSwapItem?.name ? ` ${childSwapItem.name}` : ''}`}
        alternatives={childSwapAlternatives}
        emptyText={tr('Inga andra plagg i samma kategori')}
        onClose={() => setChildTripSwap(null)}
        onRemove={() => childTripSwap && removeChildTripItem(childTripSwap.ci, childTripSwap.oi, childTripSwap.ii)}
        onReplace={(g) => childTripSwap && replaceChildTripItem(childTripSwap.ci, childTripSwap.oi, childTripSwap.ii, g)}
      />
      <GarmentPicker
        visible={childTripAdd !== null}
        title={tr('Lägg till plagg')}
        pool={childAddPool}
        garments={childAddPool}
        onSelect={(g) => childTripAdd && addChildTripItem(childTripAdd.ci, childTripAdd.oi, g)}
        onClose={() => setChildTripAdd(null)}
        accessoriesFirst
      />

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, flexShrink: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  iconBtnActive: { backgroundColor: t.primaryActive, borderColor: t.primaryActive },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtnText: { fontFamily: 'Lora_400Regular', fontSize: 18, color: t.textPrimary },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
  // Innehållet top-justeras så datumsiffran hamnar på samma nivå i alla celler
  // (annars centreras den och en dag med outfit-bild trycker upp siffran medan
  // en tom dag får den längre ner). Transparent kant på basen så dagens kant
  // inte förskjuter layouten relativt grannarna.
  dayCell: { width: '14.28%', aspectRatio: 0.78, padding: 2, paddingTop: 6, alignItems: 'center', justifyContent: 'flex-start', borderRadius: 8, borderWidth: 1.5, borderColor: 'transparent' },
  dayCellToday: { borderColor: t.primary },
  // Burna outfits (dagar som passerat) = varm brun ton. Planerade (idag/framåt)
  // = samma ljusblå som plusknappen (fast, oavsett tema).
  dayCellWorn: { backgroundColor: t.primaryActive + '33' },
  dayCellPlanned: { backgroundColor: '#DDE6ED' },
  dayNumber: { fontFamily: 'Lora_500Medium', fontSize: 11, color: t.textPrimary, marginBottom: 2 },
  dayNumberToday: { color: t.textSecondary, fontWeight: '700' },
  dayNumberPast: { color: t.textFaint },
  dayNumberPlanned: { color: '#2B2320' },
  dayCellGrid: { width: 44, height: 44, flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellImage: { width: 42, height: 42, borderRadius: 8 },
  dayCellImageSmall: { width: 21, height: 21, borderRadius: 5 },
  dayCellOutfitDot: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textPrimary },
  dayCellPlus: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint },
  calendarLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 32 },
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
  pickerCreateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 16, paddingVertical: 14, marginBottom: 14 },
  pickerCreateBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
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
  nameInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 16 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 12, marginTop: 8 },
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
  // Fast höjd (i stället för aspectRatio) så datumsiffran centreras säkert
  // vertikalt i markeringen – aspectRatio + justifyContent kunde lägga siffran
  // i nederkant.
  tripDayCell: { width: '14.28%', height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  // Temaanpassad: t.accent är #DDE6ED i ljust läge (oförändrat) och en mörk ton
  // i mörkt läge, så dagsiffrorna (t.textPrimary) syns i båda temana.
  // Spannet mellan start/slut: alltid ljusblått med mörkbruna siffror (samma i
  // ljust och mörkt läge) – i mörkt läge var det annars mörkblått med vit text.
  tripDayInRange: { backgroundColor: '#DDE6ED' },
  tripDayEndpoint: { backgroundColor: t.primary, borderRadius: 8 },
  tripDayNum: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textPrimary },
  tripDayNumPast: { color: t.textFaint },
  tripDayNumInRange: { color: '#402D21' },
  tripDayNumEndpoint: { color: t.onPrimary, fontWeight: '700' },
  tripDatesLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, textAlign: 'center', marginBottom: 16 },
  tripGenBtn: { backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  tripGenBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  tripKidsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.border, marginTop: 14, marginBottom: 16 },
  tripKidsLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  tripKidsSub: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, marginTop: 2 },
  childPackBlock: { marginTop: 12 },
  childPackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 8 },
  childPackTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary },
  childPackSub: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, marginTop: 14, marginBottom: 8 },
  tripQuotaHint: { alignItems: 'center', paddingVertical: 10 },
  tripQuotaText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textFaint, textDecorationLine: 'underline' },
  tripLoadingHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  tripHeaderCard: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: t.border, marginBottom: 8 },
  tripDest: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: t.textPrimary },
  tripDates: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textSecondary, marginTop: 2 },
  tripClimate: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20, marginTop: 10 },
  tripSectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary, marginTop: 20, marginBottom: 12 },
  packCard: { backgroundColor: t.surfaceMuted, borderRadius: 18, padding: 8, borderWidth: 1, borderColor: t.border },
  packRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8 },
  packRowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  extraAddRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 8 },
  extraInput: { flex: 1, fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  extraAddBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  extraHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, marginTop: 8, marginLeft: 4 },
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
  tripItemWrap: { width: 70, height: 70 },
  tripSwapBadge: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  tripSwapBadgeText: { color: t.onPrimary, fontSize: 11, fontFamily: 'Poppins_700Bold' },
  tripAddBox: { width: 70, height: 70, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, borderStyle: 'dashed', backgroundColor: t.surface },
  tripAddCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  tripWashBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 16, paddingVertical: 14, marginTop: 24 },
  tripWashBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  dayPickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  dayPickText: { fontFamily: 'Lora_500Medium', fontSize: 15, color: t.textPrimary, textTransform: 'capitalize' },

  // Delning
  shareCardHidden: { position: 'absolute', left: -9999, top: 0 },
  shareOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
})
