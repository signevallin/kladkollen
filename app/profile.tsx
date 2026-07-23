import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, useThemeControl } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { goBack } from '../utils/nav'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'
import { apiPost } from '../utils/api'
import { pickImageSmart } from '../utils/imagePicker'
import { MUSIC_GENRES, OUTFIT_CONTEXTS } from '../utils/constants'
import { cacheClear } from '../utils/cache'

const STYLES = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
// Hur frusen användaren är – justerar hur AI:n tolkar temperaturen vid outfit-förslag.
const COLD_LEVELS = [
  { v: 1, label: 'Alltid varm' },
  { v: 2, label: 'Sällan frusen' },
  { v: 3, label: 'Lagom' },
  { v: 4, label: 'Ofta frusen' },
  { v: 5, label: 'Fryser lätt' },
]
const FAVORITE_COLORS = ['Svart', 'Vit', 'Beige', 'Brun', 'Röd', 'Rosa', 'Blå', 'Grön', 'Guld']
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter']
const STIL_PROFIL = ['Minimal', 'Casual', 'Elegant', 'Sport', 'Bohemisk', 'Streetwear']
const COLOR_PROFILES = ['Varm', 'Kall', 'Neutral']
const LIFESTYLE = ['Kontor', 'Hybridjobb', 'Fritid', 'Träning']

const STRATEGY_LABELS: Record<string, { label: string; emoji: string }> = {
  auktoritet:      { label: 'Auktoritet',      emoji: '' },
  tillganglighet:  { label: 'Tillgänglighet',  emoji: '' },
  kreativitet:     { label: 'Kreativitet',      emoji: '' },
  professionalism: { label: 'Professionalism',  emoji: '' },
}

interface ColorItem { hex: string; namn: string; motivering?: string }
interface ColorAnalysis {
  biologisk: {
    undertone: string; varde: string; intensitet: string; kontrast: string
    hudreaktion: string; svartVitt: string
  }
  palett: {
    bas: ColorItem[]
    kompletterande: ColorItem[]
    accent: ColorItem[]
    undvik: ColorItem[]
  }
  strategi: Record<string, { text: string; farger: string[] }>
  sasong: { sommar: string; vinter: string }
  sammanfattning: string[]
  garderobsAlgoritm: string
}

const THEME_OPTIONS: { key: 'system' | 'light' | 'dark'; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Ljust' },
  { key: 'dark', label: 'Mörkt' },
]

