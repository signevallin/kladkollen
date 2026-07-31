import { createClient } from '@supabase/supabase-js'

// Tar emot RevenueCat-webhooks och skriver Premium-status till databasen
// (entitlements.pro_until) med service role – den enda pålitliga källan, eftersom
// klienten inte kan skriva i entitlements-tabellen.
//
// Konfig: sätt REVENUECAT_WEBHOOK_SECRET (samma värde som Authorization-headern
// i RevenueCats webhook-inställningar) samt SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Klienten loggar in RevenueCat med Supabase-user-id, så app_user_id = auth-uid.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  const auth = request.headers.get('authorization') || ''
  if (secret && auth !== secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return new Response('Missing config', { status: 500 })

  let body: any
  try { body = await request.json() } catch { return new Response('Bad JSON', { status: 400 }) }

  const ev = body?.event || {}
  const userId: string = ev.app_user_id || ''
  // Anonyma RevenueCat-id:n (t.ex. $RCAnonymousID:...) hör inte till en app-användare.
  if (!UUID_RE.test(userId)) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no app user' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const expMs = ev.expiration_at_ms
  const proUntil = expMs ? new Date(Number(expMs)).toISOString() : null

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { error } = await admin.from('entitlements').upsert({
    user_id: userId,
    pro_until: proUntil,
    product_id: ev.product_id ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
