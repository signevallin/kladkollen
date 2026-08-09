import { supabase } from '../supabase'
import { captureError } from './sentry'

// Bas-URL för API:t. Tom sträng = samma origin (webben).
// Sätt EXPO_PUBLIC_API_URL till t.ex. https://kladkollen.vercel.app för native-byggen.
const API_BASE = process.env.EXPO_PUBLIC_API_URL || ''

// Aktuellt appspråk. Sätts av SettingsProvider när språket laddas/ändras och
// bifogas automatiskt i varje AI-anrop så genererad text kommer på rätt språk.
let currentLang: string = 'sv'
export function setApiLang(lang: string) { currentLang = lang }

/** POST till en av våra serverless-endpoints med Supabase-sessionen som Bearer-token. */
export async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  // Bifoga valt språk (utan att skriva över om anroparen redan satt det).
  const payload = (body && typeof body === 'object' && !Array.isArray(body))
    ? { lang: currentLang, ...(body as Record<string, unknown>) }
    : body
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  let data: any = null
  try {
    data = await res.json()
  } catch {
    // Icke-JSON-svar = oftast en plattforms-timeout (504/502/503) som ger en
    // HTML-sida i stället för vårt JSON. Ge då ett begripligt meddelande.
    const timedOut = res.status === 504 || res.status === 502 || res.status === 503 || res.status === 408
    const err = new Error(timedOut
      ? 'Det tog för lång tid att svara. Försök igen om en stund.'
      : `Servern svarade oväntat (${res.status})`)
    captureError(err, { path, status: res.status })
    throw err
  }
  if (!res.ok || data?.error) {
    const err: any = new Error(data?.error || `Serverfel (${res.status})`)
    err.code = data?.code
    err.status = res.status
    // Kvot-stopp (402) är förväntat, inte ett fel att rapportera till Sentry.
    if (data?.code !== 'quota_exceeded') captureError(err, { path, status: res.status })
    throw err
  }
  return data as T
}
