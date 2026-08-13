import AsyncStorage from '@react-native-async-storage/async-storage'
import * as BackgroundTask from 'expo-background-task'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { ensureCalendarPermission, planForDay } from './calendar'

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
const EVENING_LOG_HOUR = 20              // "vad hade du på dig idag?"-påminnelsen
const LOGGED_KEY = 'outfit_logged_date'  // YYYY-MM-DD (UTC) för senast loggade dag
const LOG_TAG = 'logreminder'            // egen tag – helt fristående från Smart Push
const LOG_ENABLED_KEY = 'logreminder_enabled' // lokal spegling av notif-pref
const BG_TASK = 'smartpush-refresh'

// Datumsträng i samma format som outfit_calendar använder (UTC), så
// jämförelsen "har dagen loggats?" stämmer med det appen faktiskt sparar.
function dayStr(d: Date): string { return d.toISOString().split('T')[0] }

// ── Bakgrundsuppgift ────────────────────────────────────────────────
// Definieras på modulnivå (körs vid import i _layout) så systemet kan väcka
// den även när appen är helt stängd. Den bara schemalägger om notisen.
TaskManager.defineTask(BG_TASK, async () => {
  try {
    await scheduleSmartPush()
    await scheduleLogReminder()
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

// Bakgrundsuppgiften delas av Smart Push och kvällspåminnelsen. Registrera den
// om någon av dem är på, avregistrera bara när båda är av.
async function syncBackground(): Promise<void> {
  const anyOn = (await isSmartPushEnabled()) || (await isLogReminderEnabled())
  if (anyOn) await registerBackground()
  else await unregisterBackground()
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
    await syncBackground()
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
  await syncBackground()
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

// ── Fristående kvällspåminnelse "logga dagens outfit" ───────────────
// Helt oberoende av Smart Push: egen på/av-flagga (speglar notif-preferensen
// logreminder) och egen notis-tag. Kräver bara notistillstånd, inte kalender.

export async function isLogReminderEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOG_ENABLED_KEY)) === '1'
}

// Slår på/av den lokala kvällspåminnelsen. Anropas från notisinställningarna
// med (notiser på && logreminder-pref på).
export async function setLogReminderEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(LOG_ENABLED_KEY, on ? '1' : '0')
  await scheduleLogReminder()
  await syncBackground()
}

async function cancelLogReminder(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync()
    for (const n of all) {
      if ((n.content.data as any)?.tag === LOG_TAG) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  } catch { /* ignorera */ }
}

// Schemalägger kvällens påminnelse för närmaste kväll som inte passerat – men
// bara om påminnelsen är på OCH den dagens outfit inte redan loggats.
export async function scheduleLogReminder(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await cancelLogReminder()
    if ((await AsyncStorage.getItem(LOG_ENABLED_KEY)) !== '1') return
    const now = new Date()
    const target = new Date()
    target.setHours(EVENING_LOG_HOUR, 0, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1) // kvällen har passerat → imorgon
    const loggedDate = await AsyncStorage.getItem(LOGGED_KEY)
    if (target > now && loggedDate !== dayStr(target)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Vad hade du på dig idag? 📸',
          body: 'Logga dagens outfit på 2 sekunder.',
          data: { tag: LOG_TAG, route: '/my-outfit' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
      })
    }
  } catch { /* tyst – notiser är en bonus */ }
}

// Anropas när användaren loggar dagens outfit. Sätter dagens flagga och
// schemalägger om, så kvällens påminnelse för idag avbokas direkt (i stället
// för att smälla in trots att man redan loggat).
export async function markOutfitLoggedToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(LOGGED_KEY, dayStr(new Date()))
    await scheduleLogReminder()
  } catch { /* best-effort – notiser är en bonus */ }
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
