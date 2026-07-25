import { nearestSize, nextSize, prevSize, suggestedSizeCm, formatAge, ageYearsFromBirthdate } from '../utils/childSize'

// Fast referensdatum via ett barn fött exakt N år/månader före "idag".
function birthdateYearsAgo(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - Math.floor(years))
  d.setDate(d.getDate() - Math.round((years % 1) * 365.25))
  return d.toISOString().slice(0, 10)
}

describe('nearestSize', () => {
  it('snappar till närmaste EU-storlek', () => {
    expect(nearestSize(90)).toBe(92)
    expect(nearestSize(100)).toBe(98)
    expect(nearestSize(51)).toBe(50)
  })
})

describe('nextSize / prevSize', () => {
  it('går ett steg upp/ner i skalan', () => {
    expect(nextSize(92)).toBe(98)
    expect(prevSize(92)).toBe(86)
  })
  it('klampar i ändarna', () => {
    expect(nextSize(170)).toBe(170)
    expect(prevSize(50)).toBe(50)
  })
})

describe('ageYearsFromBirthdate', () => {
  it('returnerar null för tomt/framtida datum', () => {
    expect(ageYearsFromBirthdate(null)).toBeNull()
    expect(ageYearsFromBirthdate('')).toBeNull()
    expect(ageYearsFromBirthdate('2099-01-01')).toBeNull()
  })
  it('räknar ålder i år', () => {
    const age = ageYearsFromBirthdate(birthdateYearsAgo(3))
    expect(age).not.toBeNull()
    expect(Math.round(age as number)).toBe(3)
  })
})

describe('formatAge', () => {
  it('visar månader under ett år', () => {
    expect(formatAge(birthdateYearsAgo(0.5))).toMatch(/mån$/)
  })
  it('visar år från ett år och uppåt', () => {
    expect(formatAge(birthdateYearsAgo(4))).toBe('4 år')
  })
})

describe('suggestedSizeCm', () => {
  it('ger en rimlig storlek för en 3-åring (~98)', () => {
    const s = suggestedSizeCm(birthdateYearsAgo(3))
    expect(s).not.toBeNull()
    expect(s as number).toBeGreaterThanOrEqual(92)
    expect(s as number).toBeLessThanOrEqual(104)
  })
  it('returnerar null utan födelsedatum', () => {
    expect(suggestedSizeCm(null)).toBeNull()
  })
})
