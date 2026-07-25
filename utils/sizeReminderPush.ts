import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { loadPeople, loadSizedGarments } from './people'
import { computeSizeReminders } from './sizeReminders'

// Veckodigest för hand-me-down-storlekar (spec §6): en gång i veckan påminner
// appen om vilka sparade plagg som är redo att tas fram. Beräknas PÅ ENHETEN
// (samma modell som listan i familjevyn) och schemaläggs som en lokal notis –
// ingen server/cron behövs, i linje med Smart Push. Schemaläggs om vid varje
// appstart och via bakgrundsuppgiften, så den håller sig färsk.

const ENABLED_KEY = 'sizereminder_enabled'
const TAG = 'sizereminder'
const DIGEST_WEEKDAY = 0   // 0 = söndag
const DIGEST_HOUR = 18
const DIGEST_MIN = 0

export async function isSizeReminderPushEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1'
}

export async function setSizeReminderPushEnabled(on: boolean): Promise<boolean> {
  if (!on) {
    await AsyncStorage.setItem(ENABLED_KEY, '0')
    await cancelSizeReminderPush()
    return true
  }
  if (Platform.OS === 'web') return false
  const perm = await Notifications.getPermissionsAsync()
  const ok = perm.status === 'granted' || (await Notifications.requestPermissionsAsync()).status === 'granted'
  if (!ok) return false
  await AsyncStorage.setItem(ENABLED_KEY, '1')
  await scheduleSizeReminderPush()
  return true
}

async function cancelSizeReminderPush(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync()
    for (const n of all) {
      if ((n.content.data as any)?.tag === TAG) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  } catch { /* ignorera */ }
}

// Nästa tidpunkt för veckans digest (given veckodag + klockslag).
function nextDigestDate(now: Date): Date {
  const d = new Date(now)
  d.setHours(DIGEST_HOUR, DIGEST_MIN, 0, 0)
  let add = (DIGEST_WEEKDAY - d.getDay() + 7) % 7
  if (add === 0 && d <= now) add = 7
  d.setDate(d.getDate() + add)
  return d
}

export async function scheduleSizeReminderPush(): Promise<void> {
  if (Platform.OS === 'web') return
  if (!(await isSizeReminderPushEnabled())) return

  try {
    await cancelSizeReminderPush()

    const [people, garments] = await Promise.all([loadPeople(), loadSizedGarments()])
    const children = people.filter(p => p.type === 'child')
    if (children.length === 0) return

    const ready = computeSizeReminders(garments, children, new Date()).filter(r => r.state === 'ready')
    if (ready.length === 0) return // inget att ta fram → ingen notis

    // Vanligaste platsen ("kartong 3, vinden") för en konkret uppmaning.
    const locCount: Record<string, number> = {}
    for (const r of ready) if (r.location) locCount[r.location] = (locCount[r.location] || 0) + 1
    const topLoc = Object.entries(locCount).sort((a, b) => b[1] - a[1])[0]?.[0]

    const n = ready.length
    const body = `${n} ${n === 1 ? 'plagg är' : 'plagg är'} redo att ta fram${topLoc ? ` – ${topLoc}` : ''}.`

    const when = nextDigestDate(new Date())
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Dags att ta fram nästa storlek 👶',
        body,
        data: { tag: TAG, route: '/family' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    })
  } catch { /* tyst – notiser är en bonus */ }
}
