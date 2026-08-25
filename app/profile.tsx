import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, useThemeControl } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { router, useFocusEffect } from 'expo-router'
import { goBack } from '../utils/nav'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import SignedImage from '../components/SignedImage'
import ColorAnalysis from '../components/profile/ColorAnalysis'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'
import { downscaleForUpload } from '../utils/image'
import { cacheGet, cacheSet } from '../utils/cache'
import { trimesterFromDueDate, trimesterLabel } from '../utils/pregnancy'
import { apiPost } from '../utils/api'
import { pickImageSmart } from '../utils/imagePicker'
import { COLOR_OPTIONS, MUSIC_GENRES, OUTFIT_CONTEXTS, STYLE_RULES } from '../utils/constants'
import { cacheClear } from '../utils/cache'
import { clearSignedUrls } from '../utils/signedUrls'
import { loadPartner, type Partner } from '../utils/household'
import { loadPeople, type Person } from '../utils/people'
import { uploadUserImage } from '../utils/storage'
import { CURRENCIES, useSettings } from '../utils/settings'
import { invalidateGarments } from '../utils/garmentsStore'
import { useEntitlements, partnerFeaturesEnabled, familyFeaturesEnabled } from '../utils/entitlements'
import { TIER_LABEL } from '../utils/purchases'
import { COLD_LEVELS } from '../utils/weather'
import { LANGS } from '../utils/i18n'

const STYLES = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']
// Hur frusen användaren är – justerar hur AI:n tolkar temperaturen vid outfit-förslag.
const GENDERS = ['Kvinna', 'Man', 'Annat', 'Vill ej ange']

const THEME_OPTIONS: { key: 'system' | 'light' | 'dark'; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Ljust' },
  { key: 'dark', label: 'Mörkt' },
]

