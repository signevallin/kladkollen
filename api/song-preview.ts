import { clip, json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

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
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return json({ error: 'Kunde inte söka i Apple Music' }, 502)

    const data = (await res.json()) as any
    const results: any[] = data.results || []
    // Föredra en träff som faktiskt har en spelbar preview.
    const hit = results.find(r => r.previewUrl) || results[0]
    if (!hit) return json({ song: null })

    return json({
      song: {
        title: hit.trackName,
        artist: hit.artistName,
        previewUrl: hit.previewUrl || null,
        artwork: (hit.artworkUrl100 || '').replace('100x100', '300x300'),
        appleMusicUrl: hit.trackViewUrl || null,
      },
    })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
