import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView, Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'
import { useSettings } from '../utils/settings'
import GoogleIcon from '../components/GoogleIcon'

// Se till att en ev. öppnad auth-webbsession avslutas snyggt (OAuth-återhopp).
WebBrowser.maybeCompleteAuthSession()

// Apple-inloggning kräver den nativa modulen. Vi laddar den skyddat så att
// appen fungerar även innan den finns i bygget (då visas bara knappen inte).
let AppleAuthentication: any = null
try { AppleAuthentication = require('expo-apple-authentication') } catch { AppleAuthentication = null }

// Vilken inloggningsmetod som användes senast – visas som "Senast använd".
const LAST_METHOD_KEY = 'skrud.lastLoginMethod'
type Method = 'google' | 'apple' | 'email'

// Mörk, editorial palett – login-sidan har en egen fullskärmslook oavsett tema.
const C = {
  bg: '#181009',
  ink: '#F6ECE2',
  sub: '#CBB199',
  pill: '#FFFFFF',
  pillInk: '#1A120B',
  gold: '#E4C39B',
}
// Varma toner till collage-mosaiken bakom (fungerar som tygrutor utan foton).
const TILES = ['#4A3120', '#8C5A3C', '#CFB59E', '#5E3E28', '#DBB48D', '#6C4D38', '#A9764F', '#3A2417']
const COL_LEFT = [168, 220, 130, 196]
const COL_RIGHT = [210, 138, 226, 150]
const { width: SCREEN_W } = Dimensions.get('window')

