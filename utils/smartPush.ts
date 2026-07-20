import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { ensureCalendarPermission, planForDay } from './calendar'

// "Smart Push": läser telefonens kalender och schemalägger en morgonnotis med
// en outfit som passar dagens planer (samt en eftermiddagspåminnelse om man
// har något inplanerat på kvällen). Allt sker på enheten – kalendern lämnar
// aldrig telefonen. Notisen schemaläggs om varje gång appen öppnas.

const ENABLED_KEY = 'smartpush_enabled'
const TAG = 'smartpush'
const MORNING_HOUR = 7
const MORNING_MIN = 30
const EVENING_REMINDER_HOUR = 16

export async function isSmartPushEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1'
}

// Slår på/av. Vid påslag ber vi om kalender- + notis-tillstånd. Returnerar
// false om något tillstånd nekades (så UI:t kan visa varför).
export async function setSmartPushEnabled(on: boolean): Promise<boolean> {
  if (!on) {
    await AsyncStorage.setItem(ENABLED_KEY, '0')
    await cancelSmartPush()
    return true
  }
  if (Platform.OS === 'web') return false
  const okCal = await ensureCalendarPermission()
  if (!okCal) return false
  const perm = await Notifications.getPermissionsAsync()
  const okNotif = perm.status === 'granted' || (await Notifications.requestPermissionsAsync()).status === 'granted'
  if (!okNotif) return false
  await AsyncStorage.setItem(ENABLED_KEY, '1')
  await scheduleSmartPush()
  return true
}

async function cancelSmartPush(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync()
    for (const n of all) {
      if ((n.content.data as any)?.tag === TAG) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  } catch { /* ignorera */ }
}

// Schemalägger notiser för nästa morgon (idag om det fortfarande är före 07:30).
export async function scheduleSmartPush(): Promise<void> {
  if (Platform.OS === 'web') return
  if (!(await isSmartPushEnabled())) return

  try {
    await cancelSmartPush()

    const now = new Date()
    const morningToday = new Date()
    morningToday.setHours(MORNING_HOUR, MORNING_MIN, 0, 0)
    // Har morgonen redan passerat → planera för imorgon.
    const targetDay = morningToday <= now ? new Date(now.getTime() + 86400000) : new Date()

    const plan = await planForDay(targetDay)

    const morningTrigger = new Date(targetDay)
    morningTrigger.setHours(MORNING_HOUR, MORNING_MIN, 0, 0)
    if (morningTrigger > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'God morgon! ☀️',
          body: `${plan.summary} – jag har valt ut en outfit som passar!`,
          data: { tag: TAG, route: `/home?smartContext=${encodeURIComponent(plan.contextLabel)}` },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morningTrigger },
      })
    }

    // Har man något på kvällen: påminn på eftermiddagen om att byta om.
    if (plan.eveningEvent) {
      const eveningTrigger = new Date(targetDay)
      eveningTrigger.setHours(EVENING_REMINDER_HOUR, 0, 0, 0)
      if (eveningTrigger > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Dags att fixa kvällslooken 👠',
            body: `${plan.eveningEvent} ikväll – glöm inte att byta om (och ta med klackarna!).`,
            data: { tag: TAG, route: `/home?smartContext=${encodeURIComponent(plan.contextLabel)}` },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eveningTrigger },
        })
      }
    }
  } catch { /* tyst – notiser är en bonus */ }
}
