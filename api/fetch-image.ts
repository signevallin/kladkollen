import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

const MAX_BYTES = 8 * 1024 * 1024

// Blockera interna/privata adresser (SSRF-skydd).
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (h.includes(':')) return true // IPv6-literaler avvisas
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
  }
  return false
}

/**
 * Hämtar en publik produktbild åt webbklienten och returnerar den som base64.
 * Behövs eftersom butikers CDN:er ofta blockerar direkt läsning från andra
 * domäner (CORS) – servern har inga sådana begränsningar.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const url = typeof body.url === 'string' ? body.url.slice(0, 800) : ''

    let parsed: URL
    try { parsed = new URL(url) } catch { return json({ error: 'Ogiltig URL' }, 400) }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return json({ error: 'Ogiltig URL' }, 400)
    if (isBlockedHost(parsed.hostname)) return json({ error: 'Ogiltig URL' }, 400)

    const res = await fetch(url, { headers: { Accept: 'image/*' } })
    if (!res.ok) return json({ error: `Bilden kunde inte hämtas (${res.status})` }, 502)
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return json({ error: 'URL:en är inte en bild' }, 400)

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return json({ error: 'Bilden är för stor' }, 400)

    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    return json({ base64: btoa(binary), contentType })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
