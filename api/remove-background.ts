import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Öppen bakgrundsborttagningsmodell på Replicate. Kan bytas via env utan koddeploy.
const DEFAULT_MODEL = '851-labs/background-remover'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...Array.from(chunk))
  }
  return btoa(binary)
}

// Replicate kan svara med output som URL-sträng, array av URL:er eller data-URI.
function firstOutputUrl(output: unknown): string | null {
  if (typeof output === 'string') return output
  if (Array.isArray(output) && typeof output[0] === 'string') return output[0]
  return null
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const { base64 } = (await request.json()) as any
    if (!base64) return json({ error: 'Bild saknas' }, 400)

    const token = process.env.REPLICATE_API_TOKEN
    if (!token) return json({ error: 'REPLICATE_API_TOKEN saknas på servern' }, 500)
    const model = process.env.REPLICATE_MODEL || DEFAULT_MODEL

    // Kör modellens senaste version synkront (Prefer: wait, upp till 60 s).
    let res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({ input: { image: `data:image/jpeg;base64,${base64}` } }),
    })

    let prediction = (await res.json()) as any
    if (!res.ok) {
      return json({ error: prediction?.detail || 'Bakgrundsborttagning misslyckades' }, res.status)
    }

    // Om wait tog slut innan modellen blev klar: polla statusen en stund.
    const pollUrl = prediction?.urls?.get
    for (let i = 0; i < 30 && (prediction.status === 'starting' || prediction.status === 'processing') && pollUrl; i++) {
      await new Promise(r => setTimeout(r, 1500))
      res = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}` } })
      prediction = await res.json()
    }

    if (prediction.status !== 'succeeded') {
      return json({ error: prediction?.error || 'Bakgrundsborttagning misslyckades' }, 502)
    }

    const url = firstOutputUrl(prediction.output)
    if (!url) return json({ error: 'Inget resultat från modellen' }, 502)

    // Hämta den bakgrundsfria PNG:n och returnera som base64 (samma kontrakt som förr).
    const imgRes = await fetch(url)
    if (!imgRes.ok) return json({ error: 'Kunde inte hämta resultatbilden' }, 502)
    const arrayBuffer = await imgRes.arrayBuffer()
    return json({ base64: arrayBufferToBase64(arrayBuffer) })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
