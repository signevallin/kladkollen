import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView, ScrollView,
    StyleSheet, Text,
    TouchableOpacity,
    View
} from 'react-native'
import BottomNav from '../components/BottomNav'

import { supabase } from '../supabase'

export default function Outfit() {
  const [weather, setWeather] = useState(null)
  const [garments, setGarments] = useState([])
  const [outfit, setOutfit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [weatherLoading, setWeatherLoading] = useState(true)

  useEffect(() => {
    fetchWeather()
    fetchGarments()
  }, [])

  async function fetchWeather() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setWeather({ temp: 10, description: 'Okänt väder', city: 'Din stad' })
        setWeatherLoading(false)
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

     const { text, emoji } = getWeatherDescription(code)

      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      )
      const geoData = await geoResponse.json()
      const city = geoData.address.city || geoData.address.town || 'Din stad'

      setWeather({ temp, description: text, emoji, city })
    } catch (error) {
      setWeather({ temp: 10, description: 'Okänt väder', emoji: '🌡️', city: 'Din stad' })
    } finally {
      setWeatherLoading(false)
    }
  }

 
function getWeatherDescription(code: number) {
  if (code === 0) return { text: 'Klart och soligt', emoji: '☀️' }
  if (code <= 3) return { text: 'Mestadels molnigt', emoji: '⛅️' }
  if (code <= 48) return { text: 'Dimmigt', emoji: '🌫️' }
  if (code <= 67) return { text: 'Regn', emoji: '🌧️' }
  if (code <= 77) return { text: 'Snö', emoji: '❄️' }
  if (code <= 82) return { text: 'Regnskurar', emoji: '🌦️' }
  return { text: 'Åskväder', emoji: '⛈️' }
}

  async function fetchGarments() {
    const { data } = await supabase.from('garments').select('*')
    if (data) setGarments(data)
  }

  async function generateOutfit() {
    if (!weather || garments.length === 0) return
    setLoading(true)
    setOutfit(null)

    try {
      const garmentList = garments
        .map(g => `- ${g.name} (${g.category}, ${g.season || 'alla årstider'})`)
        .join('\n')

      const prompt = `Du är en personlig stylist. Det är ${weather.temp}°C och ${weather.description} i ${weather.city}.
      
Användarens garderob innehåller:
${garmentList}

Föreslå ett passande outfit baserat på vädret. Välj 3-4 plagg från garderoben. 
Svara ENDAST med ett JSON-objekt i detta format, inget annat:
{
  "outfitName": "namn på outfiten",
  "items": ["plaggnamn1", "plaggnamn2", "plaggnamn3"],
  "description": "kort beskrivning av outfiten och varför den passar vädret"
}`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
        }),
      })

      const data = await response.json()
      const text = data.choices[0].message.content
      const parsed = JSON.parse(text)

      const outfitWithImages = parsed.items.map((itemName: string) => {
        const match = garments.find(g =>
          g.name.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(g.name.toLowerCase())
        )
        return { name: itemName, image_url: match?.image_url || null }
      })

      setOutfit({ ...parsed, itemsWithImages: outfitWithImages })
    } catch (error: any) {
      console.log('Fel:', error.message)
    } finally {
      setLoading(false)
    }
  }
  async function wearOutfit() {
  if (!outfit) return

  const today = new Date().toISOString().split('T')[0]
  let wornCount = 0

  for (const item of outfit.itemsWithImages) {
    const match = garments.find(g =>
      g.name.toLowerCase().includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(g.name.toLowerCase())
    )

    if (match) {
      await supabase
        .from('garments')
        .update({
          times_worn: (match.times_worn || 0) + 1,
          last_worn: today,
        })
        .eq('id', match.id)
      wornCount++
    }
  }

  Alert.alert(
    'Outfit vald! 🍒',
    `${wornCount} plagg markerade som använda idag.`
  )
}
async function saveOutfit() {
  if (!outfit) return

  const { data: { user } } = await supabase.auth.getUser()

  const garmentIds = outfit.itemsWithImages
    .map((item: any) => {
      const match = garments.find(g =>
        g.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(g.name.toLowerCase())
      )
      return match?.id || null
    })
    .filter(Boolean)

  const imageUrls = outfit.itemsWithImages
    .map((item: any) => item.image_url)
    .filter(Boolean)

  const { error } = await supabase
    .from('outfits')
    .insert([{
      user_id: user?.id,
      name: outfit.outfitName,
      garment_ids: garmentIds,
      garment_names: outfit.items,
      image_urls: imageUrls,
      weather_condition: weather?.description,
      temperature: weather?.temp,
    }])

  if (error) {
    Alert.alert('Något gick fel', error.message)
  } else {
    Alert.alert('Outfit sparad! 🍒')
  }
}



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.title}>Outfit-förslag</Text>
        <Text style={styles.subtitle}>baserat på vädret</Text>

        {/* Väder-kort */}
        <View style={styles.weatherCard}>
          {weatherLoading ? (
            <ActivityIndicator color="#FBF3EF" />
          ) : (
            <>
             <Text style={styles.weatherTemp}>{weather?.temp}°</Text>
<View style={{ flex: 1 }}>
  <Text style={styles.weatherCity}>{weather?.city}</Text>
  <Text style={styles.weatherDesc}>{weather?.description}</Text>
</View>
<Text style={styles.weatherEmoji}>{weather?.emoji}</Text>

            </>
          )}
        </View>

  

        {/* Generera-knapp */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateOutfit}
          disabled={loading || weatherLoading}
        >
          <Text style={styles.generateButtonText}>
            {loading ? 'Genererar outfit...' : '✨ Generera dagens outfit'}
          </Text>
        </TouchableOpacity>

        {loading && (
          <ActivityIndicator color="#C4737A" style={{ marginTop: 20 }} />
        )}

        {/* Outfit-resultat */}
        {outfit && (
          <View style={styles.outfitCard}>
            <Text style={styles.outfitName}>{outfit.outfitName}</Text>
            <Text style={styles.outfitDescription}>{outfit.description}</Text>

            <View style={styles.outfitItems}>
              {outfit.itemsWithImages.map((item: any, index: number) => (
                <View key={index} style={styles.outfitItem}>
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.outfitItemImage}
                    />
                  ) : (
                    <Text style={styles.outfitItemEmoji}>👗</Text>
                  )}
                  <Text style={styles.outfitItemName}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
{/* Välj outfit-knapp */}
<TouchableOpacity style={styles.wearButton} onPress={wearOutfit}>
  <Text style={styles.wearButtonText}>👗 Det här har jag på mig idag!</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.saveButton} onPress={saveOutfit}>
  <Text style={styles.saveButtonText}>🍒 Spara outfit</Text>
</TouchableOpacity>

      </ScrollView>

          <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FBF3EF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#C4737A',
    marginBottom: 20,
    marginTop: 2,
  },
  weatherCard: {
    backgroundColor: '#9E2035',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  weatherTemp: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FBF3EF',
    lineHeight: 60,
  },
  weatherCity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBF3EF',
    letterSpacing: 1,
  },
  weatherDesc: {
    fontSize: 14,
    color: 'rgba(251,243,239,0.7)',
    marginTop: 2,
  },
  generateButton: {
    backgroundColor: 'rgba(122,24,40,0.5)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.3)',
    marginBottom: 20,
  },
  generateButtonText: {
    color: '#FBF3EF',
    fontSize: 16,
    fontWeight: '600',
  },
  outfitCard: {
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
  },
  outfitName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FBF3EF',
    marginBottom: 8,
  },
  outfitDescription: {
    fontSize: 14,
    color: '#C4737A',
    lineHeight: 20,
    marginBottom: 16,
  },
  outfitItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  outfitItem: {
    width: '22%',
    alignItems: 'center',
    gap: 4,
  },
  outfitItemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  outfitItemEmoji: {
    fontSize: 32,
  },
  outfitItemName: {
    fontSize: 9,
    color: '#C4737A',
    textAlign: 'center',
  },
  weatherEmoji: {
  fontSize: 48,
},
wearButton: {
  backgroundColor: '#9E2035',
  borderRadius: 14,
  padding: 14,
  alignItems: 'center',
  marginVertical: 12,
},
wearButtonText: {
  color: '#FBF3EF',
  fontSize: 15,
  fontWeight: '600',
},
saveButton: {
  backgroundColor: 'rgba(122,24,40,0.5)',
  borderRadius: 14,
  padding: 14,
  alignItems: 'center',
  marginTop: 8,
  borderWidth: 1,
  borderColor: 'rgba(196,115,122,0.3)',
},
saveButtonText: {
  color: '#DDA0A7',
  fontSize: 15,
  fontWeight: '600',
},


})

