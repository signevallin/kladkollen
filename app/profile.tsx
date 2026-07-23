import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, useThemeControl } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { router } from 'expo-router'
import { goBack } from '../utils/nav'
import { useEffect, useState, type ReactNode } from 'react'
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
import { MUSIC_GENRES, OUTFIT_CONTEXTS, STYLE_RULES } from '../utils/constants'
import { cacheClear } from '../utils/cache'
import { uploadUserImage } from '../utils/storage'
import { CURRENCIES, useSettings } from '../utils/settings'

const STYLES = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
// Hur frusen användaren är – justerar hur AI:n tolkar temperaturen vid outfit-förslag.
const COLD_LEVELS = [
  { v: 1, label: 'Alltid varm' },
  { v: 2, label: 'Sällan frusen' },
  { v: 3, label: 'Lagom' },
  { v: 4, label: 'Ofta frusen' },
  { v: 5, label: 'Fryser lätt' },
]
const GENDERS = ['Kvinna', 'Man', 'Annat', 'Vill ej ange']
const FAVORITE_COLORS = ['Svart', 'Vit', 'Beige', 'Brun', 'Röd', 'Rosa', 'Blå', 'Grön', 'Guld']
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
  const { currency, setCurrency, tempUnit, setTempUnit } = useSettings()

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [stylePrefs, setStylePrefs] = useState<string[]>([])
  const [colorPrefs, setColorPrefs] = useState<string[]>([])
  const [currentSeason, setCurrentSeason] = useState('')
  const [coldSensitivity, setColdSensitivity] = useState(3)
  const [avoidNote, setAvoidNote] = useState('')
  const [lifeMode, setLifeMode] = useState('single')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  // Vilken listrad som är utfälld (dragspel). Bara en i taget.
  const [expanded, setExpanded] = useState<string | null>(null)

  // Stilprofil
  const [stilProfil, setStilProfil] = useState<string[]>([])
  const [fargsatt, setFargsatt] = useState('')
  const [livsstil, setLivsstil] = useState<string[]>([])
  const [contextNotes, setContextNotes] = useState<Record<string, string>>({})
  const [musicGenres, setMusicGenres] = useState<string[]>([])
  const [styleRules, setStyleRules] = useState<string[]>([])

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
        setGender(data.gender || '')
        setBirthday(data.birthday || '')
        setAvoidNote(data.avoid_note || '')
        setLifeMode(data.life_mode || 'single')
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
        if (data.style_rules) setStyleRules(data.style_rules.split(', ').filter(Boolean))
      }
    }
  }

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

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
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    const url = await uploadUserImage(new Uint8Array(arrayBuffer), 'jpg', 'image/jpeg')
    setAvatar(url)
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
        gender: gender || null,
        birthday: birthday || null,
        avoid_note: avoidNote || null,
        life_mode: lifeMode,
        style_prefs: stylePrefs.join(', '),
        color_prefs: colorPrefs.join(', '),
        current_season: currentSeason,
        cold_sensitivity: coldSensitivity,
        stil_profil: stilProfil.join(', '),
        fargsatt,
        livsstil: livsstil.join(', '),
        outfit_context_notes: contextNotes,
        music_genres: musicGenres.join(', '),
        style_rules: styleRules.join(', '),
      })
      if (error) throw error
      showAlert('Profil sparad!')
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

  // En rad i listvyn. Antingen navigerar den (onPress) eller fäller ut en editor
  // (body). renderRow är en vanlig funktion (ingen komponent) så textfält i body
  // behåller fokus mellan renderingar.
  const renderRow = (
    rowKey: string,
    label: string,
    opts: { value?: string; icon?: any; onPress?: () => void; body?: ReactNode } = {}
  ) => {
    const isOpen = expanded === rowKey
    const navigate = !!opts.onPress
    return (
      <View key={rowKey}>
        <TouchableOpacity
          style={styles.rowHeader}
          activeOpacity={0.7}
          onPress={opts.onPress ? opts.onPress : () => setExpanded(isOpen ? null : rowKey)}
        >
          {opts.icon && <MaterialIcons name={opts.icon} size={20} color={t.textSecondary} style={{ width: 26 }} />}
          <Text style={styles.rowLabel}>{label}</Text>
          {!!opts.value && <Text style={styles.rowValue} numberOfLines={1}>{opts.value}</Text>}
          <MaterialIcons
            name={navigate ? 'chevron-right' : (isOpen ? 'expand-less' : 'expand-more')}
            size={22}
            color={t.textFaint}
          />
        </TouchableOpacity>
        {!navigate && isOpen && !!opts.body && <View style={styles.rowBody}>{opts.body}</View>}
      </View>
    )
  }

  const pillGroup = (options: string[], selected: string[], onToggle: (v: string) => void) => (
    <View style={styles.pills}>
      {options.map(o => (
        <TouchableOpacity key={o} style={[styles.pill, selected.includes(o) && styles.pillActive]} onPress={() => onToggle(o)}>
          <Text style={[styles.pillText, selected.includes(o) && styles.pillTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const coldLabel = COLD_LEVELS.find(l => l.v === coldSensitivity)?.label || ''
  const themeLabel = THEME_OPTIONS.find(o => o.key === preference)?.label || ''

  const colorAnalysisBody = (
    <View>
      <Text style={styles.hint}>
        {colorAnalysis ? 'Din personliga färgprofil.' : 'Ladda upp en bild eller fyll i formuläret.'}
      </Text>
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

      {colorAnalysis && (
        <View style={styles.colorResults}>
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
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
        {!!name && <Text style={styles.avatarName}>{name}</Text>}

        {/* ── Min information ── */}
        <Text style={styles.sectionTitle}>Min information</Text>
        <View style={styles.listCard}>
          {renderRow('namn', 'Namn', {
            icon: 'person-outline', value: name,
            body: (
              <TextInput style={styles.input} placeholder="Ditt namn" placeholderTextColor={t.placeholder} value={name} onChangeText={setName} />
            ),
          })}
          {renderRow('konto', 'Konto', {
            icon: 'mail-outline', value: email,
            body: (
              <View>
                <Text style={styles.accountEmail}>{email}</Text>
                <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                  <Text style={styles.signOutText}>Logga ut</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteAccountButton} onPress={deleteAccount}>
                  <Text style={styles.deleteAccountText}>Radera konto permanent</Text>
                </TouchableOpacity>
              </View>
            ),
          })}
          {renderRow('kon', 'Kön', {
            icon: 'wc', value: gender,
            body: (
              <View style={styles.pills}>
                {GENDERS.map(g => (
                  <TouchableOpacity key={g} style={[styles.pill, gender === g && styles.pillActive]} onPress={() => setGender(prev => prev === g ? '' : g)}>
                    <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ),
          })}
          {renderRow('fodelsedag', 'Födelsedag', {
            icon: 'cake', value: birthday,
            body: (
              <TextInput
                style={styles.input}
                placeholder="ÅÅÅÅ-MM-DD"
                placeholderTextColor={t.placeholder}
                value={birthday}
                onChangeText={setBirthday}
                maxLength={10}
              />
            ),
          })}
          {renderRow('frusen', 'Frusen', {
            icon: 'ac-unit', value: coldLabel,
            body: (
              <>
                <Text style={styles.hint}>Påverkar hur mycket AI:n tar hänsyn till vädret – fryser du lätt föreslås varmare lager.</Text>
                <View style={styles.pills}>
                  {COLD_LEVELS.map(l => (
                    <TouchableOpacity key={l.v} style={[styles.pill, coldSensitivity === l.v && styles.pillActive]} onPress={() => setColdSensitivity(l.v)}>
                      <Text style={[styles.pillText, coldSensitivity === l.v && styles.pillTextActive]}>{l.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ),
          })}
          {renderRow('musik', 'Musik', {
            icon: 'music-note', value: musicGenres.length ? `${musicGenres.length} valda` : undefined,
            body: (
              <>
                <Text style={styles.hint}>Outfitens låtförslag hämtas ur dina genrer.</Text>
                {pillGroup(MUSIC_GENRES as unknown as string[], musicGenres, toggle(setMusicGenres))}
              </>
            ),
          })}
        </View>

        {/* ── Min stil ── */}
        <Text style={styles.sectionTitle}>Min stil</Text>
        <View style={styles.listCard}>
          {renderRow('stil', 'Stil', {
            icon: 'checkroom', value: stylePrefs.length ? `${stylePrefs.length} valda` : undefined,
            body: (
              <>
                <Text style={styles.hint}>Välj en eller flera</Text>
                {pillGroup(STYLES, stylePrefs, toggle(setStylePrefs))}
              </>
            ),
          })}
          {renderRow('stilregler', 'Stilregler', {
            icon: 'rule', value: styleRules.length ? `${styleRules.length} valda` : undefined,
            body: (
              <>
                <Text style={styles.hint}>Regler AI:n följer när den sätter ihop en outfit.</Text>
                <View style={styles.pills}>
                  {STYLE_RULES.map(r => (
                    <TouchableOpacity key={r.key} style={[styles.pill, styleRules.includes(r.key) && styles.pillActive]} onPress={() => toggle(setStyleRules)(r.key)}>
                      <Text style={[styles.pillText, styleRules.includes(r.key) && styles.pillTextActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ),
          })}
          {renderRow('stilpref', 'Stilpreferenser', {
            icon: 'tune',
            body: (
              <>
                <Text style={styles.subLabel}>Stilriktning</Text>
                {pillGroup(STIL_PROFIL, stilProfil, toggle(setStilProfil))}

                <Text style={styles.subLabel}>Färgprofil</Text>
                <View style={styles.pills}>
                  {COLOR_PROFILES.map(c => (
                    <TouchableOpacity key={c} style={[styles.pill, fargsatt === c && styles.pillActive]} onPress={() => setFargsatt(prev => prev === c ? '' : c)}>
                      <Text style={[styles.pillText, fargsatt === c && styles.pillTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.subLabel}>Livsstil</Text>
                {pillGroup(LIFESTYLE, livsstil, toggle(setLivsstil))}

                <Text style={styles.subLabel}>Kommentar per tillfälle</Text>
                <Text style={styles.hint}>Egen instruktion per tillfälle – AI:n väger in den vid outfit-förslag.</Text>
                {OUTFIT_CONTEXTS.map(ctx => (
                  <View key={ctx.label} style={styles.contextNoteGroup}>
                    <Text style={styles.contextNoteLabel}>{ctx.label}</Text>
                    <TextInput
                      style={styles.contextNoteInput}
                      placeholder={`T.ex. "gärna kjol", "aldrig klänning"...`}
                      placeholderTextColor={t.placeholder}
                      value={contextNotes[ctx.label] || ''}
                      onChangeText={text => setContextNotes(prev => ({ ...prev, [ctx.label]: text }))}
                      multiline
                    />
                  </View>
                ))}
              </>
            ),
          })}
          {renderRow('favfarg', 'Favoritfärger', {
            icon: 'palette', value: colorPrefs.length ? `${colorPrefs.length} valda` : undefined,
            body: pillGroup(FAVORITE_COLORS, colorPrefs, toggle(setColorPrefs)),
          })}
          {renderRow('undvik', 'Undvika?', {
            icon: 'block', value: avoidNote ? '✓' : undefined,
            body: (
              <>
                <Text style={styles.hint}>Skriv sådant AI:n ska undvika – färger, plagg eller stilar (t.ex. "aldrig gult", "inga korta kjolar").</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder="Det här vill jag undvika..."
                  placeholderTextColor={t.placeholder}
                  value={avoidNote}
                  onChangeText={setAvoidNote}
                  multiline
                />
              </>
            ),
          })}
          {renderRow('farganalys', 'Färganalys', {
            icon: 'colorize', value: colorAnalysis ? 'Klar' : undefined,
            body: colorAnalysisBody,
          })}
        </View>

        {/* ── Inställningar ── */}
        <Text style={styles.sectionTitle}>Inställningar</Text>
        <View style={styles.listCard}>
          {renderRow('livssituation', 'Livssituation', {
            icon: 'favorite-border', value: lifeMode === 'couple' ? 'Sambo' : 'Singel',
            body: (
              <>
                <Text style={styles.hint}>Anpassar appen efter var i livet du är. Fler lägen kommer.</Text>
                <View style={styles.pills}>
                  {([['single', 'Singel'], ['couple', 'Sambo']] as const).map(([v, lbl]) => (
                    <TouchableOpacity key={v} style={[styles.pill, lifeMode === v && styles.pillActive]} onPress={() => setLifeMode(v)}>
                      <Text style={[styles.pillText, lifeMode === v && styles.pillTextActive]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ),
          })}
          {lifeMode === 'couple' && renderRow('partner', 'Min partner', { icon: 'people-outline', onPress: () => router.push('/partner') })}
          {renderRow('valuta', 'Valuta', {
            icon: 'attach-money', value: currency,
            body: (
              <View style={styles.pills}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity key={c.code} style={[styles.pill, currency === c.code && styles.pillActive]} onPress={() => setCurrency(c.code)}>
                    <Text style={[styles.pillText, currency === c.code && styles.pillTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ),
          })}
          {renderRow('temp', 'Temperatur', {
            icon: 'thermostat', value: tempUnit === 'C' ? '°C' : '°F',
            body: (
              <View style={styles.pills}>
                {([['C', 'Celsius (°C)'], ['F', 'Fahrenheit (°F)']] as const).map(([u, lbl]) => (
                  <TouchableOpacity key={u} style={[styles.pill, tempUnit === u && styles.pillActive]} onPress={() => setTempUnit(u)}>
                    <Text style={[styles.pillText, tempUnit === u && styles.pillTextActive]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ),
          })}
          {renderRow('sprak', 'Språk', {
            icon: 'language', value: 'Svenska',
            body: <Text style={styles.hint}>Appen är på svenska. Fler språk kommer snart.</Text>,
          })}
          {renderRow('platser', 'Egna platser', { icon: 'place', onPress: () => router.push('/locations') })}
          {renderRow('notiser', 'Notiser', { icon: 'notifications-none', onPress: () => router.push('/notifications') })}
          {renderRow('utseende', 'Utseende', {
            icon: 'dark-mode', value: themeLabel,
            body: (
              <View style={styles.pills}>
                {THEME_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.key} style={[styles.pill, preference === opt.key && styles.pillActive]} onPress={() => setPreference(opt.key)}>
                    <Text style={[styles.pillText, preference === opt.key && styles.pillTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ),
          })}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? 'Sparar...' : 'Spara profil'}</Text>
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
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 20 },
  avatarContainer: { alignSelf: 'center', marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: t.primary },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.border },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: t.primary, borderRadius: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  avatarName: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary, textAlign: 'center', marginBottom: 20 },

  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: t.textSecondary, textTransform: 'uppercase', marginTop: 22, marginBottom: 10, marginLeft: 4 },
  listCard: { backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  rowLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  rowValue: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, maxWidth: 150, textAlign: 'right' },
  rowBody: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 16, backgroundColor: t.surfaceMuted },

  subLabel: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 13, marginBottom: 8, marginTop: 12 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 8, marginTop: 8 },
  hint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 11, fontStyle: 'italic', marginBottom: 10, marginTop: 4 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surface, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginTop: 6 },
  accountEmail: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  saveButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24 },
  saveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },

  contextNoteGroup: { marginBottom: 12 },
  contextNoteLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary, marginBottom: 6 },
  contextNoteInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surface, borderRadius: 12, padding: 12, color: t.textPrimary, fontSize: 14, borderWidth: 1, borderColor: t.border, minHeight: 44 },

  // ── Färganalys ──
  inputModeRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 16 },
  inputModeBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  inputModeBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  inputModeBtnText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  inputModeBtnTextActive: { color: t.onPrimary, fontWeight: '700' },

  colorUploadZone: { borderRadius: 16, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', backgroundColor: t.surface },
  colorUploadPreview: { width: '100%', height: '100%' },
  colorUploadText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  colorUploadHint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 11, marginTop: 4 },

  colorFormGroup: { marginBottom: 12 },
  colorFormLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 8 },
  colorFormPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorFormPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  colorFormPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  colorFormPillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  colorFormPillTextActive: { color: t.onPrimary, fontWeight: '600' },

  analyzeBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },

  colorResults: { gap: 14 },
  bioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bioChip: { backgroundColor: t.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: t.border, minWidth: '45%', flex: 1 },
  bioChipLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.textSecondary, letterSpacing: 1.5, marginBottom: 2 },
  bioChipValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, textTransform: 'capitalize' },

  colorTabRow: { flexDirection: 'row', gap: 6 },
  colorTab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  colorTabActive: { backgroundColor: t.primary, borderColor: t.primary },
  colorTabText: { fontFamily: 'Lora_500Medium', fontSize: 12, color: t.textSecondary },
  colorTabTextActive: { color: t.onPrimary, fontWeight: '700' },

  tabContent: { gap: 12 },
  bioCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border },
  bioCardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  bioCardText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 20 },

  summaryCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
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

  strategiCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  strategiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strategiEmoji: { fontFamily: 'Lora_400Regular', fontSize: 18 },
  strategiLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, flex: 1 },
  strategiSwatches: { flexDirection: 'row', gap: 4 },
  strategiSwatch: { width: 20, height: 20, borderRadius: 10 },
  strategiText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },

  sasongsCard: { backgroundColor: t.surface, borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: t.border },
  sasongsTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  sasongsText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },

  algoritmCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  algoritmTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  algoritmText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, lineHeight: 18, fontStyle: 'italic' },

  signOutButton: { borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  signOutText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 16 },
  deleteAccountButton: { marginTop: 10, padding: 10, alignItems: 'center' },
  deleteAccountText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, textDecorationLine: 'underline' },
})
