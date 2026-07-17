import { createClient } from '@supabase/supabase-js'

// Körs av Vercel Cron (morgon + kväll). Bygger en personlig notis per
// användare utifrån deras garderob + väder och skickar via Expo Push.
// Node-runtime (inte edge): behöver service role och loopar över användare.

type Garment = {
  id: string; name: string | null; brand: string | null; color: string | null
  category: string | null; season: string | null; price: number | null
  times_worn: number | null; last_worn: string | null; created_at: string
}

type Profile = {
  id: string; push_token: string | null; notif_enabled: boolean | null
  notif_prefs: Record<string, boolean> | null
  push_lat: number | null; push_lon: number | null
  last_notif_date: string | null
}

type Notif = { kind: string; title: string; body: string; route: string }

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send'

function today(): string { return new Date().toISOString().slice(0, 10) }

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  const d = new Date(dateStr).getTime()
  if (isNaN(d)) return Infinity
  return Math.floor((Date.now() - d) / 86400000)
}

// Månad → svensk säsong.
function currentSeason(): 'Vår' | 'Sommar' | 'Höst' | 'Vinter' {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return 'Vår'
  if (m >= 6 && m <= 8) return 'Sommar'
  if (m >= 9 && m <= 11) return 'Höst'
  return 'Vinter'
}

function describe(g: Garment): string {
  const parts = [g.color, g.name || g.category].filter(Boolean)
  const base = parts.join(' ').toLowerCase()
  return g.brand ? `${base} från ${g.brand}` : base
}

