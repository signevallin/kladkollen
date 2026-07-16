import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins'
import * as Location from 'expo-location'
import { router, useFocusEffect } from 'expo-router'
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
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../components/BottomNav'
import SignedImage from '../components/SignedImage'
import SongCard from '../components/SongCard'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'
import { apiPost } from '../utils/api'

const CONTEXTS = [
  { label: 'Jobb', logic: 'professionellt, snyggt, välskräddrat, stilrent, passar arbetsplatsen' },
  { label: 'Skola', logic: 'bekvämt men snyggt, ungt och avslappnat, funkar en hel skoldag, effortless casual' },
  { label: 'Ledig', logic: 'casual, bekvämt, avslappnat men snyggt, vardaglig känsla' },
  { label: 'Date', logic: 'romantiskt och självsäkert, snyggt utan att vara overdressed, charmigt med en personlig touch' },
  { label: 'Fest', logic: 'festligt, glansigt, statement pieces, dressy, kvällskänsla' },
]

const INTENSITY_LABELS = ['Subtil', 'Diskret', 'Balanserad', 'Uttalad', 'Total']
const RECENT_SONGS_KEY = 'kladkollen_recent_songs'

export default function Home() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [fontsLoaded] = useFonts({ Poppins_600SemiBold })
  const [weather, setWeather] = useState<any>(null)
  const [outfit, setOutfit] = useState<any>(null)
  const [garments, setGarments] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, vintedTips: 0 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null)
  const [wornToday, setWornToday] = useState(false)
  const [wearingToday, setWearingToday] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [swapIndex, setSwapIndex] = useState<number | null>(null)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)

  const [selectedContext, setSelectedContext] = useState(2) // 0=Jobb, 1=Skola, 2=Ledig, 3=Date, 4=Fest
  const intensity = 3 // Fast: Balanserad
  const [useWeather, setUseWeather] = useState(true)

  const outfitAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadUser()
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchAll()
    }, [])
  )

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single()
      if (profile?.name) setUserName(profile.name)
      else setUserName(user.email?.split('@')[0] || '')
      if (profile?.avatar_url) setUserAvatar(profile.avatar_url)
    }
  }

  async function fetchAll() {
    const { data } = await supabase.from('garments').select('*')
    if (data) {
      setGarments(data)
      const active = data.filter(g => !g.archived)
      const vintedTips = active.filter(g => !g.times_worn || g.times_worn === 0).length
      setStats({ total: active.length, vintedTips })
    }
    fetchWeather()
  }

  async function fetchWeather() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { setWeather({ temp: 10, emoji: '🌧️', description: 'Regn', rain: true }); return }
      const location = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = location.coords
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`)
      const data = await response.json()
      const temp = Math.round(data.current.temperature_2m)
      const code = data.current.weathercode
      setWeather({ temp, emoji: getWeatherEmoji(code), description: getWeatherDescription(code), rain: code >= 51 && code <= 82 })
    } catch {
      setWeather({ temp: 10, emoji: '🌡️', description: 'Okänt', rain: false })
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
    if (code === 0) return 'Klart'
    if (code <= 3) return 'Halvklart'
    if (code <= 48) return 'Dimma'
    if (code <= 67) return 'Regn'
    if (code <= 77) return 'Snö'
    if (code <= 82) return 'Skurar'
    return 'Åska'
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 10) return 'God morgon'
    if (hour < 18) return 'Hej'
    return 'God kväll'
  }

  function selectContext(index: number) {
    setSelectedContext(index)
    setOutfit(null)
    setSaved(false)
    setSavedOutfitId(null)
    setWornToday(false)
    setRating(null)
  }

  function buildWeatherContext(w: any): { summary: string; rules: string; requiresOuterwear: boolean } {
    if (!w) return { summary: '', rules: '', requiresOuterwear: false }
    const temp = w.temp
    const rain = w.rain

    let summary = `Väder just nu: ${temp}°C, ${w.description}.`
    const rules: string[] = []
    let requiresOuterwear = false

    if (temp <= 5) {
      summary += ' Det är kallt.'
      rules.push('KALLT VÄDER: Ytterkläder (jacka/kappa) är OBLIGATORISKT om det finns i garderoben. Välj varma material.')
      requiresOuterwear = true
    } else if (temp <= 12) {
      summary += ' Det är svalt.'
      rules.push('SVALT VÄDER: Lägg till ytterkläder eller kavaj om det finns – annars välj en tjockare tröja.')
    } else if (temp <= 18) {
      summary += ' Det är milt.'
      rules.push('MILT VÄDER: En lätt kavaj eller tröja kan passa, men ytterkläder är inte nödvändigt.')
    } else if (temp >= 23) {
      summary += ' Det är varmt.'
      rules.push('VARMT VÄDER: Välj lätta material. Undvik tjocka lager och ytterkläder.')
    }

    if (rain) {
      rules.push('REGN: Prioritera ytterkläder med regnbeskyddande funktion om det finns. Undvik vita eller känsliga material.')
      requiresOuterwear = true
    }

    return { summary, rules: rules.join('\n'), requiresOuterwear }
  }

  function getCurrentSeason(): string {
    const m = new Date().getMonth() // 0 = jan
    if (m === 11 || m <= 1) return 'Vinter'
    if (m <= 4) return 'Vår'
    if (m <= 7) return 'Sommar'
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
      'Kjolar': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Toppar': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Tröjor': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Kavajer': outerwearLabel,
      'Ytterkläder': outerwearLabel,
      'Skor': 'SKOR – alltid obligatorisk (välj exakt 1)',
      'Väskor': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
      'Accessoarer': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
    }
    for (const g of garmentList) {
      const group = categoryMap[g.category]
      if (group) {
        groups[group].push(`  • ${g.name}${g.color ? ' (' + g.color + ')' : ''}`)
      }
    }
    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([group, items]) => `${group}:\n${items.join('\n')}`)
      .join('\n\n')
  }

  function validateOutfit(items: string[], garmentList: any[], requiresOuterwear: boolean): { valid: boolean; missing: string } {
    const BOTTOM_CATS = ['Byxor', 'Kjolar']
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

  async function generateOutfit() {
    if (garments.length === 0) {
      showAlert('Lägg till plagg i garderoben först!')
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

    const ctx = CONTEXTS[selectedContext]
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

      const activeGarments = garments.filter(g => !g.archived)
      const weatherCtx = useWeather ? buildWeatherContext(currentWeather) : { summary: '', rules: '', requiresOuterwear: false }

      // Filtrera bort renodlade off-season-plagg (t.ex. vinterjacka på sommaren).
      // Faller tillbaka till hela garderoben om säsongsurvalet inte räcker för
      // en komplett outfit (skor + över-/nederdel eller klänning).
      const season = getCurrentSeason()
      const seasonalPool = activeGarments.filter(g => seasonAppropriate(g, season))
      const SHOE_CATS = ['Skor']
      const BOTTOM_OR_DRESS = ['Byxor', 'Kjolar', 'Klänningar']
      const TOP_OR_DRESS = ['Toppar', 'Tröjor', 'Klänningar']
      const poolCanFormOutfit =
        seasonalPool.some(g => SHOE_CATS.includes(g.category)) &&
        seasonalPool.some(g => BOTTOM_OR_DRESS.includes(g.category)) &&
        seasonalPool.some(g => TOP_OR_DRESS.includes(g.category))
      const pool = poolCanFormOutfit ? seasonalPool : activeGarments

      const groupedList = buildGroupedGarmentList(pool, weatherCtx.requiresOuterwear)

      const intensityStr = INTENSITY_LABELS[intensity - 1]
      const avoidStr = recentGarments.length > 0 ? `Undvik om möjligt: ${[...new Set(recentGarments)].slice(0, 6).join(', ')}.` : ''

      // Nyligen föreslagna låtar (sparas lokalt) så AI:n slipper upprepa sig.
      const recentSongs: string[] = JSON.parse((await AsyncStorage.getItem(RECENT_SONGS_KEY)) || '[]')
      const avoidSongsStr = recentSongs.slice(0, 20).join(', ')

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
          previousItems: attempts === 1 ? previousItems : '',
          retry: attempts > 1,
        })

        const { valid } = validateOutfit(parsed.items, pool, weatherCtx.requiresOuterwear)
        if (valid) break
      }

      if (!parsed?.items?.length) throw new Error('AI:n gav inget giltigt förslag – försök igen.')

      const itemsWithImages = parsed.items.map((name: string) => {
        const match = pool.find(g =>
          g.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(g.name.toLowerCase())
        )
        return { name, image_url: match?.image_url || null, id: match?.id || null }
      })

      setOutfit({ ...parsed, itemsWithImages })

      outfitAnim.setValue(0)
      Animated.spring(outfitAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start()

      // Hämta matchande låt + Apple Music-preview (blockerar inte outfiten om det failar)
      if (parsed.song?.title) {
        // Minns låten så vi undviker upprepning nästa gång (senaste 20).
        try {
          const next = [parsed.song.title, ...recentSongs.filter(s => s !== parsed.song.title)].slice(0, 20)
          await AsyncStorage.setItem(RECENT_SONGS_KEY, JSON.stringify(next))
        } catch { /* ignorera */ }
        try {
          const { song } = await apiPost('/api/song-preview', { title: parsed.song.title, artist: parsed.song.artist })
          if (song) setOutfit((prev: any) => prev ? { ...prev, song: { ...song, reason: parsed.song.reason } } : prev)
        } catch { /* låten är bonus – ignorera fel */ }
      }

    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveOutfit() {
    if (!outfit) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const garmentIds = outfit.itemsWithImages.map((i: any) => i.id).filter(Boolean)
      const garmentNames = outfit.itemsWithImages.map((i: any) => i.name)
      const imageUrls = outfit.itemsWithImages.map((i: any) => i.image_url).filter(Boolean)
      const { data: outfitData, error } = await supabase.from('outfits').insert([{
        user_id: user?.id, name: outfit.outfitName,
        garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls,
        mood: CONTEXTS[selectedContext].label,
        context: CONTEXTS[selectedContext].label.toLowerCase(),
      }]).select('id').single()
      if (error) throw error
      setSaved(true)
      setSavedOutfitId(outfitData.id)
      showAlert('Outfit sparad!', 'Du hittar den under Outfits.')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
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
      for (const gId of garmentIds) {
        const garment = garments.find(g => g.id === gId)
        if (garment) {
          await supabase.from('garments').update({
            times_worn: (garment.times_worn || 0) + 1,
            last_worn: today,
          }).eq('id', gId)
        }
      }

      setWornToday(true)
      showAlert('Outfit vald för idag!', 'Den syns nu i din kalender och plaggen räknas som använda.')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
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
        }]).select('id').single()
        if (outfitError) throw outfitError
        outfitId = outfitData.id
        setSaved(true)
        setSavedOutfitId(outfitId)
      }

      await supabase.from('outfits').update({ rating: stars }).eq('id', outfitId)
      setRating(stars)
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
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
    !g.archived && g.id !== swapItem?.id && (swapCategory ? g.category === swapCategory : true)
  )

  const activeCtx = CONTEXTS[selectedContext]

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
            accessibilityLabel="Min profil"
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
                accessibilityLabel={`Kontext: ${ctx.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.contextLabel, isSelected && styles.contextLabelSelected]}>{ctx.label}</Text>
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
                <Text style={styles.optionText}>Anpassa efter väder</Text>
                {weather && <Text style={styles.optionSub}>{weather.temp}° · {weather.description}</Text>}
              </View>
            </View>
            <View style={[styles.toggle, useWeather && styles.toggleOn]}>
              <View style={[styles.toggleKnob, useWeather && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={generateOutfit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={t.onPrimary} />
            : <Text style={styles.generateBtnText}>Generera outfit</Text>
          }
        </TouchableOpacity>

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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outfitImagesScroll}>
              <View style={styles.outfitImages}>
                {outfit.itemsWithImages.map((item: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.outfitItemWrap}
                    onPress={() => setSwapIndex(i)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Byt ut ${item.name}`}
                    accessibilityRole="button"
                  >
                    {item.image_url
                      ? <SignedImage path={item.image_url} style={styles.outfitImage} />
                      : <View style={styles.outfitImageEmpty} />
                    }
                    <View style={styles.swapBadge}><Text style={styles.swapBadgeText}>⇄</Text></View>
                    <Text style={styles.outfitItemName} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {outfit.song && <SongCard song={outfit.song} />}

            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Vad tyckte du om looken?</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => rateOutfit(star)}
                    disabled={ratingLoading}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel={`Betyg ${star} av 5`}
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
                accessibilityLabel={saved ? 'Outfit sparad' : 'Spara outfit'}
                accessibilityRole="button"
              >
                {saving
                  ? <ActivityIndicator color={t.onPrimary} size="small" />
                  : <Text style={styles.saveBtnText}>{saved ? '✓ Sparad' : 'Spara outfit'}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.newBtn} onPress={generateOutfit}>
                <Text style={styles.newBtnText}>↻</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.wearTodayBtn, wornToday && styles.wearTodayBtnDone]}
              onPress={wearToday}
              disabled={wearingToday || wornToday}
              accessibilityLabel={wornToday ? 'Vald för idag' : 'Vill ha på mig idag'}
              accessibilityRole="button"
            >
              {wearingToday
                ? <ActivityIndicator color={t.onPrimary} size="small" />
                : <Text style={styles.wearTodayBtnText}>{wornToday ? '✓ Vald för idag' : 'Vill ha på mig idag'}</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/wardrobe')}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>PLAGG</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/stats')}>
            <Text style={styles.statNum}>{stats.vintedTips}</Text>
            <Text style={styles.statLabel}>SÄLJ TIPS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/inspiration')}>
            <Text style={styles.statLabel}>INSPO</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      {/* Byt ut plagg i outfiten */}
      <Modal visible={swapIndex !== null} animationType="slide" transparent onRequestClose={() => setSwapIndex(null)}>
        <View style={styles.swapOverlay}>
          <View style={styles.swapSheet}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>Byt ut{swapItem ? ` ${swapItem.name}` : ''}</Text>
              <TouchableOpacity
                onPress={() => setSwapIndex(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Stäng"
                accessibilityRole="button"
              >
                <Text style={styles.swapClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.swapRemoveBtn}
              onPress={() => swapIndex !== null && removeItem(swapIndex)}
            >
              <Text style={styles.swapRemoveText}>Ta bort ur outfiten</Text>
            </TouchableOpacity>

            {swapAlternatives.length === 0 ? (
              <View style={styles.swapEmpty}>
                <Text style={styles.swapEmptyText}>Inga andra plagg i samma kategori</Text>
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
  generateBtn: { marginHorizontal: 28, backgroundColor: t.primary, borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 28 },
  generateBtnText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, letterSpacing: 0.5 },

  // Outfit card
  outfitCard: { marginHorizontal: 28, backgroundColor: t.surfaceMuted, borderRadius: 22, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: t.border, gap: 16 },
  messageBox: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(64,45,33,0.15)' },
  messageEmoji: { fontFamily: 'Lora_400Regular', fontSize: 22 },
  messageText: { fontFamily: 'Lora_400Regular', flex: 1, fontSize: 14, color: t.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  outfitName: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  outfitImagesScroll: { marginHorizontal: -4 },
  outfitImages: { flexDirection: 'row', gap: 10, paddingHorizontal: 4 },
  outfitItemWrap: { alignItems: 'center', gap: 4, width: 80 },
  outfitImage: { width: 80, height: 80, borderRadius: 14 },
  swapBadge: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
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
  ratingRow: { alignItems: 'center', gap: 8 },
  ratingLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontFamily: 'Lora_400Regular', fontSize: 28, color: t.textFaint },
  starFilled: { color: t.textPrimary },

  wearTodayBtn: { borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  wearTodayBtnDone: { backgroundColor: 'transparent', borderColor: t.border },
  wearTodayBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 14 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 28 },
  statCard: { flex: 1, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  statNum: { fontFamily: 'Poppins_700Bold', fontSize: 26, color: t.textSecondary },
  statLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.textSecondary, letterSpacing: 1.5, marginTop: 2 },
})
