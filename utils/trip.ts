// Hjälpfunktioner för reseplaneraren: slår upp destinationens koordinater och
// hämtar väderprognos för resperioden (open-meteo, gratis och utan nyckel).
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'

const TRIP_KEY = 'kladkollen_trip'

// Speglar en lokalt sparad resa till databasen (trips-tabellen) så en sambo kan
// se den i läsläge. Körs vid appstart OCH när outfit-fliken får fokus, så resan
// hamnar i molnet även om man inte öppnar just den fliken. No-op utan resa/inlogg.
export async function mirrorLocalTripToDb(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(TRIP_KEY)
    if (!raw) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('trips').upsert({ user_id: user.id, data: JSON.parse(raw), updated_at: new Date().toISOString() })
  } catch { /* ignorera – nästa försök tar det */ }
}

export type GeoResult = { name: string; country: string; latitude: number; longitude: number }

/** Slår upp en destination (stad/plats) och returnerar koordinater + land.
 *  `lang` styr språket på stads-/landsnamnen så de matchar appspråket. */
export async function geocodeDestination(query: string, lang: string = 'sv'): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=${encodeURIComponent(lang)}&format=json`
  try {
    const res = await fetch(url)
    const data = await res.json()
    const r = data?.results?.[0]
    if (!r) return null
    return { name: r.name, country: r.country || '', latitude: r.latitude, longitude: r.longitude }
  } catch {
    return null
  }
}

export type TripWeather = {
  summary: string
  hasForecast: boolean
  minTemp?: number
  maxTemp?: number
  rainDays?: number
}

function ymd(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Hämtar en daglig prognos för resperioden. Prognosen når bara ~16 dagar fram,
 * så vi klipper intervallet till det som går att förutspå. Ligger hela resan
 * längre fram returneras hasForecast=false och AI:n får resonera utifrån
 * typiskt klimat för destinationen och månaden istället.
 */
export async function fetchTripWeather(lat: number, lon: number, start: string, end: string): Promise<TripWeather> {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 15)
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const clampS = s < today ? today : s
  const clampE = e > maxDate ? maxDate : e
  if (clampS > clampE) return { summary: '', hasForecast: false }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
      `&start_date=${ymd(clampS)}&end_date=${ymd(clampE)}&timezone=auto`
    const res = await fetch(url)
    const data = await res.json()
    const maxT: number[] = (data?.daily?.temperature_2m_max || []).filter((x: any) => x != null)
    const minT: number[] = (data?.daily?.temperature_2m_min || []).filter((x: any) => x != null)
    const precip: number[] = (data?.daily?.precipitation_probability_max || []).filter((x: any) => x != null)
    if (!maxT.length || !minT.length) return { summary: '', hasForecast: false }
    const maxTemp = Math.round(Math.max(...maxT))
    const minTemp = Math.round(Math.min(...minT))
    const rainDays = precip.filter(p => p >= 50).length
    const summary = `Prognos på plats: ca ${minTemp}–${maxTemp}°C. ` +
      (rainDays > 0 ? `${rainDays} dag${rainDays > 1 ? 'ar' : ''} med risk för regn.` : 'Mestadels uppehåll.')
    return { summary, hasForecast: true, minTemp, maxTemp, rainDays }
  } catch {
    return { summary: '', hasForecast: false }
  }
}
