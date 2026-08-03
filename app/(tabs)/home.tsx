import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins'
import * as Location from 'expo-location'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
import { CATEGORIES, COLOR_HEX, COLOR_NAMES, OUTFIT_CONTEXTS, SEASONS, STYLE_RULES, SUBCATEGORIES } from '../../utils/constants'
import { cacheGet, cacheSet } from '../../utils/cache'
import { useSettings } from '../../utils/settings'
import { loadPartner } from '../../utils/household'
import OutfitShareCard from '../../components/OutfitShareCard'
import SignedImage from '../../components/SignedImage'
import SongCard from '../../components/SongCard'
import { supabase } from '../../supabase'
import { showAlert } from '../../utils/alert'
import { apiPost } from '../../utils/api'
import { buildWeatherContext, summarizeDayForecast } from '../../utils/weather'
import { useEntitlements, FREE_AI_PER_WEEK } from '../../utils/entitlements'
import { fetchSets, type GarmentSet } from '../../utils/sets'

const CONTEXTS = OUTFIT_CONTEXTS

const INTENSITY_LABELS = ['Subtil', 'Diskret', 'Balanserad', 'Uttalad', 'Total']
const RECENT_SONGS_KEY = 'kladkollen_recent_songs'
// Minne av de senaste genererade outfitsen (lokalt), så AI:n inte upprepar
// samma kombination flera dagar i rad – även om man inte sparar dem.
const RECENT_OUTFITS_KEY = 'kladkollen_recent_outfits'
// Minne av enskilda plagg som nyligen använts, så samma plagg (t.ex. en viss
// skjorta) inte återkommer flera dagar i rad även om outfiten i övrigt skiljer sig.
const RECENT_GARMENTS_KEY = 'kladkollen_recent_garments'

