import { router } from 'expo-router'
import { useState } from 'react'
import {
    Alert, KeyboardAvoidingView, Platform,
    SafeAreaView,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Fyll i email och lösenord!')
      return
    }
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        Alert.alert('Konto skapat! 🍒', 'Kolla din email för att verifiera ditt konto.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/home')
      }
    } catch (error: any) {
      Alert.alert('Något gick fel', error.message)
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>KLÄDKOLLEN</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Skapa konto' : 'Logga in'}
          </Text>
        </View>

        {/* Formulär */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="din@email.com"
            placeholderTextColor="rgba(196,115,122,0.4)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Lösenord</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(196,115,122,0.4)"
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FBF3EF',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#C4737A',
    marginTop: 8,
  },
  form: { gap: 8 },
  label: {
    color: '#FBF3EF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#FBF3EF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#9E2035',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FBF3EF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  switchText: {
    color: '#C4737A',
    fontSize: 14,
  },
})
