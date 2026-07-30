import { clip, json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Enkel cache i modulscope (lever så länge edge-instansen är varm) så vi inte
// slår i iTunes Search API:s rate limit (~20 anrop/min) när populära låtar
// återkommer. Vi cachar bara METADATAN/länken – aldrig själva ljudfilen.
type CacheEntry = { at: number; body: unknown }
const CACHE = new Map<string, CacheEntry>()
const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 timmar
const CACHE_MAX = 500

function cacheGet(key: string): unknown | null {
  const e = CACHE.get(key)
  if (!e) return null
  if (Date.now() - e.at > CACHE_TTL) { CACHE.delete(key); return null }
  return e.body
}
function cacheSet(key: string, body: unknown) {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value
    if (oldest !== undefined) CACHE.delete(oldest)
  }
  CACHE.set(key, { at: Date.now(), body })
}

// Slår upp en låt i Apples publika iTunes Search API och returnerar
// 30-sekunders-preview, omslag och Apple Music-länk. Ingen inloggning mot Apple
// krävs och previewen är gratis att spela.
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const title = clip(body.title, 120)
    const artist = clip(body.artist, 120)
    if (!title) return json({ error: 'Låttitel saknas' }, 400)

    const term = `${title} ${artist}`.trim()
    const cacheKey = term.toLowerCase()
    const cached = cacheGet(cacheKey)
    if (cached) return json(cached as any)

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return json({ error: 'Kunde inte söka i Apple Music' }, 502)

    const data = (await res.json()) as any
    const results: any[] = data.results || []
    // Föredra en träff som faktiskt har en spelbar preview.
    const hit = results.find(r => r.previewUrl) || results[0]
    const payload = hit
      ? {
          song: {
            title: hit.trackName,
            artist: hit.artistName,
            previewUrl: hit.previewUrl || null,
            artwork: (hit.artworkUrl100 || '').replace('100x100', '300x300'),
            appleMusicUrl: hit.trackViewUrl || null,
          },
        }
      : { song: null }

    cacheSet(cacheKey, payload)
    return json(payload)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