async function getWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,weathercode&daily=uv_index_max&timezone=auto`
    const r = await fetch(url)
    if (!r.ok) return null
    const d: any = await r.json()
    return {
      temp: Math.round(d?.current?.temperature_2m ?? NaN),
      code: d?.current?.weathercode ?? 0,
      uv: Math.round(d?.daily?.uv_index_max?.[0] ?? 0),
    }
  } catch { return null }
}

// Väljer dagens notis för en användare. Prioriterad ordning, hoppar över
// kategorier användaren stängt av. Returnerar null om inget passar.
async function buildNotif(
  slot: 'morning' | 'evening',
  p: Profile,
  garments: Garment[],
  hasOutfitToday: boolean,
): Promise<Notif | null> {
  const prefs = p.notif_prefs || {}
  const active = garments.filter(g => g)
  const season = currentSeason()

  if (slot === 'evening') {
    // Kväll: påminn om att logga dagens outfit om inget loggats.
    if (prefs.logreminder && !hasOutfitToday && active.length > 0) {
      return {
        kind: 'logreminder',
        title: 'Vad hade du på dig idag? 📸',
        body: 'Tryck här för att logga dagens outfit på 2 sekunder.',
        route: '/my-outfit',
      }
    }
    // Söndag kväll: veckans statistik (kräver att något burits).
    if (prefs.rediscovery && new Date().getDay() === 0) {
      const worn = active.filter(g => (g.times_worn || 0) > 0)
      if (worn.length > 0) {
        const top = [...worn].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0))[0]
        return {
          kind: 'weeklystats',
          title: 'Din vecka i kläder 👗',
          body: `Ditt mest burna plagg är ${describe(top)}. Öppna för hela din statistik.`,
          route: '/stats',
        }
      }
    }
    return null
  }

  // ── Morgon ──
  const weather = (prefs.weather && p.push_lat != null && p.push_lon != null)
    ? await getWeather(p.push_lat, p.push_lon)
    : null

  // UV-varning på soliga sommardagar.
  if (weather && prefs.weather && weather.uv >= 6) {
    return {
      kind: 'uv',
      title: `UV-index ${weather.uv} idag ☀️`,
      body: 'Starkt solljus – plocka fram något luftigt och glöm inte solglasögonen.',
      route: '/home',
    }
  }

  // "Äntligen rätt väder": ett säsongsplagg du inte burit på länge.
  if (weather && prefs.weather) {
    const cand = active
      .filter(g => (g.season || '').includes(season) && daysSince(g.last_worn) >= 30)
      .sort((a, b) => daysSince(b.last_worn) - daysSince(a.last_worn))[0]
    if (cand) {
      return {
        kind: 'rightweather',
        title: `Perfekt väder idag (${weather.temp}°C) 🌤`,
        body: `Äntligen läge för din ${describe(cand)} som legat orörd ett tag.`,
        route: '/home',
      }
    }
  }

  // Glömda skatter: plagget som legat orört längst.
  if (prefs.rediscovery) {
    const forgotten = active
      .filter(g => daysSince(g.last_worn) >= 45 && daysSince(g.created_at) >= 21)
      .sort((a, b) => daysSince(b.last_worn) - daysSince(a.last_worn))[0]
    if (forgotten) {
      const d = daysSince(forgotten.last_worn)
      const when = d === Infinity ? 'har aldrig burits' : `har legat orörd i ${d} dagar`
      return {
        kind: 'forgotten',
        title: 'Glömd skatt i garderoben ✨',
        body: `Din ${describe(forgotten)} ${when}. Ska vi styla den idag?`,
        route: '/home',
      }
    }
  }

  // Dagens outfit-förslag.
  if (prefs.ootd && active.length >= 3) {
    return {
      kind: 'ootd',
      title: 'Dagens outfit väntar 👀',
      body: 'Öppna Klädkollen för ett outfitförslag anpassat efter vädret.',
      route: '/home',
    }
  }

  // Säsongsbyte de första dagarna i en ny säsong.
  if (prefs.seasonal && new Date().getDate() <= 3 && [3, 6, 9, 12].includes(new Date().getMonth() + 1)) {
    return {
      kind: 'seasonal',
      title: `${season} är här 🍂`,
      body: 'Dags att arkivera förra säsongens plagg och lyfta fram de nya?',
      route: '/wardrobe',
    }
  }

  return null
}

async function sendBatch(messages: any[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(chunk),
      })
    } catch { /* fortsätt med nästa batch */ }
  }
}

export default async function handler(request: Request): Promise<Response> {
  // Skyddad av CRON_SECRET (Vercel Cron skickar den som Bearer-token).
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  const url = new URL(request.url)
  const qsSecret = url.searchParams.get('secret')
  if (secret && auth !== `Bearer ${secret}` && qsSecret !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const slot = (url.searchParams.get('slot') === 'evening') ? 'evening' : 'morning'
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return new Response('Missing config', { status: 500 })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, push_token, notif_enabled, notif_prefs, push_lat, push_lon, last_notif_date')
    .not('push_token', 'is', null)
    .eq('notif_enabled', true)

  const day = today()
  const messages: any[] = []
  let considered = 0

  for (const p of (profiles || []) as Profile[]) {
    if (!p.push_token) continue
    // Max en notis per slot och dag (dedup lagras som "YYYY-MM-DD:slot").
    if (p.last_notif_date === `${day}:${slot}`) continue
    considered++

    const { data: garments } = await admin
      .from('garments')
      .select('id, name, brand, color, category, season, price, times_worn, last_worn, created_at')
      .eq('user_id', p.id)
      .eq('archived', false)

    let hasOutfitToday = false
    if (slot === 'evening') {
      const { data: cal } = await admin
        .from('outfit_calendar')
        .select('date')
        .eq('user_id', p.id)
        .eq('date', day)
        .limit(1)
      hasOutfitToday = !!(cal && cal.length)
    }

    const notif = await buildNotif(slot, p, (garments || []) as Garment[], hasOutfitToday)
    if (!notif) continue

    messages.push({
      to: p.push_token,
      sound: 'default',
      title: notif.title,
      body: notif.body,
      data: { route: notif.route, kind: notif.kind },
    })
    await admin.from('profiles').update({
      last_notif_date: `${day}:${slot}`,
      last_notif_kind: notif.kind,
    }).eq('id', p.id)
  }

  if (messages.length) await sendBatch(messages)

  return new Response(JSON.stringify({ ok: true, slot, considered, sent: messages.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
