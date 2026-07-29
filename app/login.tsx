import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView, Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
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

export default function Login() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [social, setSocial] = useState<null | 'apple' | 'google'>(null)
  const [appleAvailable, setAppleAvailable] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'ios' && AppleAuthentication?.isAvailableAsync) {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false))
    }
  }, [])

  function goHome() {
    if (Platform.OS === 'web') window.location.href = '/home'
    else router.replace('/home')
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
        showAlert(tr('Konto skapat!'), tr('Kolla din email för att verifiera ditt konto.'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
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
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/home` },
        })
        if (error) throw error
        return // webben omdirigerar själv
      }
      const redirectTo = Linking.createURL('/home')
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="shirt-outline" size={30} color={t.onPrimary} />
            </View>
            <Text style={styles.title}>KLÄDKOLLEN</Text>
            <Text style={styles.tagline}>{tr('Din digitala garderob')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? tr('Skapa konto') : tr('Välkommen tillbaka')}</Text>
            <Text style={styles.cardSub}>
              {isSignUp ? tr('Kom igång på ett par sekunder.') : tr('Logga in för att fortsätta.')}
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="din@email.com"
              placeholderTextColor={t.placeholder}
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
              placeholderTextColor={t.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isSignUp ? 'newPassword' : 'password'}
            />

            <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={handleAuth} disabled={busy}>
              {loading
                ? <ActivityIndicator color={t.onPrimary} />
                : <Text style={styles.buttonText}>{isSignUp ? tr('Skapa konto') : tr('Logga in')}</Text>}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotButton} onPress={forgotPassword} disabled={busy}>
                <Text style={styles.forgotText}>{tr('Glömt lösenord?')}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{tr('eller')}</Text>
              <View style={styles.divider} />
            </View>

            {appleAvailable && (
              <TouchableOpacity style={[styles.appleBtn, busy && styles.buttonDisabled]} onPress={signInWithApple} disabled={busy}>
                {social === 'apple'
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="logo-apple" size={19} color="#fff" style={styles.socialIcon} />
                      <Text style={styles.appleBtnText}>{tr('Fortsätt med Apple')}</Text>
                    </>}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.googleBtn, busy && styles.buttonDisabled]} onPress={signInWithGoogle} disabled={busy}>
              {social === 'google'
                ? <ActivityIndicator color={t.textPrimary} />
                : <>
                    <View style={styles.socialIcon}><GoogleIcon size={18} /></View>
                    <Text style={styles.googleBtnText}>{tr('Fortsätt med Google')}</Text>
                  </>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.switchButton} onPress={() => setIsSignUp(!isSignUp)} disabled={busy}>
            <Text style={styles.switchText}>
              {isSignUp ? tr('Har du redan ett konto? ') : tr('Inget konto? ')}
              <Text style={styles.switchTextBold}>{isSignUp ? tr('Logga in') : tr('Skapa ett här')}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 34, color: t.textPrimary, letterSpacing: 3 },
  tagline: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textSecondary, marginTop: 6 },

  card: { backgroundColor: t.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: t.border },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  cardSub: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 4, marginBottom: 14 },

  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 13, marginTop: 10, marginBottom: 6 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border },
  button: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 18, minHeight: 54, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  forgotButton: { alignItems: 'center', paddingVertical: 12 },
  forgotText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, textDecorationLine: 'underline' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 12 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border },
  dividerText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint },

  socialIcon: { marginRight: 10 },
  appleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderRadius: 16, minHeight: 54, marginBottom: 10 },
  appleBtnText: { fontFamily: 'Poppins_600SemiBold', color: '#fff', fontSize: 16 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface, borderRadius: 16, minHeight: 54, borderWidth: 1, borderColor: t.border },
  googleBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 16 },

  switchButton: { alignItems: 'center', marginTop: 22, padding: 8 },
  switchText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  switchTextBold: { fontFamily: 'Poppins_600SemiBold', color: t.primary },
})
