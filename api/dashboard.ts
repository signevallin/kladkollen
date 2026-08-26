import { json } from './_utils'

export const config = { runtime: 'edge' }

/**
 * Intern översiktssida: allt man annars måste logga in i fem tjänster för.
 *
 * Skyddad med DASHBOARD_KEY i query-parametern. Det är medvetet enkelt och
 * acceptabelt HÄR eftersom sidan bara visar AGGREGAT – inga e-postadresser,
 * inga namn, inga bilder. Lägg aldrig till personuppgifter på den; då duger
 * inte en nyckel i en URL som kan hamna i loggar och historik.
 *
 * Supabase-siffrorna kommer från RPC:n dashboard_stats(). Övriga tjänster är
 * frivilliga: saknas nyckeln visas rutan som "ej konfigurerad" i stället för
 * att sidan går sönder.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

type Card = { label: string; value: string; hint?: string; tone?: 'ok' | 'warn' | 'bad' }

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

const bytes = (n: number) => {
  if (!n) return '0 B'
  const u = ['B', 'kB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1)
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`
}

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : '–')

/** Hämtar med kort timeout – en trög tredjepart får inte hänga hela sidan. */
async function get(url: string, headers: Record<string, string>, ms = 6000): Promise<any | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── Supabase ───────────────────────────────────────────────────────────────
async function supabaseStats(): Promise<any | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dashboard_stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: '{}',
  })
  if (!r.ok) return null
  return r.json()
}

// ── Sentry ─────────────────────────────────────────────────────────────────
async function sentryIssues() {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org = process.env.SENTRY_ORG
  const proj = process.env.SENTRY_PROJECT
  if (!token || !org || !proj) return null
  const data = await get(
    `https://sentry.io/api/0/projects/${org}/${proj}/issues/?statsPeriod=24h&query=is:unresolved`,
    { Authorization: `Bearer ${token}` },
  )
  if (!Array.isArray(data)) return null
  return {
    open: data.length,
    events: data.reduce((n: number, i: any) => n + Number(i.count || 0), 0),
    top: data.slice(0, 5).map((i: any) => ({ title: i.title, count: i.count, culprit: i.culprit })),
  }
}

// ── RevenueCat ─────────────────────────────────────────────────────────────
async function revenueCat() {
  const key = process.env.REVENUECAT_SECRET_KEY
  const project = process.env.REVENUECAT_PROJECT_ID
  if (!key || !project) return null
  const data = await get(
    `https://api.revenuecat.com/v2/projects/${project}/metrics/overview`,
    { Authorization: `Bearer ${key}` },
  )
  if (!data?.metrics) return null
  const by = Object.fromEntries(data.metrics.map((m: any) => [m.id, m]))
  return {
    mrr: by.mrr?.value ?? null,
    activeSubs: by.active_subscriptions?.value ?? null,
    activeTrials: by.active_trials?.value ?? null,
    revenue28: by.revenue?.value ?? null,
  }
}

// ── Vercel ─────────────────────────────────────────────────────────────────
async function vercel() {
  const token = process.env.VERCEL_TOKEN
  if (!token) return null
  const data = await get('https://api.vercel.com/v6/deployments?limit=5', { Authorization: `Bearer ${token}` })
  const d = data?.deployments
  if (!Array.isArray(d) || !d.length) return null
  return {
    latestState: d[0].state,
    latestAt: d[0].created,
    failed24h: d.filter((x: any) => x.state === 'ERROR' && Date.now() - x.created < 864e5).length,
  }
}

// ── Rendering ──────────────────────────────────────────────────────────────
function cardHtml(c: Card) {
  return `<div class="card ${c.tone || ''}">
    <div class="label">${esc(c.label)}</div>
    <div class="value">${esc(c.value)}</div>
    ${c.hint ? `<div class="hint">${esc(c.hint)}</div>` : ''}
  </div>`
}

function section(title: string, cards: Card[], note?: string) {
  return `<section>
    <h2>${esc(title)}</h2>
    ${note ? `<p class="note">${esc(note)}</p>` : ''}
    <div class="grid">${cards.map(cardHtml).join('')}</div>
  </section>`
}

