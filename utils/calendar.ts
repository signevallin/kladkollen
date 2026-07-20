import * as Calendar from 'expo-calendar'

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

export async function planForDay(date = new Date()): Promise<DayPlan> {
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
      eveningTime = new Date(e.startDate as any).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      eveningIsDate = has(DATE_WORDS, t)
    }
  }

  let contextLabel = 'Ledig'
  if (eveningEvent) contextLabel = eveningIsDate ? 'Date' : 'Fest'
  else if (meetingCount > 0) contextLabel = 'Jobb'
  else if (school) contextLabel = 'Skola'
  else if (sport) contextLabel = 'Aktiv'

  let summary: string
  if (eveningEvent) {
    summary = `Ikväll har du ${eveningEvent}${eveningTime ? ` (${eveningTime})` : ''} inplanerad`
  } else if (meetingCount >= 1) {
    summary = `Idag väntar ${meetingCount} ${meetingCount === 1 ? 'möte' : 'möten'}`
  } else if (school) {
    summary = 'Dagen bjuder på skola'
  } else if (sport) {
    summary = 'Dagen bjuder på träning'
  } else {
    summary = 'En ledig dag'
  }

  return { contextLabel, meetingCount, eveningEvent, eveningTime, summary }
}
