import {
  EU_CHILD_SIZES, EU_SHOE_SIZES, childSizeLabel, shoeSizeLabel, SIZE_SYSTEMS,
} from '../utils/childSize'

describe('storlekssystem', () => {
  it('EU visar det lagrade värdet oförändrat', () => {
    expect(childSizeLabel(104, 'eu')).toBe('104')
    expect(shoeSizeLabel(28, 'eu')).toBe('28')
  })

  it('har en etikett för VARJE lagrad storlek – inga hål', () => {
    for (const sys of ['uk', 'us'] as const) {
      for (const cm of EU_CHILD_SIZES) {
        const l = childSizeLabel(cm, sys)
        expect(l).toBeTruthy()
        expect(l).not.toBe('–')
      }
      for (const eu of EU_SHOE_SIZES) {
        const l = shoeSizeLabel(eu, sys)
        expect(l).toBeTruthy()
        expect(l).not.toBe('–')
      }
    }
  })

  // Ankarpunkter mot branschstandard. Går tabellen sönder ska det synas här.
  it.each([
    [50, 'Newborn', 'NB'],
    [92, '18-24 m', '2T'],
    [104, '3-4 yrs', '4T'],
    [110, '4-5 yrs', '5'],
    [128, '7-8 yrs', '8'],
    [170, '14-15 yrs', '18'],
  ])('klädstorlek %s cm → UK "%s", US "%s"', (cm, uk, us) => {
    expect(childSizeLabel(cm as number, 'uk')).toBe(uk)
    expect(childSizeLabel(cm as number, 'us')).toBe(us)
  })

  it.each([
    [16, '0.5', '1'],
    [24, '7', '8'],
    [28, '10', '11'],
    [32, '13', '1Y'],
    [35, '2.5', '3.5Y'],
  ])('skostorlek EU %s → UK "%s", US "%s"', (eu, uk, us) => {
    expect(shoeSizeLabel(eu as number, 'uk')).toBe(uk)
    expect(shoeSizeLabel(eu as number, 'us')).toBe(us)
  })

  it('hanterar null och värden utanför skalan', () => {
    expect(childSizeLabel(null, 'uk')).toBe('–')
    expect(shoeSizeLabel(undefined, 'us')).toBe('–')
    // Utanför skalan rundas till närmaste giltiga steg, aldrig krasch.
    expect(childSizeLabel(999, 'uk')).toBeTruthy()
  })

  it('erbjuder exakt tre system, med EU först', () => {
    expect(SIZE_SYSTEMS.map(s => s.code)).toEqual(['eu', 'uk', 'us'])
  })
})
