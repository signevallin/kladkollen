import * as Location from 'expo-location'

// Delad väderlogik så både hemskärmen och par-matchningen använder EXAKT samma
// regler när AI:n genererar outfits.

export type Weather = { temp: number; emoji: string; description: string; rain: boolean }

function getWeatherEmoji(code: number) {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

function getWeatherDescription(code: number) {
  if (code === 0) return 'Klart'
  if (code <= 3) return 'Halvklart'
  if (code <= 48) return 'Dimma'
  if (code <= 67) return 'Regn'
  if (code <= 77) return 'Snö'
  if (code <= 82) return 'Skurar'
  return 'Åska'
}

export async function fetchCurrentWeather(): Promise<Weather> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return { temp: 10, emoji: '🌧️', description: 'Regn', rain: true }
    const location = await Location.getCurrentPositionAsync({})
    const { latitude, longitude } = location.coords
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`)
    const data = await response.json()
    const temp = Math.round(data.current.temperature_2m)
    const code = data.current.weathercode
    return { temp, emoji: getWeatherEmoji(code), description: getWeatherDescription(code), rain: code >= 51 && code <= 82 }
  } catch {
    return { temp: 10, emoji: '🌡️', description: 'Okänt', rain: false }
  }
}

export function getCurrentSeason(): string {
  const m = new Date().getMonth()
  if (m === 11 || m <= 1) return 'Vinter'
  if (m <= 4) return 'Vår'
  if (m <= 8) return 'Sommar'
  return 'Höst'
}

// coldSensitivity 1–5 (3 = lagom). Justerar upplevd temperatur och klädregler.
export function buildWeatherContext(w: Weather | null, coldSensitivity = 3): { summary: string; rules: string; requiresOuterwear: boolean } {
  if (!w) return { summary: '', rules: '', requiresOuterwear: false }
  const temp = w.temp
  const rain = w.rain
  const perceived = temp - (coldSensitivity - 3) * 2

  let summary = `Väder just nu: ${temp}°C, ${w.description}.`
  const rules: string[] = []
  let requiresOuterwear = false

  if (coldSensitivity >= 4) rules.push('LÄTTFRUSEN: lägg hellre till ett extra lager.')
  else if (coldSensitivity <= 2) rules.push('VÄRMETÅLIG: undvik att övertäcka – lättare lager räcker.')

  if (perceived <= 5) {
    summary += ' Det är kallt.'
    rules.push('KALLT VÄDER: Ytterkläder (jacka/kappa) är OBLIGATORISKT om det finns i garderoben. Välj varma material.')
    requiresOuterwear = true
  } else if (perceived <= 12) {
    summary += ' Det är svalt.'
    rules.push('SVALT VÄDER: Lägg till ytterkläder eller kavaj om det finns – annars en tjockare tröja.')
  } else if (perceived <= 18) {
    summary += ' Det är milt.'
    rules.push('MILT VÄDER: En lätt kavaj eller tröja kan passa, men ytterkläder är inte nödvändigt.')
  } else if (perceived >= 23) {
    summary += ' Det är varmt.'
    rules.push('VARMT VÄDER: Välj lätta material. Undvik tjocka lager och ytterkläder.')
  }

  if (rain) {
    rules.push('REGN: Prioritera regntåliga ytterkläder om det finns. Undvik känsliga material.')
    requiresOuterwear = true
  }

  return { summary, rules: rules.join('\n'), requiresOuterwear }
}
