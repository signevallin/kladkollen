import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../components/SignedImage'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { showAlert } from '../utils/alert'
import { apiPost } from '../utils/api'
import { loadGarments } from '../utils/garmentsStore'
import { goBack } from '../utils/nav'
import { loadPeople, type Person } from '../utils/people'
import { ageMonths } from '../utils/outfit'
import { useSettings } from '../utils/settings'
import { buildGroupedGarmentList, childSizeFits, childWalks, dedupOutfitItems, getCurrentSeason, isBabyChild, matchItemsToPool, seasonAppropriate, validateOutfit } from '../utils/outfit'
import { buildWeatherContext, childHeadwearRule, summarizeDayForecast, type WeatherInput } from '../utils/weather'

// Dagens outfit för ett barn: en fristående, förenklad version av hemskärmens
// generering. Barn stylas efter LOGISTIK, inte mode – rätt för vädret, bekvämt,
// och i rätt storlek (plagg som barnet vuxit ur eller ännu inte passar döljs).
// Ingen låt, inga stil-/formalitetsregler, inget par-läge. Motorn är densamma
// (/api/generate-outfit) men med audience:'child'.

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

export default function ChildOutfit() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang, tempLabel } = useSettings()
  const { person, personName } = useLocalSearchParams<{ person?: string; personName?: string }>()

  const [child, setChild] = useState<Person | null>(null)
  const [garments, setGarments] = useState<any[]>([])
  const [weather, setWeather] = useState<(WeatherInput & { emoji?: string }) | null>(null)
  const [loading, setLoading] = useState(false)
  const [outfit, setOutfit] = useState<any>(null)

  const name = personName || child?.name || tr('Barnet')

  useEffect(() => {
    if (!person) return
    loadPeople().then(ppl => setChild(ppl.find(p => p.id === person) || null)).catch(() => {})
    loadGarments().then(all => setGarments((all as any[]).filter(g => g.person_id === person))).catch(() => {})
    fetchWeather()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person])

  async function fetchWeather() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      const { latitude, longitude } = loc.coords
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`)
      const data = await res.json()
      const code = data.current.weathercode
      const forecast = summarizeDayForecast(data)
      setWeather({ temp: Math.round(data.current.temperature_2m), rain: code >= 51 && code <= 82, emoji: weatherEmoji(code), ...forecast })
    } catch { /* utan väder genereras ändå en säsongsanpassad outfit */ }
  }

  async function generate() {
    const active = garments.filter(g => !g.archived && !g.in_laundry)
    if (active.length === 0) {
      showAlert(tr('Lägg till plagg i barnets garderob först!'))
      return
    }
    setLoading(true)
    setOutfit(null)
    try {
      const season = getCurrentSeason()
      // Barn upplever inte köld annorlunda som standard → neutral känslighet (3).
      // Barnets egen köldkänslighet styr den upplevda temperaturen – syskon
      // skiljer sig ofta åt, och för de minsta avgör den när mössa krävs.
      const cold = child?.cold_sensitivity ?? 3
      const weatherCtx = weather ? buildWeatherContext(weather, cold) : { summary: '', rules: '', requiresOuterwear: false }
      const headwear = childHeadwearRule(ageMonths(child?.birthdate), weather?.temp, cold)

      // Filtrera på rätt storlek + säsong. Faller tillbaka bredare om urvalet blir
      // för smalt för en komplett outfit (skor + över-/nederdel eller klänning).
      const sized = active.filter(g => childSizeFits(g, child?.current_size_cm ?? null))
      const seasonal = sized.filter(g => seasonAppropriate(g, season))
      const SHOE = ['Skor'], BOTTOM_OR_DRESS = ['Byxor', 'Shorts', 'Kjolar', 'Klänningar'], TOP_OR_DRESS = ['Toppar', 'Tröjor', 'Klänningar']
      const canForm = (list: any[]) =>
        list.some(g => SHOE.includes(g.category)) &&
        list.some(g => BOTTOM_OR_DRESS.includes(g.category)) &&
        list.some(g => TOP_OR_DRESS.includes(g.category))
      const pool = canForm(seasonal) ? seasonal : canForm(sized) ? sized : active

      const groupedList = buildGroupedGarmentList(pool, weatherCtx.requiresOuterwear)
      const previousItems: string = (outfit?.items || []).join(', ')
      // Tilltal (bebis vs barn) och skor avgörs var för sig: ett barn kan gå
      // men fortfarande vara bebis, och tvärtom.
      const baby = isBabyChild(child?.birthdate, child?.current_size_cm ?? null)
      const walks = childWalks(child?.birthdate, child?.current_size_cm ?? null, child?.walks)

      let parsed: any = null
      let attempts = 0
      while (attempts < 3) {
        attempts++
        parsed = await apiPost('/api/generate-outfit', {
          audience: 'child',
          childName: name,
          babyMode: baby,
          walks,
          pottyTraining: child?.potty_training === true,
          weatherSummary: weatherCtx.summary,
          weatherRules: [weatherCtx.rules, headwear].filter(Boolean).join(' '),
          season,
          groupedList,
          previousItems: attempts === 1 ? previousItems : '',
          retry: attempts > 1,
          lang,
        })
        const { valid } = validateOutfit(parsed.items || [], pool, weatherCtx.requiresOuterwear, { requireShoes: !baby })
        if (valid) break
      }
      if (!parsed?.items?.length) throw new Error(tr('AI:n gav inget giltigt förslag – försök igen.'))

      const itemsWithImages = dedupOutfitItems(matchItemsToPool(parsed.items, pool), pool)
      setOutfit({ ...parsed, itemsWithImages })
    } catch (e: any) {
      if (e?.code === 'quota_exceeded') { router.push('/paywall'); return }
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack(person ? `/wardrobe?person=${person}&personName=${encodeURIComponent(name)}` : '/wardrobe')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{tr('Dagens outfit')} · {name}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {weather && (
          <View style={styles.weatherRow}>
            <Text style={styles.weatherText}>{weather.emoji} {tempLabel(weather.temp)}</Text>
            {typeof weather.dayMin === 'number' && typeof weather.dayMax === 'number' && weather.dayMax - weather.dayMin >= 4 && (
              <Text style={styles.weatherSub}>{tempLabel(weather.dayMin)}–{tempLabel(weather.dayMax)}</Text>
            )}
          </View>
        )}

        <Text style={styles.intro}>
          {tr('En outfit anpassad efter dagens väder och barnets aktuella storlek.')}
        </Text>

        <TouchableOpacity style={styles.generateBtn} onPress={generate} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color={t.onPrimary} />
            : <Text style={styles.generateText}>{outfit ? tr('Skapa ny') : tr('Skapa dagens outfit')}</Text>}
        </TouchableOpacity>

        {outfit && (
          <View style={styles.result}>
            {!!outfit.outfitName && <Text style={styles.outfitName}>{outfit.outfitName}</Text>}
            {!!outfit.message && <Text style={styles.message}>{outfit.message}</Text>}
            <View style={styles.grid}>
              {outfit.itemsWithImages.map((item: any, i: number) => (
                <View key={i} style={styles.card}>
                  {item.image_url
                    ? <SignedImage path={item.image_url} style={styles.cardImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                    : <View style={[styles.cardImage, styles.cardEmpty]}><MaterialIcons name="checkroom" size={28} color={t.textFaint} /></View>}
                  <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  title: { flex: 1, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: t.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  weatherRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, justifyContent: 'center', marginBottom: 6 },
  weatherText: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary },
  weatherSub: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary },
  intro: { fontFamily: 'Lora_400Regular', fontSize: 15, lineHeight: 22, color: t.textSecondary, textAlign: 'center', marginBottom: 18 },
  generateBtn: { backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  generateText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.onPrimary },
  result: { marginTop: 24 },
  outfitName: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: t.textPrimary, textAlign: 'center' },
  message: { fontFamily: 'Lora_400Regular', fontSize: 15, lineHeight: 22, color: t.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { width: '47%', backgroundColor: t.surface, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: t.border },
  cardImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: t.surfaceMuted },
  cardEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, marginTop: 8, textAlign: 'center' },
})
