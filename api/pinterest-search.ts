export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }
  try {
    const { query } = await request.json() as any
    const key = process.env.UNSPLASH_ACCESS_KEY
    if (!key) {
      return new Response(JSON.stringify({ error: 'Unsplash-nyckel saknas på servern' }), { status: 500 })
    }
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=24&orientation=portrait`,
      { headers: { 'Authorization': `Client-ID ${key}` } }
    )
    const data = await res.json()
    // Normalize to same shape as before: { items: [...] }
    const items = (data.results || []).map((photo: any) => ({
      id: photo.id,
      media: {
        images: {
          '600x': { url: photo.urls?.regular || photo.urls?.small },
          '400x300': { url: photo.urls?.small },
          '150x150': { url: photo.urls?.thumb },
        }
      }
    }))
    return new Response(JSON.stringify({ items }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
