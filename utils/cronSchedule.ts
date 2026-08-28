/**
 * Vercels cron-scheman tolkas i UTC och har inget tidszonsstöd. Sverige växlar
 * mellan CET (UTC+1) och CEST (UTC+2), så ett fast UTC-schema vandrar en timme
 * två gånger om året – tyst, och åt fel håll för en morgonnotis.
 *
 * Valet är att byta schema manuellt vid varje omställning. Den här modulen är
 * enda källan till vad schemat SKA vara; `__tests__/cronSchedule.test.ts`
 * jämför den mot `vercel.json` och blir röd så fort de glider isär, och
 * dashboarden visar samma sak för den som inte kör testerna.
 */

/** Klockslagen i svensk lokaltid som ska ligga fast året runt. */
export const CRON_TARGETS = [
  { path: '/api/send-notifications', hour: 8, minute: 30, dayOfWeek: '*', label: 'Dagens outfit' },
  { path: '/api/family-size-reminders', hour: 18, minute: 0, dayOfWeek: '0', label: 'Storlekspåminnelser' },
] as const

/**
 * Sveriges UTC-offset i timmar vid en given tidpunkt (1 på vintern, 2 på sommaren).
 * Räknas ut via Intl i stället för att hårdkodas – omställningsdatumen flyttar sig.
 */
export function stockholmOffsetHours(at: Date = new Date()): number {
  const asUtc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }))
  const asLocal = new Date(at.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }))
  return Math.round((asLocal.getTime() - asUtc.getTime()) / 3_600_000)
}

/** Det UTC-schema som ger rätt svenskt klockslag vid tidpunkten `at`. */
export function expectedSchedules(at: Date = new Date()) {
  const offset = stockholmOffsetHours(at)
  return CRON_TARGETS.map(t => {
    const utcHour = t.hour - offset
    // Alla nuvarande tider ligger med god marginal från midnatt. Skulle någon
    // flyttas dit måste även veckodagen justeras – vägra hellre än att gissa.
    if (utcHour < 0 || utcHour > 23) {
      throw new Error(`${t.path}: ${t.hour}:${t.minute} svensk tid korsar midnatt i UTC – veckodagen måste justeras för hand.`)
    }
    return { path: t.path, label: t.label, schedule: `${t.minute} ${utcHour} * * ${t.dayOfWeek}` }
  })
}

/**
 * Speglar "crons" i vercel.json. Dashboarden körs som en serverless-funktion och
 * ska inte behöva importera vercel.json vid körning – misslyckas den importen
 * faller hela översikten. Testet jämför de två åt båda håll, så en ändring på
 * ett ställe och inte det andra blir röd.
 */
export const DEPLOYED_CRONS = [
  { path: '/api/send-notifications', schedule: '30 6 * * *' },
  { path: '/api/family-size-reminders', schedule: '0 16 * * 0' },
]

export type CronDrift = { path: string; label: string; actual: string; expected: string }

/**
 * Jämför de deployade schemana mot vad de borde vara nu.
 * Tom lista = allt stämmer.
 */
export function cronDrift(
  actual: { path: string; schedule: string }[],
  at: Date = new Date(),
): CronDrift[] {
  return expectedSchedules(at).flatMap(exp => {
    const found = actual.find(a => a.path === exp.path)
    if (!found || found.schedule === exp.schedule) return []
    return [{ path: exp.path, label: exp.label, actual: found.schedule, expected: exp.schedule }]
  })
}
