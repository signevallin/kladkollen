// Väderlogik för dagens outfit. Hålls ren (inga React-beroenden, ingen
// översättning) så AI-prompten alltid byggs på svenska och logiken kan
// enhetstestas. getWeatherEmoji/-Description bor kvar i home.tsx eftersom de
// använder översättningsfunktionen.

export interface DayForecast {
  dayMin?: number     // kallaste temp (°C) återstående av dagen
  dayMax?: number     // varmaste temp (°C) återstående av dagen
  rainChance?: number // högsta nederbördssannolikhet (%) återstående av dagen
}

export interface WeatherInput extends DayForecast {
  temp: number
  description?: string
  rain?: boolean
}

// Sammanfattar Open-Meteo-svaret till dagens spann + regnrisk för ÅTERSTODEN av
// dagen (från nuvarande timme och framåt) – det är det outfiten ska hålla för.
// Använder timvärden om de finns, annars dygnets min/max. Tål saknad data.
export function summarizeDayForecast(
  data: any,
  nowHour: number = new Date().getHours(),
): DayForecast {
  try {
    const times: any[] = data?.hourly?.time || []
    const temps: any[] = data?.hourly?.temperature_2m || []
    const precip: any[] = data?.hourly?.precipitation_probability || []
    const remTemps: number[] = []
    const remPrecip: number[] = []
    for (let i = 0; i < times.length; i++) {
      const h = parseInt(String(times[i]).slice(11, 13), 10)
      if (isNaN(h) || h < nowHour) continue
      if (typeof temps[i] === 'number') remTemps.push(temps[i])
      if (typeof precip[i] === 'number') remPrecip.push(precip[i])
    }
    let dayMin = remTemps.length ? Math.round(Math.min(...remTemps)) : undefined
    let dayMax = remTemps.length ? Math.round(Math.max(...remTemps)) : undefined
    let rainChance = remPrecip.length ? Math.max(...remPrecip) : undefined

    // Fall tillbaka på dygnets aggregat om timvärden saknas (eller om det är så
    // sent på dagen att inga timmar återstår).
    const dMin = data?.daily?.temperature_2m_min?.[0]
    const dMax = data?.daily?.temperature_2m_max?.[0]
    const dPrecip = data?.daily?.precipitation_probability_max?.[0]
    if (dayMin == null && typeof dMin === 'number') dayMin = Math.round(dMin)
    if (dayMax == null && typeof dMax === 'number') dayMax = Math.round(dMax)
    if (rainChance == null && typeof dPrecip === 'number') rainChance = dPrecip

    return { dayMin, dayMax, rainChance }
  } catch {
    return {}
  }
}

