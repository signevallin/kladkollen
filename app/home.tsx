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

const CONTEXTS = [
  { label: 'Jobb', emoji: '💼', logic: 'professionellt, snyggt, välskräddrat, stilrent, passar arbetsplatsen' },
  { label: 'Ledig', emoji: '🌿', logic: 'casual, bekvämt, avslappnat men snyggt, vardaglig känsla' },
  { label: 'Fest', emoji: '🪩', logic: 'festligt, glansigt, statement pieces, dressy, kvällskänsla' },
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
  const [rating, setRating] = useState<number | null>(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)

  const [selectedContext, setSelectedContext] = useState(1) // 0=Jobb, 1=Ledig, 2=Fest
  const [intensity, setIntensity] = useState(3)
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

  function selectContext(index: number) {
    setSelectedContext(index)
    setOutfit(null)
    setSaved(false)
    setSavedOutfitId(null)
    setWornToday(false)
    setRating(null)
  }

  function buildGroupedGarmentList(garmentList: any[]) {
    const groups: Record<string, string[]> = {
      'KLÄNNING (välj 1 om du vill ha heldress – då skippar du nederdel och överdel)': [],
      'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)': [],
      'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)': [],
      'YTTERPLAGG / KAVAJ – valfritt, lägg till om kontexten/vädret kräver': [],
      'SKOR – alltid obligatorisk (välj exakt 1)': [],
      'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken': [],
    }
    const categoryMap: Record<string, string> = {
      'Klänningar': 'KLÄNNING (välj 1 om du vill ha heldress – då skippar du nederdel och överdel)',
      'Byxor': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Kjolar': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Toppar': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Tröjor': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
      'Kavajer': 'YTTERPLAGG / KAVAJ – valfritt, lägg till om kontexten/vädret kräver',
      'Ytterkläder': 'YTTERPLAGG / KAVAJ – valfritt, lägg till om kontexten/vädret kräver',
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

  function validateOutfit(items: string[], garmentList: any[]): { valid: boolean; missing: string } {
    const BOTTOM_CATS = ['Byxor', 'Kjolar']
    const TOP_CATS = ['Toppar', 'Tröjor']
    const DRESS_CATS = ['Klänningar']
    const SHOE_CATS = ['Skor']

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

    if (!hasShoes) return { valid: false, missing: 'skor saknas' }
    if (!hasDress && !hasBottom) return { valid: false, missing: 'nederdel (byxor/kjol) saknas' }
    if (!hasDress && !hasTop) return { valid: false, missing: 'överdel saknas' }
    return { valid: true, missing: '' }
  }

  async function generateOutfit() {
    if (garments.length === 0) {
      showAlert('Lägg till plagg i garderoben först!')
      return
    }

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
      const groupedList = buildGroupedGarmentList(activeGarments)

      const weatherStr = useWeather ? `Väder: ${currentWeather.temp}°C, ${currentWeather.description}${currentWeather.rain ? ' (regn – ta med regnplagg om tillgängligt)' : ''}.` : ''
      const intensityStr = INTENSITY_LABELS[intensity - 1]
      const avoidStr = recentGarments.length > 0 ? `Undvik om möjligt: ${[...new Set(recentGarments)].slice(0, 6).join(', ')}.` : ''
      const ratingCtx = feedbackStr ? `\nSmakprofil:\n${feedbackStr}` : ''

      const buildPrompt = (extraInstruction = '') => `Du är en personlig stylist. Välj en komplett outfit från garderoben nedan.

Kontext: ${ctx.label} – ${ctx.logic}
Intensitet: ${intensityStr} (${intensity}/5)
${weatherStr}
${avoidStr}${ratingCtx}
${extraInstruction}

GARDEROB (välj ENDAST plagg från listan nedan, exakt som de heter):

${groupedList}

OBLIGATORISKA REGLER – följ dessa EXAKT:
1. SKOR: Du MÅSTE välja ett par skor. Outfit utan skor är ogiltig.
2. NEDERDEL: Du MÅSTE välja byxor eller kjol – SÅVIDA du inte väljer klänning.
3. ÖVERDEL: Du MÅSTE välja topp eller tröja – SÅVIDA du inte väljer klänning.
4. Väljer du klänning → lägg inte till separata byxor/kjol/topp.

Svara ENDAST med JSON, inga backticks:
{"outfitName": "namn", "items": ["exakt plaggnamn 1", "exakt plaggnamn 2", "exakt plaggnamn 3"], "message": "Personligt, emotionellt budskap om looken (1–2 meningar)."}`

      let parsed: any = null
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts) {
        attempts++
        const extraInstruction = attempts > 1
          ? `\nVIKTIGT: Föregående försök saknade obligatoriska plagg. Se till att inkludera SKOR och NEDERDEL (eller klänning) denna gång.`
          : ''

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: buildPrompt(extraInstruction) }],
            max_tokens: 350,
          }),
        })

        const data = await response.json()
        const text = data.choices[0].message.content
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

        const { valid } = validateOutfit(parsed.items, activeGarments)
        if (valid) break
      }

      const itemsWithImages = parsed.items.map((name: string) => {
        const match = activeGarments.find(g =>
          g.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(g.name.toLowerCase())
        )
        return { name, image_url: match?.image_url || null, id: match?.id || null }
      })

      setOutfit({ ...parsed, itemsWithImages })

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
        mood: CONTEXTS[selectedContext].label,
        context: CONTEXTS[selectedContext].label.toLowerCase(),
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
      showAlert('Outfit vald för idag! 🍒', 'Den syns nu i din kalender och plaggen räknas som använda.')
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

  const activeCtx = CONTEXTS[selectedContext]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, fontsLoaded && { fontFamily: 'DancingScript_400Regular' }]}>
              {getGreeting()}, {userName} 🍒
            </Text>
            {weather && (
              <Text style={styles.weatherLine}>
                {weather.emoji} {weather.temp}° · {weather.description}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileBtn}>
            {userAvatar
              ? <Image source={{ uri: userAvatar }} style={styles.profileBtnImage} />
              : <Text style={styles.profileBtnText}>👤</Text>
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
              >
                <Text style={styles.contextEmoji}>{ctx.emoji}</Text>
                <Text style={[styles.contextLabel, isSelected && styles.contextLabelSelected]}>{ctx.label}</Text>
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
                  val <= intensity && styles.sliderDotFilled,
                  val === intensity && styles.sliderDotActive,
                ]} />
              </TouchableOpacity>
            ))}
          </View>
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
            ? <ActivityIndicator color="#FBF3EF" />
            : <Text style={styles.generateBtnText}>{activeCtx.emoji} Generera outfit</Text>
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
                <Text style={styles.messageEmoji}>{activeCtx.emoji}</Text>
                <Text style={styles.messageText}>{outfit.message}</Text>
              </View>
            )}

            <Text style={styles.outfitName}>{outfit.outfitName}</Text>

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

            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Vad tyckte du om looken?</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => rateOutfit(star)} disabled={ratingLoading} activeOpacity={0.7}>
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

  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 32 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 28, color: '#C4737A', marginBottom: 6 },
  weatherLine: { fontSize: 13, color: 'rgba(196,115,122,0.6)', marginTop: 2 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)', overflow: 'hidden', marginLeft: 16 },
  profileBtnText: { fontSize: 18 },
  profileBtnImage: { width: 40, height: 40, borderRadius: 20 },

  // Context quick-select
  contextRow: { flexDirection: 'row', paddingHorizontal: 28, gap: 12, marginBottom: 36 },
  contextBtn: { flex: 1, borderRadius: 18, paddingVertical: 18, alignItems: 'center', gap: 6, backgroundColor: 'rgba(122,24,40,0.2)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.12)' },
  contextBtnSelected: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  contextEmoji: { fontSize: 22 },
  contextLabel: { fontSize: 13, color: 'rgba(196,115,122,0.7)', fontWeight: '600', letterSpacing: 0.3 },
  contextLabelSelected: { color: '#FBF3EF' },

  // Section
  section: { paddingHorizontal: 28, marginBottom: 20, gap: 12 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(251,243,239,0.6)', letterSpacing: 0.5 },
  intensityLabel: { fontSize: 13, color: '#C4737A', fontStyle: 'italic' },

  // Slider
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  sliderStepWrap: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  sliderDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(196,115,122,0.15)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.12)' },
  sliderDotFilled: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  sliderDotActive: { width: 18, height: 18, borderRadius: 9 },

  // Options
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(122,24,40,0.2)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(196,115,122,0.12)' },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { fontSize: 22 },
  optionText: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  optionSub: { fontSize: 11, color: '#C4737A', marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(122,24,40,0.4)', padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: '#9E2035' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(196,115,122,0.5)' },
  toggleKnobOn: { alignSelf: 'flex-end', backgroundColor: '#FBF3EF' },

  // Generate
  generateBtn: { marginHorizontal: 28, backgroundColor: '#9E2035', borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 28 },
  generateBtnText: { color: '#FBF3EF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Outfit card
  outfitCard: { marginHorizontal: 28, backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 22, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', gap: 16 },
  messageBox: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(158,32,53,0.15)' },
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
  ratingRow: { alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 12, color: '#C4737A', fontStyle: 'italic' },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 28, color: 'rgba(196,115,122,0.3)' },
  starFilled: { color: '#9E2035' },

  wearTodayBtn: { borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.5)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  wearTodayBtnDone: { backgroundColor: 'transparent', borderColor: 'rgba(196,115,122,0.2)' },
  wearTodayBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 28 },
  statCard: { flex: 1, backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.12)' },
  statNum: { fontSize: 26, fontWeight: 'bold', color: '#DDA0A7' },
  statLabel: { fontSize: 9, color: '#C4737A', letterSpacing: 1.5, marginTop: 2, fontWeight: '600' },
})
