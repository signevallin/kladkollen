import {
  EU_SHOE_SIZES, nearestShoeSize, shoeSizeIndex, shoeGrowthPerMonth,
  suggestedShoeSize, shoeSizeAtDate, nextShoeSize, prevShoeSize,
} from '../utils/childSize'
import { computeSizeReminders, type ReminderChild, type ReminderGarment } from '../utils/sizeReminders'

const iso = (yearsAgo: number) =>
  new Date(Date.now() - yearsAgo * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)

describe('skostorlekar – skalan', () => {
  it('rundar till närmaste giltiga storlek', () => {
    expect(nearestShoeSize(24.4)).toBe(24)
    expect(nearestShoeSize(24.6)).toBe(25)
    expect(nearestShoeSize(2)).toBe(EU_SHOE_SIZES[0])
    expect(nearestShoeSize(99)).toBe(EU_SHOE_SIZES[EU_SHOE_SIZES.length - 1])
  })

  it('steg mellan storlekar är ett i taget', () => {
    expect(shoeSizeIndex(20) - shoeSizeIndex(19)).toBe(1)
    expect(nextShoeSize(22)).toBe(23)
    expect(prevShoeSize(22)).toBe(21)
  })

  it('stannar vid skalans ändar', () => {
    expect(prevShoeSize(EU_SHOE_SIZES[0])).toBe(EU_SHOE_SIZES[0])
    expect(nextShoeSize(EU_SHOE_SIZES[EU_SHOE_SIZES.length - 1]))
      .toBe(EU_SHOE_SIZES[EU_SHOE_SIZES.length - 1])
  })
})

describe('skostorlekar – tillväxtmodellen', () => {
  // Kalibrerad mot kända EU-storlekar per ålder. Går modellen sönder ska det
  // synas här och inte som konstiga påminnelser hos användarna.
  const REF: [number, number][] = [[0, 16], [1, 20.5], [3, 25.5], [6, 29.5], [10, 34], [14, 39]]
  it.each(REF)('ålder %s år ≈ storlek %s', (age, expected) => {
    const got = suggestedShoeSize(iso(age))!
    expect(Math.abs(got - expected)).toBeLessThanOrEqual(1)
  })

  it('växer snabbare som liten än som stor', () => {
    expect(shoeGrowthPerMonth(0.5)).toBeGreaterThan(shoeGrowthPerMonth(5))
    expect(shoeGrowthPerMonth(5)).toBeGreaterThan(shoeGrowthPerMonth(20))
  })

  it('projicerar framåt men aldrig bakåt', () => {
    const now = new Date('2026-01-01')
    const om6man = new Date('2026-07-01')
    expect(shoeSizeAtDate(24, iso(2), om6man, now)!).toBeGreaterThan(24)
    expect(shoeSizeAtDate(24, iso(2), new Date('2025-06-01'), now)).toBe(24)
    expect(shoeSizeAtDate(null, iso(2), om6man, now)).toBeNull()
  })
})

describe('storlekspåminnelser med skor', () => {
  const child = (o: Partial<ReminderChild> = {}): ReminderChild => ({
    id: 'c1', name: 'Alva', birthdate: iso(2), current_size_cm: 92, current_shoe_size: 24, ...o,
  })
  const g = (o: Partial<ReminderGarment> = {}): ReminderGarment => ({
    id: 'g1', name: 'Sak', image_url: null, location: null, season: 'Alla årstider',
    size_cm: null, shoe_size: null, status: 'stored', person_id: null, ...o,
  })

  it('tar med sparade skor som snart passar', () => {
    const out = computeSizeReminders([g({ id: 's1', name: 'Stövlar', shoe_size: 25 })], [child()])
    expect(out).toHaveLength(1)
    expect(out[0].isShoe).toBe(true)
    expect(out[0].sizeCm).toBe(25)
  })

  it('mäter skor mot skostorleken, inte mot klädstorleken', () => {
    // 92 cm och skostorlek 24: en sko i 25 är ett steg upp och ska med, medan
    // en sko i 98 (klädstorlek) ligger långt utanför skoskalan och ska bort.
    const out = computeSizeReminders(
      [g({ id: 's1', shoe_size: 25 }), g({ id: 's2', shoe_size: 40 })],
      [child()],
    )
    expect(out.map(r => r.garmentId)).toEqual(['s1'])
  })

  it('hoppar över skor när barnets skostorlek saknas och ålder inte går att gissa', () => {
    const out = computeSizeReminders(
      [g({ shoe_size: 25 })],
      [child({ current_shoe_size: null, birthdate: null })],
    )
    expect(out).toHaveLength(0)
  })

  it('blandar kläder och skor i samma lista', () => {
    const out = computeSizeReminders(
      [g({ id: 'k1', size_cm: 98 }), g({ id: 's1', shoe_size: 25 })],
      [child()],
    )
    expect(out.map(r => r.garmentId).sort()).toEqual(['k1', 's1'])
    expect(out.find(r => r.garmentId === 'k1')!.isShoe).toBe(false)
    expect(out.find(r => r.garmentId === 's1')!.isShoe).toBe(true)
  })
})
