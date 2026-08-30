import { createClient } from '@supabase/supabase-js'
import { computeSizeReminders, type ReminderChild, type ReminderGarment } from '../utils/sizeReminders'

// Körs av Vercel Cron (veckovis). Räknar per hushåll ut vilka sparade barnkläder
// som är redo att tas fram (spec §2) och skickar en veckodigest via Expo Push
// till hushållets vuxna – så påminnelsen når även den som aldrig öppnar appen.
// Edge-runtime (som resten av api/): handlern använder webb-signaturen
// (request: Request) → new Response(). Utan config default:ade den till
// nodejs-runtime, där handlern får (req, res) i stället och kraschar direkt
// (request.headers.get is not a function) → 100 % fel, aldrig levererad.
export const config = { runtime: 'edge' }

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send'

// Notis-texter per språk (fristående; faller tillbaka på svenska).
const MSG: Record<string, Record<string, string>> = {
  sv: { title: 'Dags att ta fram nästa storlek 👶', body: '{n} plagg är redo att ta fram.', bodyLoc: '{n} plagg är redo att ta fram – {loc}.' },
  en: { title: 'Time to bring out the next size 👶', body: '{n} items are ready to bring out.', bodyLoc: '{n} items are ready to bring out – {loc}.' },
  de: { title: 'Zeit für die nächste Größe 👶', body: '{n} Teile sind bereit zum Hervorholen.', bodyLoc: '{n} Teile sind bereit zum Hervorholen – {loc}.' },
  es: { title: 'Hora de sacar la siguiente talla 👶', body: '{n} prendas están listas para sacar.', bodyLoc: '{n} prendas están listas para sacar: {loc}.' },
  fr: { title: 'Il est temps de sortir la taille suivante 👶', body: '{n} vêtements sont prêts à sortir.', bodyLoc: '{n} vêtements sont prêts à sortir – {loc}.' },
}
function t(lang: string | null | undefined, key: string, vars?: Record<string, string | number>): string {
  const l = lang && MSG[lang] ? lang : 'sv'
  let s = MSG[l][key] ?? MSG.sv[key] ?? key
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]))
  return s
}

function today(): string { return new Date().toISOString().slice(0, 10) }

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  const d = new Date(dateStr).getTime()
  if (isNaN(d)) return Infinity
  return Math.floor((Date.now() - d) / 86400000)
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return new Response('Missing config', { status: 500 })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Barn per hushåll.
  const { data: kids } = await admin
    .from('people')
    .select('id, household_id, name, birthdate, current_size_cm, current_shoe_size, type')
    .eq('type', 'child')
  const childrenByHousehold = new Map<string, ReminderChild[]>()
  for (const k of (kids || []) as any[]) {
    const list = childrenByHousehold.get(k.household_id) || []
    list.push({ id: k.id, name: k.name, birthdate: k.birthdate, current_size_cm: k.current_size_cm, current_shoe_size: k.current_shoe_size })
    childrenByHousehold.set(k.household_id, list)
  }
  const householdIds = [...childrenByHousehold.keys()]
  if (householdIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, households: 0, sent: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // Plagg med barnstorlek per hushåll.
  const { data: garments } = await admin
    .from('garments')
    .select('id, name, image_url, location, season, size_cm, shoe_size, status, person_id, household_id')
    .in('household_id', householdIds)
    .or('size_cm.not.is.null,shoe_size.not.is.null')
  const garmentsByHousehold = new Map<string, ReminderGarment[]>()
  for (const g of (garments || []) as any[]) {
    const list = garmentsByHousehold.get(g.household_id) || []
    list.push(g)
    garmentsByHousehold.set(g.household_id, list)
  }

  const day = today()
  const messages: any[] = []
  let householdsWithReady = 0
  // Dedupa per push-token över hela körningen: en token = en enhet. Samma
  // telefon inloggad på flera konton ska bara få EN notis (inte en per konto).
  const sentTokens = new Set<string>()

  for (const hid of householdIds) {
    const children = childrenByHousehold.get(hid) || []
    const gs = garmentsByHousehold.get(hid) || []
    const ready = computeSizeReminders(gs, children, new Date()).filter(r => r.state === 'ready')
    if (ready.length === 0) continue
    householdsWithReady++

    // Vanligaste platsen ("kartong 3, vinden") för en konkret uppmaning.
    const locCount: Record<string, number> = {}
    for (const r of ready) if (r.location) locCount[r.location] = (locCount[r.location] || 0) + 1
    const topLoc = Object.entries(locCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    const n = ready.length

    // Hushållets vuxna med app-konto.
    const { data: members } = await admin
      .from('household_members')
      .select('user_id')
      .eq('household_id', hid)
    const userIds = (members || []).map((m: any) => m.user_id)
    if (userIds.length === 0) continue

    const sizeCols = 'id, push_token, notif_enabled, notif_prefs, last_size_digest'
    let { data: profiles, error: profErr } = await admin
      .from('profiles').select(`${sizeCols}, lang`)
      .in('id', userIds).not('push_token', 'is', null)
    // Resiliens: om lang-kolumnen inte körts än – hämta utan den (svenska).
    if (profErr) {
      const r = await admin.from('profiles').select(sizeCols).in('id', userIds).not('push_token', 'is', null)
      profiles = r.data as any
    }

    for (const p of (profiles || []) as any[]) {
      if (!p.push_token) continue
      if (p.notif_enabled === false) continue
      // Opt-out: prefs.sizereminder === false. Default på.
      if (p.notif_prefs && p.notif_prefs.sizereminder === false) continue
      // Max en digest per vecka.
      if (daysSince(p.last_size_digest) < 6) continue
      // En notis per enhet, även om telefonen varit inloggad på flera konton.
      if (sentTokens.has(p.push_token)) continue
      sentTokens.add(p.push_token)

      messages.push({
        to: p.push_token,
        sound: 'default',
        title: t(p.lang, 'title'),
        body: topLoc ? t(p.lang, 'bodyLoc', { n, loc: topLoc }) : t(p.lang, 'body', { n }),
        data: { route: '/family', kind: 'sizereminder' },
      })
      await admin.from('profiles').update({ last_size_digest: day }).eq('id', p.id)
    }
  }

  if (messages.length) await sendBatch(messages)

  return new Response(JSON.stringify({ ok: true, households: householdsWithReady, sent: messages.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