function missing(title: string, vars: string[]) {
  return `<section>
    <h2>${esc(title)}</h2>
    <div class="empty">Ej konfigurerad. Lägg till ${vars.map(v => `<code>${esc(v)}</code>`).join(', ')} i Vercel.</div>
  </section>`
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const key = url.searchParams.get('key') || ''
  const expected = process.env.DASHBOARD_KEY || ''
  if (!expected) return json({ error: 'DASHBOARD_KEY saknas på servern' }, 500)
  if (key !== expected) return new Response('Not found', { status: 404 })

  const [sb, sentry, rc, vc] = await Promise.all([supabaseStats(), sentryIssues(), revenueCat(), vercel()])

  const parts: string[] = []

  if (sb) {
    const a = sb.activation || {}
    const rate = a.cohort > 0 ? a.activated / a.cohort : 0
    // Aktivering är enligt playbooken den viktigaste siffran. Under 25 % betyder
    // att onboardingen läcker – då spelar marknadsföring ingen roll än.
    parts.push(section('Aktivering – senaste 30 dagarna', [
      { label: 'Nya konton', value: String(a.cohort ?? 0) },
      { label: 'Lagt in plagg', value: `${a.with_garment ?? 0}`, hint: pct(a.with_garment ?? 0, a.cohort ?? 0) },
      { label: 'Genererat outfit', value: `${a.with_outfit ?? 0}`, hint: pct(a.with_outfit ?? 0, a.cohort ?? 0) },
      {
        label: 'Aktiverade', value: pct(a.activated ?? 0, a.cohort ?? 0),
        hint: 'plagg + outfit',
        tone: rate >= 0.4 ? 'ok' : rate >= 0.25 ? 'warn' : 'bad',
      },
    ], 'Andelen som både lagt in plagg och genererat en outfit. Är den låg läcker onboardingen, och annonser gör bara läckaget dyrare.'))

    const u = sb.users || {}
    parts.push(section('Användare', [
      { label: 'Totalt', value: String(u.total ?? 0) },
      { label: 'Nya (7 d)', value: String(u.new_7d ?? 0) },
      { label: 'Aktiva (7 d)', value: String(u.active_7d ?? 0), hint: pct(u.active_7d ?? 0, u.total ?? 0) },
    ]))

    const c = sb.content || {}
    const s = sb.storage || {}
    parts.push(section('Databas & lagring', [
      { label: 'Plagg', value: String(c.garments ?? 0) },
      { label: 'Outfits', value: String(c.outfits ?? 0) },
      { label: 'Hushåll', value: `${c.households ?? 0}`, hint: `${c.people ?? 0} familjemedlemmar` },
      { label: 'Databas', value: bytes(sb.db_size_bytes ?? 0) },
      {
        label: 'Bildlagring', value: bytes(s.bytes ?? 0), hint: `${s.objects ?? 0} filer`,
        tone: (s.bytes ?? 0) > 900e6 ? 'warn' : undefined,
      },
    ], 'Bildlagringen är er största kostnadsrisk – den skalar med hur ofta bilder visas, inte med antal användare.'))

    const ai = sb.ai || {}
    const ent = ai.entitlements || {}
    parts.push(section('Premium & AI-kvot', [
      { label: 'Aktiva abonnemang', value: String(ent.active_total ?? 0), hint: `varav ${ent.manual ?? 0} manuella` },
      { label: 'Familj', value: String(ent.family ?? 0) },
      { label: 'Partner', value: String(ent.partner ?? 0) },
      {
        label: 'Slog i gratistaket', value: String(ai.at_cap_this_week ?? 0),
        hint: 'denna vecka', tone: (ai.at_cap_this_week ?? 0) > 0 ? 'warn' : undefined,
      },
    ], 'De som slår i taket är er tydligaste konverteringssignal.'))

    // Notisjobbet kör som Vercel cron. Slutar det köra märks det annars inte.
    const last = String(sb.cron?.last_notification || '')
    const day = last.split(':')[0]
    const stale = !day || (Date.now() - Date.parse(day)) > 36 * 3600e3
    parts.push(section('Cron', [
      {
        label: 'Senaste notisutskick', value: day || 'aldrig',
        hint: last.split(':')[1] || '', tone: stale ? 'bad' : 'ok',
      },
    ], stale ? 'Inget utskick på över 36 timmar – kontrollera Vercel cron.' : undefined))
  } else {
    parts.push(missing('Supabase', ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']))
  }

  if (sentry) {
    parts.push(section('Sentry (24 h)', [
      { label: 'Öppna issues', value: String(sentry.open), tone: sentry.open > 0 ? 'warn' : 'ok' },
      { label: 'Händelser', value: String(sentry.events) },
      ...sentry.top.map((i: any) => ({ label: i.culprit || 'issue', value: String(i.count), hint: i.title })),
    ]))
  } else {
    parts.push(missing('Sentry', ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']))
  }

  if (rc) {
    parts.push(section('RevenueCat', [
      { label: 'MRR', value: rc.mrr != null ? String(rc.mrr) : '–' },
      { label: 'Aktiva abonnemang', value: rc.activeSubs != null ? String(rc.activeSubs) : '–' },
      { label: 'Aktiva provperioder', value: rc.activeTrials != null ? String(rc.activeTrials) : '–' },
      { label: 'Intäkt (28 d)', value: rc.revenue28 != null ? String(rc.revenue28) : '–' },
    ]))
  } else {
    parts.push(missing('RevenueCat', ['REVENUECAT_SECRET_KEY', 'REVENUECAT_PROJECT_ID']))
  }

  if (vc) {
    parts.push(section('Vercel', [
      { label: 'Senaste deploy', value: String(vc.latestState), tone: vc.latestState === 'READY' ? 'ok' : 'warn' },
      { label: 'Misslyckade (24 h)', value: String(vc.failed24h), tone: vc.failed24h > 0 ? 'bad' : 'ok' },
    ]))
  } else {
    parts.push(missing('Vercel', ['VERCEL_TOKEN']))
  }

  const html = `<!DOCTYPE html>
<html lang="sv"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="color-scheme" content="light">
<title>Skrud — Översikt</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Lora:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{color-scheme:light;--brand:#402D21;--soft:#6C4D38;--cream:#F8EADE;--bg:#FEFAF8;
  --border:rgba(108,77,56,.14);--ok:#4F6B4A;--warn:#96682A;--bad:#9E3D28;}
body{background:var(--bg);color:var(--brand);font-family:'Lora',Georgia,serif;line-height:1.6;padding:40px 24px 80px;}
.wrap{max-width:1040px;margin:0 auto;}
.wordmark{font-family:'Poppins',sans-serif;font-weight:700;font-size:15px;letter-spacing:.22em;text-transform:uppercase;}
h1{font-family:'Poppins',sans-serif;font-size:32px;letter-spacing:-.02em;margin:14px 0 4px;}
.stamp{color:var(--soft);font-size:14px;margin-bottom:38px;}
section{margin-bottom:38px;}
h2{font-family:'Poppins',sans-serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);
  border-bottom:1px solid var(--border);padding-bottom:9px;margin-bottom:14px;}
.note{font-size:14px;color:var(--soft);margin:-6px 0 16px;max-width:64ch;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;}
.card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px 18px;}
.card.ok{border-left:3px solid var(--ok);} .card.warn{border-left:3px solid var(--warn);}
.card.bad{border-left:3px solid var(--bad);}
.label{font-family:'Poppins',sans-serif;font-size:10.5px;font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;color:var(--soft);margin-bottom:6px;}
.value{font-family:'Poppins',sans-serif;font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.hint{font-size:13px;color:var(--soft);margin-top:3px;}
.empty{background:var(--cream);border:1px dashed var(--border);border-radius:12px;padding:16px 18px;font-size:14px;color:var(--soft);}
code{font-family:'Poppins',sans-serif;font-size:12.5px;background:#fff;padding:1px 6px;border-radius:5px;border:1px solid var(--border);}
</style></head><body><div class="wrap">
<span class="wordmark">Skrud</span>
<h1>Översikt</h1>
<p class="stamp">${esc(new Date().toLocaleString('sv-SE'))}</p>
${parts.join('\n')}
</div></body></html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
