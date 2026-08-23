import * as Calendar from 'expo-calendar'
import { localeFor, translate } from './i18n'

// Fyller i {platshållare} i en översatt sträng.
function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]))
  return s
}

// Tolkar dagens kalender till en outfit-kontext + en kort text för notisen.
// contextLabel matchar OUTFIT_CONTEXTS (Jobb/Skola/Ledig/Aktiv/Date/Fest).
export type DayPlan = {
  contextLabel: string
  meetingCount: number
  eveningEvent: string | null
  eveningTime: string | null
  summary: string
}

const WORK = ['möte', 'meeting', 'standup', 'sync', 'intervju', 'presentation', 'kund', 'workshop', '1:1', 'avstämning', 'styrelse', 'demo', 'review']
const EVENING = ['aw', 'after work', 'afterwork', 'middag', 'dinner', 'fest', 'party', 'bar', 'drink', 'release', 'premiär', 'vernissage', 'bröllop', 'kalas', 'krog', 'pub', 'konsert', 'gala']
const DATE_WORDS = ['date', 'träff', 'middag']
const SPORT = ['gym', 'träning', 'löpning', 'yoga', 'pass', 'match', 'pt', 'spinning', 'crossfit', 'padel']
const SCHOOL = ['föreläsning', 'lektion', 'tenta', 'seminarium', 'plugg', 'skola', 'lecture', 'exam']

const has = (list: string[], t: string) => list.some(k => t.includes(k))

export async function ensureCalendarPermission(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync()
    if (status === 'granted') return true
    const req = await Calendar.requestCalendarPermissionsAsync()
    return req.status === 'granted'
  } catch {
    return false
  }
}

async function eventsForDay(date: Date): Promise<Calendar.Event[]> {
  const { status } = await Calendar.getCalendarPermissionsAsync()
  if (status !== 'granted') return []
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const ids = cals.map(c => c.id)
  if (ids.length === 0) return []
  const start = new Date(date); start.setHours(0, 0, 0, 0)
  const end = new Date(date); end.setHours(23, 59, 59, 999)
  return Calendar.getEventsAsync(ids, start, end)
}

export async function planForDay(date = new Date(), lang: string = 'sv'): Promise<DayPlan> {
  let events: Calendar.Event[] = []
  try { events = await eventsForDay(date) } catch { events = [] }
  const timed = events.filter(e => e.title && !e.allDay)

  let meetingCount = 0
  let sport = false
  let school = false
  let eveningEvent: string | null = null
  let eveningTime: string | null = null
  let eveningIsDate = false

  for (const e of timed) {
    const t = (e.title || '').toLowerCase()
    const startHour = new Date(e.startDate as any).getHours()
    if (has(WORK, t)) meetingCount++
    if (has(SPORT, t)) sport = true
    if (has(SCHOOL, t)) school = true
    // Kvällshändelse = börjar 17:00 eller senare och känns som en "kväll ute".
    if (!eveningEvent && startHour >= 17 && has(EVENING, t)) {
      eveningEvent = e.title || null
      eveningTime = new Date(e.startDate as any).toLocaleTimeString(localeFor(lang), { hour: '2-digit', minute: '2-digit' })
      eveningIsDate = has(DATE_WORDS, t)
    }
  }

  let contextLabel = 'Ledig'
  if (eveningEvent) contextLabel = eveningIsDate ? 'Date' : 'Fest'
  else if (meetingCount > 0) contextLabel = 'Jobb'
  else if (school) contextLabel = 'Skola'
  else if (sport) contextLabel = 'Aktiv'

  const tt = (key: string, vars?: Record<string, string | number>) => fill(translate(lang, key), vars)
  let summary: string
  if (eveningEvent) {
    const ev = `${eveningEvent}${eveningTime ? ` (${eveningTime})` : ''}`
    summary = tt('Ikväll har du {event} inplanerad', { event: ev })
  } else if (meetingCount >= 1) {
    summary = tt(meetingCount === 1 ? 'Idag väntar {n} möte' : 'Idag väntar {n} möten', { n: meetingCount })
  } else if (school) {
    summary = tt('Dagen bjuder på skola')
  } else if (sport) {
    summary = tt('Dagen bjuder på träning')
  } else if (timed.length > 0) {
    // Det finns inbokade händelser (t.ex. i en delad kalender) som inte matchar
    // våra nyckelord – skriv då ut vad som är inplanerat i stället för bara antalet.
    const firstTitle = timed[0].title || ''
    const rest = timed.length - 1
    summary = rest > 0
      ? tt('Idag: {event} + {n} till', { event: firstTitle, n: rest })
      : tt('Idag har du {event} inplanerat', { event: firstTitle })
  } else {
    summary = tt('En ledig dag')
  }

  return { contextLabel, meetingCount, eveningEvent, eveningTime, summary }
}