export default function Home() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { tempLabel, t: tr } = useSettings()
  const { isPro, creditsLeft, refresh: refreshEntitlements } = useEntitlements()
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold })
  // Seedas från cachen så vädret syns direkt vid flikbyte (uppdateras i bakgrunden).
  const [weather, setWeather] = useState<any>(() => cacheGet('home.weather') ?? null)
  const [outfit, setOutfit] = useState<any>(null)
  const [garments, setGarments] = useState<any[]>(() => cacheGet('home.garments') ?? [])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null)
  const [wornToday, setWornToday] = useState(false)
  const [wearingToday, setWearingToday] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [swapIndex, setSwapIndex] = useState<number | null>(null)
  const [contextNotes, setContextNotes] = useState<Record<string, string>>({})
  const [musicGenres, setMusicGenres] = useState<string>('')
  const [coldSensitivity, setColdSensitivity] = useState(3)
  const [styleRuleKeys, setStyleRuleKeys] = useState<string[]>([])
  const [avoidNote, setAvoidNote] = useState('')
  const [sharing, setSharing] = useState(false)
  // Seedas från cachen så hälsning + profilbild syns direkt vid flikbyte.
  const [userName, setUserName] = useState<string>(() => cacheGet('home.userName') ?? '')
  const [userAvatar, setUserAvatar] = useState<string | null>(() => cacheGet('home.userAvatar') ?? null)
  // Seedas från cachen så partner-knappen syns direkt vid flikbyte (annars
  // blinkar den in först efter att loadPartner hämtat klart).
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(() => cacheGet('household.partner') ?? null)
  const [coupleOutfit, setCoupleOutfit] = useState<any | null>(null)
  const [coupleLoading, setCoupleLoading] = useState(false)
  const [coupleSaving, setCoupleSaving] = useState(false)
  const [coupleSaved, setCoupleSaved] = useState(false)
  const [coupleWearing, setCoupleWearing] = useState(false)
  const [coupleWorn, setCoupleWorn] = useState(false)
  // Vilket plagg i par-outfiten som byts ut: person (0 = jag, 1 = partner) + index.
  const [coupleSwap, setCoupleSwap] = useState<{ person: number; index: number } | null>(null)
  // Valfritt utgångsplagg – bygg outfiten kring ett specifikt plagg.
  const [baseGarment, setBaseGarment] = useState<any | null>(null)
  // Utgångsset: generera en outfit KRING ett helt set (alt. till utgångsplagg).
  const [baseSet, setBaseSet] = useState<{ id: string; name: string; members: any[] } | null>(null)
  const [sets, setSets] = useState<GarmentSet[]>([])
  const [showBasePicker, setShowBasePicker] = useState(false)
  const [baseSearch, setBaseSearch] = useState('')
  // Filter i plagg-väljaren (enkelval, 'Alla' = inget filter).
  const [baseCat, setBaseCat] = useState('Alla')
  const [baseType, setBaseType] = useState('Alla')
  const [baseColor, setBaseColor] = useState('Alla')
  const [baseSeason, setBaseSeason] = useState('Alla')
  const [baseFilterOpen, setBaseFilterOpen] = useState<string | null>(null)
  // Lägg till ytterligare plagg i en genererad outfit. person=null → singel-
  // outfiten, person=0/1 → par-outfitens person. Max 3 tillagda plagg.
  const [addTarget, setAddTarget] = useState<{ person: number | null } | null>(null)
  const MAX_ADDED = 3

  const shareCardRef = useRef<View>(null)

  const [selectedContext, setSelectedContext] = useState(2) // 0=Jobb, 1=Skola, 2=Ledig, 3=Aktiv, 4=Date, 5=Fest
  const intensity = 3 // Fast: Balanserad
  const [useWeather, setUseWeather] = useState(true)

  const outfitAnim = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      // loadUser körs även på fokus så egna kommentarer/genrer man precis
      // ändrat i profilen slår igenom direkt när man kommer tillbaka hit.
      loadUser()
      fetchAll()
      fetchSets().then(setSets)
      loadPartner().then(({ partner }) => { setPartner(partner); cacheSet('household.partner', partner) })
    }, [])
  )

  // Öppnade man appen via en Smart Push-notis: förvälj kalenderns kontext och
  // generera outfiten direkt (en gång, när garderoben har laddats).
  const { smartContext, styleSet } = useLocalSearchParams<{ smartContext?: string; styleSet?: string }>()
  const smartHandled = useRef(false)
  useEffect(() => {
    if (!smartContext || smartHandled.current || garments.length === 0) return
    const idx = CONTEXTS.findIndex(c => c.label === smartContext)
    if (idx < 0) return
    smartHandled.current = true
    setSelectedContext(idx)
    generateOutfit(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartContext, garments.length])

  // "Styla hela setet" (från plaggvyn): bygg en outfit kring hela setet en gång.
  const styleSetHandled = useRef(false)
  useEffect(() => {
    if (!styleSet || styleSetHandled.current || garments.length === 0) return
    const members = garments.filter(g => g.set_id === styleSet && !g.archived && !g.in_laundry)
    if (members.length === 0) return
    styleSetHandled.current = true
    generateOutfit(selectedContext, members)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleSet, garments.length])

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('name, avatar_url, outfit_context_notes, music_genres, cold_sensitivity, style_rules, avoid_note').eq('id', user.id).single()
      const name = profile?.name || user.email?.split('@')[0] || ''
      setUserName(name); cacheSet('home.userName', name)
      setUserAvatar(profile?.avatar_url || null); cacheSet('home.userAvatar', profile?.avatar_url || null)
      setContextNotes(profile?.outfit_context_notes || {})
      setMusicGenres(profile?.music_genres || '')
      if (profile?.cold_sensitivity != null) setColdSensitivity(profile.cold_sensitivity)
      setStyleRuleKeys(profile?.style_rules ? profile.style_rules.split(', ').filter(Boolean) : [])
      setAvoidNote(profile?.avoid_note || '')
    }
  }

  async function fetchAll() {
    // Bara kolumnerna hemskärmen faktiskt använder (outfit-generering + räknare) –
    // slipper dra hela plaggraden vid varje appstart.
    const { data } = await supabase.from('garments').select('id, name, category, subcategory, color, season, image_url, times_worn, archived, in_laundry, set_id').is('person_id', null)
    if (data) {
      setGarments(data); cacheSet('home.garments', data)
    }
    fetchWeather()
  }

  async function fetchWeather() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { if (!weather) setWeather({ temp: 10, emoji: '🌧️', description: tr('Regn'), rain: true }); return }
      // Låg precision räcker gott för väder (~stad/kvarter) och håller platsen
      // grov – vi behöver aldrig exakt position.
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      const { latitude, longitude } = location.coords
      // current = hur det känns nu (emoji/etikett). hourly + daily = resten av
      // dagens temperaturspann och regnrisk, så outfiten håller hela dagen.
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`)
      const data = await response.json()
      const temp = Math.round(data.current.temperature_2m)
      const code = data.current.weathercode
      const forecast = summarizeDayForecast(data)
      const w = { temp, emoji: getWeatherEmoji(code), description: getWeatherDescription(code), rain: code >= 51 && code <= 82, ...forecast }
      setWeather(w); cacheSet('home.weather', w)
    } catch {
      // Behåll senast kända väder (om det finns) i stället för att skriva över
      // med en platshållare vid tillfälligt fel.
      if (!weather) setWeather({ temp: 10, emoji: '🌡️', description: tr('Okänt'), rain: false })
    }
  }

  function getWeatherEmoji(code: number) {
    if (code === 0) return '☀️'
    if (code <= 3) return '⛅️'
    if (code <= 48) return '🌫️'
    if (code <= 67) return '🌧️'
    if (code <= 77) return '❄️'
    if (code <= 82) return '🌦️'
    return '⛈️'
  }

  function getWeatherDescription(code: number) {
    if (code === 0) return tr('Klart')
    if (code <= 3) return tr('Halvklart')
    if (code <= 48) return tr('Dimma')
    if (code <= 67) return tr('Regn')
    if (code <= 77) return tr('Snö')
    if (code <= 82) return tr('Skurar')
    return tr('Åska')
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 10) return tr('God morgon')
    if (hour < 18) return tr('Hej')
    return tr('God kväll')
  }

  function selectContext(index: number) {
    setSelectedContext(index)
    setOutfit(null)
    setSaved(false)
    setSavedOutfitId(null)
    setWornToday(false)
    setRating(null)
  }

  function getCurrentSeason(): string {
    const m = new Date().getMonth() // 0 = jan
    if (m === 11 || m <= 1) return 'Vinter'
    if (m <= 4) return 'Vår'
    if (m <= 8) return 'Sommar'
    return 'Höst'
  }

  // Ett plagg passar säsongen om: ingen säsong angiven, "Alla årstider",
  // eller om den aktuella säsongen finns med i plaggets säsonger.
  function seasonAppropriate(g: any, season: string): boolean {
    const s = (g.season || '').trim()
    if (!s) return true
    if (s.includes('Alla årstider')) return true
    return s.includes(season)
  }

  function buildGroupedGarmentList(garmentList: any[], requiresOuterwear: boolean) {
    const outerwearLabel = requiresOuterwear
      ? 'YTTERPLAGG / KAVAJ – OBLIGATORISK pga vädret (välj 1 om tillgängligt)'
      : 'YTTERPLAGG / KAVAJ – valfritt, lägg till om kontexten/vädret kräver'

    const groups: Record<string, string[]> = {
      'KLÄNNING (välj 1 om du vill ha heldress – då skippar du nederdel och överdel)': [],
      'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)': [],
      'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)': [],
      [outerwearLabel]: [],
      'SKOR – alltid obligatorisk (välj exakt 1)': [],
      'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken': [],
    }
    const categoryMap: Record<string, string> = {
      'Klänningar': 'KLÄNNING (välj 1 om du vill ha heldress – då skippar du nederdel och överdel)',
      'Byxor': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Shorts': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Kjolar': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Toppar': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Tröjor': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Kavajer': outerwearLabel,
      'Ytterkläder': outerwearLabel,
      'Skor': 'SKOR – alltid obligatorisk (välj exakt 1)',
      'Väskor': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
      'Accessoarer': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
      'Smycken': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
    }
    for (const g of garmentList) {
      const group = categoryMap[g.category]
      if (group) {
        // Ta med typen (t.ex. Festklänning/Vardagsklänning) så AI:n kan matcha
        // formalitetsnivån till kontexten – annars syns bara huvudkategorin.
        const meta = [g.subcategory, g.color].filter(Boolean).join(', ')
        groups[group].push(`  • ${g.name}${meta ? ' (' + meta + ')' : ''}`)
      }
    }
    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([group, items]) => `${group}:\n${items.join('\n')}`)
      .join('\n\n')
  }

  function validateOutfit(items: string[], garmentList: any[], requiresOuterwear: boolean): { valid: boolean; missing: string } {
    const BOTTOM_CATS = ['Byxor', 'Shorts', 'Kjolar']
    const TOP_CATS = ['Toppar', 'Tröjor']
    const DRESS_CATS = ['Klänningar']
    const SHOE_CATS = ['Skor']
    const OUTER_CATS = ['Ytterkläder', 'Kavajer']

    const matched = items.map(name =>
      garmentList.find(g =>
        g.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(g.name.toLowerCase())
      )
    ).filter(Boolean)

    const hasDress = matched.some(g => DRESS_CATS.includes(g.category))
    const hasBottom = matched.some(g => BOTTOM_CATS.includes(g.category))
    const hasTop = matched.some(g => TOP_CATS.includes(g.category))
    const hasShoes = matched.some(g => SHOE_CATS.includes(g.category))
    const hasOuter = matched.some(g => OUTER_CATS.includes(g.category))

    if (!hasShoes) return { valid: false, missing: 'skor saknas' }
    if (!hasDress && !hasBottom) return { valid: false, missing: 'nederdel (byxor/kjol) saknas' }
    if (!hasDress && !hasTop) return { valid: false, missing: 'överdel saknas' }
    // Only require outerwear if the wardrobe actually has some
    const hasOuterwearInWardrobe = garmentList.some(g => OUTER_CATS.includes(g.category))
    if (requiresOuterwear && hasOuterwearInWardrobe && !hasOuter) return { valid: false, missing: 'ytterkläder saknas trots kallt/regnigt väder' }
    return { valid: true, missing: '' }
  }

  async function generateOutfit(ctxIndex: number = selectedContext, baseSetGarments: any[] = []) {
    if (garments.length === 0) {
      showAlert(tr('Lägg till plagg i garderoben först!'))
      return
    }

    // Föregående förslag (om man trycker "generera ny") så AI:n varierar sig.
    const previousItems: string = (outfit?.items || []).join(', ')

    setLoading(true)
    setSaved(false)
    setSavedOutfitId(null)
    setWornToday(false)
    setRating(null)
    setOutfit(null)

    const ctx = CONTEXTS[ctxIndex] ?? CONTEXTS[selectedContext]
    const currentWeather = weather ?? { temp: 10, description: 'okänt', rain: false }

    try {
      const { data: recentOutfits } = await supabase
        .from('outfits')
        .select('garment_names, rating')
        .order('created_at', { ascending: false })
        .limit(10)

      const recentGarments = recentOutfits?.slice(0, 5).flatMap(o => o.garment_names || []) || []

      const likedOutfits = recentOutfits?.filter(o => o.rating >= 4).map(o => o.garment_names?.join(', ')).filter(Boolean) || []
      const dislikedOutfits = recentOutfits?.filter(o => o.rating <= 2 && o.rating !== null).map(o => o.garment_names?.join(', ')).filter(Boolean) || []
      const feedbackStr = [
        likedOutfits.length > 0 ? `Användaren GILLADE dessa kombinationer: ${likedOutfits.slice(0, 3).join(' | ')}` : '',
        dislikedOutfits.length > 0 ? `Användaren GILLADE INTE dessa: ${dislikedOutfits.slice(0, 3).join(' | ')}` : '',
      ].filter(Boolean).join('\n')

      // Plagg i tvätten föreslås inte i genererade outfits.
      const activeGarments = garments.filter(g => !g.archived && !g.in_laundry)
      const weatherCtx = useWeather ? buildWeatherContext(currentWeather, coldSensitivity) : { summary: '', rules: '', requiresOuterwear: false }

      // Filtrera bort renodlade off-season-plagg (t.ex. vinterjacka på sommaren).
      // Faller tillbaka till hela garderoben om säsongsurvalet inte räcker för
      // en komplett outfit (skor + över-/nederdel eller klänning).
      const season = getCurrentSeason()
      const seasonalPool = activeGarments.filter(g => seasonAppropriate(g, season))
      const SHOE_CATS = ['Skor']
      const BOTTOM_OR_DRESS = ['Byxor', 'Shorts', 'Kjolar', 'Klänningar']
      const TOP_OR_DRESS = ['Toppar', 'Tröjor', 'Klänningar']
      const poolCanFormOutfit =
        seasonalPool.some(g => SHOE_CATS.includes(g.category)) &&
        seasonalPool.some(g => BOTTOM_OR_DRESS.includes(g.category)) &&
        seasonalPool.some(g => TOP_OR_DRESS.includes(g.category))
      let pool = poolCanFormOutfit ? seasonalPool : activeGarments
      // Utgångsplagget måste alltid finnas i poolen även om det är off-season.
      if (baseGarment && !pool.some(g => g.id === baseGarment.id)) pool = [baseGarment, ...pool]
      // Set att bygga kring: explicit inskickat (t.ex. "styla hela setet") eller
      // det utgångsset man valt på startskärmen.
      const setGarments = baseSetGarments.length ? baseSetGarments : (baseSet?.members || [])
      // Set-plaggen måste också alltid finnas i poolen.
      for (const g of setGarments) if (!pool.some(p => p.id === g.id)) pool = [g, ...pool]
      const annot = (g: any) => {
        const extra = [g.subcategory, g.color].filter(Boolean).join(', ')
        return `${g.name}${extra ? ` (${extra})` : ''}`
      }
      const baseSetStr = setGarments.map(annot).join(', ')

      const groupedList = buildGroupedGarmentList(pool, weatherCtx.requiresOuterwear)

      const intensityStr = INTENSITY_LABELS[intensity - 1]

      // Nyligen använda enskilda plagg (lokalt minne) + plagg ur sparade outfits.
      const recentGarmentsLocal: string[] = JSON.parse((await AsyncStorage.getItem(RECENT_GARMENTS_KEY)) || '[]')
      const avoidGarments = [...new Set([...recentGarmentsLocal, ...recentGarments])].slice(0, 10)
      const recentAvoidStr = avoidGarments.length > 0
        ? `Undvik om möjligt att återanvända dessa nyligen burna plagg – variera, låt inte samma plagg (särskilt nederdel/överdel) återkomma flera dagar i rad: ${avoidGarments.join(', ')}.`
        : ''
      // Användarens egen "undvik"-instruktion från profilen väger tungt.
      const userAvoidStr = avoidNote.trim()
        ? `Användaren vill UNDVIKA följande – respektera det: ${avoidNote.trim()}.`
        : ''
      const avoidStr = [userAvoidStr, recentAvoidStr].filter(Boolean).join(' ')

      // Nyligen föreslagna låtar (sparas lokalt som "Titel – Artist") så AI:n
      // slipper upprepa sig – varken samma låt eller samma artist igen.
      const recentSongs: string[] = JSON.parse((await AsyncStorage.getItem(RECENT_SONGS_KEY)) || '[]')
      const avoidSongsStr = recentSongs.slice(0, 50).join(', ')
      const previousSongStr = recentSongs[0] || ''

      // Minne av de senaste 10 genererade outfitsen (lokalt, oavsett om de
      // sparats) → matas in så AI:n ger en tydligt annorlunda kombination.
      const recentOutfitsLocal: string[] = JSON.parse((await AsyncStorage.getItem(RECENT_OUTFITS_KEY)) || '[]')
      const recentOutfitsStr = recentOutfitsLocal.slice(0, 10).join(' | ')

      let parsed: any = null
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        attempts++
        parsed = await apiPost('/api/generate-outfit', {
          contextLabel: ctx.label,
          contextLogic: ctx.logic,
          intensity: `${intensityStr} (${intensity}/5)`,
          weatherSummary: weatherCtx.summary,
          weatherRules: weatherCtx.rules,
          avoid: avoidStr,
          feedback: feedbackStr,
          groupedList,
          season,
          avoidSongs: avoidSongsStr,
          previousSong: previousSongStr,
          recentOutfits: recentOutfitsStr,
          contextNote: contextNotes[ctx.label] || '',
          musicGenres,
          styleRules: STYLE_RULES.filter(r => styleRuleKeys.includes(r.key)).map(r => `- ${r.rule}`).join('\n'),
          previousItems: attempts === 1 ? previousItems : '',
          retry: attempts > 1,
          baseGarment: baseGarment
            ? `${baseGarment.name}${[baseGarment.subcategory, baseGarment.color].filter(Boolean).length ? ` (${[baseGarment.subcategory, baseGarment.color].filter(Boolean).join(', ')})` : ''}`
            : '',
          baseSet: baseSetStr,
        })

        const { valid } = validateOutfit(parsed.items, pool, weatherCtx.requiresOuterwear)
        // Om ett utgångsplagg valts måste det finnas med i förslaget.
        const baseIncluded = !baseGarment || (parsed.items || []).some((n: string) => {
          const a = (n || '').trim().toLowerCase(), b = (baseGarment.name || '').trim().toLowerCase()
          return !!b && (a === b || a.includes(b) || b.includes(a))
        })
        if (valid && baseIncluded) break
      }

      if (!parsed?.items?.length) throw new Error(tr('AI:n gav inget giltigt förslag – försök igen.'))

      // Matcha AI:ns plaggnamn mot rätt plagg – exakt först, sedan mest
      // specifikt, och aldrig samma plagg två gånger. (Lös includes-matchning
      // gav ibland fel bild när två plagg hade liknande namn.)
      const usedIds = new Set<string>()
      const findMatch = (name: string) => {
        const target = name.trim().toLowerCase()
        const free = (g: any) => !g.id || !usedIds.has(g.id)
        // 1. Exakt samma namn
        let m = pool.find(g => free(g) && (g.name || '').trim().toLowerCase() === target)
        // 2. Plaggets namn innehåller hela AI-namnet
        if (!m) m = pool.find(g => free(g) && (g.name || '').toLowerCase().includes(target))
        // 3. AI-namnet innehåller plaggets namn – välj det LÄNGSTA (mest specifika)
        if (!m) {
          m = pool
            .filter(g => free(g) && g.name && target.includes(g.name.toLowerCase()))
            .sort((a, b) => b.name.length - a.name.length)[0]
        }
        if (m?.id) usedIds.add(m.id)
        return m
      }
      const itemsWithImages = dedupOutfitItems(
        parsed.items.map((name: string) => {
          const match = findMatch(name)
          return { name, image_url: match?.image_url || null, id: match?.id || null }
        }),
        pool,
      )

      setOutfit({ ...parsed, itemsWithImages })

      // Minns kombinationen + de enskilda plaggen så nästa generering varierar.
      try {
        const items: string[] = parsed.items || []
        const comboStr = items.join(', ')
        if (comboStr) {
          const nextOutfits = [comboStr, ...recentOutfitsLocal.filter(s => s !== comboStr)].slice(0, 10)
          await AsyncStorage.setItem(RECENT_OUTFITS_KEY, JSON.stringify(nextOutfits))
          const nextGarments = [...items, ...recentGarmentsLocal.filter(g => !items.includes(g))].slice(0, 15)
          await AsyncStorage.setItem(RECENT_GARMENTS_KEY, JSON.stringify(nextGarments))
        }
      } catch { /* ignorera */ }

      outfitAnim.setValue(0)
      Animated.spring(outfitAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start()

      // Hämta matchande låt + Apple Music-preview (blockerar inte outfiten om det failar)
      if (parsed.song?.title) {
        // Minns låten (som "Titel – Artist") så vi undviker upprepning nästa
        // gång – både samma låt och samma artist (senaste 50).
        try {
          const entry = parsed.song.artist ? `${parsed.song.title} – ${parsed.song.artist}` : parsed.song.title
          const next = [entry, ...recentSongs.filter(s => s !== entry)].slice(0, 50)
          await AsyncStorage.setItem(RECENT_SONGS_KEY, JSON.stringify(next))
        } catch { /* ignorera */ }
        try {
          const { song } = await apiPost('/api/song-preview', { title: parsed.song.title, artist: parsed.song.artist })
          if (song) setOutfit((prev: any) => prev ? { ...prev, song: { ...song, reason: parsed.song.reason } } : prev)
        } catch { /* låten är bonus – ignorera fel */ }
      }

    } catch (e: any) {
      // Gratiskvoten slut → visa paywall i stället för ett generiskt fel.
      if (e?.code === 'quota_exceeded') { router.push('/paywall'); return }
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setLoading(false)
      // Uppdatera kvar-räknaren efter varje försök (den ändras serverside).
      refreshEntitlements()
    }
  }

  async function shareOutfit() {
    if (!outfit || sharing) return
    setSharing(true)
    try {
      // Ge den dolda dela-vyn ett ögonblick att rita klart bilderna.
      await new Promise(r => setTimeout(r, 350))
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: tr('Dela din outfit') })
      } else if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: tr('Min outfit'), text: outfit.outfitName })
      } else {
        showAlert(tr('Delning stöds inte här'), tr('Öppna appen på din telefon för att dela din outfit.'))
      }
    } catch (e: any) {
      if (e?.message && !/cancel/i.test(e.message)) showAlert(tr('Kunde inte dela'), e.message)
    } finally {
      setSharing(false)
    }
  }

  // ── Par-generering (samboläge) ──────────────────────────────────────────
  function matchItemsToPool(names: string[], pool: any[]) {
    const used = new Set<string>()
    const find = (name: string) => {
      const target = (name || '').trim().toLowerCase()
      const free = (g: any) => !g.id || !used.has(g.id)
      let m = pool.find(g => free(g) && (g.name || '').trim().toLowerCase() === target)
      if (!m) m = pool.find(g => free(g) && (g.name || '').toLowerCase().includes(target))
      if (!m) m = pool.filter(g => free(g) && g.name && target.includes(g.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0]
      if (m?.id) used.add(m.id)
      return m
    }
    return (names || []).map((n: string) => {
      const m = find(n)
      return { name: n, image_url: m?.image_url || null, id: m?.id || null }
    })
  }

  // Skyddsnät: ta bort dubbletter av "en-per-look"-roller (t.ex. två par skor)
  // som AI:n ibland råkar välja. Accessoarer/smycken/väskor lämnas orörda.
  function dedupOutfitItems(items: any[], pool: any[]) {
    const catById = new Map(pool.filter(g => g.id).map(g => [g.id, g.category]))
    // Högst ETT plagg per kärnkategori. Lager är olika kategorier (t.ex. Toppar +
    // Tröjor), så två av SAMMA kategori (t.ex. två skjortor = två Toppar) tas bort.
    // Accessoarer, väskor och smycken får förekomma flera gånger.
    const SINGLE = new Set(['Skor', 'Byxor', 'Shorts', 'Kjolar', 'Klänningar', 'Toppar', 'Tröjor', 'Kavajer', 'Ytterkläder'])
    const seen = new Set<string>()
    return items.filter(it => {
      const cat = it.id ? catById.get(it.id) : null
      if (!cat || !SINGLE.has(cat)) return true // accessoarer m.m. – behåll alla
      if (seen.has(cat)) return false
      seen.add(cat)
      return true
    })
  }

  // Bygger listan för en person: egna plagg + den ANDRAS lånbara (märkta [LÅN]).
  function coupleList(own: any[], borrowedLendable: any[]) {
    const all = [...own.map(g => ({ g, lent: false })), ...borrowedLendable.map(g => ({ g, lent: true }))]
    const byCat: Record<string, string[]> = {}
    for (const { g, lent } of all) {
      const cat = g.category || 'Övrigt'
      const parts = [g.subcategory, g.color].filter(Boolean).join(', ')
      ;(byCat[cat] ||= []).push(`${g.name}${parts ? ` (${parts})` : ''}${lent ? ' [LÅN]' : ''}`)
    }
    return Object.entries(byCat).map(([c, items]) => `${c.toUpperCase()}:\n${items.map(i => '- ' + i).join('\n')}`).join('\n\n')
  }

  async function generateCouple() {
    if (!partner || coupleLoading) return
    // Par-matchning är en Premium-funktion.
    if (!isPro) { router.push('/paywall'); return }
    setCoupleLoading(true); setCoupleOutfit(null); setCoupleSaved(false); setCoupleWorn(false)
    try {
      const ctx = CONTEXTS[selectedContext]
      const currentWeather = weather ?? { temp: 10, description: 'okänt', rain: false }
      const weatherCtx = useWeather ? buildWeatherContext(currentWeather, coldSensitivity) : { summary: '', rules: '', requiresOuterwear: false }
      const season = getCurrentSeason()

      const { data: theirs } = await supabase.rpc('partner_garments', { target: partner.id })
      const myActive = garments.filter(g => !g.archived && !g.for_sale)
      const parActive = (theirs || []).filter((g: any) => !g.archived && !g.for_sale)
      if (myActive.length === 0 || parActive.length === 0) {
        showAlert(tr('För få plagg'), tr('Ni behöver båda ha plagg i garderoben.'))
        return
      }
      // Filtrera bort off-season-plagg (löser t.ex. vantar mitt i sommaren),
      // men fall tillbaka till hela garderoben om säsongsurvalet inte räcker.
      const seasonalOrFull = (pool: any[]) => {
        const s = pool.filter(g => seasonAppropriate(g, season))
        const ok = s.some(g => g.category === 'Skor')
          && s.some(g => ['Byxor', 'Shorts', 'Kjolar', 'Klänningar'].includes(g.category))
          && s.some(g => ['Toppar', 'Tröjor', 'Klänningar'].includes(g.category))
        return ok ? s : pool
      }
      let mySeason = seasonalOrFull(myActive)
      const parSeason = seasonalOrFull(parActive)
      // Ev. valt utgångsplagg (mitt) tvingas in i min pool även om off-season.
      if (baseGarment && !mySeason.some(g => g.id === baseGarment.id)) mySeason = [baseGarment, ...mySeason]
      const myLendable = mySeason.filter(g => g.lendable)
      const parLendable = parSeason.filter(g => g.lendable)

      const styleRules = STYLE_RULES.filter(r => styleRuleKeys.includes(r.key)).map(r => `- ${r.rule}`).join('\n')

      const parsed = await apiPost('/api/match-couple', {
        nameA: userName || tr('Jag'), nameB: partner.name,
        // Min outfit: mina plagg + partnerns lånbara. Partnerns: sina + mina lånbara.
        listA: coupleList(mySeason, parLendable),
        listB: coupleList(parSeason, myLendable),
        contextLabel: ctx.label, contextLogic: ctx.logic,
        weatherSummary: weatherCtx.summary, weatherRules: weatherCtx.rules,
        styleRules, avoid: avoidNote.trim(),
        contextNote: (contextNotes[ctx.label] || '').trim(),
        season,
        baseA: baseGarment
          ? `${baseGarment.name}${[baseGarment.subcategory, baseGarment.color].filter(Boolean).length ? ` (${[baseGarment.subcategory, baseGarment.color].filter(Boolean).join(', ')})` : ''}`
          : '',
      })
      const myPool = [...mySeason, ...parLendable]
      const parPool = [...parSeason, ...myLendable]
      const outfits = (parsed.outfits || []).map((o: any, idx: number) => {
        const pool = idx === 0 ? myPool : parPool
        return { ...o, itemsWithImages: dedupOutfitItems(matchItemsToPool(o.items || [], pool), pool) }
      })
      // Spara personernas plagg-pooler så man kan byta ut plagg efteråt, samt
      // vilka id:n som är inlånade (den andras lånbara) för att hålla "Lånar"
      // korrekt även efter manuella byten.
      const lentIds = [
        new Set(parLendable.map((g: any) => g.id)),
        new Set(myLendable.map((g: any) => g.id)),
      ]
      const withBorrowed = outfits.map((o: any, oi: number) => ({
        ...o,
        borrowed: o.itemsWithImages.filter((i: any) => i.id && lentIds[oi].has(i.id)).map((i: any) => i.name),
      }))
      setCoupleOutfit({ ...parsed, outfits: withBorrowed, pools: [myPool, parPool], lentIds })
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setCoupleLoading(false)
    }
  }

  async function saveCoupleOutfit() {
    if (!coupleOutfit || !partner) return
    setCoupleSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const label = CONTEXTS[selectedContext].label
      const mine = coupleOutfit.outfits[0]
      const par = coupleOutfit.outfits[1]
      if (mine) {
        const { error } = await supabase.from('outfits').insert([{
          user_id: user?.id,
          name: `Med ${partner.name} – ${label}`,
          garment_ids: mine.itemsWithImages.map((i: any) => i.id).filter(Boolean),
          garment_names: mine.itemsWithImages.map((i: any) => i.name),
          image_urls: mine.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
          saved: true,
        }])
        if (error) throw error
      }
      if (par) {
        const { error } = await supabase.rpc('save_partner_outfit', {
          target: partner.id,
          p_name: `Med ${userName || 'partner'} – ${label}`,
          p_garment_names: par.itemsWithImages.map((i: any) => i.name),
          p_image_urls: par.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
        })
        if (error) throw error
      }
      setCoupleSaved(true)
      showAlert(tr('Sparat!'), `${tr('Outfitsen sparades hos både dig och')} ${partner.name}.`)
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setCoupleSaving(false)
    }
  }

  async function wearCoupleToday() {
    if (!coupleOutfit || coupleWearing) return
    setCoupleWearing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const mine = coupleOutfit.outfits[0]
      const garmentIds = mine.itemsWithImages.map((i: any) => i.id).filter(Boolean)
      const { data: outfitData, error } = await supabase.from('outfits').insert([{
        user_id: user?.id,
        name: `Med ${partner?.name} – ${CONTEXTS[selectedContext].label}`,
        garment_ids: garmentIds,
        garment_names: mine.itemsWithImages.map((i: any) => i.name),
        image_urls: mine.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
        mood: CONTEXTS[selectedContext].label,
        context: CONTEXTS[selectedContext].label.toLowerCase(),
        saved: true,
      }]).select('id').single()
      if (error) throw error
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('outfit_calendar').upsert({ user_id: user?.id, outfit_id: outfitData.id, date: today }, { onConflict: 'user_id,date' })
      // Räkna plaggen som använda idag – atomiskt via RPC (ingen läs+skriv-loop).
      if (garmentIds.length) await supabase.rpc('adjust_garment_wear', { p_ids: garmentIds, p_delta: 1, p_date: today })
      // Lägg även sambons look på HENS kalender – ni går ju bort tillsammans.
      const par = coupleOutfit.outfits[1]
      if (partner && par) {
        const { error: pErr } = await supabase.rpc('wear_partner_outfit', {
          target: partner.id,
          p_name: `Med ${userName || 'partner'} – ${CONTEXTS[selectedContext].label}`,
          p_garment_names: par.itemsWithImages.map((i: any) => i.name),
          p_image_urls: par.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
          p_date: today,
        })
        if (pErr) throw pErr
      }
      setCoupleWorn(true)
      if (!coupleSaved) setCoupleSaved(true)
      showAlert(tr('Vald för idag!'), `${tr('Looken lades i kalendern hos både dig och')} ${partner?.name}.`)
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setCoupleWearing(false)
    }
  }

  async function saveOutfit() {
    if (!outfit) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // Om outfiten redan finns (fått ett betyg) markerar vi bara den som sparad,
      // annars skapar vi en ny sparad rad.
      if (savedOutfitId) {
        const { error } = await supabase.from('outfits').update({ saved: true }).eq('id', savedOutfitId)
        if (error) throw error
      } else {
        const garmentIds = outfit.itemsWithImages.map((i: any) => i.id).filter(Boolean)
        const garmentNames = outfit.itemsWithImages.map((i: any) => i.name)
        const imageUrls = outfit.itemsWithImages.map((i: any) => i.image_url).filter(Boolean)
        const { data: outfitData, error } = await supabase.from('outfits').insert([{
          user_id: user?.id, name: outfit.outfitName,
          garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls,
          mood: CONTEXTS[selectedContext].label,
          context: CONTEXTS[selectedContext].label.toLowerCase(),
          saved: true,
        }]).select('id').single()
        if (error) throw error
        setSavedOutfitId(outfitData.id)
      }
      setSaved(true)
      showAlert(tr('Outfit sparad!'), tr('Du hittar den under Outfits.'))
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setSaving(false)
    }
  }

  async function wearToday() {
    if (!outfit) return
    setWearingToday(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let outfitId = savedOutfitId

      if (!outfitId) {
        const garmentIds = outfit.itemsWithImages.map((i: any) => i.id).filter(Boolean)
        const garmentNames = outfit.itemsWithImages.map((i: any) => i.name)
        const imageUrls = outfit.itemsWithImages.map((i: any) => i.image_url).filter(Boolean)
        const { data: outfitData, error: outfitError } = await supabase.from('outfits').insert([{
          user_id: user?.id, name: outfit.outfitName,
          garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls,
          mood: CONTEXTS[selectedContext].label,
          context: CONTEXTS[selectedContext].label.toLowerCase(),
        }]).select('id').single()
        if (outfitError) throw outfitError
        outfitId = outfitData.id
        setSaved(true)
        setSavedOutfitId(outfitId)
      }

      const today = new Date().toISOString().split('T')[0]
      const { error: calError } = await supabase.from('outfit_calendar').upsert({
        user_id: user?.id,
        outfit_id: outfitId,
        date: today,
      }, { onConflict: 'user_id,date' })
      if (calError) throw calError

      const garmentIds = outfit.itemsWithImages.map((i: any) => i.id).filter(Boolean)
      // Räkna plaggen som använda idag – atomiskt via RPC (ingen läs+skriv-loop).
      if (garmentIds.length) await supabase.rpc('adjust_garment_wear', { p_ids: garmentIds, p_delta: 1, p_date: today })

      setWornToday(true)
      showAlert(tr('Outfit vald för idag!'), tr('Den syns nu i din kalender och plaggen räknas som använda.'))
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setWearingToday(false)
    }
  }

  async function rateOutfit(stars: number) {
    if (!outfit || ratingLoading) return
    setRatingLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let outfitId = savedOutfitId

      if (!outfitId) {
        const garmentIds = outfit.itemsWithImages.map((i: any) => i.id).filter(Boolean)
        const garmentNames = outfit.itemsWithImages.map((i: any) => i.name)
        const imageUrls = outfit.itemsWithImages.map((i: any) => i.image_url).filter(Boolean)
        const { data: outfitData, error: outfitError } = await supabase.from('outfits').insert([{
          user_id: user?.id, name: outfit.outfitName,
          garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls,
          mood: CONTEXTS[selectedContext].label,
          context: CONTEXTS[selectedContext].label.toLowerCase(),
          // Betyg är feedback till AI:n – outfiten dyker inte upp i "Outfits"
          // förrän användaren aktivt trycker Spara.
          saved: false,
        }]).select('id').single()
        if (outfitError) throw outfitError
        outfitId = outfitData.id
        setSavedOutfitId(outfitId)
      }

      await supabase.from('outfits').update({ rating: stars }).eq('id', outfitId)
      setRating(stars)
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setRatingLoading(false)
    }
  }

  // Efter manuell ändring av outfiten är ev. sparad version inaktuell → nollställ.
  function resetSavedState() {
    setSaved(false)
    setSavedOutfitId(null)
    setWornToday(false)
    setRating(null)
  }

  function replaceItem(index: number, garment: any) {
    setOutfit((prev: any) => {
      if (!prev) return prev
      const items = [...prev.itemsWithImages]
      items[index] = { name: garment.name, image_url: garment.image_url || null, id: garment.id }
      return { ...prev, itemsWithImages: items }
    })
    resetSavedState()
    setSwapIndex(null)
  }

  function removeItem(index: number) {
    setOutfit((prev: any) => {
      if (!prev) return prev
      const items = prev.itemsWithImages.filter((_: any, i: number) => i !== index)
      return { ...prev, itemsWithImages: items }
    })
    resetSavedState()
    setSwapIndex(null)
  }

  // Alternativ till plagget som byts: samma kategori, aktiva, ej samma plagg.
  const swapItem = swapIndex !== null ? outfit?.itemsWithImages?.[swapIndex] : null
  const swapCategory = swapItem ? garments.find(g => g.id === swapItem.id)?.category : null
  const swapAlternatives = garments.filter(g =>
    !g.archived && !g.in_laundry && g.id !== swapItem?.id && (swapCategory ? g.category === swapCategory : true)
  )

  // ── Byt ut plagg i en par-outfit (samma logik som ovan, per person) ──────
  // Räknar om "Lånar"-listan utifrån vilka plagg som är inlånade (den andras lånbara).
  function withRecomputedBorrowed(o: any, lentSet: Set<string> | undefined) {
    if (!lentSet) return o
    return { ...o, borrowed: o.itemsWithImages.filter((i: any) => i.id && lentSet.has(i.id)).map((i: any) => i.name) }
  }

  function replaceCoupleItem(person: number, index: number, garment: any) {
    setCoupleOutfit((prev: any) => {
      if (!prev) return prev
      const outfits = prev.outfits.map((o: any, oi: number) => {
        if (oi !== person) return o
        const items = [...o.itemsWithImages]
        items[index] = { name: garment.name, image_url: garment.image_url || null, id: garment.id }
        return withRecomputedBorrowed({ ...o, itemsWithImages: items }, prev.lentIds?.[oi])
      })
      return { ...prev, outfits }
    })
    setCoupleSaved(false); setCoupleWorn(false)
    setCoupleSwap(null)
  }

  function removeCoupleItem(person: number, index: number) {
    setCoupleOutfit((prev: any) => {
      if (!prev) return prev
      const outfits = prev.outfits.map((o: any, oi: number) =>
        oi !== person ? o : withRecomputedBorrowed({ ...o, itemsWithImages: o.itemsWithImages.filter((_: any, i: number) => i !== index) }, prev.lentIds?.[oi])
      )
      return { ...prev, outfits }
    })
    setCoupleSaved(false); setCoupleWorn(false)
    setCoupleSwap(null)
  }

  const coupleSwapPool: any[] = coupleSwap ? (coupleOutfit?.pools?.[coupleSwap.person] || []) : []
  const coupleSwapItem = coupleSwap ? coupleOutfit?.outfits?.[coupleSwap.person]?.itemsWithImages?.[coupleSwap.index] : null
  const coupleSwapCategory = coupleSwapItem ? coupleSwapPool.find(g => g.id === coupleSwapItem.id)?.category : null
  // Plagg som redan används i personens outfit exkluderas så man inte får dubbletter.
  const coupleUsedIds = new Set(
    (coupleSwap ? coupleOutfit?.outfits?.[coupleSwap.person]?.itemsWithImages || [] : [])
      .map((i: any) => i.id).filter(Boolean)
  )
  const coupleSwapAlternatives = coupleSwapPool.filter(g =>
    !g.archived && g.id !== coupleSwapItem?.id && !coupleUsedIds.has(g.id) &&
    (coupleSwapCategory ? g.category === coupleSwapCategory : true)
  )

  function resetPickerFilters() {
    setBaseSearch(''); setBaseFilterOpen(null)
    setBaseCat('Alla'); setBaseType('Alla'); setBaseColor('Alla'); setBaseSeason('Alla')
  }
  function closeBasePicker() { setShowBasePicker(false); resetPickerFilters() }
  function openAddPicker(person: number | null) { resetPickerFilters(); setAddTarget({ person }) }
  function closeAddPicker() { setAddTarget(null); resetPickerFilters() }

  // Lägger till valt plagg i rätt outfit (singel eller en av par-personerna).
  function addItemToOutfit(g: any) {
    const newItem = { name: g.name, image_url: g.image_url || null, id: g.id, added: true }
    if (!addTarget) return
    if (addTarget.person === null) {
      setOutfit((prev: any) => prev ? { ...prev, itemsWithImages: [...prev.itemsWithImages, newItem] } : prev)
      resetSavedState()
    } else {
      const person = addTarget.person
      setCoupleOutfit((prev: any) => {
        if (!prev) return prev
        const outfits = prev.outfits.map((o: any, oi: number) =>
          oi !== person ? o : withRecomputedBorrowed({ ...o, itemsWithImages: [...o.itemsWithImages, newItem] }, prev.lentIds?.[oi])
        )
        return { ...prev, outfits }
      })
      setCoupleSaved(false); setCoupleWorn(false)
    }
    closeAddPicker()
  }

  // Antal manuellt tillagda plagg (för att kunna begränsa till MAX_ADDED).
  const singleAddedCount = (outfit?.itemsWithImages || []).filter((i: any) => i.added).length
  const activeGarmentsForPicker = garments.filter(g => !g.archived && !g.for_sale && !g.in_laundry)

  const activeCtx = CONTEXTS[selectedContext]

  // Återanvändbar plagg-väljare (samma UI för utgångsplagg och "lägg till plagg").
  function renderGarmentPicker(cfg: { visible: boolean; title: string; pool: any[]; onSelect: (g: any) => void; onClose: () => void; accessoriesFirst?: boolean; sets?: GarmentSet[]; onSelectSet?: (s: GarmentSet) => void }) {
    const typeOptions = baseCat !== 'Alla' && SUBCATEGORIES[baseCat]
      ? SUBCATEGORIES[baseCat]
      : Array.from(new Set(cfg.pool.map(g => g.subcategory).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))
    const chips = [
      { key: 'category', label: tr('Kategori'), value: baseCat },
      { key: 'type', label: tr('Typ'), value: baseType },
      { key: 'color', label: tr('Färg'), value: baseColor },
      { key: 'season', label: tr('Säsong'), value: baseSeason },
    ]
    const optionsFor = (key: string): string[] =>
      key === 'category' ? ['Alla', ...CATEGORIES]
        : key === 'type' ? ['Alla', ...typeOptions]
        : key === 'color' ? ['Alla', ...COLOR_NAMES]
        : ['Alla', ...SEASONS]
    const valueFor = (key: string) =>
      key === 'category' ? baseCat : key === 'type' ? baseType : key === 'color' ? baseColor : baseSeason
    const setValue = (key: string, v: string) => {
      if (key === 'category') { setBaseCat(v); setBaseType('Alla') }
      else if (key === 'type') setBaseType(v)
      else if (key === 'color') setBaseColor(v)
      else setBaseSeason(v)
      setBaseFilterOpen(null)
    }
    const anyActive = baseCat !== 'Alla' || baseType !== 'Alla' || baseColor !== 'Alla' || baseSeason !== 'Alla'
    const q = baseSearch.trim().toLowerCase()
    let items = cfg.pool.filter(g =>
      !g.archived && !g.for_sale &&
      (!q || g.name?.toLowerCase().includes(q) || g.color?.toLowerCase().includes(q)) &&
      (baseCat === 'Alla' || g.category === baseCat) &&
      (baseType === 'Alla' || g.subcategory === baseType) &&
      (baseColor === 'Alla' || g.color === baseColor) &&
      (baseSeason === 'Alla' || g.season?.includes(baseSeason))
    )
    if (cfg.accessoriesFirst) {
      // Smycken och accessoarer överst (vanligast att vilja lägga till).
      const rank = (g: any) => g.category === 'Smycken' ? 0 : g.category === 'Accessoarer' ? 1 : 2
      items = [...items].sort((a, b) => rank(a) - rank(b))
    }
    return (
      <Modal visible={cfg.visible} animationType="slide" transparent onRequestClose={cfg.onClose}>
        <View style={styles.swapOverlay}>
          <View style={styles.swapSheet}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>{cfg.title}</Text>
              <TouchableOpacity onPress={cfg.onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel={tr('Stäng')} accessibilityRole="button">
                <Text style={styles.swapClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {cfg.sets && cfg.sets.length > 0 && (
              <View style={styles.baseSetChipsWrap}>
                <Text style={styles.baseSetChipsLabel}>{tr('Set')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.baseSetChipsRow}>
                  {cfg.sets.map(s => (
                    <TouchableOpacity key={s.id} style={styles.baseSetChip} onPress={() => { cfg.onSelectSet?.(s); cfg.onClose() }}>
                      <Ionicons name="albums-outline" size={14} color={t.textSecondary} />
                      <Text style={styles.baseSetChipText} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TextInput
              style={styles.baseSearchInput}
              placeholder={tr('Sök plagg eller färg...')}
              placeholderTextColor={t.textSecondary}
              value={baseSearch}
              onChangeText={setBaseSearch}
            />

            <View style={styles.baseFilterRow}>
              {chips.map(c => {
                const on = c.value !== 'Alla'
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.baseChip, (on || baseFilterOpen === c.key) && styles.baseChipActive]}
                    onPress={() => setBaseFilterOpen(baseFilterOpen === c.key ? null : c.key)}
                  >
                    <Text style={[styles.baseChipText, (on || baseFilterOpen === c.key) && styles.baseChipTextActive]} numberOfLines={1}>
                      {on ? tr(c.value) : c.label} ▾
                    </Text>
                  </TouchableOpacity>
                )
              })}
              {anyActive && (
                <TouchableOpacity
                  style={styles.baseChipClear}
                  onPress={() => { setBaseCat('Alla'); setBaseType('Alla'); setBaseColor('Alla'); setBaseSeason('Alla'); setBaseFilterOpen(null) }}
                >
                  <Text style={styles.baseChipClearText}>{tr('Rensa')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {baseFilterOpen && (
              <View style={styles.baseOptionsRow}>
                {optionsFor(baseFilterOpen).map(opt => {
                  const active = valueFor(baseFilterOpen) === opt
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.baseOption, active && styles.baseOptionActive]}
                      onPress={() => setValue(baseFilterOpen, opt)}
                    >
                      {baseFilterOpen === 'color' && COLOR_HEX[opt] && (
                        <View style={[styles.baseColorDot, { backgroundColor: COLOR_HEX[opt] }]} />
                      )}
                      <Text style={[styles.baseOptionText, active && styles.baseOptionTextActive]}>{tr(opt)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            {items.length === 0 ? (
              <View style={styles.swapEmpty}>
                <Text style={styles.swapEmptyText}>{tr('Inga plagg matchar filtren')}</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                numColumns={3}
                keyExtractor={g => g.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: g }) => (
                  <TouchableOpacity style={styles.swapAlt} onPress={() => { cfg.onSelect(g); cfg.onClose() }}>
                    {g.image_url
                      ? <SignedImage path={g.image_url} style={styles.swapAltImage} resizeMode="contain" />
                      : <View style={[styles.swapAltImage, styles.swapAltEmpty]} />
                    }
                    <Text style={styles.swapAltName} numberOfLines={1}>{g.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    )
  }

  // Set som har minst ett användbart plagg (för utgångsset-valet).
  const availableSets = sets.filter(s => garments.some(g => g.set_id === s.id && !g.archived && !g.in_laundry))
  function chooseBaseSet(s: GarmentSet) {
    const members = garments.filter(g => g.set_id === s.id && !g.archived && !g.in_laundry)
    if (members.length === 0) return
    setBaseSet({ id: s.id, name: s.name, members })
    setBaseGarment(null)
  }

  const addPickerPool: any[] = addTarget
    ? (addTarget.person === null ? activeGarmentsForPicker : (coupleOutfit?.pools?.[addTarget.person] || []))
    : []

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, fontsLoaded && { fontFamily: 'Poppins_600SemiBold' }]}>
              {getGreeting()}, {userName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={styles.profileBtn}
            accessibilityLabel={tr('Min profil')}
            accessibilityRole="button"
          >
            {userAvatar
              ? <SignedImage path={userAvatar} style={styles.profileBtnImage} resizeMode="cover" />
              : null
            }
          </TouchableOpacity>
        </View>

        {/* Quick-select context */}
        <View style={styles.contextRow}>
          {CONTEXTS.map((ctx, index) => {
            const isSelected = selectedContext === index
            return (
              <TouchableOpacity
                key={index}
                style={[styles.contextBtn, isSelected && styles.contextBtnSelected]}
                onPress={() => selectContext(index)}
                activeOpacity={0.75}
                accessibilityLabel={`${tr('Kontext:')} ${tr(ctx.label)}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.contextLabel, isSelected && styles.contextLabelSelected]}>{tr(ctx.label)}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Weather toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setUseWeather(!useWeather)}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <Text style={styles.optionIcon}>{weather?.emoji || '🌤'}</Text>
              <View>
                <Text style={styles.optionText}>{tr('Anpassa efter väder')}</Text>
                {weather && <Text style={styles.optionSub}>{tempLabel(weather.temp)} · {weather.description}</Text>}
              </View>
            </View>
            <View style={[styles.toggle, useWeather && styles.toggleOn]}>
              <View style={[styles.toggleKnob, useWeather && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Valfritt utgångsplagg/-set – generera outfit KRING ett plagg eller set */}
        <View style={styles.section}>
          {baseSet ? (
            <View style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <View style={styles.baseSetIcon}><Ionicons name="albums" size={18} color={t.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionText}>{tr('Utgår från set')}</Text>
                  <Text style={styles.optionSub} numberOfLines={1}>{baseSet.name}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setBaseSet(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={tr('Ta bort utgångsset')}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={t.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : baseGarment ? (
            <View style={styles.optionRow}>
              <View style={styles.optionLeft}>
                {baseGarment.image_url
                  ? <SignedImage path={baseGarment.image_url} style={styles.baseThumb} resizeMode="contain" />
                  : <View style={[styles.baseThumb, styles.baseThumbEmpty]} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionText}>{tr('Utgår från plagg')}</Text>
                  <Text style={styles.optionSub} numberOfLines={1}>{baseGarment.name}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setBaseGarment(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={tr('Ta bort utgångsplagg')}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={t.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.optionRow} onPress={() => setShowBasePicker(true)} activeOpacity={0.8}>
              <View style={styles.optionLeft}>
                <View>
                  <Text style={styles.optionText}>{tr('Utgå från ett plagg/set')}</Text>
                  <Text style={styles.optionSub}>{tr('Valfritt – bygg outfiten kring ett plagg')}</Text>
                </View>
              </View>
              <View style={styles.addItemCircle}><Ionicons name="add" size={16} color={t.onPrimary} /></View>
            </TouchableOpacity>
          )}
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={() => generateOutfit()}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={t.onPrimary} />
            : <Text style={styles.generateBtnText}>{tr('Generera outfit')}</Text>
          }
        </TouchableOpacity>

        {/* Gratis-kvot: dold för Premium (creditsLeft === -1). Klickbar → paywall. */}
        {creditsLeft >= 0 && (
          <TouchableOpacity style={styles.quotaHint} onPress={() => router.push('/paywall')}>
            <Text style={styles.quotaText}>
              {creditsLeft > 0
                ? tr('{n} av {max} gratis outfits kvar denna vecka').replace('{n}', String(creditsLeft)).replace('{max}', String(FREE_AI_PER_WEEK))
                : tr('Gratiskvoten är slut · Uppgradera')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Par-generering – bara i samboläge. Använder samma valda kontext/väder. */}
        {partner && (
          <TouchableOpacity style={styles.coupleBtn} onPress={generateCouple} disabled={coupleLoading || loading}>
            {coupleLoading
              ? <ActivityIndicator color={t.primary} />
              : <Text style={styles.coupleBtnText}>{tr('Generera outfits för mig och')} {partner.name}</Text>}
          </TouchableOpacity>
        )}

        {/* Outfit result */}
        {outfit && !loading && (
          <Animated.View style={[styles.outfitCard, {
            opacity: outfitAnim,
            transform: [{ translateY: outfitAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }]}>
            {outfit.message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{outfit.message}</Text>
              </View>
            )}

            <Text style={styles.outfitName}>{outfit.outfitName}</Text>

            <View style={styles.outfitImages}>
              {outfit.itemsWithImages.map((item: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.outfitItemWrap}
                  onPress={() => setSwapIndex(i)}
                  activeOpacity={0.7}
                  accessibilityLabel={`${tr('Byt ut')} ${item.name}`}
                  accessibilityRole="button"
                >
                  {item.image_url
                    ? <SignedImage path={item.image_url} style={styles.outfitImage} />
                    : <View style={styles.outfitImageEmpty} />
                  }
                  <View style={styles.swapBadge}><Text style={styles.swapBadgeText}>⇄</Text></View>
                  <Text style={styles.outfitItemName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
              {singleAddedCount < MAX_ADDED && (
                <TouchableOpacity
                  style={styles.outfitItemWrap}
                  onPress={() => openAddPicker(null)}
                  activeOpacity={0.7}
                  accessibilityLabel={tr('Lägg till plagg')}
                  accessibilityRole="button"
                >
                  <View style={styles.addItemBox}>
                    <View style={styles.addItemCircle}><Ionicons name="add" size={16} color={t.onPrimary} /></View>
                  </View>
                  <Text style={styles.outfitItemName} numberOfLines={1}>{tr('Lägg till')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {outfit.song && <SongCard song={outfit.song} />}

            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>{tr('Vad tyckte du om looken?')}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => rateOutfit(star)}
                    disabled={ratingLoading}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel={`${tr('Betyg')} ${star} ${tr('av')} 5`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: star <= (rating || 0) }}
                  >
                    <Text style={[styles.star, star <= (rating || 0) && styles.starFilled]}>
                      {star <= (rating || 0) ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.outfitActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnDone]}
                onPress={saveOutfit}
                disabled={saving || saved}
                accessibilityLabel={saved ? tr('Outfit sparad') : tr('Spara outfit')}
                accessibilityRole="button"
              >
                {saving
                  ? <ActivityIndicator color={t.onPrimary} size="small" />
                  : <Text style={styles.saveBtnText}>{saved ? `✓ ${tr('Sparad')}` : tr('Spara outfit')}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={shareOutfit}
                disabled={sharing}
                accessibilityLabel={tr('Dela outfit')}
                accessibilityRole="button"
              >
                {sharing
                  ? <ActivityIndicator color={t.primary} size="small" />
                  : <Ionicons name="share-outline" size={22} color={t.primary} />
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.newBtn} onPress={() => generateOutfit()}>
                <Ionicons name="refresh" size={22} color={t.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.wearTodayBtn, wornToday && styles.wearTodayBtnDone]}
              onPress={wearToday}
              disabled={wearingToday || wornToday}
              accessibilityLabel={wornToday ? tr('Vald för idag') : tr('Vill ha på mig idag')}
              accessibilityRole="button"
            >
              {wearingToday
                ? <ActivityIndicator color={t.onPrimary} size="small" />
                : <Text style={[styles.wearTodayBtnText, wornToday && styles.wearTodayBtnTextDone]}>{wornToday ? `✓ ${tr('Vald för idag')}` : tr('Vill ha på mig idag')}</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Par-resultat (två outfits) */}
        {coupleOutfit && !coupleLoading && (
          <View style={styles.outfitCard}>
            {!!coupleOutfit.vibe && <Text style={styles.coupleVibe}>{coupleOutfit.vibe}</Text>}
            {(coupleOutfit.outfits || []).map((o: any, oi: number) => (
              <View key={oi} style={styles.couplePersonBlock}>
                <Text style={styles.couplePersonTitle}>{o.person || (oi === 0 ? (userName || tr('Jag')) : partner?.name)}</Text>
                <View style={styles.outfitImages}>
                  {o.itemsWithImages.map((item: any, i: number) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.outfitItemWrap}
                      onPress={() => setCoupleSwap({ person: oi, index: i })}
                      activeOpacity={0.7}
                      accessibilityLabel={`${tr('Byt ut')} ${item.name}`}
                      accessibilityRole="button"
                    >
                      {item.image_url
                        ? <SignedImage path={item.image_url} style={styles.outfitImage} />
                        : <View style={styles.outfitImageEmpty} />}
                      <View style={styles.swapBadge}><Text style={styles.swapBadgeText}>⇄</Text></View>
                      <Text style={styles.outfitItemName}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {o.itemsWithImages.filter((i: any) => i.added).length < MAX_ADDED && (
                    <TouchableOpacity
                      style={styles.outfitItemWrap}
                      onPress={() => openAddPicker(oi)}
                      activeOpacity={0.7}
                      accessibilityLabel="Lägg till plagg"
                      accessibilityRole="button"
                    >
                      <View style={styles.addItemBox}>
                        <View style={styles.addItemCircle}><Ionicons name="add" size={16} color={t.onPrimary} /></View>
                      </View>
                      <Text style={styles.outfitItemName} numberOfLines={1}>{tr('Lägg till')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(o.borrowed || []).length > 0 && (
                  <View style={styles.coupleBorrowedRow}>
                    <Ionicons name="swap-horizontal" size={14} color={t.primaryActive} />
                    <Text style={styles.coupleBorrowed}>{tr('Lånar:')} {o.borrowed.join(', ')}</Text>
                  </View>
                )}
              </View>
            ))}
            {!!coupleOutfit.tip && (
              <View style={styles.messageBox}><Text style={styles.messageText}>{coupleOutfit.tip}</Text></View>
            )}
            <View style={styles.outfitActions}>
              <TouchableOpacity
                style={[styles.saveBtn, coupleSaved && styles.saveBtnDone]}
                onPress={saveCoupleOutfit}
                disabled={coupleSaving || coupleSaved}
              >
                {coupleSaving
                  ? <ActivityIndicator color={t.onPrimary} size="small" />
                  : <Text style={styles.saveBtnText}>{coupleSaved ? `✓ ${tr('Sparad')}` : tr('Spara båda')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.newBtn} onPress={generateCouple}>
                <Ionicons name="refresh" size={22} color={t.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.wearTodayBtn, coupleWorn && styles.wearTodayBtnDone]}
              onPress={wearCoupleToday}
              disabled={coupleWearing || coupleWorn}
            >
              {coupleWearing
                ? <ActivityIndicator color={t.onPrimary} size="small" />
                : <Text style={[styles.wearTodayBtnText, coupleWorn && styles.wearTodayBtnTextDone]}>{coupleWorn ? `✓ ${tr('Vald för idag')}` : tr('Vill ha på mig idag')}</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Välj utgångsplagg att bygga outfiten kring */}
      {renderGarmentPicker({
        visible: showBasePicker,
        title: tr('Utgå från ett plagg/set'),
        pool: activeGarmentsForPicker,
        onSelect: (g) => { setBaseGarment(g); setBaseSet(null) },
        onClose: closeBasePicker,
        sets: availableSets,
        onSelectSet: chooseBaseSet,
      })}

      {/* Lägg till ytterligare plagg i en genererad outfit */}
      {renderGarmentPicker({
        visible: addTarget !== null,
        title: tr('Lägg till plagg'),
        pool: addPickerPool,
        onSelect: addItemToOutfit,
        onClose: closeAddPicker,
        accessoriesFirst: true,
      })}

      {/* Byt ut plagg i outfiten */}
      <Modal visible={swapIndex !== null} animationType="slide" transparent onRequestClose={() => setSwapIndex(null)}>
        <View style={styles.swapOverlay}>
          <View style={styles.swapSheet}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>{tr('Byt ut')}{swapItem ? ` ${swapItem.name}` : ''}</Text>
              <TouchableOpacity
                onPress={() => setSwapIndex(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={tr('Stäng')}
                accessibilityRole="button"
              >
                <Text style={styles.swapClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.swapRemoveBtn}
              onPress={() => swapIndex !== null && removeItem(swapIndex)}
            >
              <Text style={styles.swapRemoveText}>{tr('Ta bort ur outfiten')}</Text>
            </TouchableOpacity>

            {swapAlternatives.length === 0 ? (
              <View style={styles.swapEmpty}>
                <Text style={styles.swapEmptyText}>{tr('Inga andra plagg i samma kategori')}</Text>
              </View>
            ) : (
              <FlatList
                data={swapAlternatives}
                numColumns={3}
                keyExtractor={g => g.id}
                renderItem={({ item: g }) => (
                  <TouchableOpacity
                    style={styles.swapAlt}
                    onPress={() => swapIndex !== null && replaceItem(swapIndex, g)}
                  >
                    {g.image_url
                      ? <SignedImage path={g.image_url} style={styles.swapAltImage} resizeMode="contain" />
                      : <View style={[styles.swapAltImage, styles.swapAltEmpty]} />
                    }
                    <Text style={styles.swapAltName} numberOfLines={1}>{g.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Byt ut plagg i par-outfiten */}
      <Modal visible={coupleSwap !== null} animationType="slide" transparent onRequestClose={() => setCoupleSwap(null)}>
        <View style={styles.swapOverlay}>
          <View style={styles.swapSheet}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>{tr('Byt ut')}{coupleSwapItem ? ` ${coupleSwapItem.name}` : ''}</Text>
              <TouchableOpacity
                onPress={() => setCoupleSwap(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={tr('Stäng')}
                accessibilityRole="button"
              >
                <Text style={styles.swapClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.swapRemoveBtn}
              onPress={() => coupleSwap && removeCoupleItem(coupleSwap.person, coupleSwap.index)}
            >
              <Text style={styles.swapRemoveText}>{tr('Ta bort ur outfiten')}</Text>
            </TouchableOpacity>

            {coupleSwapAlternatives.length === 0 ? (
              <View style={styles.swapEmpty}>
                <Text style={styles.swapEmptyText}>{tr('Inga andra plagg i samma kategori')}</Text>
              </View>
            ) : (
              <FlatList
                data={coupleSwapAlternatives}
                numColumns={3}
                keyExtractor={g => g.id}
                renderItem={({ item: g }) => (
                  <TouchableOpacity
                    style={styles.swapAlt}
                    onPress={() => coupleSwap && replaceCoupleItem(coupleSwap.person, coupleSwap.index, g)}
                  >
                    {g.image_url
                      ? <SignedImage path={g.image_url} style={styles.swapAltImage} resizeMode="contain" />
                      : <View style={[styles.swapAltImage, styles.swapAltEmpty]} />
                    }
                    <Text style={styles.swapAltName} numberOfLines={1}>{g.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Dold vy som fångas som bild vid delning. Placeras utanför skärmen. */}
      {outfit && (
        <View style={styles.shareCardHidden} pointerEvents="none">
          <View ref={shareCardRef} collapsable={false}>
            <OutfitShareCard
              outfit={outfit}
              subtitle={`${tr(CONTEXTS[selectedContext].label)}${weather ? ` · ${tempLabel(weather.temp)}` : ''}`}
            />
          </View>
        </View>
      )}

      <BottomNav />
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingBottom: 100 },

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 32 },
  headerLeft: { flex: 1 },
  greeting: { fontFamily: 'Lora_400Regular', fontSize: 28, color: t.textSecondary, marginBottom: 6 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, overflow: 'hidden', marginLeft: 16 },
  profileBtnText: { fontFamily: 'Lora_400Regular', fontSize: 18 },
  profileBtnImage: { width: 40, height: 40, borderRadius: 20 },

  // Context quick-select
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 28, gap: 12, marginBottom: 36 },
  contextBtn: { flexBasis: '28%', flexGrow: 1, borderRadius: 18, paddingVertical: 18, alignItems: 'center', gap: 6, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  contextBtnSelected: { backgroundColor: t.primary, borderColor: t.border },
  contextEmoji: { fontFamily: 'Lora_400Regular', fontSize: 22, opacity: 0.5 },
  contextEmojiSelected: { opacity: 1 },
  contextLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textFaint, letterSpacing: 0.3 },
  contextLabelSelected: { color: t.onPrimary },

  // Section
  section: { paddingHorizontal: 28, marginBottom: 20, gap: 12 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: 'rgba(64,45,33,0.6)', letterSpacing: 0.5 },
  intensityLabel: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, fontStyle: 'italic' },

  // Slider
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  sliderStepWrap: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  sliderDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  sliderDotFilled: { backgroundColor: t.primary, borderColor: t.primary },
  sliderDotActive: { width: 18, height: 18, borderRadius: 9 },

  // Options
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { fontFamily: 'Lora_400Regular', fontSize: 22 },
  optionText: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  optionSub: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: t.surfaceMuted, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: t.primary },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: t.surfaceMuted },
  toggleKnobOn: { alignSelf: 'flex-end', backgroundColor: t.bg },

  // Generate
  generateBtn: { marginHorizontal: 28, backgroundColor: t.primary, borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 12 },
  generateBtnText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, letterSpacing: 0.5 },
  quotaHint: { alignItems: 'center', marginTop: -4, marginBottom: 10, paddingVertical: 4 },
  quotaText: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: t.textFaint },
  coupleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 28, backgroundColor: t.surfaceMuted, borderRadius: 16, paddingVertical: 15, borderWidth: 1, borderColor: t.border, marginBottom: 28 },
  coupleBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  coupleVibe: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, lineHeight: 21, textAlign: 'center', marginBottom: 4 },
  couplePersonBlock: { gap: 10, paddingBottom: 14, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  couplePersonTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary },
  coupleBorrowedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coupleBorrowed: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.primaryActive },

  // Outfit card
  outfitCard: { marginHorizontal: 28, backgroundColor: t.surfaceMuted, borderRadius: 22, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: t.border, gap: 16 },
  messageBox: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(64,45,33,0.15)' },
  messageEmoji: { fontFamily: 'Lora_400Regular', fontSize: 22 },
  messageText: { fontFamily: 'Lora_400Regular', flex: 1, fontSize: 14, color: t.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  outfitName: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  outfitImagesScroll: { marginHorizontal: -4 },
  outfitImages: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 10, rowGap: 14, paddingHorizontal: 4 },
  outfitItemWrap: { alignItems: 'center', gap: 4, width: 80 },
  outfitImage: { width: 80, height: 80, borderRadius: 14 },
  baseThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: t.surface },
  baseThumbEmpty: { borderWidth: 1, borderColor: t.border },
  baseSetIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  baseSetChipsWrap: { marginTop: 10, marginBottom: 16 },
  baseSetChipsLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, marginBottom: 8, marginLeft: 2 },
  baseSetChipsRow: { gap: 8, paddingRight: 8 },
  baseSetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.surfaceMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: t.border },
  baseSetChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, maxWidth: 160 },
  baseSearchInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: t.textPrimary, fontSize: 15, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  baseFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  baseChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  baseChipActive: { backgroundColor: t.primary, borderColor: t.primary },
  baseChipText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  baseChipTextActive: { color: t.onPrimary },
  baseChipClear: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20 },
  baseChipClearText: { fontFamily: 'Lora_500Medium', color: t.primary, fontSize: 12 },
  baseOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  baseOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  baseOptionActive: { backgroundColor: t.primaryActive, borderColor: t.primaryActive },
  baseOptionText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  baseOptionTextActive: { color: t.onPrimary },
  baseColorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
  swapBadge: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  addItemBox: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  addItemCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  swapBadgeText: { color: t.onPrimary, fontSize: 12, fontFamily: 'Poppins_700Bold' },

  // Byt-ut-modal
  swapOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  swapSheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  swapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  swapTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary, flex: 1 },
  swapClose: { color: t.textSecondary, fontSize: 20 },
  swapRemoveBtn: { backgroundColor: t.surfaceMuted, borderRadius: t.radius.md, padding: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: t.border },
  swapRemoveText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 14 },
  swapEmpty: { padding: 28, alignItems: 'center' },
  swapEmptyText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  swapAlt: { flex: 1 / 3, margin: 4, alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: t.border },
  swapAltImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  swapAltEmpty: { alignItems: 'center', justifyContent: 'center' },
  swapAltName: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' },
  outfitImageEmpty: { width: 80, height: 80, borderRadius: 14, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  outfitItemName: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center', width: 80 },
  outfitActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, backgroundColor: t.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  saveBtnDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 14 },
  newBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  newBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 18 },
  shareBtn: { paddingHorizontal: 16, height: 44, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  shareBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.primary, fontSize: 14 },
  shareCardHidden: { position: 'absolute', left: -9999, top: 0 },
  ratingRow: { alignItems: 'center', gap: 8 },
  ratingLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontFamily: 'Lora_400Regular', fontSize: 28, color: t.textFaint },
  starFilled: { color: t.textPrimary },

  wearTodayBtn: { borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: t.primary, borderWidth: 1, borderColor: t.primary },
  wearTodayBtnDone: { backgroundColor: t.surfaceMuted, borderColor: t.border },
  wearTodayBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 14 },
  wearTodayBtnTextDone: { color: t.textSecondary },
})
