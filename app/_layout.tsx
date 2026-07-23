import { Lora_400Regular, Lora_500Medium } from '@expo-google-fonts/lora'
import { Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins'
import * as Notifications from 'expo-notifications'
import { Stack, router, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from '../supabase'
import { registerForPush } from '../utils/push'
import { scheduleSmartPush } from '../utils/smartPush'
import { ThemeProvider, useTheme, useThemeControl } from '../theme/ThemeProvider'
import { SettingsProvider } from '../utils/settings'
import { ToastHost } from '../components/Toast'
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

  // Registrera för push när användaren är inloggad, och skicka den vidare
  // till rätt vy när en notis trycks på.
  const coldStartHandled = useRef(false)
  useEffect(() => {
    if (!hasSession) return
    registerForPush()
    // Schemalägg om Smart Push (kalenderbaserad morgonnotis) för nästa morgon.
    scheduleSmartPush()

    // Kallstart: öppnades appen genom att trycka på en notis (från helt stängt
    // läge) hämtar vi den och navigerar till rätt vy – en gång.
    if (!coldStartHandled.current) {
      coldStartHandled.current = true
      Notifications.getLastNotificationResponseAsync().then(res => {
        const route = (res?.notification.request.content.data as any)?.route
        if (typeof route === 'string' && route.startsWith('/')) router.push(route as any)
      }).catch(() => {})
    }

    const sub = Notifications.addNotificationResponseReceivedListener(res => {
      const route = (res.notification.request.content.data as any)?.route
      if (typeof route === 'string' && route.startsWith('/')) router.push(route as any)
    })
    return () => sub.remove()
  }, [hasSession])

  if (!ready || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        {/* Flik-sidorna byts direkt (ingen in-slide) så det känns som en riktig
            flikbar. Detaljsidor (plaggvy, lägg till ...) behåller sin slide. */}
        <Stack.Screen name="home" options={{ animation: 'none' }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="wardrobe" options={{ animation: 'none' }} />
        <Stack.Screen name="my-outfit" options={{ animation: 'none' }} />
        <Stack.Screen name="inspiration" options={{ animation: 'none' }} />
        <Stack.Screen name="stats" />
        <Stack.Screen name="add-garment" />
        <Stack.Screen name="import-purchases" />
        <Stack.Screen name="import-email" />
        <Stack.Screen name="locations" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="garment-detail" />
        <Stack.Screen name="login" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
      </Stack>
      <ToastHost />
    </>
  )
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <RootLayout />
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
