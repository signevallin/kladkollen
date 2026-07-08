import { Stack, router, usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { supabase } from '../supabase'
import '../global.css'

// Sidor som får besökas utan inloggning.
const PUBLIC_ROUTES = ['/', '/login', '/privacy', '/terms', '/reset-password']

export default function Layout() {
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!hasSession && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/login')
    }
  }, [ready, hasSession, pathname])

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#150408' }} />

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="wardrobe" />
      <Stack.Screen name="my-outfit" />
      <Stack.Screen name="collage" />
      <Stack.Screen name="inspiration" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="add-garment" />
      <Stack.Screen name="garment-detail" />
      <Stack.Screen name="login" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  )
}
