export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }
  try {
    const { query } = await request.json() as any
    const token = process.env.PINTEREST_ACCESS_TOKEN
    if (!token) {
      return new Response(JSON.stringify({ error: 'Pinterest-token saknas på servern' }), { status: 500 })
    }
    const res = await fetch(
      `https://api.pinterest.com/v5/pins/search?query=${encodeURIComponent(query)}&page_size=24`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
