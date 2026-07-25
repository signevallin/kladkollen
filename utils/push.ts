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
        name: 'Klädkollen',
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
