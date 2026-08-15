import { Lora_400Regular, Lora_500Medium } from '@expo-google-fonts/lora'
import { Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Stack, router, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from '../supabase'
import { hydrateCache } from '../utils/cache'
import { registerForPush } from '../utils/push'
import { scheduleSmartPush, scheduleLogReminder } from '../utils/smartPush'
import { mirrorLocalTripToDb } from '../utils/trip'
import { ONBOARDING_DONE_KEY } from './onboarding'
import { ThemeProvider, useTheme, useThemeControl } from '../theme/ThemeProvider'
import { SettingsProvider } from '../utils/settings'
import { EntitlementsProvider } from '../utils/entitlements'
import { ToastHost } from '../components/Toast'
import { ConfirmHost } from '../components/ConfirmDialog'
import { initSentry, wrapWithSentry } from '../utils/sentry'
import '../global.css'

// Starta kraschrapportering så tidigt som möjligt (no-op utan modul/DSN).
initSentry()

// Sidor som får besökas utan inloggning.
const PUBLIC_ROUTES = ['/', '/login', '/privacy', '/terms', '/reset-password']

function RootLayout() {
  const t = useTheme()
  const { isDark } = useThemeControl()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  const sentToOnboarding = useRef(false)
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Lora_400Regular,
    Lora_500Medium,
  })

  useEffect(() => {
    // Hydrera disk-cachen och läs sessionen parallellt. Cachen fylls innan
    // flikarna monteras (ready=true), så en kallstart kan visa senast kända
    // data direkt i varje flik i stället för en tom laddande vy.
    Promise.all([hydrateCache(), supabase.auth.getSession()]).then(([, { data: { session } }]) => {
      setHasSession(!!session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session)
    })
    AsyncStorage.getItem(ONBOARDING_DONE_KEY)
      .then(v => setOnboarded(!!v))
      .catch(() => setOnboarded(true)) // vid fel: hoppa inte in i introt
  }, [])

  useEffect(() => {
    if (!ready || onboarded === null) return
    if (!hasSession && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/login')
      return
    }
    // Första gången en inloggad användare som inte sett introt landar: visa det
    // en gång (styrs av en ref så vi inte studsar tillbaka efter att det klarats).
    if (hasSession && !onboarded && !sentToOnboarding.current && pathname !== '/onboarding') {
      sentToOnboarding.current = true
      router.replace('/onboarding')
    }
  }, [ready, hasSession, onboarded, pathname])

  // Registrera för push när användaren är inloggad, och skicka den vidare
  // till rätt vy när en notis trycks på.
  const coldStartHandled = useRef(false)
  useEffect(() => {
    if (!hasSession) return
    registerForPush()
    // Schemalägg om Smart Push (kalenderbaserad morgonnotis) för nästa morgon.
    scheduleSmartPush()
    // Schemalägg om den fristående kvällspåminnelsen "logga dagens outfit".
    scheduleLogReminder()
    // Spegla ev. lokal resa till molnet direkt vid start, så partnern kan se den
    // även om man aldrig öppnar Outfits-fliken.
    mirrorLocalTripToDb()

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

  if (!ready || onboarded === null || (!fontsLoaded && !fontError)) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        {/* Flikskärmarna ligger i (tabs)-gruppen och hålls monterade där.
            Gruppen byts in utan slide; detaljsidor behåller sin slide. */}
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="wardrobe-analysis" />
        <Stack.Screen name="partner" />
        <Stack.Screen name="family" />
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
        <Stack.Screen name="how-it-works" />
        <Stack.Screen name="pregnancy-wardrobe" />
        <Stack.Screen name="child-outfit" />
        <Stack.Screen name="family-today" />
      </Stack>
      <ToastHost />
      <ConfirmHost />
    </>
  )
}

function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <EntitlementsProvider>
            <RootLayout />
          </EntitlementsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

// Wrappa roten så Sentry fångar renderingsfel/krascher (no-op utan modul/DSN).
export default wrapWithSentry(Layout)
