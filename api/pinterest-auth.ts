import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Pinterest-inloggning för moodboarden. Två vägar i samma route:
//
//   POST  (med Supabase-token)  → returnerar URL:en användaren ska skickas till
//   GET   (?code&state)         → Pinterests callback, byter kod mot token
//   DELETE(med Supabase-token)  → kopplar bort kontot
//
// Klienthemligheten lämnar aldrig servern, och access-token skrivs bara till
// pinterest_accounts (RLS på, inga policies → bara service role kommer åt den).
// Appen får aldrig se token; den hämtar pins via api/pinterest-pins.

const AUTH_URL = 'https://www.pinterest.com/oauth/'
const TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token'
const ME_URL = 'https://api.pinterest.com/v5/user_account'
const REDIRECT_URI = 'https://www.skrud.app/api/pinterest-auth'
const SCOPES = 'pins:read,boards:read,user_accounts:read'

// Dit användaren skickas tillbaka i appen. Ren scheme-URL av samma skäl som i
// login.tsx: createURL gav tre snedstreck och matchade inte.
const APP_RETURN = 'kladkollen://inspiration'

function env(name: string): string | null {
  return process.env[name] || null
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase-konfiguration saknas på servern')
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}

// Skickar tillbaka till appen med ett resultat i frågesträngen. Alltid en
// redirect, aldrig JSON: det här svaret läses av Safari, inte av appen.
function backToApp(status: 'ok' | 'error', detalj?: string): Response {
  const q = new URLSearchParams({ pinterest: status })
  if (detalj) q.set('reason', detalj)
  return new Response(null, { status: 302, headers: { Location: `${APP_RETURN}?${q}` } })
}

export default async function handler(request: Request): Promise<Response> {
  const appId = env('PINTEREST_APP_ID')
  const secret = env('PINTEREST_APP_SECRET')

  // ── Pinterests callback ──────────────────────────────────────────────────
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    // Användaren tryckte "Avbryt" hos Pinterest.
    if (url.searchParams.get('error')) return backToApp('error', 'avbruten')
    if (!code || !state) return backToApp('error', 'saknar_kod')
    if (!appId || !secret) return backToApp('error', 'serverkonfiguration')

    // Slå upp vems inloggning det här är. Raden förbrukas direkt – en state
    // får bara användas en gång.
    const stateRes = await db(`pinterest_oauth_states?state=eq.${encodeURIComponent(state)}&select=user_id,expires_at`)
    const rows = stateRes.ok ? await stateRes.json() : []
    const row = rows?.[0]
    await db(`pinterest_oauth_states?state=eq.${encodeURIComponent(state)}`, { method: 'DELETE' })
    if (!row) return backToApp('error', 'okand_state')
    if (new Date(row.expires_at).getTime() < Date.now()) return backToApp('error', 'utgangen')

    // Byt kod mot token. Basic-auth med app-id och hemlighet.
    const basic = btoa(`${appId}:${secret}`)
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    })
    if (!tokenRes.ok) return backToApp('error', 'token_nekad')
    const tok = await tokenRes.json()
    if (!tok?.access_token) return backToApp('error', 'ingen_token')

    // Användarnamnet visas i appen ("Kopplad som @namn"). Misslyckas det är
    // kopplingen ändå giltig – spara utan namn hellre än att slänga token.
    let username: string | null = null
    try {
      const me = await fetch(ME_URL, { headers: { Authorization: `Bearer ${tok.access_token}` } })
      if (me.ok) username = (await me.json())?.username ?? null
    } catch { /* namnet är kosmetiskt */ }

    const expiresAt = tok.expires_in
      ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
      : null

    const save = await db('pinterest_accounts?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id: row.user_id,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? null,
        expires_at: expiresAt,
        scopes: tok.scope ?? SCOPES,
        pinterest_username: username,
        updated_at: new Date().toISOString(),
      }),
    })
    if (!save.ok) return backToApp('error', 'kunde_inte_spara')
    return backToApp('ok')
  }

  // ── Starta inloggningen (anropas av appen) ───────────────────────────────
  if (request.method === 'POST') {
    const auth = await requireUser(request, { rateLimit: false })
    if (auth instanceof Response) return auth
    if (!appId) return json({ error: 'PINTEREST_APP_ID saknas på servern' }, 500)

    // Slumpad state, bunden till användaren. Utan den kan vem som helst
    // slutföra ett OAuth-flöde mot någon annans konto.
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const state = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')

    const ins = await db('pinterest_oauth_states', {
      method: 'POST',
      body: JSON.stringify({ state, user_id: auth.id }),
    })
    if (!ins.ok) return json({ error: 'Kunde inte starta inloggningen' }, 500)

    const q = new URLSearchParams({
      client_id: appId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      state,
    })
    return json({ url: `${AUTH_URL}?${q}` })
  }

  // ── Koppla bort ──────────────────────────────────────────────────────────
  if (request.method === 'DELETE') {
    const auth = await requireUser(request, { rateLimit: false })
    if (auth instanceof Response) return auth
    const res = await db(`pinterest_accounts?user_id=eq.${auth.id}`, { method: 'DELETE' })
    if (!res.ok) return json({ error: 'Kunde inte koppla bort' }, 500)
    return json({ ok: true })
  }

  return json({ error: 'Metod stöds inte' }, 405)
}
