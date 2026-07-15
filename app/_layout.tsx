import { Lora_400Regular, Lora_500Medium } from '@expo-google-fonts/lora'
import { Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins'
import { Stack, router, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { supabase } from '../supabase'
import { ThemeProvider, useTheme, useThemeControl } from '../theme/ThemeProvider'
import '../global.css'

// Sidor som får besökas utan inloggning.
const PUBLIC_ROUTES = ['/', '/login', '/privacy', '/terms', '/reset-password']

function RootLayout() {
  const t = useTheme()
  const { isDark } = useThemeControl()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Lora_400Regular,
    Lora_500Medium,
  })

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

  if (!ready || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="wardrobe" />
        <Stack.Screen name="my-outfit" />
        <Stack.Screen name="collage" />
        <Stack.Screen name="inspiration" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="add-garment" />
        <Stack.Screen name="import-purchases" />
        <Stack.Screen name="garment-detail" />
        <Stack.Screen name="login" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
      </Stack>
    </>
  )
}

export default function Layout() {
  return (
    <ThemeProvider>
      <RootLayout />
    </ThemeProvider>
  )
}
