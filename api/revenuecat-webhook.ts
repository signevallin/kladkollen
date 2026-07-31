export const config = { runtime: 'edge' }

// Tar emot RevenueCat-webhooks och skriver Premium-status till databasen
// (entitlements.pro_until) med service role – den enda pålitliga källan, eftersom
// klienten inte kan skriva i entitlements-tabellen.
//
// Konfig: sätt REVENUECAT_WEBHOOK_SECRET (samma värde som Authorization-headern
// i RevenueCats webhook-inställningar) samt SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Klienten loggar in RevenueCat med Supabase-user-id, så app_user_id = auth-uid.
//
// Edge-runtime + rå fetch (samma mönster som de övriga HTTP-endpointsen) för att
// undvika native/SDK-beroenden vid cold start.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

    const secret = process.env.REVENUECAT_WEBHOOK_SECRET
    const auth = request.headers.get('authorization') || ''
    if (secret && auth !== secret && auth !== `Bearer ${secret}`) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return jsonResponse({ error: 'Missing Supabase config' }, 500)

    let body: any = null
    try { body = await request.json() } catch { return jsonResponse({ error: 'Bad JSON' }, 400) }

    const ev = body?.event || {}
    const userId: string = ev.app_user_id || ''
    // Anonyma RevenueCat-id:n (t.ex. $RCAnonymousID:...) och testevent hör inte
    // till en app-användare – kvittera bara med 200.
    if (!UUID_RE.test(userId)) {
      return jsonResponse({ ok: true, skipped: 'no app user' }, 200)
    }

    const proUntil = ev.expiration_at_ms ? new Date(Number(ev.expiration_at_ms)).toISOString() : null
    const row = {
      user_id: userId,
      pro_until: proUntil,
      product_id: ev.product_id ?? null,
      updated_at: new Date().toISOString(),
    }

    // Upsert via PostgREST (merge på primärnyckeln user_id).
    const res = await fetch(`${supabaseUrl}/rest/v1/entitlements`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return jsonResponse({ ok: false, error: `DB-fel (${res.status})`, detail: text.slice(0, 300) }, 500)
    }

    return jsonResponse({ ok: true }, 200)
  } catch (e: any) {
    return jsonResponse({ ok: false, error: e?.message || 'Oväntat fel' }, 500)
  }
}
