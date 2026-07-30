import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { router } from 'expo-router'
import { useState } from 'react'
import {
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
// Supabase-klienten (detectSessionInUrl) loggar in användaren med recovery-token,
// därefter kan lösenordet bytas här.
export default function ResetPassword() {
  const t = useTheme()
  const { t: tr } = useSettings()
  const styles = makeStyles(t)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showAlert(tr('Länken har gått ut'), tr('Begär en ny återställningslänk från inloggningssidan.'))
        router.replace('/login')
        return
      }
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
