import { trimesterFromDueDate, pregnancyPromptContext } from '../utils/pregnancy'

// Fast "nu" för deterministiska tester.
const NOW = new Date('2026-01-01T00:00:00')

// Hjälp: BF n veckor efter NOW.
function dueInWeeks(weeks: number): string {
  const d = new Date(NOW.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

describe('trimesterFromDueDate', () => {
  it('returnerar null utan datum', () => {
    expect(trimesterFromDueDate(null, NOW)).toBeNull()
    expect(trimesterFromDueDate(undefined, NOW)).toBeNull()
  })

  it('BF om ~30 veckor = första trimestern (vecka ~10)', () => {
    expect(trimesterFromDueDate(dueInWeeks(30), NOW)).toBe(1)
  })

  it('BF om ~18 veckor = andra trimestern (vecka ~22)', () => {
    expect(trimesterFromDueDate(dueInWeeks(18), NOW)).toBe(2)
  })

  it('BF om ~4 veckor = tredje trimestern (vecka ~36)', () => {
    expect(trimesterFromDueDate(dueInWeeks(4), NOW)).toBe(3)
  })

  it('orimliga datum ger null', () => {
    expect(trimesterFromDueDate(dueInWeeks(60), NOW)).toBeNull() // för tidigt (vecka -20)
    expect(trimesterFromDueDate(dueInWeeks(-10), NOW)).toBeNull() // långt över tiden
    expect(trimesterFromDueDate('inte-ett-datum', NOW)).toBeNull()
  })
})

describe('pregnancyPromptContext', () => {
  it('tom sträng när läget är av', () => {
    expect(pregnancyPromptContext(false, 2)).toBe('')
  })

  it('nämner graviditet när läget är på', () => {
    const txt = pregnancyPromptContext(true, 3)
    expect(txt).toContain('gravid')
    expect(txt.length).toBeGreaterThan(0)
  })
})
