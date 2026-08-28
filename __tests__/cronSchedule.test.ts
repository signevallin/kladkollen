import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEPLOYED_CRONS, cronDrift, expectedSchedules, stockholmOffsetHours } from '../utils/cronSchedule'

const vercel = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8')) as {
  crons: { path: string; schedule: string }[]
}

describe('svensk offset', () => {
  it('är 2 på sommaren och 1 på vintern', () => {
    expect(stockholmOffsetHours(new Date('2026-07-15T12:00:00Z'))).toBe(2)
    expect(stockholmOffsetHours(new Date('2026-01-15T12:00:00Z'))).toBe(1)
  })

  it('växlar vid EU:s omställningsdatum, inte vid månadsskiftet', () => {
    // Sommartiden slutar 03:00 CEST söndag 25 oktober 2026 (= 01:00 UTC).
    expect(stockholmOffsetHours(new Date('2026-10-25T00:59:00Z'))).toBe(2)
    expect(stockholmOffsetHours(new Date('2026-10-25T01:01:00Z'))).toBe(1)
  })
})

describe('schemat för ett fast svenskt klockslag', () => {
  it('ger 06:30 UTC på sommaren och 07:30 UTC på vintern för 08:30 svensk tid', () => {
    const sommar = expectedSchedules(new Date('2026-07-15T12:00:00Z'))
    const vinter = expectedSchedules(new Date('2026-12-15T12:00:00Z'))
    expect(sommar.find(s => s.path === '/api/send-notifications')!.schedule).toBe('30 6 * * *')
    expect(vinter.find(s => s.path === '/api/send-notifications')!.schedule).toBe('30 7 * * *')
  })

  it('behåller veckodagen för söndagsjobbet', () => {
    const sommar = expectedSchedules(new Date('2026-07-15T12:00:00Z'))
    const vinter = expectedSchedules(new Date('2026-12-15T12:00:00Z'))
    expect(sommar.find(s => s.path === '/api/family-size-reminders')!.schedule).toBe('0 16 * * 0')
    expect(vinter.find(s => s.path === '/api/family-size-reminders')!.schedule).toBe('0 17 * * 0')
  })
})

/**
 * Det här testet är MEDVETET datumberoende. Det ska bli rött dagen Sverige
 * ställer om, och stanna rött tills vercel.json är bytt och deployad. Det är
 * hela poängen – en påminnelse som bara ligger i en kalender går att missa.
 */
it('vercel.json matchar den svenska tiden som gäller NU', () => {
  const drift = cronDrift(vercel.crons)
  if (drift.length) {
    throw new Error(
      'Sverige har ställt om klockan. Uppdatera "crons" i vercel.json och deploya:\n' +
        drift.map(d => `  ${d.path}\n    nu:     "${d.actual}"\n    ska va: "${d.expected}"`).join('\n'),
    )
  }
  expect(drift).toEqual([])
})

it('DEPLOYED_CRONS speglar vercel.json exakt', () => {
  // Dashboarden läser DEPLOYED_CRONS, Vercel läser vercel.json. Glider de isär
  // visar översikten grönt medan jobbet går på fel tid.
  expect(DEPLOYED_CRONS).toEqual(vercel.crons.map(c => ({ path: c.path, schedule: c.schedule })))
})
