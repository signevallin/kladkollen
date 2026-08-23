import { computeSizeReminders, seasonForMonth, type ReminderGarment, type ReminderChild } from '../utils/sizeReminders'

const child = (over: Partial<ReminderChild> = {}): ReminderChild => ({
  id: 'c1', name: 'Alva', birthdate: null, current_size_cm: 92, current_shoe_size: null, ...over,
})
const garment = (over: Partial<ReminderGarment> = {}): ReminderGarment => ({
  id: 'g1', name: 'Klänning', image_url: null, location: 'Kartong 3',
  season: 'Alla årstider', size_cm: 98, shoe_size: null, status: 'stored', person_id: null, ...over,
})

describe('seasonForMonth', () => {
  it('mappar månad till svensk säsong', () => {
    expect(seasonForMonth(1)).toBe('Vinter')
    expect(seasonForMonth(4)).toBe('Vår')
    expect(seasonForMonth(7)).toBe('Sommar')
    expect(seasonForMonth(10)).toBe('Höst')
    expect(seasonForMonth(12)).toBe('Vinter')
  })
})

describe('computeSizeReminders – urval', () => {
  it('tar med plagg 0–2 storlekssteg över barnets storlek', () => {
    const res = computeSizeReminders([garment({ size_cm: 98 })], [child({ current_size_cm: 92 })])
    expect(res).toHaveLength(1)
    expect(res[0].garmentId).toBe('g1')
  })

  it('utesluter plagg som är för stora (mer än 2 steg)', () => {
    const res = computeSizeReminders([garment({ size_cm: 116 })], [child({ current_size_cm: 92 })])
    expect(res).toHaveLength(0)
  })

  it('utesluter plagg barnet redan vuxit förbi (mindre storlek)', () => {
    const res = computeSizeReminders([garment({ size_cm: 86 })], [child({ current_size_cm: 92 })])
    expect(res).toHaveLength(0)
  })

  it('utesluter urvuxna och plagg öronmärkta för annat barn', () => {
    const g1 = garment({ id: 'a', status: 'outgrown' })
    const g2 = garment({ id: 'b', person_id: 'annat-barn' })
    expect(computeSizeReminders([g1, g2], [child()])).toHaveLength(0)
  })

  it('tar med plagg öronmärkt för barnet självt', () => {
    const res = computeSizeReminders([garment({ person_id: 'c1' })], [child({ id: 'c1' })])
    expect(res).toHaveLength(1)
  })
})

describe('computeSizeReminders – säsong', () => {
  // Barn i storlek 92 (~1,5 år, växer ~1 cm/mån), sommarplagg i 98 (~1 storlek
  // upp). Fryst referensdatum i november: passform infaller ~6 mån senare = maj
  // (vår) → fel säsong → skjut fram till sommaren.
  it('flaggar fel säsong och skjuter fram till plaggets säsong', () => {
    const now = new Date('2026-11-01')
    const res = computeSizeReminders(
      [garment({ season: 'Sommar', size_cm: 98 })],
      [child({ current_size_cm: 92, birthdate: '2025-02-01' })],
      now,
    )
    expect(res).toHaveLength(1)
    expect(res[0].seasonOk).toBe(false)
    expect(res[0].season).toBe('Sommar')
    // readyDate ska ligga i en sommarmånad (juni–aug).
    const m = new Date(res[0].readyDate).getMonth() + 1
    expect(m).toBeGreaterThanOrEqual(6)
    expect(m).toBeLessThanOrEqual(8)
  })

  it('plagg som passar nu i rätt storlek blir "ready"', () => {
    const res = computeSizeReminders(
      [garment({ season: 'Alla årstider', size_cm: 92 })],
      [child({ current_size_cm: 92 })],
    )
    expect(res[0].state).toBe('ready')
    expect(res[0].monthsToFit).toBe(0)
  })
})

describe('computeSizeReminders – sortering', () => {
  it('lägger redo-plagg före kommande', () => {
    const res = computeSizeReminders(
      [
        garment({ id: 'now', size_cm: 92, season: 'Alla årstider' }),
        garment({ id: 'later', size_cm: 98, season: 'Sommar' }),
      ],
      [child({ current_size_cm: 92, birthdate: '2024-01-01' })],
      new Date('2026-11-01'),
    )
    expect(res[0].garmentId).toBe('now')
    expect(res[0].state).toBe('ready')
  })
})
