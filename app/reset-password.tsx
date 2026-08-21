import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as Linking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'
import { useSettings } from '../utils/settings'

// Landningssida för återställningslänken i mailet.
//
// Sessionen måste upprättas HÄR. detectSessionInUrl är en ren webbmekanism – den
// läser window.location och gör ingenting i React Native, så på mobilen kom
// användaren fram till formuläret helt utan session och fick "Länken har gått
// ut" oavsett hur färsk länken var. Google-inloggningen slapp problemet för att
// den fångar sin kod från WebBrowser.openAuthSessionAsync; en mejllänk öppnar i
// stället appen utifrån, och då är det routens parametrar som bär token.
//
// Med flowType 'pkce' kommer länken som ?code=… och löses in med
// exchangeCodeForSession. Äldre länkar (implicit flow) bär i stället
// access_token/refresh_token – båda hanteras nedan.
// supabase-js sparar PKCE-verifieraren i localStorage under en nyckel som slutar
// på "code-verifier". Finns den inte har den här klienten inte begärt länken.
function hasCodeVerifier(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false
    return Object.keys(window.localStorage).some(k => k.includes('code-verifier'))
  } catch { return false }
}

export default function ResetPassword() {
  const t = useTheme()
  const { t: tr } = useSettings()
  const styles = makeStyles(t)
  const params = useLocalSearchParams<{
    code?: string; access_token?: string; refresh_token?: string; error_description?: string
  }>()
  // Återställningslänken bär sina tokens i URL:ens FRAGMENT (#access_token=…),
  // inte som query-parametrar – useLocalSearchParams ser aldrig fragment. På
  // webben plockar detectSessionInUrl upp dem åt oss; öppnas skärmen i stället
  // via en djuplänk måste vi läsa fragmentet själva.
  const incomingUrl = Linking.useURL()
  const fragment = useMemo(() => {
    const raw = incomingUrl?.split('#')[1]
    if (!raw) return null
    const q = new URLSearchParams(raw)
    return {
      access_token: q.get('access_token'), refresh_token: q.get('refresh_token'),
      error_description: q.get('error_description'),
    }
  }, [incomingUrl])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [linkState, setLinkState] = useState<'checking' | 'ready' | 'invalid' | 'openInApp'>('checking')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Supabase skickar tillbaka fel i URL:en i stället för att bara utebli,
        // t.ex. otp_expired när länken redan använts eller hunnit gå ut.
        const err = params.error_description || fragment?.error_description
        if (err) throw new Error(String(err))

        // PKCE binder inlösen till klienten som BEGÄRDE länken: code verifier
        // ligger i den klientens lagring. Begäran görs i appen, men Supabase
        // redirectar till webbsidan (Safari kan inte lämna över till ett custom
        // scheme från en redirect). Safari har alltså aldrig sett verifieraren.
        //
        // Försök därför inte lösa in koden här utan den – ett misslyckat försök
        // riskerar bara att bränna en engångskod. Lämna i stället över till
        // appen via ett knapptryck; en användargest får iOS att öppna schemat.
        if (Platform.OS === 'web' && params.code && !hasCodeVerifier()) {
          if (alive) setLinkState('openInApp')
          return
        }

        const access = params.access_token || fragment?.access_token
        const refresh = params.refresh_token || fragment?.refresh_token

        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(String(params.code))
          if (error) throw error
        } else if (access && refresh) {
          const { error } = await supabase.auth.setSession({
            access_token: String(access), refresh_token: String(refresh),
          })
          if (error) throw error
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (alive) setLinkState(session ? 'ready' : 'invalid')
      } catch {
        if (alive) setLinkState('invalid')
      }
    })()
    return () => { alive = false }
  }, [params.code, params.access_token, params.refresh_token, params.error_description, fragment])

  function openInApp() {
    const code = params.code ? `?code=${encodeURIComponent(String(params.code))}` : ''
    Linking.openURL(`kladkollen://reset-password${code}`).catch(() => {
      showAlert(tr('Kunde inte öppna Skrud'), tr('Öppna appen manuellt och begär en ny återställningslänk.'))
    })
  }

  async function updatePassword() {
    if (password.length < 8) {
      showAlert(tr('För kort lösenord'), tr('Använd minst 8 tecken.'))
      return
    }
    if (password !== confirm) {
      showAlert(tr('Lösenorden matchar inte'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      showAlert(tr('Lösenord uppdaterat!'))
      router.replace('/home')
    } catch (error: any) {
      showAlert(tr('Något gick fel'), error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>SKRUD</Text>
          <Text style={styles.subtitle}>{tr('Välj nytt lösenord')}</Text>
        </View>

        {linkState === 'checking' ? (
          <ActivityIndicator color={t.primary} />
        ) : linkState === 'openInApp' ? (
          <View style={styles.form}>
            <Text style={styles.subtitle}>{tr('Sista steget sker i Skrud-appen. Av säkerhetsskäl kan lösenordet bara bytas där du begärde länken.')}</Text>
            <TouchableOpacity style={styles.button} onPress={openInApp}>
              <Text style={styles.buttonText}>{tr('Öppna i Skrud')}</Text>
            </TouchableOpacity>
          </View>
        ) : linkState === 'invalid' ? (
          <View style={styles.form}>
            <Text style={styles.subtitle}>{tr('Länken har gått ut eller är redan använd. Begär en ny återställningslänk från inloggningssidan.')}</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
              <Text style={styles.buttonText}>{tr('Till inloggningen')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={styles.form}>
          <Text style={styles.label}>{tr('Nytt lösenord')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={t.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>{tr('Upprepa lösenordet')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={t.placeholder}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={updatePassword} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? tr('Sparar...') : tr('Spara nytt lösenord')}</Text>
          </TouchableOpacity>
        </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 40, color: t.textPrimary, letterSpacing: 3 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 16, color: t.textSecondary, marginTop: 8 },
  form: { gap: 8 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginTop: 8, marginBottom: 4 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 4 },
  button: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
})
