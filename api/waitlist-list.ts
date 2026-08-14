export const config = { runtime: 'edge' }

// Enkel, lösenordsskyddad adminvy för väntelistan. Listan innehåller e-post
// (PII) så den ligger BAKOM en hemlig nyckel – aldrig länkad publikt.
//
// Konfig: sätt WAITLIST_ADMIN_SECRET i Vercel. Öppna sedan:
//   https://skrud.app/api/waitlist-list?key=<hemlighet>
//   …&format=csv  → laddar ner som CSV.

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const key = url.searchParams.get('key') || ''
  const secret = process.env.WAITLIST_ADMIN_SECRET || ''
  if (!secret) return new Response('WAITLIST_ADMIN_SECRET är inte satt i Vercel.', { status: 500 })
  if (key !== secret) return new Response('Unauthorized', { status: 401 })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return new Response('Missing config', { status: 500 })

  const r = await fetch(
    `${supabaseUrl}/rest/v1/waitlist?select=email,source,lang,created_at&order=created_at.desc`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  )
  if (!r.ok) return new Response('Kunde inte hämta väntelistan', { status: 502 })
  const rows = (await r.json()) as { email: string; source: string | null; lang: string | null; created_at: string }[]

  // CSV-export
  if (url.searchParams.get('format') === 'csv') {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = 'email,source,lang,created_at\n' +
      rows.map(x => [x.email, x.source, x.lang, x.created_at].map(cell).join(',')).join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const rowsHtml = rows.map((x, i) => `<tr>
    <td class="num">${i + 1}</td>
    <td>${esc(x.email)}</td>
    <td class="mid">${esc(x.lang || '–')}</td>
    <td class="mid">${esc(x.source || '–')}</td>
    <td class="dim">${esc((x.created_at || '').slice(0, 16).replace('T', ' '))}</td>
  </tr>`).join('')

  const csvHref = `/api/waitlist-list?key=${encodeURIComponent(key)}&format=csv`

  const html = `<!DOCTYPE html>
<html lang="sv"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Väntelista — Skrud</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#FEFAF8;color:#402D21;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px 20px;}
  .wrap{max-width:820px;margin:0 auto;}
  h1{font-size:26px;letter-spacing:-.02em;margin-bottom:4px;}
  .meta{color:#6C4D38;font-size:14px;margin-bottom:20px;}
  .count{font-weight:700;color:#402D21;}
  .btn{display:inline-block;background:#402D21;color:#FEFAF8;text-decoration:none;padding:9px 18px;border-radius:999px;font-size:13px;font-weight:600;margin-bottom:20px;}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid rgba(108,77,56,.14);border-radius:14px;overflow:hidden;font-size:14px;}
  th,td{text-align:left;padding:11px 14px;border-bottom:1px solid rgba(108,77,56,.1);}
  th{background:#F8EADE;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6C4D38;}
  tr:last-child td{border-bottom:none;}
  .num{color:#6C4D38;width:36px;}
  .mid{color:#6C4D38;}
  .dim{color:rgba(108,77,56,.6);white-space:nowrap;}
  .empty{padding:40px;text-align:center;color:#6C4D38;}
</style></head><body>
<div class="wrap">
  <h1>Väntelista</h1>
  <p class="meta"><span class="count">${rows.length}</span> anmälda · sorterat nyast först</p>
  ${rows.length ? `<a class="btn" href="${csvHref}">⬇︎ Ladda ner CSV</a>
  <table>
    <thead><tr><th>#</th><th>E-post</th><th>Språk</th><th>Källa</th><th>Datum</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>` : `<div class="empty">Ingen har anmält sig ännu.</div>`}
</div></body></html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
