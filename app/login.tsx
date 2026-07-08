import { router } from 'expo-router'
import { useState } from 'react'
import {
  KeyboardAvoidingView, Platform,
  SafeAreaView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAuth() {
    if (!email || !password) {
      showAlert('Fyll i email och lösenord!')
      return
    }
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        showAlert('Konto skapat! 🍒', 'Kolla din email för att verifiera ditt konto.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (Platform.OS === 'web') {
          window.location.href = '/home'
        } else {
          router.replace('/home')
        }
      }
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function forgotPassword() {
    if (!email) {
      showAlert('Fyll i din email först', 'Skriv din emailadress i fältet ovan så skickar vi en återställningslänk.')
      return
    }
    try {
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}/reset-password`
        : 'kladkollen://reset-password'
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      showAlert('Mail skickat! 🍒', 'Kolla din inkorg för en länk att återställa lösenordet.')
    } catch (error: any) {
      showAlert('Något gick fel', error.message)
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
          <Text style={styles.subtitle}>
            {isSignUp ? 'Skapa konto' : 'Logga in'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="din@email.com"
            placeholderTextColor="rgba(108,77,56,0.4)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Lösenord</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(108,77,56,0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Laddar...' : isSignUp ? 'Skapa konto' : 'Logga in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Har du redan ett konto? Logga in'
                : 'Inget konto? Skapa ett här'}
            </Text>
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity style={styles.forgotButton} onPress={forgotPassword}>
              <Text style={styles.forgotText}>Glömt lösenord?</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFAF8' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 40, color: '#402D21', letterSpacing: 3 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 16, color: '#6C4D38', marginTop: 8 },
  form: { gap: 8 },
  label: { fontFamily: 'Poppins_600SemiBold', color: '#402D21', fontSize: 14, marginTop: 8, marginBottom: 4 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: 'rgba(207,181,158,0.3)', borderRadius: 12, padding: 14, color: '#402D21', fontSize: 16, borderWidth: 1, borderColor: 'rgba(108,77,56,0.2)', marginBottom: 4 },
  button: { backgroundColor: '#402D21', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { fontFamily: 'Poppins_600SemiBold', color: '#FEFAF8', fontSize: 16 },
  switchButton: { alignItems: 'center', marginTop: 16, padding: 8 },
  switchText: { fontFamily: 'Lora_400Regular', color: '#6C4D38', fontSize: 14 },
  forgotButton: { alignItems: 'center', padding: 8 },
  forgotText: { fontFamily: 'Lora_400Regular', color: 'rgba(108,77,56,0.7)', fontSize: 13, textDecorationLine: 'underline' },
})