export default function Profile() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { preference, setPreference } = useThemeControl()
  const { currency, setCurrency, tempUnit, setTempUnit, lang, setLang, showDailySong, setShowDailySong, t: tr } = useSettings()
  const { isPro, tier, sharedFrom } = useEntitlements()
  const partnerOn = partnerFeaturesEnabled(tier)
  const familyOn = familyFeaturesEnabled(tier)

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [stylePrefs, setStylePrefs] = useState<string[]>([])
  const [colorPrefs, setColorPrefs] = useState<string[]>([])
  const [currentSeason, setCurrentSeason] = useState('')
  const [coldSensitivity, setColdSensitivity] = useState(3)
  // Automatisk tvätt: plagget hamnar i tvätten efter N användningar.
  const [autoLaundry, setAutoLaundry] = useState(false)
  const [washAfterWears, setWashAfterWears] = useState(2)
  const [avoidNote, setAvoidNote] = useState('')
  const [lifeMode, setLifeMode] = useState('single')
  // Rita senast kända hushåll direkt (delas med hemskärmen) och uppdatera i
  // bakgrunden – annars väntar raden på en DB-fråga varje gång man öppnar profilen.
  const [pregnant, setPregnant] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [nursing, setNursing] = useState(false)
  const [partner, setPartner] = useState<Partner | null>(() => cacheGet<Partner | null>('household.partner') ?? null)
  const [householdChildren, setHouseholdChildren] = useState<Person[]>(() => cacheGet<Person[]>('household.children') ?? [])
  // Autospar: sparar tyst en stund efter senaste ändringen (ingen spara-knapp att glömma).
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  // Vilken listrad som är utfälld (dragspel). Bara en i taget.
  const [expanded, setExpanded] = useState<string | null>(null)
  // Hopfällda sektioner. Inställningar och Om Skrud (de minst använda) är
  // ihopfällda som standard så profilen känns kortare vid öppning.
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['installningar', 'omskrud']))
  const toggleSection = (key: string) => setCollapsedSections(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  // Stilprofil
  const [contextNotes, setContextNotes] = useState<Record<string, string>>({})
  const [musicGenres, setMusicGenres] = useState<string[]>([])
  const [styleRules, setStyleRules] = useState<string[]>([])

  // Färganalys – hela blocket bor i components/profile/ColorAnalysis.tsx.
  // Här behövs bara en flagga för att visa "Klar" på profilraden.
  const [hasColorAnalysis, setHasColorAnalysis] = useState(false)

  useEffect(() => { loadProfile() }, [])
  // Läs om partnern varje gång sidan får fokus, så "Mitt hushåll" uppdateras
  // direkt efter att man kopplat ihop/isär på partner-sidan.
  useFocusEffect(
    useCallback(() => {
      loadPartner().then(({ partner }) => { setPartner(partner); cacheSet('household.partner', partner) })
      loadPeople().then(ppl => {
        const children = ppl.filter(p => p.type === 'child')
        setHouseholdChildren(children); cacheSet('household.children', children)
      }).catch(() => {})
    }, [])
  )

  // Autospar: 700 ms efter senaste ändringen skrivs profilen tyst.
  useEffect(() => {
    if (!profileLoaded) return
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { persistProfile() }, 700)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, name, avatar, gender, birthday, avoidNote, lifeMode, stylePrefs, colorPrefs,
      currentSeason, coldSensitivity, autoLaundry, washAfterWears, pregnant, dueDate, nursing, contextNotes, musicGenres, styleRules])

  // Skriver profildata till alla fält. Anropas både med cachad rad (direkt vid
  // montering, för snabb rendering) och med den färska raden från nätet.
  function applyProfile(data: any) {
    setName(data.name || '')
    setAvatar(data.avatar_url || null)
    setGender(data.gender || '')
    setBirthday(data.birthday || '')
    setAvoidNote(data.avoid_note || '')
    setLifeMode(data.life_mode || 'single'); cacheSet('profile.lifeMode', data.life_mode || 'single')
    setStylePrefs(data.style_prefs ? data.style_prefs.split(', ') : [])
    setColorPrefs(data.color_prefs ? data.color_prefs.split(', ') : [])
    setCurrentSeason(data.current_season || '')
    if (data.cold_sensitivity != null) setColdSensitivity(data.cold_sensitivity)
    setAutoLaundry(!!data.auto_laundry)
    if (data.wash_after_wears != null) setWashAfterWears(data.wash_after_wears)
    setPregnant(!!data.pregnant); cacheSet('profile.pregnant', !!data.pregnant)
    setDueDate(data.due_date || '')
    setNursing(!!data.nursing); cacheSet('profile.nursing', !!data.nursing)
    setHasColorAnalysis(!!data.color_analysis)
    if (data.outfit_context_notes) setContextNotes(data.outfit_context_notes)
    if (data.music_genres) setMusicGenres(data.music_genres.split(', ').filter(Boolean))
    if (data.style_rules) setStyleRules(data.style_rules.split(', ').filter(Boolean))
  }

  async function loadProfile() {
    // Rita senast kända profil direkt så sidan inte känns långsam vid öppning.
    const cached = cacheGet<any>('profile.row')
    if (cached) applyProfile(cached)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { applyProfile(data); cacheSet('profile.row', data) }
    }
    // Först nu får autospar-effekten börja skriva (annars sparar den tomma
    // defaultvärden över riktig data direkt vid montering).
    setProfileLoaded(true)
  }

  // Sparar profilen tyst (utan alert/navigering) – används av autospar.
  async function persistProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const row: any = {
      id: user.id,
      name,
      gender: gender || null,
      birthday: birthday || null,
      avoid_note: avoidNote || null,
      life_mode: lifeMode,
      style_prefs: stylePrefs.join(', '),
      color_prefs: colorPrefs.join(', '),
      current_season: currentSeason,
      cold_sensitivity: coldSensitivity,
      auto_laundry: autoLaundry,
      wash_after_wears: washAfterWears,
      pregnant,
      due_date: dueDate || null,
      nursing,
      outfit_context_notes: contextNotes,
      music_genres: musicGenres.join(', '),
      style_rules: styleRules.join(', '),
    }
    // Ladda upp ev. lokal bild till en riktig URL; misslyckas det, rör vi inte
    // avatar_url (så vi aldrig sparar en lokal file://-sökväg eller nollar den).
    let avatarToSave = avatar
    if (avatarToSave && /^(file|blob|data):/i.test(avatarToSave)) {
      try { avatarToSave = await uploadAvatar(avatarToSave); setAvatar(avatarToSave); row.avatar_url = avatarToSave }
      catch { /* hoppa över bilden denna gång */ }
    } else {
      row.avatar_url = avatarToSave
    }
    const { error } = await supabase.from('profiles').upsert(row)
    setSaveState(error ? 'idle' : 'saved')
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
      const prev = avatar
      setAvatar(uri) // visa direkt medan uppladdningen sker
      try {
        const url = await uploadAvatar(uri)
        setAvatar(url)
      } catch {
        // Viktigt: spara ALDRIG en lokal file://-sökväg som avatar – då syns
        // bilden bara på den egna telefonen. Återställ och be användaren igen.
        setAvatar(prev)
        showAlert(tr('Kunde inte ladda upp bilden'), tr('Försök igen om en stund.'))
      }
    }
  }

  function togglePregnant() {
    setPregnant(v => { const nv = !v; cacheSet('profile.pregnant', nv); return nv })
  }

  // Tar tillbaka alla plagg som pausats under graviditeten (döljda ur förslag).
  async function restorePausedGarments() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('garments').update({ paused_pregnancy: false }).eq('paused_pregnancy', true).select('id')
    if (error) { showAlert(tr('Kunde inte ta tillbaka plaggen'), tr('Försök igen om en stund.')); return }
    invalidateGarments()
    showAlert(tr('Klart'), `${data?.length ?? 0} ${tr('plagg togs tillbaka i garderoben.')}`)
  }

  async function uploadAvatar(uri: string): Promise<string> {
    // Skala ner till en liten WebP – avataren visas som liten miniatyr, så
    // fullstora foton gör bara hushållsraden seg att ladda.
    const { bytes, ext, contentType } = await downscaleForUpload(uri, 512)
    return uploadUserImage(bytes, ext, contentType)
  }

  // Spara-knappen behövs inte längre för att spara (autospar sköter det) – den
  // säkerställer bara en sista skrivning och tar dig tillbaka.
  async function saveProfile() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setLoading(true)
    try { await persistProfile() } finally { setLoading(false) }
    goBack('/home')
  }

  async function signOut() {
    showConfirm(tr('Logga ut'), tr('Är du säker?'), async () => {
      cacheClear()
      clearSignedUrls()
      await supabase.auth.signOut()
      if (Platform.OS === 'web') {
        window.location.href = '/login'
      } else {
        router.replace('/login')
      }
    }, tr('Logga ut'), true)
  }

  // Byte av livssituation. Att välja Singel med en partner kvar i hushållet
  // döljer par-ytorna men LÄMNAR inte hushållet – det sker bara via "lämna
  // hushållet" under Min partner. Skillnaden är inte uppenbar, och att tro att
  // man kopplat isär sig när man inte har det är värt en varning.
  function chooseLifeMode(v: 'single' | 'couple' | 'family') {
    const apply = () => { setLifeMode(v); cacheSet('profile.lifeMode', v) }
    if (v === 'single' && partner && lifeMode !== 'single') {
      showConfirm(
        tr('Byt till Singel?'),
        `${tr('Par- och familjefunktionerna döljs. Ni är kvar i samma hushåll och')} ${partner.name} ${tr('ser fortfarande det ni delar – vill du koppla isär helt gör du det under Min partner.')}`,
        apply,
        tr('Byt till Singel'),
      )
      return
    }
    apply()
  }

  async function deleteAccount() {
    showConfirm(
      tr('Radera konto'),
      tr('Detta raderar ditt konto och ALL din data permanent – plagg, outfits, bilder och profil. Det går inte att ångra. Är du helt säker?'),
      async () => {
        try {
          await apiPost('/api/delete-account', {})
          cacheClear()
          clearSignedUrls()
          await supabase.auth.signOut()
          if (Platform.OS === 'web') {
            window.location.href = '/'
          } else {
            router.replace('/login')
          }
        } catch (e: any) {
          showAlert(tr('Något gick fel'), e.message)
        }
      },
      tr('Radera permanent'),
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
          <Text style={styles.rowLabel}>{tr(label)}</Text>
          {!!opts.value && <Text style={styles.rowValue} numberOfLines={1}>{tr(opts.value)}</Text>}
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

  // Hopfällbar sektionsrubrik: tryck för att fälla ihop/ut hela kortet nedanför.
  const sectionHeader = (key: string, title: string) => {
    const collapsed = collapsedSections.has(key)
    return (
      <TouchableOpacity
        style={styles.sectionHeaderRow}
        activeOpacity={0.7}
        onPress={() => { setExpanded(null); toggleSection(key) }}
        accessibilityRole="button"
        accessibilityLabel={tr(title)}
      >
        <Text style={styles.sectionHeaderTitle}>{tr(title)}</Text>
        <MaterialIcons name={collapsed ? 'expand-more' : 'expand-less'} size={20} color={t.textFaint} />
      </TouchableOpacity>
    )
  }

  const pillGroup = (options: string[], selected: string[], onToggle: (v: string) => void) => (
    <View style={styles.pills}>
      {options.map(o => (
        <TouchableOpacity key={o} style={[styles.pill, selected.includes(o) && styles.pillActive]} onPress={() => onToggle(o)}>
          <Text style={[styles.pillText, selected.includes(o) && styles.pillTextActive]}>{tr(o)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const coldLabel = COLD_LEVELS.find(l => l.v === coldSensitivity)?.label || ''
  const themeLabel = THEME_OPTIONS.find(o => o.key === preference)?.label || ''

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => goBack('/home')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={tr('Gå tillbaka')}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{tr('Min profil')}</Text>

        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} accessibilityLabel={tr('Byt profilbild')} accessibilityRole="button">
          {avatar
            ? <SignedImage path={avatar} style={styles.avatar} resizeMode="cover" transform={{ width: 240, height: 240, resize: 'cover', format: 'origin' }} />
            : <View style={styles.avatarPlaceholder}><MaterialIcons name="person" size={44} color={t.textSecondary} /></View>
          }
          <View style={styles.avatarBadge}><MaterialIcons name="photo-camera" size={16} color={t.onPrimary} /></View>
        </TouchableOpacity>
        {!!name && <Text style={styles.avatarName}>{name}</Text>}

        {((partnerOn && partner) || (familyOn && householdChildren.length > 0)) && (
          <>
            <Text style={styles.sectionTitle}>{tr('Mitt hushåll')}</Text>
            <View style={styles.householdRow}>
              {partnerOn && partner && (
                <TouchableOpacity
                  style={styles.householdMember}
                  onPress={() => router.push(`/wardrobe?partner=${partner.id}&partnerName=${encodeURIComponent(partner.name)}` as any)}
                  accessibilityLabel={`${tr('Öppna garderob för')} ${partner.name}`}
                  accessibilityRole="button"
                >
                  {partner.avatar_url
                    ? <SignedImage path={partner.avatar_url} style={styles.householdAvatar} resizeMode="cover" transform={{ width: 160, height: 160, resize: 'cover', format: 'origin' }} />
                    : <View style={styles.householdAvatarPlaceholder}><MaterialIcons name="person" size={28} color={t.textSecondary} /></View>}
                  <Text style={styles.householdName} numberOfLines={1}>{partner.name}</Text>
                </TouchableOpacity>
              )}
              {familyOn && householdChildren.map(child => (
                <TouchableOpacity
                  key={child.id}
                  style={styles.householdMember}
                  onPress={() => router.push(`/wardrobe?person=${child.id}&personName=${encodeURIComponent(child.name)}` as any)}
                  accessibilityLabel={`${tr('Öppna garderob för')} ${child.name}`}
                  accessibilityRole="button"
                >
                  {child.avatar_url
                    ? <SignedImage path={child.avatar_url} style={styles.householdAvatar} resizeMode="cover" transform={{ width: 160, height: 160, resize: 'cover', format: 'origin' }} />
                    : <View style={styles.householdAvatarPlaceholder}><MaterialIcons name="child-care" size={26} color={t.textSecondary} /></View>}
                  <Text style={styles.householdName} numberOfLines={1}>{child.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Min information ── */}
        {sectionHeader('info', 'Min information')}
        {!collapsedSections.has('info') && (
        <View style={styles.listCard}>
          {renderRow('namn', 'Namn', {
            icon: 'person-outline', value: name,
            body: (
              <TextInput style={styles.input} placeholder={tr('Ditt namn')} placeholderTextColor={t.placeholder} value={name} onChangeText={setName} />
            ),
          })}
          {renderRow('konto', 'Konto', {
            icon: 'mail-outline', value: email,
            body: (
              <View>
                <Text style={styles.accountEmail}>{email}</Text>
                <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                  <Text style={styles.signOutText}>{tr('Logga ut')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteAccountButton} onPress={deleteAccount}>
                  <Text style={styles.deleteAccountText}>{tr('Radera konto permanent')}</Text>
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
                    <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{tr(g)}</Text>
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
                placeholder={tr('ÅÅÅÅ-MM-DD')}
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
                <Text style={styles.hint}>{tr('Påverkar hur mycket AI:n tar hänsyn till vädret – fryser du lätt föreslås varmare lager.')}</Text>
                <View style={styles.pills}>
                  {COLD_LEVELS.map(l => (
                    <TouchableOpacity key={l.v} style={[styles.pill, coldSensitivity === l.v && styles.pillActive]} onPress={() => setColdSensitivity(l.v)}>
                      <Text style={[styles.pillText, coldSensitivity === l.v && styles.pillTextActive]}>{tr(l.label)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ),
          })}
          {renderRow('musik', 'Musik', {
            icon: 'music-note', value: musicGenres.length ? `${musicGenres.length} ${tr('valda')}` : undefined,
            body: (
              <>
                <View style={styles.gravidToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gravidFieldLabel, { marginTop: 0 }]}>{tr('Visa Dagens låt')}</Text>
                    <Text style={styles.hint}>{tr('Visar en matchande låt till dagens outfit på startsidan.')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDailySong(!showDailySong)} style={[styles.toggle, showDailySong && styles.toggleOn]}>
                    <View style={[styles.toggleKnob, showDailySong && styles.toggleKnobOn]} />
                  </TouchableOpacity>
                </View>
                {showDailySong && (
                  <>
                    <Text style={styles.hint}>{tr('Outfitens låtförslag hämtas ur dina genrer.')}</Text>
                    {pillGroup(MUSIC_GENRES as unknown as string[], musicGenres, toggle(setMusicGenres))}
                  </>
                )}
              </>
            ),
          })}
          {renderRow('livssituation', 'Livssituation', {
            icon: 'favorite-border', value: lifeMode === 'family' ? 'Familj' : lifeMode === 'couple' ? 'Partner' : 'Singel',
            body: (
              <>
                <Text style={styles.hint}>{tr('Anpassar appen efter var i livet du är.')}</Text>
                <View style={styles.pills}>
                  {([['single', 'Singel'], ['couple', 'Partner'], ['family', 'Familj']] as const).map(([v, lbl]) => (
                    <TouchableOpacity key={v} style={[styles.pill, lifeMode === v && styles.pillActive]} onPress={() => chooseLifeMode(v)}>
                      <Text style={[styles.pillText, lifeMode === v && styles.pillTextActive]}>{tr(lbl)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Gravid- och amningsläget ligger bakom partnerläget (Partner-
                    nivån; Familj räknas med). Utan nivån visas "Premium" → paywall.
                    När Gravid slås på dyker en egen "Gravidläge"-rad upp nedanför. */}
                <View style={styles.gravidToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gravidFieldLabel, { marginTop: 0 }]}>{tr('Gravid')}</Text>
                    <Text style={styles.hint}>{tr('Anpassar outfits efter magen och låter dig pausa plagg som inte passar just nu.')}</Text>
                  </View>
                  {partnerOn ? (
                    <TouchableOpacity onPress={togglePregnant} style={[styles.toggle, pregnant && styles.toggleOn]}>
                      <View style={[styles.toggleKnob, pregnant && styles.toggleKnobOn]} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => router.push('/paywall')}>
                      <Text style={styles.rowValue}>{tr('Partner Premium')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Amningsläge – eget val (t.ex. efter förlossningen). AI:n väljer
                    då plagg med enkel amningsåtkomst framtill. */}
                <View style={styles.gravidToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gravidFieldLabel, { marginTop: 0 }]}>{tr('Ammar')}</Text>
                    <Text style={styles.hint}>{tr('Anpassar outfits för amning – plagg som är lätta att öppna framtill.')}</Text>
                  </View>
                  {partnerOn ? (
                    <TouchableOpacity onPress={() => setNursing(v => { const nv = !v; cacheSet('profile.nursing', nv); return nv })} style={[styles.toggle, nursing && styles.toggleOn]}>
                      <View style={[styles.toggleKnob, nursing && styles.toggleKnobOn]} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => router.push('/paywall')}>
                      <Text style={styles.rowValue}>{tr('Partner Premium')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ),
          })}
          {pregnant && partnerOn && renderRow('gravidlage', 'Gravidläge', {
            icon: 'pregnant-woman',
            value: trimesterLabel(trimesterFromDueDate(dueDate || null)) || undefined,
            body: (
              <>
                <Text style={styles.gravidFieldLabel}>{tr('Beräknat födelsedatum (BF)')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={tr('ÅÅÅÅ-MM-DD')}
                  placeholderTextColor={t.placeholder}
                  value={dueDate}
                  onChangeText={setDueDate}
                  maxLength={10}
                />
                {(() => {
                  const tri = trimesterFromDueDate(dueDate || null)
                  return tri ? <Text style={styles.hint}>{tr(trimesterLabel(tri))}</Text> : null
                })()}
                <Text style={styles.hint}>{tr('Markera plagg som gravid-/amningsvänliga eller pausa dem inne på varje plagg.')}</Text>
                <TouchableOpacity style={styles.restoreBtn} onPress={() => router.push('/pregnancy-wardrobe')}>
                  <MaterialIcons name="checkroom" size={18} color={t.textPrimary} />
                  <Text style={styles.restoreBtnText}>{tr('Gravidgarderob')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restoreBtn} onPress={restorePausedGarments}>
                  <MaterialIcons name="undo" size={18} color={t.textPrimary} />
                  <Text style={styles.restoreBtnText}>{tr('Ta tillbaka pausade plagg')}</Text>
                </TouchableOpacity>
              </>
            ),
          })}
          {(lifeMode === 'couple' || lifeMode === 'family') && renderRow('partner', 'Min partner', { icon: 'people-outline', value: partnerOn ? undefined : 'Partner Premium', onPress: () => router.push(partnerOn ? '/partner' : '/paywall') })}
          {lifeMode === 'family' && renderRow('familj', 'Familj & barn', { icon: 'family-restroom', value: familyOn ? undefined : 'Familj Premium', onPress: () => router.push(familyOn ? '/family' : '/paywall') })}
        </View>
        )}

        {/* ── Min stil ── */}
        {sectionHeader('stil', 'Min stil')}
        {!collapsedSections.has('stil') && (
        <View style={styles.listCard}>
          {renderRow('stil', 'Stil', {
            icon: 'checkroom', value: stylePrefs.length ? `${stylePrefs.length} ${tr('valda')}` : undefined,
            body: (
              <>
                <Text style={styles.hint}>{tr('Välj en eller flera')}</Text>
                {pillGroup(STYLES, stylePrefs, toggle(setStylePrefs))}
              </>
            ),
          })}
          {renderRow('stilregler', 'Stilregler', {
            icon: 'rule', value: styleRules.length ? `${styleRules.length} ${tr('valda')}` : undefined,
            body: (
              <>
                <Text style={styles.hint}>{tr('Regler AI:n följer när den sätter ihop en outfit.')}</Text>
                <View style={styles.pills}>
                  {STYLE_RULES.map(r => (
                    <TouchableOpacity key={r.key} style={[styles.pill, styleRules.includes(r.key) && styles.pillActive]} onPress={() => toggle(setStyleRules)(r.key)}>
                      <Text style={[styles.pillText, styleRules.includes(r.key) && styles.pillTextActive]}>{tr(r.label)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ),
          })}
          {/* Hette "Stilpreferenser" och rymde Stilriktning + Livsstil + kommentarer.
              De två första är borttagna: Stilriktning var nästan en dubblett av
              Stil (Minimal/Casual/Bohemisk mot Minimalistisk/Klassisk/Bohemisk)
              och Livsstil lästes aldrig av någon generering. Kvar är det raden
              faktiskt gör, så namnet säger det nu. */}
          {renderRow('stilpref', 'Kommentar per tillfälle', {
            icon: 'tune',
            body: (
              <>
                <Text style={styles.hint}>{tr('Egen instruktion per tillfälle – AI:n väger in den vid outfit-förslag.')}</Text>
                {OUTFIT_CONTEXTS.map(ctx => (
                  <View key={ctx.label} style={styles.contextNoteGroup}>
                    <Text style={styles.contextNoteLabel}>{tr(ctx.label)}</Text>
                    <TextInput
                      style={styles.contextNoteInput}
                      placeholder={tr('T.ex. "gärna kjol", "aldrig klänning"...')}
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
            icon: 'palette', value: colorPrefs.length ? `${colorPrefs.length} ${tr('valda')}` : undefined,
            body: (
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map(c => {
                  const on = colorPrefs.includes(c.name)
                  return (
                    <TouchableOpacity
                      key={c.name}
                      style={[styles.colorDot, { backgroundColor: c.hex }, on && styles.colorDotActive]}
                      onPress={() => toggle(setColorPrefs)(c.name)}
                      accessibilityLabel={c.name}
                    >
                      {on && <Text style={styles.colorCheck}>✓</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            ),
          })}
          {renderRow('undvik', 'Undvika?', {
            icon: 'block', value: avoidNote ? '✓' : undefined,
            body: (
              <>
                <Text style={styles.hint}>{tr('Skriv sådant AI:n ska undvika – färger, plagg eller stilar (t.ex. "aldrig gult", "inga korta kjolar").')}</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60 }]}
                  placeholder={tr('Det här vill jag undvika...')}
                  placeholderTextColor={t.placeholder}
                  value={avoidNote}
                  onChangeText={setAvoidNote}
                  multiline
                />
              </>
            ),
          })}
          {renderRow('farganalys', 'Färganalys', {
            icon: 'colorize', value: hasColorAnalysis ? 'Klar' : undefined,
            body: <ColorAnalysis onAnalyzed={() => setHasColorAnalysis(true)} />,
          })}
        </View>
        )}

        {/* ── Skrud Premium ── */}
        {sectionHeader('premium', 'Skrud Premium')}
        {!collapsedSections.has('premium') && (
        <View style={styles.listCard}>
          {/* Visa vilken nivå som gäller, inte bara "Aktiv" – en Partner-köpare
              ska se "Partner" här, annars går det inte att se vad man betalar för. */}
          {renderRow('premium', 'Skrud Premium', {
            icon: 'workspace-premium',
            // Delad nivå markeras kompakt här; paywallen förklarar i klartext.
            value: isPro
              ? (sharedFrom !== null
                  ? `${TIER_LABEL[tier] || tr('Aktiv')} · ${tr('via')} ${sharedFrom || tr('hushållet')}`
                  : (TIER_LABEL[tier] || 'Aktiv'))
              : 'Uppgradera',
            onPress: () => router.push('/paywall'),
          })}
        </View>
        )}

        {/* ── Inställningar ── */}
        {sectionHeader('installningar', 'Inställningar')}
        {!collapsedSections.has('installningar') && (
        <View style={styles.listCard}>
          {renderRow('tvatt', 'Automatisk tvätt', {
            icon: 'local-laundry-service',
            value: autoLaundry ? `${tr('Efter')} ${washAfterWears}` : tr('Av'),
            body: (
              <>
                <Text style={styles.hint}>{tr('Plagg läggs i tvätten av sig själva när de använts ett visst antal gånger. Gäller inte ytterkläder, kavajer eller plagg som inte tvättas – skor, väskor, smycken och accessoarer.')}</Text>
                <View style={styles.gravidToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gravidFieldLabel, { marginTop: 0 }]}>{tr('Lägg i tvätten automatiskt')}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAutoLaundry(v => !v)} style={[styles.toggle, autoLaundry && styles.toggleOn]}>
                    <View style={[styles.toggleKnob, autoLaundry && styles.toggleKnobOn]} />
                  </TouchableOpacity>
                </View>
                {autoLaundry && (
                  <>
                    <Text style={styles.hint}>{tr('Efter hur många användningar?')}</Text>
                    <View style={styles.pills}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <TouchableOpacity key={n} style={[styles.pill, washAfterWears === n && styles.pillActive]} onPress={() => setWashAfterWears(n)}>
                          <Text style={[styles.pillText, washAfterWears === n && styles.pillTextActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            ),
          })}
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
                    <Text style={[styles.pillText, tempUnit === u && styles.pillTextActive]}>{tr(lbl)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ),
          })}
          {renderRow('sprak', 'Språk', {
            icon: 'language', value: LANGS.find(l => l.code === lang)?.label ?? 'Svenska',
            body: (
              <View style={styles.pills}>
                {LANGS.map(l => (
                  <TouchableOpacity key={l.code} style={[styles.pill, lang === l.code && styles.pillActive]} onPress={() => setLang(l.code)}>
                    <Text style={[styles.pillText, lang === l.code && styles.pillTextActive]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ),
          })}
          {renderRow('platser', 'Egna platser', { icon: 'place', onPress: () => router.push('/locations') })}
          {renderRow('notiser', 'Notiser', { icon: 'notifications-none', onPress: () => router.push('/notifications') })}
          {renderRow('utseende', 'Utseende', {
            icon: 'dark-mode', value: themeLabel,
            body: (
              <View style={styles.pills}>
                {THEME_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt.key} style={[styles.pill, preference === opt.key && styles.pillActive]} onPress={() => setPreference(opt.key)}>
                    <Text style={[styles.pillText, preference === opt.key && styles.pillTextActive]}>{tr(opt.label)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ),
          })}
        </View>
        )}

        {/* ── Om Skrud ── */}
        {sectionHeader('omskrud', 'Om Skrud')}
        {!collapsedSections.has('omskrud') && (
        <View style={styles.listCard}>
          {renderRow('safunkar', 'Så funkar Skrud', { icon: 'help-outline', onPress: () => router.push('/how-it-works') })}
          {renderRow('villkor', 'Användarvillkor', { icon: 'description', onPress: () => router.push('/terms') })}
          {renderRow('integritet', 'Integritetspolicy', { icon: 'privacy-tip', onPress: () => router.push('/privacy') })}
        </View>
        )}

        <Text style={styles.autosaveHint}>
          {saveState === 'saving' ? tr('Sparar…') : saveState === 'saved' ? tr('Ändringar sparas automatiskt ✓') : tr('Ändringar sparas automatiskt')}
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={loading}>
          <Text style={styles.saveButtonText}>{loading ? tr('Sparar...') : tr('Klar')}</Text>
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
  avatarName: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary, textAlign: 'center', marginBottom: 4 },
  householdRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  householdMember: { alignItems: 'center', width: 76 },
  householdAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: t.primary },
  householdAvatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.border },
  householdName: { fontFamily: 'Lora_500Medium', fontSize: 12, color: t.textSecondary, marginTop: 6, textAlign: 'center' },

  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: t.textSecondary, textTransform: 'uppercase', marginTop: 22, marginBottom: 10, marginLeft: 4 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10, paddingHorizontal: 4 },
  sectionHeaderTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: t.textSecondary, textTransform: 'uppercase' },
  listCard: { backgroundColor: t.surfaceMuted, borderRadius: 18, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  rowLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  rowValue: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, maxWidth: 150, textAlign: 'right' },
  rowBody: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 16, backgroundColor: t.surfaceMuted },

  subLabel: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 13, marginBottom: 8, marginTop: 12 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 8, marginTop: 8 },
  hint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 11, fontStyle: 'italic', marginBottom: 10, marginTop: 4 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surface, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginTop: 6 },
  gravidToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 4 },
  gravidFieldLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, marginTop: 12, marginBottom: 2 },
  pregnantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  pregnantHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 19, marginTop: 6 },
  pregnantBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: t.borderSoft, paddingTop: 12 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, backgroundColor: t.surface, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: t.border },
  restoreBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: t.primary, borderColor: t.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.textSecondary },
  toggleKnobOn: { alignSelf: 'flex-end', backgroundColor: t.onPrimary },
  accountEmail: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, marginTop: 8, marginBottom: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  autosaveHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 24 },
  saveButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },

  contextNoteGroup: { marginBottom: 12 },
  contextNoteLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary, marginBottom: 6 },
  contextNoteInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surface, borderRadius: 12, padding: 12, color: t.textPrimary, fontSize: 14, borderWidth: 1, borderColor: t.border, minHeight: 44 },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: t.primary, transform: [{ scale: 1.15 }] },
  colorCheck: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  signOutButton: { borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  signOutText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 16 },
  deleteAccountButton: { marginTop: 10, padding: 10, alignItems: 'center' },
  deleteAccountText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, textDecorationLine: 'underline' },
})
