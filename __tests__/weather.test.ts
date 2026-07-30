import { buildWeatherContext, summarizeDayForecast } from '../utils/weather'

describe('summarizeDayForecast', () => {
  it('tar min/max/regnrisk från återstoden av dagen (från nuvarande timme)', () => {
    const data = {
      hourly: {
        time: ['2026-07-30T00:00', '2026-07-30T06:00', '2026-07-30T12:00', '2026-07-30T18:00'],
        temperature_2m: [8, 6, 20, 14],
        precipitation_probability: [10, 20, 30, 80],
      },
      daily: {
        temperature_2m_max: [22],
        temperature_2m_min: [5],
        precipitation_probability_max: [80],
      },
    }
    // Kl 08 → hoppa över 00 och 06, räkna 12 och 18.
    expect(summarizeDayForecast(data, 8)).toEqual({ dayMin: 14, dayMax: 20, rainChance: 80 })
  })

  it('faller tillbaka på dygnets aggregat när inga timmar återstår', () => {
    const data = {
      hourly: {
        time: ['2026-07-30T00:00', '2026-07-30T06:00'],
        temperature_2m: [8, 6],
        precipitation_probability: [10, 20],
      },
      daily: {
        temperature_2m_max: [22],
        temperature_2m_min: [5],
        precipitation_probability_max: [40],
      },
    }
    // Kl 20 → inga timvärden kvar, använd daily.
    expect(summarizeDayForecast(data, 20)).toEqual({ dayMin: 5, dayMax: 22, rainChance: 40 })
  })

  it('tål helt saknad data', () => {
    expect(summarizeDayForecast({}, 8)).toEqual({})
    expect(summarizeDayForecast(null, 8)).toEqual({})
  })
})

describe('buildWeatherContext – bakåtkompatibelt (utan prognosfält)', () => {
  it('kallt just nu kräver ytterkläder', () => {
    const r = buildWeatherContext({ temp: 2, description: 'Snö', rain: false })
    expect(r.requiresOuterwear).toBe(true)
    expect(r.summary).toContain('Det är kallt')
    expect(r.rules).toContain('KALLT VÄDER')
  })

  it('varmt just nu undviker ytterkläder', () => {
    const r = buildWeatherContext({ temp: 26, description: 'Klart', rain: false })
    expect(r.requiresOuterwear).toBe(false)
    expect(r.rules).toContain('VARMT VÄDER')
  })

  it('regn kräver ytterkläder', () => {
    const r = buildWeatherContext({ temp: 15, description: 'Regn', rain: true })
    expect(r.requiresOuterwear).toBe(true)
    expect(r.rules).toContain('REGN:')
  })

  it('tomt väder ger tomt sammanhang', () => {
    expect(buildWeatherContext(null)).toEqual({ summary: '', rules: '', requiresOuterwear: false })
  })
})

describe('buildWeatherContext – hela dagen', () => {
  it('milt nu men kallt senare kräver ändå ytterkläder', () => {
    const r = buildWeatherContext({ temp: 14, description: 'Halvklart', rain: false, dayMin: 3, dayMax: 15 })
    expect(r.requiresOuterwear).toBe(true)
    expect(r.rules).toContain('KALLT VÄDER')
    expect(r.rules).toContain('TEMPERATURSVÄNGNING')
    expect(r.rules).toContain('kallare senare')
    expect(r.summary).toContain('Idag 3–15°C')
  })

  it('svalt nu men varmt senare tipsar om avtagbara lager', () => {
    const r = buildWeatherContext({ temp: 10, description: 'Klart', rain: false, dayMin: 9, dayMax: 24 })
    expect(r.rules).toContain('TEMPERATURSVÄNGNING')
    expect(r.rules).toContain('varmare senare')
  })

  it('regn senare kräver ytterplagg även om det är uppehåll nu', () => {
    const r = buildWeatherContext({ temp: 16, description: 'Halvklart', rain: false, dayMin: 14, dayMax: 18, rainChance: 70 })
    expect(r.requiresOuterwear).toBe(true)
    expect(r.rules).toContain('REGN SENARE')
    expect(r.rules).toContain('70%')
  })

  it('låg regnrisk utlöser ingen regnregel', () => {
    const r = buildWeatherContext({ temp: 16, description: 'Klart', rain: false, dayMin: 15, dayMax: 19, rainChance: 20 })
    expect(r.rules).not.toContain('REGN')
  })

  it('litet spann ger ingen svängningsregel', () => {
    const r = buildWeatherContext({ temp: 17, description: 'Klart', rain: false, dayMin: 16, dayMax: 19 })
    expect(r.rules).not.toContain('TEMPERATURSVÄNGNING')
    expect(r.summary).not.toContain('Idag')
  })

  it('lättfrusen användare får extra-lager-regel', () => {
    const r = buildWeatherContext({ temp: 14, description: 'Klart', rain: false, dayMin: 13, dayMax: 16 }, 5)
    expect(r.rules).toContain('LÄTTFRUSEN')
  })
})
