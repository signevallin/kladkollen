import { createClient } from '@supabase/supabase-js'
import { clip, json, openaiChat, parseAiJson } from './_utils'

export const config = { runtime: 'edge' }

// Skickar en push-notis till användaren om att nya plagg hittats i ett kvitto.
async function sendPush(token: string, count: number) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: count === 1 ? 'Nytt plagg hittat 📩' : `${count} nya plagg hittade 📩`,
        body: count === 1
          ? 'Vi hittade ett plagg i ditt kvitto. Tryck för att granska och lägga till det.'
          : `Vi hittade ${count} plagg i ditt kvitto. Tryck för att granska och lägga till dem.`,
        data: { route: '/import-email', kind: 'email_import' },
      }),
    })
  } catch { /* notis är en bonus – blockera aldrig importen */ }
}

/**
 * Tar emot vidarebefordrade orderbekräftelser och plockar ut köpta plagg.
 *
 * Anropas av en inkommande mejltjänst (t.ex. SendGrid Inbound Parse) som
 * POST:ar mejlet hit. Adressen är unik per användare: {import_token}@import…
 * så vi vet vems kvitto det är. AI:n tolkar mejlets text och lägger plaggen
 * i pending_imports, som användaren sedan granskar i appen.
 *
 * Autentisering: en delad hemlighet i URL:en (?key=INBOUND_EMAIL_SECRET),
 * eftersom mejltjänsten inte kan sätta egna headers.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const secret = process.env.INBOUND_EMAIL_SECRET
  const url = new URL(request.url)
  if (!secret || url.searchParams.get('key') !== secret) {
    return json({ error: 'Obehörig' }, 401)
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return json({ error: 'Serverkonfiguration saknas' }, 500)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  try {
    // Läs in mejlet – stöder både multipart (SendGrid) och JSON.
    let to = '', from = '', subject = '', html = '', text = ''
    const ctype = request.headers.get('content-type') || ''
    if (ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData() as any
      to = String(form.get('to') || form.get('envelope') || '')
      from = String(form.get('from') || '')
      subject = String(form.get('subject') || '')
      html = String(form.get('html') || '')
      text = String(form.get('text') || '')
    } else {
      const body = (await request.json()) as any
      to = String(body.to || ''); from = String(body.from || '')
      subject = String(body.subject || ''); html = String(body.html || ''); text = String(body.text || '')
    }

    // Plocka ut import-token ur mottagaradressen (16 hex-tecken före @).
    const tokenMatch = to.match(/([a-f0-9]{16})@/i)
    if (!tokenMatch) return json({ error: 'Ingen import-adress hittades' }, 200)
    const token = tokenMatch[1].toLowerCase()

    const { data: profile } = await admin.from('profiles').select('id, push_token, notif_enabled').eq('import_token', token).single()
    if (!profile) { console.log('[inbound] okänd token', token); return json({ error: 'Okänd import-adress' }, 200) }
    const userId = profile.id

    // Skriver en läsbar status till profilen så användaren ser i appen vad som
    // hände med senaste mejlet (felsökning utan Vercel-loggar).
    const setStatus = (msg: string) =>
      admin.from('profiles').update({ last_import_status: `${new Date().toLocaleString('sv-SE')} · ${msg}` }).eq('id', userId)

    const plain = htmlToTextWithImages(html) || text
    console.log('[inbound] from=', from.slice(0, 60), 'subject=', subject.slice(0, 60), 'htmlLen=', html.length, 'textLen=', text.length, 'plainLen=', plain.length)

    // Specialfall: Gmails bekräftelse när man ställer in vidarebefordran.
    // Måste komma från Googles bekräftelseadress – annars skulle ett
    // vidarebefordrat kvitto (som har "Vidarebefordrat" i ämnet) feltolkas
    // som en bekräftelse och aldrig parsas.
    if (/forwarding-noreply@google\.com/i.test(from)) {
      const code = (plain.match(/\b(\d{6,9})\b/) || [])[1] || null
      // Googles bekräftelselänk (innehåller "vf-") – klicka den = verifierat.
      const rawLink = (`${html} ${text}`.match(/https?:\/\/[^\s"'<>()]*vf-[^\s"'<>()]+/i) || [])[0] || null
      const link = rawLink ? rawLink.replace(/&amp;/gi, '&') : null
      if (code || link) {
        await admin.from('profiles').update({ forward_code: code, forward_link: link, last_import_status: `${new Date().toLocaleString('sv-SE')} · Bekräftelse från Gmail mottagen` }).eq('id', userId)
        return json({ ok: true, confirmation: true })
      }
    }

    // Tolka orderbekräftelsen med AI.
    const content = clip(`${subject}\n\n${plain}`, 40000)
    if (!content.trim()) { await setStatus(`Mejlet saknade läsbar text (html ${html.length}, text ${text.length} tecken)`); return json({ ok: true, items: 0 }) }

    const prompt = `Nedan är en vidarebefordrad orderbekräftelse/kvitto från en nätbutik.
Extrahera alla KÖPTA PRODUKTER som är kläder, skor, väskor eller accessoarer.
Ignorera frakt, rabattkoder, "du kanske också gillar", nyhetsbrev och personuppgifter
(namn, adress, betalning). Ta ALDRIG med personuppgifter i svaret.

Rader som börjar med [BILD] är bild-URL:er som förekom på samma plats i mejlet.
Para ihop varje produkt med den [BILD]-URL som ligger närmast produktnamnet
(produktbilder är oftast från butikens CDN – ignorera logotyper, spårpixlar och ikoner).

Gissa även kategori, färg och säsong utifrån produktnamnet:
- category: EXAKT ett av: Toppar, Tröjor, Byxor, Shorts, Kjolar, Klänningar, Kavajer, Ytterkläder, Skor, Väskor, Accessoarer (eller null om osäker)
- color: EXAKT ett av: Svart, Vit, Grå, Beige, Brun, Röd, Rosa, Lila, Blå, Ljusblå, Grön, Olivgrön, Gul, Orange, Vinröd, Guld (eller null)
- seasons: en lista med noll eller flera av: Vår, Sommar, Höst, Vinter, Alla årstider

Svara ENDAST med JSON, inga backticks:
{"items": [{"name": "produktnamn", "brand": "märke eller null", "price": "pris eller null", "orderDate": "datum eller null", "category": "kategori eller null", "color": "färg eller null", "seasons": ["..."], "imageUrl": "bild-URL eller null"}]}

Hittar du inga plagg, svara {"items": []}.

MEJL:
${content}`

    const aiText = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o', 1800)
    const parsed = parseAiJson(aiText)
    const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 40) : []
    console.log('[inbound] aiItems=', items.length)
    if (items.length === 0) { await setStatus('AI:n hittade inga plagg i mejlet'); return json({ ok: true, items: 0 }) }

    const rows = items
      .map((it: any) => ({
        user_id: userId,
        name: typeof it.name === 'string' ? it.name.slice(0, 120) : '',
        brand: typeof it.brand === 'string' ? it.brand.slice(0, 60) : null,
        price: typeof it.price === 'string' ? it.price.slice(0, 30) : null,
        order_date: typeof it.orderDate === 'string' ? it.orderDate.slice(0, 30) : null,
        category: typeof it.category === 'string' ? it.category.slice(0, 40) : null,
        color: typeof it.color === 'string' ? it.color.slice(0, 30) : null,
        season: Array.isArray(it.seasons) ? it.seasons.join(', ').slice(0, 60) : null,
        image_url: typeof it.imageUrl === 'string' && /^https?:\/\//.test(it.imageUrl) ? it.imageUrl.slice(0, 800) : null,
        source: 'mejl',
      }))
      .filter((r: any) => r.name)

    if (rows.length > 0) {
      const { error: insErr } = await admin.from('pending_imports').insert(rows)
      if (insErr) { console.log('[inbound] insert-fel', insErr.message); await setStatus(`Databasfel: ${insErr.message}`); return json({ error: insErr.message }, 500) }
      // Notis om att nya plagg väntar på granskning (om användaren har notiser på).
      if (profile.push_token && profile.notif_enabled !== false) {
        await sendPush(profile.push_token, rows.length)
      }
    }
    console.log('[inbound] sparade', rows.length, 'plagg')
    await setStatus(`Importerade ${rows.length} plagg`)
    return json({ ok: true, items: rows.length })
  } catch (e: any) {
    console.log('[inbound] fel', e.message)
    return json({ error: e.message }, 500)
  }
}

// Grovt HTML→text som behåller bild-URL:er som [BILD]-rader i dokumentordning,
// så AI:n kan para ihop produkter med rätt bild.
function htmlToTextWithImages(html: string): string {
  if (!html) return ''
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi, ' \n[BILD] $1\n ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}