export default function Profile() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { preference, setPreference } = useThemeControl()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [stylePrefs, setStylePrefs] = useState<string[]>([])
  const [colorPrefs, setColorPrefs] = useState<string[]>([])
  const [currentSeason, setCurrentSeason] = useState('')
  const [coldSensitivity, setColdSensitivity] = useState(3)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const [profileTab, setProfileTab] = useState<'profil' | 'stilprofil' | 'farg'>('profil')

  // Stilprofil
  const [stilProfil, setStilProfil] = useState<string[]>([])
  const [fargsatt, setFargsatt] = useState('')
  const [livsstil, setLivsstil] = useState<string[]>([])
  // Kommentar per tillfälle + musikgenrer (används av outfit-AI:n)
  const [contextNotes, setContextNotes] = useState<Record<string, string>>({})
  const [musicGenres, setMusicGenres] = useState<string[]>([])

  // Färganalys
  const [colorAnalysis, setColorAnalysis] = useState<ColorAnalysis | null>(null)
  const [analyzingColor, setAnalyzingColor] = useState(false)
  const [colorSection, setColorSection] = useState<'bio' | 'palett' | 'strategi' | 'sasong'>('bio')
  const [inputMode, setInputMode] = useState<'image' | 'form'>('image')
  const [colorImage, setColorImage] = useState<string | null>(null)
  const [colorBase64, setColorBase64] = useState<string | null>(null)
  const [skinTone, setSkinTone] = useState('')
  const [skinUndertone, setSkinUndertone] = useState('')
  const [hairColor, setHairColor] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [contrastLevel, setContrastLevel] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setName(data.name || '')
        setAvatar(data.avatar_url || null)
        setStylePrefs(data.style_prefs ? data.style_prefs.split(', ') : [])
        setColorPrefs(data.color_prefs ? data.color_prefs.split(', ') : [])
        setCurrentSeason(data.current_season || '')
        if (data.cold_sensitivity != null) setColdSensitivity(data.cold_sensitivity)
        if (data.color_analysis) setColorAnalysis(data.color_analysis)
        if (data.skin_tone) setSkinTone(data.skin_tone)
        if (data.skin_undertone) setSkinUndertone(data.skin_undertone)
        if (data.hair_color) setHairColor(data.hair_color)
        if (data.eye_color) setEyeColor(data.eye_color)
        if (data.contrast_level) setContrastLevel(data.contrast_level)
        if (data.stil_profil) setStilProfil(data.stil_profil.split(', ').filter(Boolean))
        if (data.fargsatt) setFargsatt(data.fargsatt)
        if (data.livsstil) setLivsstil(data.livsstil.split(', ').filter(Boolean))
        if (data.outfit_context_notes) setContextNotes(data.outfit_context_notes)
        if (data.music_genres) setMusicGenres(data.music_genres.split(', ').filter(Boolean))
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
    const result = await pickImageSmart({
      mediaTypes: ['images'] as any,
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
    await supabase.storage.from('garments').upload(`avatars/${filename}`, uint8Array, {
      contentType: 'image/jpeg', upsert: true,
    })
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(`avatars/${filename}`)
    setAvatar(urlData.publicUrl)
  }

  async function pickColorImage() {
    const result = await pickImageSmart({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      base64: true,
      quality: 0.7,
    })
    if (!result.canceled) {
      setColorImage(result.assets[0].uri)
      setColorBase64(result.assets[0].base64 || null)
    }
  }

  async function analyzeColor() {
    if (inputMode === 'image' && !colorBase64) {
      showAlert('Ladda upp en bild för att analysera din färgprofil')
      return
    }
    if (inputMode === 'form' && (!skinTone || !skinUndertone || !hairColor || !eyeColor || !contrastLevel)) {
      showAlert('Fyll i alla fält för att analysera din färgprofil')
      return
    }
    setAnalyzingColor(true)
    try {
      const parsed: ColorAnalysis = inputMode === 'image'
        ? await apiPost('/api/analyze-color', { base64: colorBase64 })
        : await apiPost('/api/analyze-color-form', { skinTone, skinUndertone, hairColor, eyeColor, contrastLevel })
      setColorAnalysis(parsed)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          color_analysis: parsed,
          ...(inputMode === 'form' && {
            skin_tone: skinTone,
            skin_undertone: skinUndertone,
            hair_color: hairColor,
            eye_color: eyeColor,
            contrast_level: contrastLevel,
          }),
        }).eq('id', user.id)
      }
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setAnalyzingColor(false)
    }
  }

  async function saveProfile() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        name,
        avatar_url: avatar,
        style_prefs: stylePrefs.join(', '),
        color_prefs: colorPrefs.join(', '),
        current_season: currentSeason,
        cold_sensitivity: coldSensitivity,
        stil_profil: stilProfil.join(', '),
        fargsatt,
        livsstil: livsstil.join(', '),
        outfit_context_notes: contextNotes,
        music_genres: musicGenres.join(', '),
      })
      if (error) throw error
      showAlert('Sparat!')
      goBack('/home')
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    showConfirm('Logga ut', 'Är du säker?', async () => {
      cacheClear()
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      } else {
        router.replace('/login')
      }
    }, 'Logga ut', true)
  }

  async function deleteAccount() {
    showConfirm(
      'Radera konto',
      'Detta raderar ditt konto och ALL din data permanent – plagg, outfits, bilder och profil. Det går inte att ångra. Är du helt säker?',
      async () => {
        try {
          await apiPost('/api/delete-account', {})
          cacheClear()
          await supabase.auth.signOut()
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          } else {
            router.replace('/login')
          }
        } catch (e: any) {
          showAlert('Något gick fel', e.message)
        }
      },
      'Radera permanent',
      true
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => goBack('/home')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Gå tillbaka"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Min profil</Text>

        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} accessibilityLabel="Byt profilbild" accessibilityRole="button">
          {avatar
            ? <SignedImage path={avatar} style={styles.avatar} resizeMode="cover" />
            : <View style={styles.avatarPlaceholder}><MaterialIcons name="person" size={44} color={t.textSecondary} /></View>
          }
          <View style={styles.avatarBadge}><MaterialIcons name="photo-camera" size={16} color={t.onPrimary} /></View>
        </TouchableOpacity>

        {/* Flikar */}
        <View style={styles.profileTabRow}>
          {(['profil', 'stilprofil', 'farg'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.profileTab, profileTab === tab && styles.profileTabActive]}
              onPress={() => setProfileTab(tab)}
            >
              <Text style={[styles.profileTabText, profileTab === tab && styles.profileTabTextActive]}>
                {tab === 'profil' ? 'Profil' : tab === 'stilprofil' ? 'Stilprofil' : 'Färg'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {profileTab === 'profil' && <>
        <Text style={styles.label}>Namn</Text>
        <TextInput
          style={styles.input}
          placeholder="Ditt namn"
          placeholderTextColor={t.placeholder}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Min stil</Text>
        <Text style={styles.hint}>Välj en eller flera</Text>
        <View style={styles.pills}>
          {STYLES.map(s => (
            <TouchableOpacity key={s} style={[styles.pill, stylePrefs.includes(s) && styles.pillActive]} onPress={() => toggleStyle(s)}>
              <Text style={[styles.pillText, stylePrefs.includes(s) && styles.pillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Favoritfärger</Text>
        <View style={styles.pills}>
          {FAVORITE_COLORS.map(c => (
            <TouchableOpacity key={c} style={[styles.pill, colorPrefs.includes(c) && styles.pillActive]} onPress={() => toggleColor(c)}>
              <Text style={[styles.pillText, colorPrefs.includes(c) && styles.pillTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nuvarande säsong</Text>
        <View style={styles.pills}>
          {SEASONS.map(s => (
            <TouchableOpacity key={s} style={[styles.pill, currentSeason === s && styles.pillActive]} onPress={() => setCurrentSeason(s)}>
              <Text style={[styles.pillText, currentSeason === s && styles.pillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Hur frusen är du?</Text>
        <Text style={styles.hint}>Påverkar hur mycket AI:n tar hänsyn till vädret – fryser du lätt föreslås varmare lager.</Text>
        <View style={styles.pills}>
          {COLD_LEVELS.map(l => (
            <TouchableOpacity key={l.v} style={[styles.pill, coldSensitivity === l.v && styles.pillActive]} onPress={() => setColdSensitivity(l.v)}>
              <Text style={[styles.pillText, coldSensitivity === l.v && styles.pillTextActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Sparar...' : 'Spara profil'}</Text>
        </TouchableOpacity>
        </>}

        {/* STILPROFIL */}
        {profileTab === 'stilprofil' && (
          <View style={styles.stilprofilSection}>

            <Text style={styles.label}>Stilriktning</Text>
            <Text style={styles.hint}>Välj en eller flera</Text>
            <View style={styles.pills}>
              {STIL_PROFIL.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, stilProfil.includes(s) && styles.pillActive]}
                  onPress={() => setStilProfil(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                >
                  <Text style={[styles.pillText, stilProfil.includes(s) && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Färgprofil</Text>
            <View style={styles.pills}>
              {COLOR_PROFILES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, fargsatt === c && styles.pillActive]}
                  onPress={() => setFargsatt(prev => prev === c ? '' : c)}
                >
                  <Text style={[styles.pillText, fargsatt === c && styles.pillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Livsstil</Text>
            <Text style={styles.hint}>Välj en eller flera</Text>
            <View style={styles.pills}>
              {LIFESTYLE.map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.pill, livsstil.includes(l) && styles.pillActive]}
                  onPress={() => setLivsstil(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])}
                >
                  <Text style={[styles.pillText, livsstil.includes(l) && styles.pillTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kommentar per tillfälle – väger in i outfit-genereringen */}
            <Text style={styles.label}>Kommentar per tillfälle</Text>
            <Text style={styles.hint}>Skriv en egen instruktion för varje tillfälle – AI:n tar hänsyn till den när den matchar outfiten</Text>
            {OUTFIT_CONTEXTS.map(ctx => (
              <View key={ctx.label} style={styles.contextNoteGroup}>
                <Text style={styles.contextNoteLabel}>{ctx.label}</Text>
                <TextInput
                  style={styles.contextNoteInput}
                  placeholder={`T.ex. "gärna kjol", "aldrig klänning", "mycket färg"...`}
                  placeholderTextColor={t.placeholder}
                  value={contextNotes[ctx.label] || ''}
                  onChangeText={text => setContextNotes(prev => ({ ...prev, [ctx.label]: text }))}
                  multiline
                />
              </View>
            ))}

            {/* Musikgenrer – AI:n väljer låtar ur dessa */}
            <Text style={styles.label}>Musikgenrer</Text>
            <Text style={styles.hint}>Välj en eller flera – outfitens låtförslag hämtas ur dina genrer</Text>
            <View style={styles.pills}>
              {MUSIC_GENRES.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.pill, musicGenres.includes(g) && styles.pillActive]}
                  onPress={() => setMusicGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                >
                  <Text style={[styles.pillText, musicGenres.includes(g) && styles.pillTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generated style profile card */}
            {(stilProfil.length > 0 || fargsatt || livsstil.length > 0) && (
              <View style={styles.stilprofilCard}>
                <Text style={styles.stilprofilCardLabel}>Din stilprofil</Text>
                {stilProfil.length > 0 && (
                  <View style={styles.stilprofilRow}>
                    <Text style={styles.stilprofilValue}>{stilProfil.join(' · ')}</Text>
                  </View>
                )}
                {fargsatt !== '' && (
                  <View style={styles.stilprofilRow}>
                    <Text style={styles.stilprofilValue}>{fargsatt} färgpalett</Text>
                  </View>
                )}
                {livsstil.length > 0 && (
                  <View style={styles.stilprofilRow}>
                    <Text style={styles.stilprofilValue}>{livsstil.join(' · ')}</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
              <Text style={styles.saveButtonText}>{loading ? 'Sparar...' : 'Spara stilprofil'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {profileTab === 'farg' && <View style={styles.colorSection}>
          <Text style={styles.colorTitle}>Färganalys</Text>
          <Text style={styles.colorSubtitle}>
            {colorAnalysis ? 'Din personliga färgprofil' : 'Ladda upp en bild eller fyll i formuläret'}
          </Text>

          {/* Toggle bild / formulär */}
          <View style={styles.inputModeRow}>
            {(['image', 'form'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.inputModeBtn, inputMode === mode && styles.inputModeBtnActive]}
                onPress={() => setInputMode(mode)}
              >
                <Text style={[styles.inputModeBtnText, inputMode === mode && styles.inputModeBtnTextActive]}>
                  {mode === 'image' ? 'Ladda upp bild' : 'Fyll i formulär'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bilduppladdning */}
          {inputMode === 'image' && (
            <TouchableOpacity style={styles.colorUploadZone} onPress={pickColorImage}>
              {colorImage
                ? <Image source={{ uri: colorImage }} style={styles.colorUploadPreview} resizeMode="cover" />
                : <>
                    <Text style={styles.colorUploadText}>Tryck för att välja bild</Text>
                    <Text style={styles.colorUploadHint}>Helst ett foto i naturligt ljus</Text>
                  </>
              }
            </TouchableOpacity>
          )}

          {/* Formulär */}
          {inputMode === 'form' && (
            <View>
              {[
                { label: 'Hudton', value: skinTone, set: setSkinTone, options: ['Ljus', 'Ljus-medium', 'Medium', 'Medium-mörk', 'Mörk'] },
                { label: 'Undertone', value: skinUndertone, set: setSkinUndertone, options: ['Varm', 'Neutral-varm', 'Neutral', 'Neutral-kall', 'Kall'] },
                { label: 'Hårfärg', value: hairColor, set: setHairColor, options: ['Svart', 'Mörkbrun', 'Mellanbrun', 'Ljusbrun', 'Blond', 'Röd/Auburn', 'Grå/Silver'] },
                { label: 'Ögonfärg', value: eyeColor, set: setEyeColor, options: ['Mörkbrun', 'Mellanbrun', 'Hasselnöt', 'Grön', 'Blå', 'Grå'] },
                { label: 'Kontrast (hud vs hår)', value: contrastLevel, set: setContrastLevel, options: ['Låg', 'Medel', 'Hög'] },
              ].map(field => (
                <View key={field.label} style={styles.colorFormGroup}>
                  <Text style={styles.colorFormLabel}>{field.label}</Text>
                  <View style={styles.colorFormPills}>
                    {field.options.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.colorFormPill, field.value === opt && styles.colorFormPillActive]}
                        onPress={() => field.set(opt)}
                      >
                        <Text style={[styles.colorFormPillText, field.value === opt && styles.colorFormPillTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.analyzeBtn, (inputMode === 'image' ? !colorBase64 : (!skinTone || !skinUndertone || !hairColor || !eyeColor || !contrastLevel)) && styles.analyzeBtnDisabled]}
            onPress={analyzeColor}
            disabled={analyzingColor || (inputMode === 'image' ? !colorBase64 : (!skinTone || !skinUndertone || !hairColor || !eyeColor || !contrastLevel))}
          >
            {analyzingColor
              ? <><ActivityIndicator color={t.onPrimary} size="small" /><Text style={styles.analyzeBtnText}> Analyserar...</Text></>
              : <Text style={styles.analyzeBtnText}>{colorAnalysis ? 'Analysera igen' : 'Analysera färgprofil'}</Text>
            }
          </TouchableOpacity>

          {/* Results */}
          {colorAnalysis && (
            <View style={styles.colorResults}>

              {/* Bio chips */}
              <View style={styles.bioChips}>
                {[
                  { label: 'Undertone', value: colorAnalysis.biologisk.undertone },
                  { label: 'Värde',     value: colorAnalysis.biologisk.varde },
                  { label: 'Intensitet',value: colorAnalysis.biologisk.intensitet },
                  { label: 'Kontrast',  value: colorAnalysis.biologisk.kontrast },
                ].map(chip => (
                  <View key={chip.label} style={styles.bioChip}>
                    <Text style={styles.bioChipLabel}>{chip.label.toUpperCase()}</Text>
                    <Text style={styles.bioChipValue}>{chip.value}</Text>
                  </View>
                ))}
              </View>

              {/* Tab nav */}
              <View style={styles.colorTabRow}>
                {(['bio', 'palett', 'strategi', 'sasong'] as const).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.colorTab, colorSection === tab && styles.colorTabActive]}
                    onPress={() => setColorSection(tab)}
                  >
                    <Text style={[styles.colorTabText, colorSection === tab && styles.colorTabTextActive]}>
                      {tab === 'bio' ? 'Analys' : tab === 'palett' ? 'Palett' : tab === 'strategi' ? 'Stil' : 'Säsong'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* BIO tab */}
              {colorSection === 'bio' && (
                <View style={styles.tabContent}>
                  <View style={styles.bioCard}>
                    <Text style={styles.bioCardTitle}>Hudreaktion</Text>
                    <Text style={styles.bioCardText}>{colorAnalysis.biologisk.hudreaktion}</Text>
                  </View>
                  <View style={styles.bioCard}>
                    <Text style={styles.bioCardTitle}>Svart & kritvitt</Text>
                    <Text style={styles.bioCardText}>{colorAnalysis.biologisk.svartVitt}</Text>
                  </View>
                  {colorAnalysis.sammanfattning.length > 0 && (
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryTitle}>Sammanfattning</Text>
                      {colorAnalysis.sammanfattning.map((punkt, i) => (
                        <View key={i} style={styles.summaryRow}>
                          <View style={styles.summaryDot} />
                          <Text style={styles.summaryText}>{punkt}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* PALETT tab */}
              {colorSection === 'palett' && (
                <View style={styles.tabContent}>
                  {([
                    { key: 'bas',            label: 'Basfärger',          items: colorAnalysis.palett.bas },
                    { key: 'kompletterande', label: 'Kompletterande',      items: colorAnalysis.palett.kompletterande },
                    { key: 'accent',         label: 'Accenter',            items: colorAnalysis.palett.accent },
                    { key: 'undvik',         label: 'Undvik nära ansiktet',items: colorAnalysis.palett.undvik },
                  ] as { key: string; label: string; items: ColorItem[] }[]).map(group => (
                    <View key={group.key} style={styles.paletteGroup}>
                      <Text style={styles.paletteGroupLabel}>
                        {group.key === 'undvik' ? '' : '✓ '}{group.label}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.swatchRow}>
                          {group.items.map((item, i) => (
                            <View key={i} style={styles.swatchWrap}>
                              <View style={[styles.swatch, { backgroundColor: item.hex }, group.key === 'undvik' && styles.swatchAvoid]}>
                                {group.key === 'undvik' && <Text style={styles.swatchX}>✕</Text>}
                              </View>
                              <Text style={styles.swatchHex}>{item.hex}</Text>
                              <Text style={styles.swatchName} numberOfLines={1}>{item.namn}</Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  ))}
                </View>
              )}

              {/* STRATEGI tab */}
              {colorSection === 'strategi' && (
                <View style={styles.tabContent}>
                  {Object.entries(colorAnalysis.strategi).map(([key, val]) => {
                    const meta = STRATEGY_LABELS[key] || { label: key, emoji: '' }
                    return (
                      <View key={key} style={styles.strategiCard}>
                        <View style={styles.strategiHeader}>
                          <Text style={styles.strategiEmoji}>{meta.emoji}</Text>
                          <Text style={styles.strategiLabel}>{meta.label}</Text>
                          <View style={styles.strategiSwatches}>
                            {val.farger.slice(0, 4).map((hex, i) => (
                              <View key={i} style={[styles.strategiSwatch, { backgroundColor: hex }]} />
                            ))}
                          </View>
                        </View>
                        <Text style={styles.strategiText}>{val.text}</Text>
                      </View>
                    )
                  })}
                </View>
              )}

              {/* SÄSONG tab */}
              {colorSection === 'sasong' && (
                <View style={styles.tabContent}>
                  <View style={styles.sasongsCard}>
                    <Text style={styles.sasongsTitle}>Sommar</Text>
                    <Text style={styles.sasongsText}>{colorAnalysis.sasong.sommar}</Text>
                  </View>
                  <View style={styles.sasongsCard}>
                    <Text style={styles.sasongsTitle}>Vinter</Text>
                    <Text style={styles.sasongsText}>{colorAnalysis.sasong.vinter}</Text>
                  </View>
                  {colorAnalysis.garderobsAlgoritm && (
                    <View style={styles.algoritmCard}>
                      <Text style={styles.algoritmTitle}>Garderobsalgoritm</Text>
                      <Text style={styles.algoritmText}>{colorAnalysis.garderobsAlgoritm}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>}

        <Text style={styles.themeLabel}>Utseende</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.themeOption, preference === opt.key && styles.themeOptionActive]}
              onPress={() => setPreference(opt.key)}
              accessibilityLabel={`Tema: ${opt.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: preference === opt.key }}
            >
              <Text style={[styles.themeOptionText, preference === opt.key && styles.themeOptionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/locations')}>
          <MaterialIcons name="place" size={20} color={t.textSecondary} />
          <Text style={styles.linkRowText}>Egna platser</Text>
          <MaterialIcons name="chevron-right" size={22} color={t.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/notifications')}>
          <MaterialIcons name="notifications-none" size={20} color={t.textSecondary} />
          <Text style={styles.linkRowText}>Notiser</Text>
          <MaterialIcons name="chevron-right" size={22} color={t.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/stats')}>
          <MaterialIcons name="bar-chart" size={20} color={t.textSecondary} />
          <Text style={styles.linkRowText}>Statistik</Text>
          <MaterialIcons name="chevron-right" size={22} color={t.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Logga ut</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={deleteAccount}>
          <Text style={styles.deleteAccountText}>Radera konto permanent</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 24 },
  avatarContainer: { alignSelf: 'center', marginBottom: 28 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: t.primary },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.border },
  avatarEmoji: { fontFamily: 'Lora_400Regular', fontSize: 40 },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: t.primary, borderRadius: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  avatarBadgeText: { fontFamily: 'Lora_400Regular', fontSize: 14 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 8, marginTop: 8 },
  hint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 11, fontStyle: 'italic', marginBottom: 8, marginTop: -4 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  saveButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  saveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },

  profileTabRow: { flexDirection: 'row', gap: 8, marginBottom: 24, marginTop: 4 },
  profileTab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  profileTabActive: { backgroundColor: t.primary, borderColor: t.primary },
  profileTabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  profileTabTextActive: { color: t.onPrimary, fontWeight: '700' },

  // ── Stilprofil ──
  stilprofilSection: { marginBottom: 24 },
  contextNoteGroup: { marginBottom: 12 },
  contextNoteLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary, marginBottom: 6 },
  contextNoteInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 12, color: t.textPrimary, fontSize: 14, borderWidth: 1, borderColor: t.border, minHeight: 44 },
  stilprofilCard: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border, gap: 10 },
  stilprofilCardLabel: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: t.textSecondary, letterSpacing: 1, marginBottom: 4 },
  stilprofilRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stilprofilEmoji: { fontFamily: 'Lora_400Regular', fontSize: 16, width: 24 },
  stilprofilValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, flex: 1 },

  // ── Färganalys ──
  colorSection: { marginBottom: 24 },
  colorTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: t.textPrimary, marginBottom: 4 },
  colorSubtitle: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginBottom: 16, fontStyle: 'italic' },

  inputModeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  inputModeBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  inputModeBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  inputModeBtnText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  inputModeBtnTextActive: { color: t.onPrimary, fontWeight: '700' },

  colorUploadZone: { borderRadius: 16, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', backgroundColor: t.surfaceMuted },
  colorUploadPreview: { width: '100%', height: '100%' },
  colorUploadIcon: { fontFamily: 'Lora_400Regular', fontSize: 36, marginBottom: 8 },
  colorUploadText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  colorUploadHint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 11, marginTop: 4 },

  colorFormGroup: { marginBottom: 12 },
  colorFormLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 8 },
  colorFormPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorFormPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  colorFormPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  colorFormPillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  colorFormPillTextActive: { color: t.onPrimary, fontWeight: '600' },

  analyzeBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },

  colorResults: { gap: 14 },

  bioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bioChip: { backgroundColor: t.surfaceMuted, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: t.border, minWidth: '45%', flex: 1 },
  bioChipLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.textSecondary, letterSpacing: 1.5, marginBottom: 2 },
  bioChipValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, textTransform: 'capitalize' },

  colorTabRow: { flexDirection: 'row', gap: 6 },
  colorTab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  colorTabActive: { backgroundColor: t.primary, borderColor: t.primary },
  colorTabText: { fontFamily: 'Lora_500Medium', fontSize: 12, color: t.textSecondary },
  colorTabTextActive: { color: t.onPrimary, fontWeight: '700' },

  tabContent: { gap: 12 },

  bioCard: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border },
  bioCardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  bioCardText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 20 },

  summaryCard: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  summaryTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  summaryDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: t.textSecondary, marginTop: 7, flexShrink: 0 },
  summaryText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 20, flex: 1 },

  paletteGroup: { gap: 8 },
  paletteGroupLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5 },
  swatchRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  swatchWrap: { alignItems: 'center', gap: 4, width: 56 },
  swatch: { width: 48, height: 48, borderRadius: 12 },
  swatchAvoid: { opacity: 0.7 },
  swatchX: { fontFamily: 'Poppins_700Bold', position: 'absolute', color: 'rgba(255,255,255,0.9)', fontSize: 18, textAlign: 'center', lineHeight: 48, width: 48 },
  swatchHex: { fontSize: 9, color: t.textSecondary, fontFamily: 'monospace' },
  swatchName: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textFaint, textAlign: 'center', width: 56 },

  strategiCard: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  strategiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strategiEmoji: { fontFamily: 'Lora_400Regular', fontSize: 18 },
  strategiLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, flex: 1 },
  strategiSwatches: { flexDirection: 'row', gap: 4 },
  strategiSwatch: { width: 20, height: 20, borderRadius: 10 },
  strategiText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },

  sasongsCard: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: t.border },
  sasongsIcon: { fontFamily: 'Lora_400Regular', fontSize: 22 },
  sasongsTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  sasongsText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },

  algoritmCard: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  algoritmTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  algoritmText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, lineHeight: 18, fontStyle: 'italic' },

  themeLabel: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 8, marginTop: 8 },
  themeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  themeOption: { flex: 1, paddingVertical: 12, borderRadius: t.radius.md, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  themeOptionActive: { backgroundColor: t.primary, borderColor: t.primary },
  themeOptionText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 13 },
  themeOptionTextActive: { color: t.onPrimary },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
  linkRowText: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  signOutButton: { borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  signOutText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 16 },
  deleteAccountButton: { marginTop: 12, padding: 12, alignItems: 'center' },
  deleteAccountText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, textDecorationLine: 'underline' },
})
