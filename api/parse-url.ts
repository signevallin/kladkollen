import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Hämtar en produktsida och plockar ut namn, bild och pris ur Open Graph-taggar.
// Används för "Lägg till via URL" på köplistan. Ingen inloggning hos butiken –
// bara publik sidinfo. SSRF-skyddad.

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function meta(html: string, prop: string): string | null {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'))
  if (a?.[1]) return decodeEntities(a[1].trim())
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
  if (b?.[1]) return decodeEntities(b[1].trim())
  return null
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  let target: URL
  try {
    const body = (await request.json()) as any
    target = new URL(String(body.url || ''))
  } catch {
    return json({ error: 'Ogiltig länk' }, 400)
  }
  if (!/^https?:$/.test(target.protocol)) return json({ error: 'Länken måste börja med http(s)://' }, 400)
  const host = target.hostname.toLowerCase()
  // SSRF: blockera lokala/privata adresser.
  if (host === 'localhost' || host === '::1' || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    return json({ error: 'Otillåten länk' }, 400)
  }

  try {
    const r = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (!r.ok) return json({ error: `Kunde inte hämta sidan (${r.status})` }, 502)
    const html = (await r.text()).slice(0, 400000)

    const name = meta(html, 'og:title') || decodeEntities((html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim()) || null
    const imageUrl = meta(html, 'og:image') || meta(html, 'og:image:secure_url')
    const price = meta(html, 'product:price:amount') || meta(html, 'og:price:amount') || null

    return json({
      name: name ? name.slice(0, 120) : null,
      imageUrl: imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl.slice(0, 800) : null,
      price: price ? price.slice(0, 30) : null,
    })
  } catch (e: any) {
    return json({ error: 'Kunde inte hämta länken. Kontrollera att den är korrekt.' }, 502)
  }
}
