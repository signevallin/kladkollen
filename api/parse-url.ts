import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Hämtar en produktsida och plockar ut namn, bild och pris. Används för "Lägg
// till via URL" på köplistan. Ingen inloggning hos butiken – bara publik
// sidinfo. SSRF-skyddad.
//
// Robusthet mot bot-skydd: många butiker (Zara, H&M, Nike…) blockerar ett rått
// fetch men serverar fulla Open Graph-/JSON-LD-taggar till länkförhandsvisare
// (Facebook/Google). Vi försöker därför först som en riktig webbläsare och,
// om det blockeras/timeout:ar, en gång till som Facebooks länkbot. Utöver
// og:*-taggar läser vi även twitter:*-taggar och JSON-LD (schema.org Product),
// vilket täcker de flesta stora butiker.

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

function absoluteUrl(u: string | null, base: URL): string | null {
  if (!u) return null
  try { return new URL(u, base).toString() } catch { return null }
}

// schema.org image kan vara sträng, array eller {url}. Plocka första giltiga.
function firstImage(img: any): string | null {
  if (!img) return null
  if (typeof img === 'string') return img
  if (Array.isArray(img)) { for (const x of img) { const r = firstImage(x); if (r) return r } return null }
  if (typeof img === 'object') return typeof img.url === 'string' ? img.url : (typeof img['@id'] === 'string' ? img['@id'] : null)
  return null
}

// Samlar alla JSON-LD-noder (hanterar array och @graph).
function parseJsonLd(html: string): any[] {
  const out: any[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed])
      for (const o of arr) if (o && typeof o === 'object') out.push(o)
    } catch { /* hoppa över trasig JSON-LD */ }
  }
  return out
}

function findProduct(nodes: any[]): any | null {
  for (const n of nodes) {
    const type = n?.['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.includes('Product')) return n
  }
  return null
}

function ldPrice(product: any): string | null {
  const offers = product?.offers
  if (!offers) return null
  const o = Array.isArray(offers) ? offers[0] : offers
  const p = o?.price ?? o?.priceSpecification?.price ?? o?.lowPrice
  return p != null ? String(p) : null
}

const BROWSER_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
// Facebooks länkförhandsvisare – de flesta butiker serverar fulla OG-taggar
// till den även när de blockerar vanliga fetch-anrop.
const FB_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

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

  // Ett hämtningsförsök med egen timeout. Många butikssidor är långsamma eller
  // bot-skyddade och hänger annars tills hela funktionen dödas av plattformen.
  async function tryFetch(ua: string): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 11000)
    try {
      return await fetch(target.toString(), {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  try {
    // Försök 1: som en riktig webbläsare. Blockeras/timeout:ar det → försök 2
    // som Facebooks länkbot (som butikerna oftast släpper fram).
    let r: Response | null = null
    let timedOut = false
    try { r = await tryFetch(BROWSER_UA) } catch (e: any) { timedOut = e?.name === 'AbortError'; r = null }
    if (!r || (!r.ok && [401, 403, 405, 429, 451, 503].includes(r.status))) {
      try { const r2 = await tryFetch(FB_UA); if (r2.ok || !r) r = r2 } catch (e: any) { if (!r) timedOut = e?.name === 'AbortError' }
    }

    if (!r) {
      return json({ error: timedOut ? 'Sidan svarade för långsamt. Prova en annan länk eller fyll i manuellt.' : 'Kunde inte hämta länken. Kontrollera att den är korrekt.' }, timedOut ? 504 : 502)
    }
    if (!r.ok) return json({ error: `Kunde inte hämta sidan (${r.status}). Vissa butiker blockerar automatisk hämtning – fyll i manuellt.` }, 502)

    const html = (await r.text()).slice(0, 400000)
    const ld = parseJsonLd(html)
    const product = findProduct(ld)

    const name =
      meta(html, 'og:title') ||
      meta(html, 'twitter:title') ||
      (typeof product?.name === 'string' ? decodeEntities(product.name) : null) ||
      decodeEntities((html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim()) ||
      null

    const rawImage =
      meta(html, 'og:image') ||
      meta(html, 'og:image:secure_url') ||
      meta(html, 'twitter:image') ||
      meta(html, 'twitter:image:src') ||
      firstImage(product?.image)
    const imageUrl = absoluteUrl(rawImage, target)

    const price =
      meta(html, 'product:price:amount') ||
      meta(html, 'og:price:amount') ||
      ldPrice(product) ||
      null

    return json({
      name: name ? name.slice(0, 120) : null,
      imageUrl: imageUrl && /^https?:\/\//.test(imageUrl) ? imageUrl.slice(0, 800) : null,
      price: price ? String(price).slice(0, 30) : null,
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return json({ error: 'Sidan svarade för långsamt. Prova en annan länk eller fyll i manuellt.' }, 504)
    }
    return json({ error: 'Kunde inte hämta länken. Kontrollera att den är korrekt.' }, 502)
  }
}
