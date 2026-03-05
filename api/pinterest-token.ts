export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }
  try {
    const { code, redirect_uri } = await request.json() as any
    const appId = process.env.PINTEREST_APP_ID
    const appSecret = process.env.PINTEREST_APP_SECRET
    if (!appId || !appSecret) {
      return new Response(JSON.stringify({ error: 'Pinterest credentials saknas på servern' }), { status: 500 })
    }
    const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${appId}:${appSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri }).toString(),
    })
    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
