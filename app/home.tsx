import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import * as Location from 'expo-location'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../components/BottomNav'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'

const MOODS = [
  { emoji: '😌', label: 'Lugn', color: '#A8B5A0', bg: 'rgba(168,181,160,0.15)', logic: 'mjuka material, neutrala färger, stickat, oversized, lager', energy: 1, expression: 1 },
  { emoji: '🔥', label: 'Power', color: '#9E2035', bg: 'rgba(158,32,53,0.15)', logic: 'skräddat, markerad siluett, svart/vitt, statement-plagg', energy: 5, expression: 5 },
  { emoji: '💕', label: 'Romantisk', color: '#E8A0B4', bg: 'rgba(232,160,180,0.15)', logic: 'klänning, pasteller, flöde, feminina detaljer', energy: 2, expression: 5 },
  { emoji: '⚡', label: 'Energisk', color: '#F5C842', bg: 'rgba(245,200,66,0.15)', logic: 'sportigt, funktionellt, lager som går att röra sig i', energy: 5, expression: 3 },
  { emoji: '☁️', label: 'Introvert', color: '#8B9BB4', bg: 'rgba(139,155,180,0.15)', logic: 'hoodie, stickat, mörka färger, bekvämt', energy: 1, expression: 2 },
  { emoji: '🪩', label: 'Fest', color: '#B57BDB', bg: 'rgba(181,123,219,0.15)', logic: 'glans, klackar, accessoarer, statement pieces', energy: 5, expression: 6 },
]

const INTENSITY_LABELS = ['Subtil', 'Diskret', 'Balanserad', 'Uttalad', 'Total']

