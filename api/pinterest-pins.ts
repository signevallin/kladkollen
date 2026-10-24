import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Hämtar användarens egna sparade pins. Appen ser aldrig access-token –
// den ligger i pinterest_accounts (RLS på, inga policies) och används bara här.
//
//   GET /api/pinterest-pins?cursor=...&board=...
//
// Svaret är avsiktligt magert: bara det moodboarden behöver (id, bildadress,
// länk tillbaka till pinnen). Inget användarinnehåll lagras på servern.

const PINS_URL = 'https://api.pinterest.com/v5/pins'
const BOARDS_URL = 'https://api.pinterest.com/v5/boards'
const PAGE_SIZE = 25

async function db(path: string): Promise<Response> {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase-konfiguration saknas på servern')
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
}

// Pinterest ger flera storlekar per pin. Vi vill ha den största rimliga –
// bilden visas i helskärm på moodboarden, och vi lagrar bara länken.
function bestImage(pin: any): string | null {
  const m = pin?.media?.images
  if (!m) return null
  for (const key of ['1200x', '600x', '400x300', '150x150']) {
    if (m[key]?.url) return m[key].url
  }
  const first = Object.values(m)[0] as any
  return first?.url ?? null
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Metod stöds inte' }, 405)

  const auth = await requireUser(request, { rateLimit: false })
  if (auth instanceof Response) return auth

  const accRes = await db(`pinterest_accounts?user_id=eq.${auth.id}&select=access_token,expires_at`)
  const rows = accRes.ok ? await accRes.json() : []
  const acc = rows?.[0]
  // 409 och inte 401: sessionen i Skrud är giltig, det är Pinterest-kopplingen
  // som saknas. Appen skiljer på dem och visar "Koppla Pinterest" i stället
  // för att logga ut användaren.
  if (!acc?.access_token) return json({ error: 'Pinterest är inte kopplat', code: 'not_connected' }, 409)
  if (acc.expires_at && new Date(acc.expires_at).getTime() < Date.now()) {
    return json({ error: 'Pinterest-kopplingen har gått ut', code: 'expired' }, 409)
  }

  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor')
  const board = url.searchParams.get('board')

  const q = new URLSearchParams({ page_size: String(PAGE_SIZE) })
  if (cursor) q.set('bookmark', cursor)
  const endpoint = board
    ? `${BOARDS_URL}/${encodeURIComponent(board)}/pins?${q}`
    : `${PINS_URL}?${q}`

  const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${acc.access_token}` } })
  if (res.status === 401) {
    return json({ error: 'Pinterest-kopplingen gäller inte längre', code: 'expired' }, 409)
  }
  if (!res.ok) {
    return json({ error: `Pinterest svarade ${res.status}`, code: 'upstream' }, 502)
  }

  const data = await res.json()
  const pins = (data?.items || [])
    .map((p: any) => ({
      id: p.id,
      imageUrl: bestImage(p),
      link: p.link ?? null,
      title: p.title ?? null,
    }))
    .filter((p: any) => p.imageUrl)

  return json({ pins, cursor: data?.bookmark ?? null })
}
