import { normalizeBrand, parsePrice } from '../utils/brands'

describe('parsePrice', () => {
  it('plockar ut pris ur text med valuta', () => {
    expect(parsePrice('299 kr')).toBe(299)
    expect(parsePrice('SEK 450')).toBe(450)
  })

  it('hanterar tusentalsavgränsare och decimalkomma (avrundar)', () => {
    expect(parsePrice('1 299,50 kr')).toBe(1300)
    expect(parsePrice('1 299 kr')).toBe(1299) // hårt mellanslag
  })

  it('släpper igenom rena tal', () => {
    expect(parsePrice(250)).toBe(250)
    expect(parsePrice(199.4)).toBe(199.4)
  })

  it('returnerar null för tomt/ogiltigt', () => {
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('gratis')).toBeNull()
    expect(parsePrice(null)).toBeNull()
    expect(parsePrice(undefined)).toBeNull()
    expect(parsePrice(NaN)).toBeNull()
  })
})

describe('normalizeBrand', () => {
  it('slår ihop stavningsvarianter till samma nyckel', () => {
    expect(normalizeBrand('H&M')).toBe('hm')
    expect(normalizeBrand('H & M')).toBe('hm')
    expect(normalizeBrand('h m')).toBe('hm')
  })

  it('tar bort apostrofer, punkter och bindestreck', () => {
    expect(normalizeBrand("Levi's")).toBe('levis')
    expect(normalizeBrand('Dr. Denim')).toBe('drdenim')
    expect(normalizeBrand('NA-KD')).toBe('nakd')
  })

  it('hanterar tomt/ogiltigt', () => {
    expect(normalizeBrand('')).toBe('')
    expect(normalizeBrand(undefined as any)).toBe('')
  })
})
