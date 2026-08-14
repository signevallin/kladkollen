import { json } from './_utils'

export const config = { runtime: 'edge' }

// Publik endpoint för väntelistan på landningssidan (ingen inloggning). Skriver
// e-post till tabellen `waitlist` via service role (PostgREST). Honeypot-fält +
// enkel validering mot skräp. Dubbletter (unik e-post) behandlas som ok.
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let email = '', source = 'landing', lang = 'sv', honeypot = '', stage: string | null = null
  try {
    const body = (await request.json()) as any
    email = String(body?.email || '').trim().toLowerCase()
    source = String(body?.source || 'landing').slice(0, 40)
    lang = String(body?.lang || 'sv').slice(0, 5)
    honeypot = String(body?.company || '')
    // Livsskede: bara kända värden sparas, annars null.
    const s = String(body?.stage || '').toLowerCase()
    stage = (s === 'single' || s === 'couple' || s === 'family' || s === 'pregnant') ? s : null
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  // Bot fyllde i det dolda fältet – låtsas att allt gick bra, spara inget.
  if (honeypot) return json({ ok: true })

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) {
    return json({ error: 'invalid_email' }, 400)
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return json({ error: 'server' }, 500)

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email, source, lang, stage }),
    })
    // 409 = redan på listan (unik e-post) → också ett lyckat resultat.
    if (!r.ok && r.status !== 409) return json({ error: 'server' }, 502)
    return json({ ok: true })
  } catch {
    return json({ error: 'server' }, 502)
  }
}
