import { createClient } from '@supabase/supabase-js'

// Körs av Vercel Cron (morgon + kväll). Bygger en personlig notis per
// användare utifrån deras garderob + väder och skickar via Expo Push.
// Node-runtime (inte edge): behöver service role och loopar över användare.
// maxDuration höjs så väder-/push-anropen hinner klart innan funktionen
// dödas (annars skickas inga notiser alls – allt skickas i slutet av körningen).
export const config = { runtime: 'nodejs', maxDuration: 60 }

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

// Delar upp en lista i mindre bitar. Används för att batcha .in()-frågor så
// URL:en inte blir för lång när användarantalet växer.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
const ID_CHUNK = 200

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
      + `&current=temperature_2m,weathercode&daily=uv_index_max,precipitation_probability_max&timezone=auto`
    const r = await fetch(url)
    if (!r.ok) return null
    const d: any = await r.json()
    return {
      temp: Math.round(d?.current?.temperature_2m ?? NaN),
      code: d?.current?.weathercode ?? 0,
      uv: Math.round(d?.daily?.uv_index_max?.[0] ?? 0),
      rainChance: Math.round(d?.daily?.precipitation_probability_max?.[0] ?? 0),
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

  // Regnvarning: hög regnrisk under dagen → påminn om regnplagg. Ligger först
  // eftersom det är mer akut att missa regnjackan än ett solglasögontips.
  if (weather && prefs.weather && weather.rainChance >= 60) {
    const raincoat = active.find(g => /regn/i.test(`${g.name || ''} ${g.category || ''}`))
    const item = raincoat ? `din ${describe(raincoat)}` : 'regnjackan eller paraplyet'
    return {
      kind: 'rain',
      title: 'Det ser ut att bli regn idag ☔️',
      body: `${weather.rainChance}% risk för regn – glöm inte ${item}.`,
      route: '/home',
    }
  }

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
      body: 'Öppna Skrud för ett outfitförslag anpassat efter vädret.',
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
  const slotTag = `${day}:${slot}`

  // Kandidater: har push-token och har inte redan fått en notis den här sloten
  // idag (max en notis per slot och dag, dedup lagras som "YYYY-MM-DD:slot").
  const candidates = ((profiles || []) as Profile[]).filter(
    p => p.push_token && p.last_notif_date !== slotTag
  )
  const ids = candidates.map(p => p.id)

  // Batcha plagg-hämtningen: EN fråga per id-batch i stället för en per
  // användare. Gruppera i minnet på user_id.
  const garmentsByUser = new Map<string, Garment[]>()
  for (const idsChunk of chunk(ids, ID_CHUNK)) {
    const { data } = await admin
      .from('garments')
      .select('user_id, id, name, brand, color, category, season, price, times_worn, last_worn, created_at')
      .in('user_id', idsChunk)
      .eq('archived', false)
    for (const g of (data || []) as (Garment & { user_id: string })[]) {
      const arr = garmentsByUser.get(g.user_id)
      if (arr) arr.push(g); else garmentsByUser.set(g.user_id, [g])
    }
  }

  // Kväll: batcha kalender-kollen på samma sätt → set med user_id som redan
  // loggat en outfit idag.
  const hasOutfitSet = new Set<string>()
  if (slot === 'evening') {
    for (const idsChunk of chunk(ids, ID_CHUNK)) {
      const { data: cal } = await admin
        .from('outfit_calendar')
        .select('user_id')
        .in('user_id', idsChunk)
        .eq('date', day)
      for (const c of (cal || []) as { user_id: string }[]) hasOutfitSet.add(c.user_id)
    }
  }

  const messages: any[] = []
  // Samla vilka användare som fick vilken notistyp, så dedup-uppdateringen kan
  // göras som en fråga per notistyp (max ~8) i stället för en per användare.
  const notifiedByKind = new Map<string, string[]>()

  for (const p of candidates) {
    const notif = await buildNotif(slot, p, garmentsByUser.get(p.id) || [], hasOutfitSet.has(p.id))
    if (!notif) continue

    messages.push({
      to: p.push_token,
      sound: 'default',
      title: notif.title,
      body: notif.body,
      data: { route: notif.route, kind: notif.kind },
    })
    const arr = notifiedByKind.get(notif.kind)
    if (arr) arr.push(p.id); else notifiedByKind.set(notif.kind, [p.id])
  }

  if (messages.length) await sendBatch(messages)

  // Batcha dedup-uppdateringen: en update per notistyp (och id-batch) i stället
  // för en per användare.
  await Promise.all(
    [...notifiedByKind.entries()].flatMap(([kind, kindIds]) =>
      chunk(kindIds, ID_CHUNK).map(idsChunk =>
        admin.from('profiles')
          .update({ last_notif_date: slotTag, last_notif_kind: kind })
          .in('id', idsChunk)
      )
    )
  )

  return new Response(JSON.stringify({ ok: true, slot, considered: candidates.length, sent: messages.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
