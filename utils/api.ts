import { supabase } from '../supabase'

// Bas-URL för API:t. Tom sträng = samma origin (webben).
// Sätt EXPO_PUBLIC_API_URL till t.ex. https://kladkollen.vercel.app för native-byggen.
const API_BASE = process.env.EXPO_PUBLIC_API_URL || ''

/** POST till en av våra serverless-endpoints med Supabase-sessionen som Bearer-token. */
export async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  let data: any = null
  try {
    data = await res.json()
  } catch {
    throw new Error(`Servern svarade oväntat (${res.status})`)
  }
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Serverfel (${res.status})`)
  }
  return data as T
}