// Bygger väderavsnittet till stylistprompten: en kort sammanfattning och en
// uppsättning regler. Tar hänsyn till hela dagens spann (inte bara just nu) och
// regnrisk längre fram. coldSensitivity 1–5 (3 = lagom) justerar den "upplevda"
// temperaturen per person. Saknas prognosfält faller vi tillbaka på nuvarande
// temp, så äldre cachade väderobjekt fungerar oförändrat.
export function buildWeatherContext(
  w: WeatherInput | null | undefined,
  coldSensitivity = 3,
): { summary: string; rules: string; requiresOuterwear: boolean } {
  if (!w) return { summary: '', rules: '', requiresOuterwear: false }

  const temp = w.temp
  const rain = !!w.rain
  const adj = (coldSensitivity - 3) * 2
  const perceived = temp - adj

  const hasRange = typeof w.dayMin === 'number' && typeof w.dayMax === 'number'
  const dayMin = hasRange ? (w.dayMin as number) : temp
  const dayMax = hasRange ? (w.dayMax as number) : temp
  const perceivedMin = dayMin - adj // kallaste delen av återstående dag
  const perceivedMax = dayMax - adj // varmaste delen av återstående dag
  const swing = dayMax - dayMin

  let summary = w.description
    ? `Väder just nu: ${temp}°C, ${w.description}.`
    : `Väder just nu: ${temp}°C.`
  if (hasRange && swing >= 6) summary += ` Idag ${dayMin}–${dayMax}°C.`

  const rules: string[] = []
  let requiresOuterwear = false

  if (coldSensitivity >= 4) rules.push('ANVÄNDAREN ÄR LÄTTFRUSEN: lägg hellre till ett extra lager – hen fryser lätt.')
  else if (coldSensitivity <= 2) rules.push('ANVÄNDAREN ÄR VÄRMETÅLIG: undvik att övertäcka – hen fryser sällan, lättare lager räcker.')

  // Beskriv känslan just nu (samma trösklar som tidigare, baserat på nuvarande temp).
  if (perceived <= 5) summary += ' Det är kallt.'
  else if (perceived <= 12) summary += ' Det är svalt.'
  else if (perceived <= 18) summary += ' Det är milt.'
  else if (perceived >= 23) summary += ' Det är varmt.'

  // Värme-/ytterklädesregel drivs av KALLASTE delen av återstående dag, så man
  // inte fryser senare även om det är milt just nu.
  if (perceivedMin <= 5) {
    rules.push('KALLT VÄDER: Ytterkläder (jacka/kappa) är OBLIGATORISKT om det finns i garderoben. Välj varma material.')
    requiresOuterwear = true
  } else if (perceivedMin <= 12) {
    rules.push('SVALT VÄDER: Lägg till ytterkläder eller kavaj om det finns – annars välj en tjockare tröja.')
  } else if (perceivedMin <= 18) {
    rules.push('MILT VÄDER: En lätt kavaj eller tröja kan passa, men ytterkläder är inte nödvändigt.')
  }

  // Överklädnadsvarning om det blir riktigt varmt någon gång under dagen – men
  // inte om det också blir kallt (då gäller lager-rådet i stället för att undvika
  // motsägelsen "ha jacka" + "undvik jacka").
  if (perceivedMax >= 23 && perceivedMin > 5) {
    rules.push('VARMT VÄDER: Välj lätta material. Undvik tjocka lager och ytterkläder som inte går att ta av.')
  }

  // Temperatursvängning över dagen → lager man kan reglera.
  if (hasRange && swing >= 6) {
    if (perceivedMax - perceived >= 4) {
      rules.push(`TEMPERATURSVÄNGNING: Det är svalare nu (${temp}°) men blir varmare senare (upp mot ${dayMax}°) – välj lager som går att ta av (t.ex. kavaj eller kofta över en topp) hellre än en tjock helhet.`)
    } else if (perceived - perceivedMin >= 4) {
      rules.push(`TEMPERATURSVÄNGNING: Det är mildare nu (${temp}°) men blir kallare senare (ner mot ${dayMin}°) – lägg till ett ytterplagg eller extra lager som håller värmen på kvällen.`)
    } else {
      rules.push(`TEMPERATURSVÄNGNING: Dagen pendlar mellan ${dayMin}° och ${dayMax}° – välj lager som går att reglera.`)
    }
  }

  // Regn: nu eller längre fram under dagen.
  if (rain) {
    rules.push('REGN: Prioritera ytterkläder med regnbeskyddande funktion om det finns. Undvik vita eller känsliga material.')
    requiresOuterwear = true
  } else if (typeof w.rainChance === 'number' && w.rainChance >= 50) {
    rules.push(`REGN SENARE: ${w.rainChance}% risk för regn längre fram idag – ta med ett ytterplagg även om det är uppehåll nu. Undvik känsliga material.`)
    requiresOuterwear = true
  }

  return { summary, rules: rules.join('\n'), requiresOuterwear }
}

// ── Köldkänslighet & mössa för barn ────────────────────────────────────────
// Samma skala som för vuxna: 1–5 där 3 är lagom. Delas av profil och barn.
export const COLD_LEVELS = [
  { v: 1, label: 'Alltid varm' },
  { v: 2, label: 'Sällan frusen' },
  { v: 3, label: 'Lagom' },
  { v: 4, label: 'Ofta frusen' },
  { v: 5, label: 'Fryser lätt' },
] as const

// Under vilken temperatur ett barn behöver mössa. Små barn tappar värme via
// huvudet betydligt snabbare än vuxna – därför ligger gränsen långt över noll
// för de yngsta och sjunker med åldern.
//
// De tre första stegen är angivna av produktägaren. Stegen över ett år är
// utfyllnad i samma anda och kan justeras utan att röra logiken.
function headwearThreshold(months: number | null): number {
  if (months == null) return 12
  if (months < 3) return 20
  if (months < 6) return 18
  if (months < 12) return 15
  if (months < 24) return 12
  return 10
}

// Returnerar en promptregel när mössa behövs, annars tom sträng. Köldkänslighet
// justerar den upplevda temperaturen precis som för vuxna, så ett lättfruset barn
// får mössa vid en högre faktisk temperatur.
export function childHeadwearRule(
  months: number | null,
  temp: number | null | undefined,
  coldSensitivity = 3,
): string {
  if (typeof temp !== 'number' || Number.isNaN(temp)) return ''
  const perceived = temp - (coldSensitivity - 3) * 2
  const limit = headwearThreshold(months)
  if (perceived >= limit) return ''
  const age = months == null ? 'barnet' : `barnet är ${months} mån`
  const thin = months != null && months < 12 ? ' Välj en TUNN mössa om garderoben har flera.' : ''
  return `MÖSSA: ${age} och det känns som ${Math.round(perceived)}°C, vilket är under ${limit}°C. `
    + `Outfiten MÅSTE innehålla en mössa om det finns en i garderoben.${thin} `
    + `Mössan är en EGEN roll – den ersätter inte överdel, nederdel eller ytterlager och bryter inte dubblettregeln.`
}
