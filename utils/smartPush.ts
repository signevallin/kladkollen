import AsyncStorage from '@react-native-async-storage/async-storage'
import * as BackgroundTask from 'expo-background-task'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { ensureCalendarPermission, planForDay } from './calendar'
import { scheduleSizeReminderPush } from './sizeReminderPush'

// "Smart Push": läser telefonens kalender och schemalägger en morgonnotis med
// en outfit som passar dagens planer (samt en eftermiddagspåminnelse om man
// har något inplanerat på kvällen). Allt sker på enheten – kalendern lämnar
// aldrig telefonen. Notisen schemaläggs om vid varje appstart OCH via en
// daglig bakgrundsuppgift, så den håller sig färsk även dagar man inte
// öppnar appen.

const ENABLED_KEY = 'smartpush_enabled'
const TIME_KEY = 'smartpush_time' // "H:M"
const TAG = 'smartpush'
const DEFAULT_HOUR = 7
const DEFAULT_MIN = 30
const EVENING_REMINDER_HOUR = 16
const BG_TASK = 'smartpush-refresh'

// ── Bakgrundsuppgift ────────────────────────────────────────────────
// Definieras på modulnivå (körs vid import i _layout) så systemet kan väcka
// den även när appen är helt stängd. Den bara schemalägger om notisen.
TaskManager.defineTask(BG_TASK, async () => {
  try {
    await scheduleSmartPush()
    // Passa på att uppdatera veckans storleks-digest medan OS:et ändå väckt oss.
    await scheduleSizeReminderPush()
    return BackgroundTask.BackgroundTaskResult.Success
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

async function registerBackground(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(BG_TASK))) {
      await BackgroundTask.registerTaskAsync(BG_TASK, { minimumInterval: 60 * 6 }) // ~6 h
    }
  } catch { /* ignorera – bakgrundskörning är best-effort */ }
}

async function unregisterBackground(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(BG_TASK)) {
      await BackgroundTask.unregisterTaskAsync(BG_TASK)
    }
  } catch { /* ignorera */ }
}

// ── På/av + tid ─────────────────────────────────────────────────────
export async function isSmartPushEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1'
}

export async function getSmartPushTime(): Promise<{ hour: number; minute: number }> {
  const raw = await AsyncStorage.getItem(TIME_KEY)
  if (raw) {
    const [h, m] = raw.split(':').map(Number)
    if (!isNaN(h) && !isNaN(m)) return { hour: h, minute: m }
  }
  return { hour: DEFAULT_HOUR, minute: DEFAULT_MIN }
}

export async function setSmartPushTime(hour: number, minute: number): Promise<void> {
  await AsyncStorage.setItem(TIME_KEY, `${hour}:${minute}`)
  await scheduleSmartPush()
}

// Slår på/av. Vid påslag ber vi om kalender- + notis-tillstånd. Returnerar
// false om något tillstånd nekades (så UI:t kan visa varför).
export async function setSmartPushEnabled(on: boolean): Promise<boolean> {
  if (!on) {
    await AsyncStorage.setItem(ENABLED_KEY, '0')
    await cancelSmartPush()
    await unregisterBackground()
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
  await registerBackground()
  return true
}

// ── Schemaläggning ──────────────────────────────────────────────────
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

// Schemalägger notiser för nästa morgon (idag om det fortfarande är före tiden).
export async function scheduleSmartPush(): Promise<void> {
  if (Platform.OS === 'web') return
  if (!(await isSmartPushEnabled())) return

  try {
    await cancelSmartPush()

    const { hour, minute } = await getSmartPushTime()
    const now = new Date()
    const morningToday = new Date()
    morningToday.setHours(hour, minute, 0, 0)
    // Har morgonen redan passerat → planera för imorgon.
    const targetDay = morningToday <= now ? new Date(now.getTime() + 86400000) : new Date()

    const plan = await planForDay(targetDay)

    const morningTrigger = new Date(targetDay)
    morningTrigger.setHours(hour, minute, 0, 0)
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
