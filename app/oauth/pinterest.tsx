import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native'

export default function PinterestOAuth() {
  const [status, setStatus] = useState('Ansluter Pinterest...')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (error) {
      setStatus('Anslutning avbröts')
      setTimeout(() => router.replace('/inspiration'), 1500)
      return
    }
    if (code) {
      exchangeToken(code, state)
    } else {
      router.replace('/inspiration')
    }
  }, [])

  async function exchangeToken(code: string, state: string | null) {
    try {
      const savedState = localStorage.getItem('pinterest_oauth_state')
      if (state && savedState && state !== savedState) {
        setStatus('Ogiltig session, försök igen')
        setTimeout(() => router.replace('/inspiration'), 1500)
        return
      }
      const redirectUri = `${window.location.origin}/oauth/pinterest`
      const res = await fetch('/api/pinterest-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      })
      const data = await res.json()
      if (data.access_token) {
        localStorage.setItem('pinterest_access_token', data.access_token)
        setStatus('Pinterest anslutet! ✓')
      } else {
        setStatus(`Något gick fel: ${data.message || 'okänt fel'}`)
      }
    } catch (e: any) {
      setStatus(`Något gick fel: ${e.message}`)
    }
    setTimeout(() => router.replace('/inspiration'), 1200)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#C4737A" size="large" />
      <Text style={styles.text}>{status}</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408', justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { color: '#C4737A', fontSize: 16 },
})
