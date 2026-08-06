import Constants from 'expo-constants'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from '../supabase'

export type NotifPrefs = {
  weather: boolean
  rediscovery: boolean
  ootd: boolean
  logreminder: boolean
  seasonal: boolean
  sizereminder: boolean
}

export const DEFAULT_PREFS: NotifPrefs = {
  weather: true, rediscovery: true, ootd: true, logreminder: true, seasonal: true, sizereminder: true,
}

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send'

// Visar notiser även när appen är i förgrunden.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

function projectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    '2f95b5b1-c506-4d79-9aba-94d15424e860'
  )
}

// Registrerar enheten för push, sparar token + plats i profiles så servern
// kan skicka personliga (och väderbaserade) notiser. Säkert att anropa flera
// gånger – gör inget på webben och kräver inte att användaren tackar ja här.
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web') return

  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let status = existing
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync()
      status = req.status
    }
    if (status !== 'granted') return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Skrud',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId: projectId() })
    const token = tokenRes.data
    if (!token) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const update: any = { push_token: token, push_platform: Platform.OS }

    // Plats används bara till väderbaserade notiser. Vi ber inte om den här –
    // om användaren redan gett plats-tillstånd (för vädret på hem) sparar vi den.
    try {
      const perm = await Location.getForegroundPermissionsAsync()
      if (perm.status === 'granted') {
        const loc = await Location.getLastKnownPositionAsync()
        if (loc) { update.push_lat = loc.coords.latitude; update.push_lon = loc.coords.longitude }
      }
    } catch { /* ignorera – plats är valfritt */ }

    await supabase.from('profiles').update(update).eq('id', user.id)
  } catch { /* tyst – notiser är en bonus, inte kritiskt */ }
}

// Skickar en testnotis till den här enheten via samma Expo Push-väg som servern.
// Används för att felsöka: kommer den fram → token + push-credentials fungerar,
// och problemet ligger i cron/servern. Kommer den inte fram → problemet är
// token/credentials (t.ex. saknad APNs-nyckel eller Expo Go). Returnerar ett
// diagnostikmeddelande.
export async function sendTestPush(): Promise<{ ok: boolean; detail: string }> {
  if (Platform.OS === 'web') return { ok: false, detail: 'Push stöds inte på webben.' }
  try {
    const perm = await Notifications.getPermissionsAsync()
    let status = perm.status
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
    if (status !== 'granted') return { ok: false, detail: 'Notistillstånd saknas – tillåt notiser i inställningarna.' }

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId: projectId() })
    const token = tokenRes.data
    if (!token) return { ok: false, detail: 'Kunde inte hämta en push-token för enheten.' }

    const res = await fetch(EXPO_PUSH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify([{ to: token, title: 'Testnotis 🔔', body: 'Push fungerar! 🎉', sound: 'default' }]),
    })
    const json: any = await res.json().catch(() => null)
    const ticket = json?.data?.[0] ?? json?.data
    if (ticket?.status === 'error') {
      return { ok: false, detail: `Expo: ${ticket?.details?.error || ticket?.message || 'okänt fel'}` }
    }
    if (!res.ok) return { ok: false, detail: `Expo svarade ${res.status}.` }
    return { ok: true, detail: token }
  } catch (e: any) {
    return { ok: false, detail: e?.message || 'Något gick fel.' }
  }
}