export default function Home() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
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
  const [userName, setUserName] = useState('')

  // Mood state
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [intensity, setIntensity] = useState(3) // 1-5
  const [useWeather, setUseWeather] = useState(true)
  const [context, setContext] = useState<'båda' | 'jobb' | 'fritid'>('båda')

  // Animations
  const moodAnim = useRef(new Animated.Value(0)).current
  const outfitAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current

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
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      if (profile?.name) setUserName(profile.name)
      else setUserName(user.email?.split('@')[0] || '')
    }
  }

  async function fetchAll() {
    const { data } = await supabase.from('garments').select('*')
    if (data) {
      setGarments(data)
      const vintedTips = data.filter(g => !g.times_worn || g.times_worn === 0).length
      setStats({ total: data.length, vintedTips })
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

  function selectMood(index: number) {
    setSelectedMood(index)
    setOutfit(null)
    setSaved(false)
    setSavedOutfitId(null)
    setWornToday(false)

    // Animate glow
    Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()

    Animated.spring(moodAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start()
  }

  async function generateOutfit() {
    if (selectedMood === null) {
      showAlert('Välj ett humör först!')
      return
    }
    if (garments.length === 0) {
      showAlert('Lägg till plagg i garderoben först!')
      return
    }

    setLoading(true)
    setSaved(false)
    setSavedOutfitId(null)
    setWornToday(false)
    setOutfit(null)

    const mood = MOODS[selectedMood]
    const currentWeather = weather ?? { temp: 10, description: 'okänt', rain: false }

    try {
      const { data: recentOutfits } = await supabase
        .from('outfits')
        .select('garment_names')
        .order('created_at', { ascending: false })
        .limit(5)

      const recentGarments = recentOutfits?.flatMap(o => o.garment_names || []) || []

      const garmentList = garments
        .filter(g => !g.archived)
        .map(g => `- ${g.name} (${g.category}${g.color ? ', ' + g.color : ''}${g.season ? ', ' + g.season : ''})`)
        .join('\n')

      const contextStr = context === 'jobb' ? 'jobbkontext' : context === 'fritid' ? 'fritid/ledigt' : 'generellt'
      const weatherStr = useWeather ? `Det är ${currentWeather.temp}°C ute, ${currentWeather.description}${currentWeather.rain ? ' – regn/fukt' : ''}.` : ''
      const intensityStr = INTENSITY_LABELS[intensity - 1]
      const avoidStr = recentGarments.length > 0 ? `Undvik om möjligt dessa plagg som nyss använts: ${[...new Set(recentGarments)].slice(0, 6).join(', ')}.` : ''

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Du är en personlig stylist. Skapa en outfit baserat på följande:

Humör: ${mood.label} (${mood.emoji}) – ${mood.logic}
Intensitet: ${intensityStr} (${intensity}/5)
Kontext: ${contextStr}
${weatherStr}
${avoidStr}

Garderob:
${garmentList}

REGLER FÖR OUTFIT-SAMMANSÄTTNING:
- Utan klänning: välj ALLTID en nederdel (byxor eller kjol) + en överdel (topp, tröja eller kavaj) + skor. Lägg till väska eller accessoar om det passar.
- Med klänning: välj ALLTID skor + klänning. Lägg till ytterkläder, väska och/eller accessoar om det passar.
- Skor MÅSTE alltid ingå.

Skriv ett emotionellt, personligt budskap (1–2 meningar) om vad looken ger för känsla. Svara ENDAST med JSON, inga backticks:
{"outfitName": "namn", "items": ["plagg1", "plagg2", "plagg3"], "message": "Emotionellt budskap om looken."}`
          }],
          max_tokens: 300,
        }),
      })

      const data = await response.json()
      const text = data.choices[0].message.content
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

      const itemsWithImages = parsed.items.map((name: string) => {
        const match = garments.find(g =>
          g.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(g.name.toLowerCase())
        )
        return { name, image_url: match?.image_url || null, id: match?.id || null }
      })

      setOutfit({ ...parsed, itemsWithImages })

      // Animate outfit in
      outfitAnim.setValue(0)
      Animated.spring(outfitAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start()

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
      }]).select('id').single()
      if (error) throw error
      setSaved(true)
      setSavedOutfitId(outfitData.id)
      showAlert('Outfit sparad! 🍒', 'Du hittar den under Outfits.')
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
      showAlert('Outfit vald för idag! 🍒', 'Den syns nu i din kalender och plaggen räknas som använda.')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setWearingToday(false)
    }
  }

  const activeMood = selectedMood !== null ? MOODS[selectedMood] : null

  return (
    <SafeAreaView style={[styles.container, activeMood && { backgroundColor: '#150408' }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, fontsLoaded && { fontFamily: 'DancingScript_400Regular', fontSize: 22 }]}>
              {getGreeting()}, {userName} 🍒
            </Text>
            <Text style={styles.question}>Hur vill du{'\n'}känna dig idag?</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileBtn}>
            <Text style={styles.profileBtnText}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Mood grid */}
        <View style={styles.moodGrid}>
          {MOODS.map((mood, index) => {
            const isSelected = selectedMood === index
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.moodBtn,
                  isSelected && { backgroundColor: mood.bg, borderColor: mood.color, borderWidth: 2 }
                ]}
                onPress={() => selectMood(index)}
                activeOpacity={0.75}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, isSelected && { color: mood.color }]}>{mood.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Intensity slider */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Intensitet</Text>
            <Text style={styles.intensityLabel}>{INTENSITY_LABELS[intensity - 1]}</Text>
          </View>
          <View style={styles.sliderRow}>
            {[1, 2, 3, 4, 5].map(val => (
              <TouchableOpacity
                key={val}
                style={styles.sliderStepWrap}
                onPress={() => setIntensity(val)}
              >
                <View style={[
                  styles.sliderDot,
                  val <= intensity && { backgroundColor: activeMood?.color || '#9E2035' },
                  val === intensity && styles.sliderDotActive,
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          {/* Weather toggle */}
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
            <View style={[styles.toggle, useWeather && { backgroundColor: activeMood?.color || '#9E2035' }]}>
              <View style={[styles.toggleKnob, useWeather && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>

          {/* Context segmented control */}
          <View style={styles.segmentedRow}>
            {(['jobb', 'båda', 'fritid'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.segmentBtn, context === opt && { backgroundColor: activeMood?.color || '#9E2035' }]}
                onPress={() => setContext(opt)}
              >
                <Text style={[styles.segmentText, context === opt && { color: '#FBF3EF' }]}>
                  {opt === 'jobb' ? '💼 Jobb' : opt === 'fritid' ? '🌿 Fritid' : '✨ Båda'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[
            styles.generateBtn,
            selectedMood === null && styles.generateBtnDisabled,
            activeMood && { backgroundColor: activeMood.color }
          ]}
          onPress={generateOutfit}
          disabled={loading || selectedMood === null}
        >
          {loading
            ? <ActivityIndicator color="#FBF3EF" />
            : <Text style={styles.generateBtnText}>
                {selectedMood !== null ? `${activeMood?.emoji} Generera outfit` : 'Välj ett humör först'}
              </Text>
          }
        </TouchableOpacity>

        {/* Outfit result */}
        {outfit && !loading && (
          <Animated.View style={[styles.outfitCard, {
            opacity: outfitAnim,
            transform: [{ translateY: outfitAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            borderColor: activeMood?.color || 'rgba(196,115,122,0.2)',
          }]}>
            {/* Emotional message */}
            {outfit.message && (
              <View style={[styles.messageBox, { backgroundColor: activeMood?.bg || 'rgba(122,24,40,0.2)' }]}>
                <Text style={[styles.messageEmoji]}>{activeMood?.emoji}</Text>
                <Text style={styles.messageText}>{outfit.message}</Text>
              </View>
            )}

            <Text style={styles.outfitName}>{outfit.outfitName}</Text>

            {/* Garment images */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outfitImagesScroll}>
              <View style={styles.outfitImages}>
                {outfit.itemsWithImages.map((item: any, i: number) => (
                  <View key={i} style={styles.outfitItemWrap}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={styles.outfitImage} />
                      : <View style={styles.outfitImageEmpty}><Text style={{ fontSize: 28 }}>👗</Text></View>
                    }
                    <Text style={styles.outfitItemName} numberOfLines={1}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.outfitActions}>
              <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnDone, { backgroundColor: activeMood?.color || '#9E2035' }]}
                onPress={saveOutfit}
                disabled={saving || saved}
              >
                <Text style={styles.saveBtnText}>{saving ? '...' : saved ? '✓ Sparad' : '🍒 Spara outfit'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newBtn} onPress={generateOutfit}>
                <Text style={styles.newBtnText}>↻</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.wearTodayBtn, wornToday && styles.wearTodayBtnDone]}
              onPress={wearToday}
              disabled={wearingToday || wornToday}
            >
              <Text style={styles.wearTodayBtnText}>
                {wearingToday ? '...' : wornToday ? '✓ Vald för idag' : '👗 Vill ha på mig idag'}
              </Text>
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
            <Text style={styles.statNum}>📸</Text>
            <Text style={styles.statLabel}>INSPO</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { paddingBottom: 100 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingBottom: 16 },
  greeting: { fontSize: 22, color: '#C4737A', marginBottom: 4 },
  question: { fontSize: 34, fontWeight: 'bold', color: '#FBF3EF', lineHeight: 40 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  profileBtnText: { fontSize: 18 },

  // Mood grid
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 10, marginBottom: 24 },
  moodBtn: { width: '30%', aspectRatio: 1.3, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)', gap: 4 },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 10, color: 'rgba(196,115,122,0.7)', fontWeight: '500' },

  // Section
  section: { paddingHorizontal: 24, marginBottom: 16, gap: 12 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#FBF3EF' },
  intensityLabel: { fontSize: 13, color: '#C4737A', fontStyle: 'italic' },

  // Slider
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  sliderStepWrap: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  sliderDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(196,115,122,0.2)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  sliderDotActive: { width: 20, height: 20, borderRadius: 10 },

  // Options
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { fontSize: 24 },
  optionText: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  optionSub: { fontSize: 11, color: '#C4737A', marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.4)', padding: 2, justifyContent: 'center' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(196,115,122,0.5)' },
  toggleKnobOn: { alignSelf: 'flex-end', backgroundColor: '#FBF3EF' },

  // Segmented
  segmentedRow: { flexDirection: 'row', gap: 6 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.25)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  segmentText: { fontSize: 12, color: '#C4737A', fontWeight: '500' },

  // Generate
  generateBtn: { marginHorizontal: 24, backgroundColor: '#9E2035', borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 20 },
  generateBtnDisabled: { opacity: 0.4 },
  generateBtnText: { color: '#FBF3EF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Outfit card
  outfitCard: { marginHorizontal: 24, backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 22, padding: 18, marginBottom: 20, borderWidth: 1.5, gap: 14 },
  messageBox: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  messageEmoji: { fontSize: 22 },
  messageText: { flex: 1, fontSize: 14, color: '#FBF3EF', lineHeight: 20, fontStyle: 'italic' },
  outfitName: { fontSize: 20, fontWeight: 'bold', color: '#FBF3EF' },
  outfitImagesScroll: { marginHorizontal: -4 },
  outfitImages: { flexDirection: 'row', gap: 10, paddingHorizontal: 4 },
  outfitItemWrap: { alignItems: 'center', gap: 4, width: 80 },
  outfitImage: { width: 80, height: 80, borderRadius: 14 },
  outfitImageEmpty: { width: 80, height: 80, borderRadius: 14, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center' },
  outfitItemName: { fontSize: 10, color: '#C4737A', textAlign: 'center', width: 80 },
  outfitActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, backgroundColor: '#9E2035', borderRadius: 12, padding: 12, alignItems: 'center' },
  saveBtnDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  saveBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },
  newBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  newBtnText: { color: '#DDA0A7', fontSize: 18 },
  wearTodayBtn: { borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.5)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  wearTodayBtnDone: { backgroundColor: 'transparent', borderColor: 'rgba(196,115,122,0.2)' },
  wearTodayBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(122,24,40,0.35)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#DDA0A7' },
  statLabel: { fontSize: 9, color: '#C4737A', letterSpacing: 1.5, marginTop: 2, fontWeight: '600' },
})