import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
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
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'

const STYLES = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
const FAVORITE_COLORS = ['Svart', 'Vit', 'Beige', 'Brun', 'Röd', 'Rosa', 'Blå', 'Grön', 'Guld']
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter']

const STRATEGY_LABELS: Record<string, { label: string; emoji: string }> = {
  auktoritet:      { label: 'Auktoritet',      emoji: '👑' },
  tillganglighet:  { label: 'Tillgänglighet',  emoji: '🤝' },
  kreativitet:     { label: 'Kreativitet',      emoji: '🎨' },
  professionalism: { label: 'Professionalism',  emoji: '💼' },
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

export default function Profile() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [stylePrefs, setStylePrefs] = useState<string[]>([])
  const [colorPrefs, setColorPrefs] = useState<string[]>([])
  const [currentSeason, setCurrentSeason] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

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
        if (data.color_analysis) setColorAnalysis(data.color_analysis)
        if (data.skin_tone) setSkinTone(data.skin_tone)
        if (data.skin_undertone) setSkinUndertone(data.skin_undertone)
        if (data.hair_color) setHairColor(data.hair_color)
        if (data.eye_color) setEyeColor(data.eye_color)
        if (data.contrast_level) setContrastLevel(data.contrast_level)
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
    const result = await ImagePicker.launchImageLibraryAsync({
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
      let text: string | null = null

      if (inputMode === 'image') {
        // Gemini Vision
        const prompt = `Du är en professionell färgkonsult. Analysera färgerna i bilden och generera en detaljerad färgpalett.

STEG 1 – Färgtonanalys:
Identifiera undertone (varm/kall/neutral), värde (ljust/mörkt), intensitet och kontrastnivå mellan hud och hår. Beskriv hur mörka och ljusa neutraler fungerar för denna profil.

STEG 2 – Optimal färgriktning:
Ge 5 basfärger, 5 kompletterande färger, 3 accentfärger och 5 färger att undvika nära ansiktet – alla med hex-koder och kortfattad motivering.

STEG 3 – Strategisk stilanalys:
Ge konkreta färgkombinationer (hex) som signalerar: Auktoritet, Tillgänglighet, Kreativitet, Professionalism.

STEG 4 – Säsongsanpassning:
Beskriv hur paletten justeras för sommar (ljusare) och vinter (djupare kontrast).

Svara ENDAST med JSON, inga backticks:
{
  "biologisk": {
    "undertone": "...",
    "varde": "...",
    "intensitet": "...",
    "kontrast": "...",
    "hudreaktion": "...",
    "svartVitt": "..."
  },
  "palett": {
    "bas": [{"hex":"#...","namn":"...","motivering":"..."}],
    "kompletterande": [{"hex":"#...","namn":"...","motivering":"..."}],
    "accent": [{"hex":"#...","namn":"...","motivering":"..."}],
    "undvik": [{"hex":"#...","namn":"..."}]
  },
  "strategi": {
    "auktoritet": {"text":"...","farger":["#...","#..."]},
    "tillganglighet": {"text":"...","farger":["#...","#..."]},
    "kreativitet": {"text":"...","farger":["#...","#..."]},
    "professionalism": {"text":"...","farger":["#...","#..."]}
  },
  "sasong": {
    "sommar": "...",
    "vinter": "..."
  },
  "sammanfattning": ["punkt1","punkt2","punkt3","punkt4","punkt5"],
  "garderobsAlgoritm": "..."
}`
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: colorBase64 } },
              ]}],
              generationConfig: { maxOutputTokens: 4096 },
            }),
          }
        )
        const geminiData = await geminiRes.json()
        if (geminiData.error) throw new Error(`Gemini: ${geminiData.error.message || JSON.stringify(geminiData.error)}`)
        text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error(`Gemini returnerade inget svar. Raw: ${JSON.stringify(geminiData).slice(0, 300)}`)
      } else {
        // GPT-4o text
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{
              role: 'user',
              content: `Du är en professionell färgkonsult. Generera en detaljerad färgpalett baserat på följande färgprofil:

Hudton: ${skinTone}
Undertone: ${skinUndertone}
Hårfärg: ${hairColor}
Ögonfärg: ${eyeColor}
Kontrastnivå (hud vs hår): ${contrastLevel}

STEG 1 – Färgtonanalys:
Bekräfta undertone, värde, intensitet och kontrastnivå. Beskriv hur mörka och ljusa neutraler fungerar för denna profil, och hur svart/kritvitt upplevs.

STEG 2 – Optimal färgriktning:
Ge 5 basfärger, 5 kompletterande färger, 3 accentfärger och 5 färger att undvika nära ansiktet – alla med hex-koder och kortfattad motivering.

STEG 3 – Strategisk stilanalys:
Ge konkreta färgkombinationer (hex) som signalerar: Auktoritet, Tillgänglighet, Kreativitet, Professionalism i digitala möten.

STEG 4 – Säsongsanpassning:
Beskriv hur paletten justeras för sommar (ljusare) och vinter (djupare kontrast).

Svara ENDAST med JSON, inga backticks:
{
  "biologisk": {
    "undertone": "...",
    "varde": "...",
    "intensitet": "...",
    "kontrast": "...",
    "hudreaktion": "...",
    "svartVitt": "..."
  },
  "palett": {
    "bas": [{"hex":"#...","namn":"...","motivering":"..."}],
    "kompletterande": [{"hex":"#...","namn":"...","motivering":"..."}],
    "accent": [{"hex":"#...","namn":"...","motivering":"..."}],
    "undvik": [{"hex":"#...","namn":"..."}]
  },
  "strategi": {
    "auktoritet": {"text":"...","farger":["#...","#..."]},
    "tillganglighet": {"text":"...","farger":["#...","#..."]},
    "kreativitet": {"text":"...","farger":["#...","#..."]},
    "professionalism": {"text":"...","farger":["#...","#..."]}
  },
  "sasong": {
    "sommar": "...",
    "vinter": "..."
  },
  "sammanfattning": ["punkt1","punkt2","punkt3","punkt4","punkt5"],
  "garderobsAlgoritm": "..."
}`,
          }],
          max_tokens: 4096,
        }),
        })
        const data = await response.json()
        if (data.error) throw new Error(data.error.message || 'API-fel')
        text = data.choices?.[0]?.message?.content
      }

      if (!text) throw new Error('Tomt svar från AI')
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('AI returnerade ogiltigt svar')
      const parsed: ColorAnalysis = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
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
      })
      if (error) throw error
      showAlert('Sparat! 🍒')
      router.back()
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    showConfirm('Logga ut', 'Är du säker?', async () => {
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      } else {
        router.replace('/login')
      }
    }, 'Logga ut', true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Min profil</Text>
        {fontsLoaded && <Text style={styles.subtitle}>{email}</Text>}

        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
          {avatar
            ? <Image source={{ uri: avatar }} style={styles.avatar} />
            : <View style={styles.avatarPlaceholder}><Text style={styles.avatarEmoji}>👤</Text></View>
          }
          <View style={styles.avatarBadge}><Text style={styles.avatarBadgeText}>📷</Text></View>
        </TouchableOpacity>

        <Text style={styles.label}>Namn</Text>
        <TextInput
          style={styles.input}
          placeholder="Ditt namn"
          placeholderTextColor="rgba(196,115,122,0.5)"
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

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Sparar...' : 'Spara profil 🍒'}</Text>
        </TouchableOpacity>

        {/* ─── FÄRGANALYS ─── */}
        <View style={styles.colorSection}>
          <Text style={styles.colorTitle}>🎨 Färganalys</Text>
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
                  {mode === 'image' ? '📷 Ladda upp bild' : '✏️ Fyll i formulär'}
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
                    <Text style={styles.colorUploadIcon}>📸</Text>
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
              ? <><ActivityIndicator color="#FBF3EF" size="small" /><Text style={styles.analyzeBtnText}> Analyserar...</Text></>
              : <Text style={styles.analyzeBtnText}>✨ {colorAnalysis ? 'Analysera igen' : 'Analysera färgprofil'}</Text>
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
                        {group.key === 'undvik' ? '🚫 ' : '✓ '}{group.label}
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
                    const meta = STRATEGY_LABELS[key] || { label: key, emoji: '🎯' }
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
                    <Text style={styles.sasongsIcon}>🌞</Text>
                    <Text style={styles.sasongsTitle}>Sommar</Text>
                    <Text style={styles.sasongsText}>{colorAnalysis.sasong.sommar}</Text>
                  </View>
                  <View style={styles.sasongsCard}>
                    <Text style={styles.sasongsIcon}>❄️</Text>
                    <Text style={styles.sasongsTitle}>Vinter</Text>
                    <Text style={styles.sasongsText}>{colorAnalysis.sasong.vinter}</Text>
                  </View>
                  {colorAnalysis.garderobsAlgoritm && (
                    <View style={styles.algoritmCard}>
                      <Text style={styles.algoritmTitle}>🤖 Garderobsalgoritm</Text>
                      <Text style={styles.algoritmText}>{colorAnalysis.garderobsAlgoritm}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Logga ut</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#C4737A', fontSize: 15 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FBF3EF', marginBottom: 4 },
  subtitle: { fontFamily: 'DancingScript_400Regular', fontSize: 18, color: '#C4737A', marginBottom: 24 },
  avatarContainer: { alignSelf: 'center', marginBottom: 28 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#9E2035' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(196,115,122,0.3)' },
  avatarEmoji: { fontSize: 40 },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#9E2035', borderRadius: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  avatarBadgeText: { fontSize: 14 },
  label: { color: '#FBF3EF', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  hint: { color: '#C4737A', fontSize: 11, fontStyle: 'italic', marginBottom: 8, marginTop: -4 },
  input: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 14, color: '#FBF3EF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', marginBottom: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  pillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  pillText: { color: '#C4737A', fontSize: 13 },
  pillTextActive: { color: '#FBF3EF' },
  saveButton: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  saveButtonText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },

  // ── Färganalys ──
  colorSection: { borderTopWidth: 1, borderTopColor: 'rgba(196,115,122,0.15)', paddingTop: 24, marginTop: 12, marginBottom: 24 },
  colorTitle: { fontSize: 22, fontWeight: 'bold', color: '#FBF3EF', marginBottom: 4 },
  colorSubtitle: { fontSize: 13, color: '#C4737A', marginBottom: 16, fontStyle: 'italic' },

  inputModeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  inputModeBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  inputModeBtnActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  inputModeBtnText: { color: '#C4737A', fontSize: 13, fontWeight: '500' },
  inputModeBtnTextActive: { color: '#FBF3EF', fontWeight: '700' },

  colorUploadZone: { borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(196,115,122,0.3)', borderStyle: 'dashed', height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', backgroundColor: 'rgba(122,24,40,0.15)' },
  colorUploadPreview: { width: '100%', height: '100%' },
  colorUploadIcon: { fontSize: 36, marginBottom: 8 },
  colorUploadText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },
  colorUploadHint: { color: '#C4737A', fontSize: 11, marginTop: 4 },

  colorFormGroup: { marginBottom: 12 },
  colorFormLabel: { fontSize: 12, color: '#C4737A', fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  colorFormPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorFormPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  colorFormPillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  colorFormPillText: { color: '#C4737A', fontSize: 12 },
  colorFormPillTextActive: { color: '#FBF3EF', fontWeight: '600' },

  analyzeBtn: { backgroundColor: '#9E2035', borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { color: '#FBF3EF', fontSize: 15, fontWeight: '600' },

  colorResults: { gap: 14 },

  bioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bioChip: { backgroundColor: 'rgba(122,24,40,0.4)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', minWidth: '45%', flex: 1 },
  bioChipLabel: { fontSize: 9, color: '#C4737A', letterSpacing: 1.5, fontWeight: '600', marginBottom: 2 },
  bioChipValue: { fontSize: 14, color: '#FBF3EF', fontWeight: '600', textTransform: 'capitalize' },

  colorTabRow: { flexDirection: 'row', gap: 6 },
  colorTab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.3)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  colorTabActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  colorTabText: { fontSize: 11, color: '#C4737A', fontWeight: '500' },
  colorTabTextActive: { color: '#FBF3EF', fontWeight: '700' },

  tabContent: { gap: 12 },

  bioCard: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  bioCardTitle: { fontSize: 12, color: '#C4737A', fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  bioCardText: { fontSize: 13, color: '#FBF3EF', lineHeight: 20 },

  summaryCard: { backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  summaryTitle: { fontSize: 12, color: '#C4737A', fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  summaryDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#C4737A', marginTop: 7, flexShrink: 0 },
  summaryText: { fontSize: 13, color: '#FBF3EF', lineHeight: 20, flex: 1 },

  paletteGroup: { gap: 8 },
  paletteGroupLabel: { fontSize: 12, color: '#C4737A', fontWeight: '600', letterSpacing: 0.5 },
  swatchRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  swatchWrap: { alignItems: 'center', gap: 4, width: 56 },
  swatch: { width: 48, height: 48, borderRadius: 12 },
  swatchAvoid: { opacity: 0.7 },
  swatchX: { position: 'absolute', color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 'bold', textAlign: 'center', lineHeight: 48, width: 48 },
  swatchHex: { fontSize: 9, color: '#C4737A', fontFamily: 'monospace' },
  swatchName: { fontSize: 9, color: 'rgba(196,115,122,0.7)', textAlign: 'center', width: 56 },

  strategiCard: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  strategiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strategiEmoji: { fontSize: 18 },
  strategiLabel: { fontSize: 14, color: '#FBF3EF', fontWeight: '600', flex: 1 },
  strategiSwatches: { flexDirection: 'row', gap: 4 },
  strategiSwatch: { width: 20, height: 20, borderRadius: 10 },
  strategiText: { fontSize: 13, color: '#DDA0A7', lineHeight: 20 },

  sasongsCard: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  sasongsIcon: { fontSize: 22 },
  sasongsTitle: { fontSize: 15, color: '#FBF3EF', fontWeight: '600' },
  sasongsText: { fontSize: 13, color: '#DDA0A7', lineHeight: 20 },

  algoritmCard: { backgroundColor: 'rgba(122,24,40,0.2)', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.1)' },
  algoritmTitle: { fontSize: 13, color: '#C4737A', fontWeight: '600' },
  algoritmText: { fontSize: 12, color: 'rgba(196,115,122,0.8)', lineHeight: 18, fontStyle: 'italic' },

  signOutButton: { borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  signOutText: { color: '#C4737A', fontSize: 16 },
})
