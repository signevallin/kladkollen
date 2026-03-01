import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import * as Location from 'expo-location'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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

export default function Home() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
  const [weather, setWeather] = useState(null)
  const [outfit, setOutfit] = useState(null)
  const [garments, setGarments] = useState([])
  const [stats, setStats] = useState({ total: 0, vintedTips: 0 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()
        if (profile?.name) {
          setUserName(profile.name)
        } else {
          setUserName(user.email?.split('@')[0] || '')
        }
      }
    }
    loadUser()
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchAll()
    }, [])
  )

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) setUserName(user.email.split('@')[0])

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
      if (status !== 'granted') {
        setWeather({ temp: 10, emoji: '🌧️', description: 'Regn' })
        return
      }
      const location = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = location.coords
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
      )
      const data = await response.json()
      const temp = Math.round(data.current.temperature_2m)
      const code = data.current.weathercode
      setWeather({ temp, emoji: getWeatherEmoji(code), description: getWeatherDescription(code) })
    } catch {
      setWeather({ temp: 10, emoji: '🌡️', description: 'Okänt väder' })
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

  async function generateOutfit() {
    const currentWeather = weather ?? { temp: 10, emoji: '🌧️', description: 'Regn' }
    if (garments.length === 0) {
      Alert.alert('Inga plagg', 'Lägg till plagg i garderoben först!')
      return
    }
    setLoading(true)
    setSaved(false)

    try {
      const garmentList = garments
        .map(g => `- ${g.name} (${g.category}, ${g.color || ''}, ${g.season || ''})`)
        .join('\n')

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Du är en personlig stylist. Det är ${currentWeather.temp}°C ute. Välj 3 plagg från garderoben för en snygg outfit. Svara ENDAST med JSON utan markdown:
{"outfitName": "namn", "items": ["plagg1", "plagg2", "plagg3"]}

Garderob:
${garmentList}`
          }],
          max_tokens: 150,
        }),
      })

      const data = await response.json()
      const text = data.choices[0].message.content
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      const itemsWithImages = parsed.items.map((name: string) => {
        const match = garments.find(g =>
          g.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(g.name.toLowerCase())
        )
        return { name, image_url: match?.image_url || null, id: match?.id || null }
      })

      setOutfit({ ...parsed, itemsWithImages })
    } catch (e: any) {
      Alert.alert('Något gick fel', e.message)
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

      const { error } = await supabase.from('outfits').insert([{
        user_id: user?.id,
        name: outfit.outfitName,
        garment_ids: garmentIds,
        garment_names: garmentNames,
        image_urls: imageUrls,
      }])

      if (error) throw error
      setSaved(true)
      Alert.alert('Outfit sparad! 🍒', 'Du hittar den under Outfits.')
    } catch (e: any) {
      Alert.alert('Något gick fel', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, fontsLoaded && { fontFamily: 'DancingScript_400Regular', fontSize: 22 }]}>
              {getGreeting()}, {userName} 🍒
            </Text>
            <Text style={styles.question}>Vad ska du ha{'\n'}på dig idag?</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileBtn}>
            <Text style={styles.profileBtnText}>👤</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>

          {weather && (
            <View style={styles.weatherCard}>
              <Text style={styles.weatherTemp}>{weather.temp}°</Text>
              <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dagens outfit</Text>
            <TouchableOpacity onPress={() => router.push('/my-outfit')}>
              <Text style={styles.seeMore}>Se fler →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.outfitCard}>
            {!outfit && !loading && (
              <TouchableOpacity style={styles.generateBtn} onPress={generateOutfit}>
                <Text style={styles.generateBtnText}>✨ Generera dagens outfit</Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#C4737A" />
                <Text style={styles.loadingText}>Skapar outfit...</Text>
              </View>
            )}

            {outfit && !loading && (
              <View style={styles.outfitContent}>
                <View style={styles.outfitItems}>
                  {outfit.itemsWithImages.map((item: any, i: number) => (
                    <View key={i} style={styles.outfitItem}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.outfitImage} />
                      ) : (
                        <View style={styles.outfitImageEmpty}>
                          <Text style={{ fontSize: 28 }}>👗</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitName}>{outfit.outfitName}</Text>
                  <Text style={styles.outfitItems2}>
                    {outfit.itemsWithImages.map((i: any) => i.name).join('\n')}
                  </Text>
                  <View style={styles.outfitActions}>
                    <TouchableOpacity
                      style={[styles.saveBtn, saved && styles.saveBtnDone]}
                      onPress={saveOutfit}
                      disabled={saving || saved}
                    >
                      <Text style={styles.saveBtnText}>
                        {saving ? '...' : saved ? '✓ Sparad' : '🍒 Spara'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.newBtn} onPress={generateOutfit}>
                      <Text style={styles.newBtnText}>↻ Ny</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

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

        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { paddingBottom: 100 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    padding: 16,
    paddingBottom: 16,
  },
  greeting: { fontSize: 32, color: '#C4737A', marginBottom: 4 },
  question: { fontSize: 36, fontWeight: 'bold', color: '#FBF3EF', lineHeight: 42 },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(122,24,40,0.4)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)',
  },
  profileBtnText: { fontSize: 18 },
  content: { paddingHorizontal: 24 },
  weatherCard: {
    flex: 1, backgroundColor: '#9E2035', borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, flexDirection: 'row', marginBottom: 20,
  },
  weatherTemp: { fontSize: 52, fontWeight: 'bold', color: '#FBF3EF' },
  weatherEmoji: { fontSize: 44 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FBF3EF' },
  seeMore: { fontSize: 13, color: '#C4737A', fontStyle: 'italic' },
  outfitCard: {
    backgroundColor: 'rgba(122,24,40,0.35)', borderRadius: 20, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)',
    minHeight: 120, justifyContent: 'center',
  },
  generateBtn: { alignItems: 'center', padding: 16 },
  generateBtnText: { color: '#DDA0A7', fontSize: 16, fontWeight: '500' },
  loadingBox: { alignItems: 'center', gap: 8, padding: 16 },
  loadingText: { color: '#C4737A', fontSize: 13, fontStyle: 'italic' },
  outfitContent: { flexDirection: 'row', gap: 12 },
  outfitItems: { gap: 6 },
  outfitItem: {},
  outfitImage: { width: 70, height: 70, borderRadius: 12 },
  outfitImageEmpty: {
    width: 70, height: 70, borderRadius: 12,
    backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  outfitInfo: { flex: 1, justifyContent: 'space-between' },
  outfitName: { fontSize: 18, fontWeight: 'bold', color: '#FBF3EF', fontStyle: 'italic' },
  outfitItems2: { fontSize: 12, color: '#C4737A', lineHeight: 18 },
  outfitActions: { flexDirection: 'row', gap: 6 },
  saveBtn: {
    flex: 1, backgroundColor: '#9E2035', borderRadius: 10,
    padding: 8, alignItems: 'center',
  },
  saveBtnDone: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)',
  },
  saveBtnText: { color: '#FBF3EF', fontSize: 12, fontWeight: '600' },
  newBtn: {
    backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 10,
    padding: 8, paddingHorizontal: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)',
  },
  newBtnText: { color: '#DDA0A7', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(122,24,40,0.35)', borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)',
  },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#DDA0A7' },
  statLabel: { fontSize: 9, color: '#C4737A', letterSpacing: 1.5, marginTop: 2, fontWeight: '600' },
})