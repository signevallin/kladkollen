import { Alert, Platform, ... } from 'react-native'
import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { supabase } from '../supabase'

const STYLES = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
const FAVORITE_COLORS = ['Svart', 'Vit', 'Beige', 'Brun', 'Röd', 'Rosa', 'Blå', 'Grön', 'Guld']
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter']

export default function Profile() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [stylePrefs, setStylePrefs] = useState<string[]>([])
  const [colorPrefs, setColorPrefs] = useState<string[]>([])
  const [currentSeason, setCurrentSeason] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setName(data.name || '')
        setAvatar(data.avatar_url || null)
        setStylePrefs(data.style_prefs ? data.style_prefs.split(', ') : [])
        setColorPrefs(data.color_prefs ? data.color_prefs.split(', ') : [])
        setCurrentSeason(data.current_season || '')
      }
    }
  }

  function toggleStyle(s: string) {
    setStylePrefs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function toggleColor(c: string) {
    setColorPrefs(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) {
      const uri = result.assets[0].uri
      setAvatar(uri)
      await uploadAvatar(uri)
    }
  }

  async function uploadAvatar(uri: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const filename = `avatar-${user.id}.jpg`
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    await supabase.storage
      .from('garments')
      .upload(`avatars/${filename}`, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    const { data: urlData } = supabase.storage
      .from('garments')
      .getPublicUrl(`avatars/${filename}`)

    setAvatar(urlData.publicUrl)
  }

  async function saveProfile() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          avatar_url: avatar,
          style_prefs: stylePrefs.join(', '),
          color_prefs: colorPrefs.join(', '),
          current_season: currentSeason,
        })

      if (error) throw error
      Alert.alert('Sparat! 🍒')
      router.back()
    } catch (error: any) {
      Alert.alert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    Alert.alert('Logga ut', 'Är du säker?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logga ut',
        style: 'destructive',
        onPress: async () => {
  await supabase.auth.signOut()
  if (Platform.OS === 'web') {
    window.location.href = '/login'
  } else {
    router.replace('/login')
  }
}
      }
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Min profil</Text>
        {fontsLoaded && (
          <Text style={styles.subtitle}>{email}</Text>
        )}

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>

        {/* Namn */}
        <Text style={styles.label}>Namn</Text>
        <TextInput
          style={styles.input}
          placeholder="Ditt namn"
          placeholderTextColor="rgba(196,115,122,0.5)"
          value={name}
          onChangeText={setName}
        />

        {/* Stilpreferenser */}
        <Text style={styles.label}>Min stil</Text>
        <Text style={styles.hint}>Välj en eller flera</Text>
        <View style={styles.pills}>
          {STYLES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, stylePrefs.includes(s) && styles.pillActive]}
              onPress={() => toggleStyle(s)}
            >
              <Text style={[styles.pillText, stylePrefs.includes(s) && styles.pillTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Favoritfärger */}
        <Text style={styles.label}>Favoritfärger</Text>
        <View style={styles.pills}>
          {FAVORITE_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.pill, colorPrefs.includes(c) && styles.pillActive]}
              onPress={() => toggleColor(c)}
            >
              <Text style={[styles.pillText, colorPrefs.includes(c) && styles.pillTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nuvarande säsong */}
        <Text style={styles.label}>Nuvarande säsong</Text>
        <View style={styles.pills}>
          {SEASONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, currentSeason === s && styles.pillActive]}
              onPress={() => setCurrentSeason(s)}
            >
              <Text style={[styles.pillText, currentSeason === s && styles.pillTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spara */}
        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Sparar...' : 'Spara profil 🍒'}</Text>
        </TouchableOpacity>

        {/* Logga ut */}
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Logga ut</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24 },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#C4737A', fontSize: 15 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FBF3EF',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DancingScript_400Regular',
    fontSize: 18,
    color: '#C4737A',
    marginBottom: 24,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#9E2035',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(122,24,40,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(196,115,122,0.3)',
  },
  avatarEmoji: { fontSize: 40 },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#9E2035',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: { fontSize: 14 },
  label: {
    color: '#FBF3EF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  hint: {
    color: '#C4737A',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#FBF3EF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
    marginBottom: 16,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
  },
  pillActive: {
    backgroundColor: '#9E2035',
    borderColor: '#9E2035',
  },
  pillText: { color: '#C4737A', fontSize: 13 },
  pillTextActive: { color: '#FBF3EF' },
  saveButton: {
    backgroundColor: '#9E2035',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FBF3EF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.3)',
  },
  signOutText: { color: '#C4737A', fontSize: 16 },
})



