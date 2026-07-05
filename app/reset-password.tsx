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

// Landningssida för återställningslänken i mailet.
// Supabase-klienten (detectSessionInUrl) loggar in användaren med recovery-token,
// därefter kan lösenordet bytas här.
export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function updatePassword() {
    if (password.length < 8) {
      showAlert('För kort lösenord', 'Använd minst 8 tecken.')
      return
    }
    if (password !== confirm) {
      showAlert('Lösenorden matchar inte')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showAlert('Länken har gått ut', 'Begär en ny återställningslänk från inloggningssidan.')
        router.replace('/login')
        return
      }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      showAlert('Lösenord uppdaterat! 🍒')
      router.replace('/home')
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
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
          <Text style={styles.title}>KLÄDKOLLEN</Text>
          <Text style={styles.subtitle}>Välj nytt lösenord</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nytt lösenord</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(196,115,122,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Upprepa lösenordet</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(196,115,122,0.4)"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={updatePassword} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Sparar...' : 'Spara nytt lösenord'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 40, fontWeight: 'bold', color: '#FBF3EF', letterSpacing: 3 },
  subtitle: { fontSize: 16, color: '#C4737A', marginTop: 8 },
  form: { gap: 8 },
  label: { color: '#FBF3EF', fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, padding: 14, color: '#FBF3EF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', marginBottom: 4 },
  button: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },
})