export default function Login() {
  const { t: tr } = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [social, setSocial] = useState<null | 'apple' | 'google'>(null)
  const [appleAvailable, setAppleAvailable] = useState(false)
  const [mode, setMode] = useState<'providers' | 'email'>('providers')
  const [lastMethod, setLastMethod] = useState<Method | null>(null)

  useEffect(() => {
    if (Platform.OS === 'ios' && AppleAuthentication?.isAvailableAsync) {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false))
    }
    AsyncStorage.getItem(LAST_METHOD_KEY).then(m => {
      if (m === 'google' || m === 'apple' || m === 'email') setLastMethod(m)
    }).catch(() => {})
  }, [])

  async function rememberMethod(m: Method) {
    setLastMethod(m)
    try { await AsyncStorage.setItem(LAST_METHOD_KEY, m) } catch {}
  }

  function goHome() {
    if (Platform.OS === 'web') window.location.href = '/home'
    else router.replace('/home')
  }

  function openEmail(signUp: boolean) {
    setIsSignUp(signUp)
    setMode('email')
  }

  async function handleAuth() {
    if (!email || !password) {
      showAlert(tr('Fyll i email och lösenord!'))
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        await rememberMethod('email')
        showAlert(tr('Konto skapat!'), tr('Kolla din email för att verifiera ditt konto.'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        await rememberMethod('email')
        goHome()
      }
    } catch (error: any) {
      showAlert(tr('Något gick fel'), error.message)
    } finally {
      setLoading(false)
    }
  }

  async function forgotPassword() {
    if (!email) {
      showAlert(tr('Fyll i din email först'), tr('Skriv din emailadress i fältet ovan så skickar vi en återställningslänk.'))
      return
    }
    try {
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}/reset-password`
        : 'kladkollen://reset-password'
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      showAlert(tr('Mail skickat!'), tr('Kolla din inkorg för en länk att återställa lösenordet.'))
    } catch (error: any) {
      showAlert(tr('Något gick fel'), error.message)
    }
  }

  // ── Logga in med Apple (nativt) ─────────────────────────────────────────
  async function signInWithApple() {
    if (!AppleAuthentication) return
    setSocial('apple')
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error('Ingen identitetstoken från Apple.')
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      if (error) throw error
      // Apple skickar bara namnet vid FÖRSTA inloggningen – spara det då.
      const given = credential.fullName?.givenName
      if (given && data.user) {
        const name = [given, credential.fullName?.familyName].filter(Boolean).join(' ')
        await supabase.from('profiles').upsert({ id: data.user.id, name }).then(() => {}, () => {})
      }
      await rememberMethod('apple')
      goHome()
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return // användaren avbröt
      showAlert(tr('Kunde inte logga in med Apple'), e.message || tr('Försök igen.'))
    } finally {
      setSocial(null)
    }
  }

  // ── Logga in med Google (OAuth) ─────────────────────────────────────────
  async function signInWithGoogle() {
    setSocial('google')
    try {
      if (Platform.OS === 'web') {
        await rememberMethod('google')
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/home` },
        })
        if (error) throw error
        return // webben omdirigerar själv
      }
      // Ren scheme-URL (samma stil som reset-password) så den matchar exakt det
      // som ligger i Supabases Redirect URLs. createURL('/home') gav tidigare
      // kladkollen:///home (tre snedstreck) → matchade inte → föll tillbaka på
      // webb-Site-URL:en, därav att man hamnade i webbläsaren.
      const redirectTo = 'kladkollen://home'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (!data?.url) throw new Error('Ingen inloggnings-URL.')
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type === 'success' && result.url) {
        const code = Linking.parse(result.url).queryParams?.code
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(String(code))
          if (exErr) throw exErr
          await rememberMethod('google')
          goHome()
        }
      }
    } catch (e: any) {
      showAlert(tr('Kunde inte logga in med Google'), e.message || tr('Försök igen.'))
    } finally {
      setSocial(null)
    }
  }

  const busy = loading || social !== null

  function renderPill(opts: {
    key: string
    onPress: () => void
    icon: React.ReactNode
    label: string
    loading?: boolean
    method: Method
  }) {
    return (
      <TouchableOpacity
        key={opts.key}
        style={[styles.pill, busy && styles.pillDisabled]}
        onPress={opts.onPress}
        disabled={busy}
        activeOpacity={0.85}
      >
        {lastMethod === opts.method && (
          <View style={styles.badge}><Text style={styles.badgeText}>{tr('Senast använd')}</Text></View>
        )}
        {opts.loading
          ? <ActivityIndicator color={C.pillInk} />
          : <>
              <View style={styles.pillIcon}>{opts.icon}</View>
              <Text style={styles.pillText}>{opts.label}</Text>
            </>}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Collage-mosaik i varma toner (bakgrund) */}
      <View style={styles.collage} pointerEvents="none">
        <View style={styles.col}>
          {COL_LEFT.map((h, i) => (
            <View key={`l${i}`} style={[styles.tile, { height: h, backgroundColor: TILES[(i * 2) % TILES.length] }]} />
          ))}
        </View>
        <View style={styles.col}>
          {COL_RIGHT.map((h, i) => (
            <View key={`r${i}`} style={[styles.tile, { height: h, backgroundColor: TILES[(i * 2 + 1) % TILES.length] }]} />
          ))}
        </View>
      </View>

      {/* Mörk gradient-skärm så rubrik och knappar syns tydligt */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.bg} stopOpacity="0.2" />
            <Stop offset="0.4" stopColor={C.bg} stopOpacity="0.5" />
            <Stop offset="0.68" stopColor={C.bg} stopOpacity="0.94" />
            <Stop offset="1" stopColor={C.bg} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#scrim)" />
      </Svg>

      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <Text style={styles.wordmark}>SKRUD</Text>
        </View>

        {mode === 'providers' ? (
          <View style={styles.bottom}>
            <Text style={styles.hero}>{tr('Din digitala garderob')}</Text>

            <View style={styles.pills}>
              {renderPill({
                key: 'google',
                onPress: signInWithGoogle,
                icon: <GoogleIcon size={20} />,
                label: tr('Fortsätt med Google'),
                loading: social === 'google',
                method: 'google',
              })}

              {appleAvailable && renderPill({
                key: 'apple',
                onPress: signInWithApple,
                icon: <Ionicons name="logo-apple" size={22} color={C.pillInk} />,
                label: tr('Fortsätt med Apple'),
                loading: social === 'apple',
                method: 'apple',
              })}

              {renderPill({
                key: 'email',
                onPress: () => openEmail(true),
                icon: <Ionicons name="mail-outline" size={20} color={C.pillInk} />,
                label: tr('Fortsätt med e-post'),
                method: 'email',
              })}
            </View>

            <TouchableOpacity style={styles.footerBtn} onPress={() => openEmail(false)} disabled={busy}>
              <Text style={styles.footer}>
                {tr('Har du redan ett konto? ')}
                <Text style={styles.footerBold}>{tr('Logga in')}</Text>
              </Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              {tr('Genom att fortsätta godkänner du våra ')}
              <Text style={styles.legalLink} onPress={() => router.push('/terms')}>{tr('Villkor')}</Text>
              {tr(' och ')}
              <Text style={styles.legalLink} onPress={() => router.push('/privacy')}>{tr('Integritetspolicy')}</Text>
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.emailWrap}
          >
            <ScrollView contentContainerStyle={styles.emailScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.sheet}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setMode('providers')} disabled={busy}>
                  <Ionicons name="chevron-back" size={22} color={C.ink} />
                </TouchableOpacity>

                <Text style={styles.sheetTitle}>{isSignUp ? tr('Skapa konto') : tr('Välkommen tillbaka')}</Text>
                <Text style={styles.sheetSub}>
                  {isSignUp ? tr('Kom igång på ett par sekunder.') : tr('Logga in för att fortsätta.')}
                </Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="din@email.com"
                  placeholderTextColor="rgba(203,177,153,0.6)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />

                <Text style={styles.label}>{tr('Lösenord')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(203,177,153,0.6)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType={isSignUp ? 'newPassword' : 'password'}
                />

                <TouchableOpacity style={[styles.submit, busy && styles.pillDisabled]} onPress={handleAuth} disabled={busy}>
                  {loading
                    ? <ActivityIndicator color={C.pillInk} />
                    : <Text style={styles.submitText}>{isSignUp ? tr('Skapa konto') : tr('Logga in')}</Text>}
                </TouchableOpacity>

                {!isSignUp && (
                  <TouchableOpacity style={styles.forgotBtn} onPress={forgotPassword} disabled={busy}>
                    <Text style={styles.forgotText}>{tr('Glömt lösenord?')}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.switchBtn} onPress={() => setIsSignUp(!isSignUp)} disabled={busy}>
                  <Text style={styles.switchText}>
                    {isSignUp ? tr('Har du redan ett konto? ') : tr('Inget konto? ')}
                    <Text style={styles.switchTextBold}>{isSignUp ? tr('Logga in') : tr('Skapa ett här')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  )
}

const TILE_COL_W = (SCREEN_W - 30) / 2

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  collage: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 10, padding: 10, paddingTop: 40 },
  col: { width: TILE_COL_W, gap: 10 },
  tile: { width: '100%', borderRadius: 18 },

  safe: { flex: 1, justifyContent: 'space-between' },
  topRow: { alignItems: 'center', paddingTop: 12 },
  wordmark: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: C.ink, letterSpacing: 6 },

  bottom: { paddingHorizontal: 22, paddingBottom: 12 },
  hero: { fontFamily: 'Lora_500Medium', fontSize: 52, lineHeight: 56, color: C.ink, marginBottom: 26 },

  pills: { gap: 12 },
  pill: {
    height: 58, borderRadius: 30, backgroundColor: C.pill,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  pillDisabled: { opacity: 0.6 },
  pillIcon: { position: 'absolute', left: 24 },
  pillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16.5, color: C.pillInk },
  badge: {
    position: 'absolute', top: -11, right: 22, backgroundColor: C.gold,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: C.pillInk },

  footerBtn: { alignItems: 'center', marginTop: 22, padding: 8 },
  footer: { fontFamily: 'Lora_400Regular', fontSize: 14.5, color: C.sub },
  footerBold: { fontFamily: 'Poppins_600SemiBold', color: C.ink },
  legal: { fontFamily: 'Lora_400Regular', fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 6, paddingHorizontal: 16, lineHeight: 18 },
  legalLink: { fontFamily: 'Poppins_600SemiBold', color: C.ink, textDecorationLine: 'underline' },

  emailWrap: { flex: 1, justifyContent: 'flex-end' },
  emailScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#241811', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 34, borderWidth: 1, borderColor: 'rgba(245,233,223,0.10)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,233,223,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  sheetTitle: { fontFamily: 'Lora_500Medium', fontSize: 26, color: C.ink },
  sheetSub: { fontFamily: 'Lora_400Regular', fontSize: 14, color: C.sub, marginTop: 4, marginBottom: 16 },

  label: { fontFamily: 'Poppins_600SemiBold', color: C.ink, fontSize: 13, marginTop: 10, marginBottom: 6 },
  input: {
    fontFamily: 'Lora_400Regular', backgroundColor: 'rgba(245,233,223,0.08)', borderRadius: 14,
    padding: 15, color: C.ink, fontSize: 16, borderWidth: 1, borderColor: 'rgba(245,233,223,0.12)',
  },
  submit: {
    backgroundColor: C.pill, borderRadius: 28, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  submitText: { fontFamily: 'Poppins_600SemiBold', color: C.pillInk, fontSize: 16 },
  forgotBtn: { alignItems: 'center', paddingVertical: 12 },
  forgotText: { fontFamily: 'Lora_400Regular', color: C.sub, fontSize: 13, textDecorationLine: 'underline' },
  switchBtn: { alignItems: 'center', marginTop: 6, padding: 8 },
  switchText: { fontFamily: 'Lora_400Regular', color: C.sub, fontSize: 14 },
  switchTextBold: { fontFamily: 'Poppins_600SemiBold', color: C.gold },
})
