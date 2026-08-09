import { json, requireUser } from './_utils'

// Edge-runtime: handlern använder den webb-baserade signaturen
// (request: Request) => Response — samma som övriga endpoints och requireUser.
// (Node-runtime förväntar sig (req, res) och ignorerar ett returnerat Response,
// vilket fick funktionen att hänga tills 60 s-taket → "request.json is not a
// function" + 504.) Vi behöver inte längre Nodes maxDuration eftersom allt nu
// är KORTA start-/poll-anrop:
//
// Modellen kan ta 30 s+ vid kallstart. Att hålla EN lång, tyst HTTP-request så
// länge fick mobilen/iOS att släppa anslutningen. I stället skapas jobbet i ett
// kort start-anrop som returnerar ett jobb-id, och klienten pollar sedan status
// i korta anrop tills den bakgrundsfria bilden är klar.
export const config = { runtime: 'edge' }

// Väletablerad öppen bakgrundsborttagningsmodell (rembg). Kan bytas via env.
const DEFAULT_MODEL = 'cjwbw/rembg'

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

// Modellversionen ändras sällan – cachea den mellan anrop (så länge instansen
// är varm) så vi slipper ett extra Replicate-anrop per bild.
let cachedVersion: { model: string; version: string } | null = null

// Replicate stryper till ~1 anrop/10 s vid låg kredit. Vänta och försök igen
// i stället för att ge upp – meddelandet anger ofta när fönstret öppnas igen.
function throttleWaitMs(detail: string, attempt: number): number {
  const m = /resets in ~?(\d+(?:\.\d+)?)s/.exec(detail)
  if (m) return Math.min(Number(m[1]) * 1000 + 500, 12000)
  return [2000, 5000, 10000][attempt] ?? 10000
}

// fetch med hård timeout så en hängande anslutning inte blockerar handlern.
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// Hämtar (och cachar) modellens senaste körbara version. Returnerar antingen
// { version } eller { err } (ett färdigt fel-Response att skicka direkt).
async function getVersion(model: string, authHeaders: Record<string, string>): Promise<{ version?: string; err?: Response }> {
  if (cachedVersion && cachedVersion.model === model) return { version: cachedVersion.version }
  const modelRes = await fetchWithTimeout(`https://api.replicate.com/v1/models/${model}`, { headers: authHeaders }, 15_000)
  if (modelRes.status === 404) {
    return { err: json({ error: `Modellen '${model}' hittades inte på Replicate. Sätt REPLICATE_MODEL till en giltig modell.` }, 502) }
  }
  if (!modelRes.ok) {
    const d = await modelRes.json().catch(() => ({}))
    return { err: json({ error: (d as any).detail || `Kunde inte läsa modellen (${modelRes.status})` }, 502) }
  }
  const modelData = (await modelRes.json()) as any
  const version = modelData?.latest_version?.id
  if (!version) return { err: json({ error: 'Modellen saknar en körbar version' }, 502) }
  cachedVersion = { model, version }
  return { version }
}

// Laddar ner den bakgrundsfria PNG:n och returnerar den som base64 (klientens kontrakt).
async function outputToBase64(prediction: any, authHeaders: Record<string, string>): Promise<Response> {
  const url = firstOutputUrl(prediction.output)
  if (!url) return json({ error: 'Inget resultat från modellen' }, 502)
  const imgRes = await fetchWithTimeout(url, {}, 15_000)
  if (!imgRes.ok) return json({ error: 'Kunde inte hämta resultatbilden' }, 502)
  return json({ base64: arrayBufferToBase64(await imgRes.arrayBuffer()) })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  try {
    const body = (await request.json()) as any
    const isPoll = !!body.predictionId
    // Poll-anrop autentiseras men räknas inte mot AI-rate-limiten (annars skulle
    // ett enda jobb med många statuskoll slå i taket).
    const auth = await requireUser(request, isPoll ? { rateLimit: false } : undefined)
    if (auth instanceof Response) return auth

    const token = process.env.REPLICATE_API_TOKEN
    if (!token) return json({ error: 'REPLICATE_API_TOKEN saknas på servern' }, 500)
    const model = process.env.REPLICATE_MODEL || DEFAULT_MODEL
    const authHeaders = { Authorization: `Bearer ${token}` }

    // ── POLL-läge: klienten frågar om ett pågående jobb ──
    if (isPoll) {
      const r = await fetchWithTimeout(`https://api.replicate.com/v1/predictions/${body.predictionId}`, { headers: authHeaders }, 15_000)
      const pred = (await r.json()) as any
      if (!r.ok) return json({ error: pred?.detail || `Kunde inte läsa jobbet (${r.status})` }, 502)
      if (pred.status === 'succeeded') return await outputToBase64(pred, authHeaders)
      if (pred.status === 'failed' || pred.status === 'canceled') {
        return json({ error: pred?.error || `Modellen svarade: ${pred.status}` }, 502)
      }
      return json({ predictionId: body.predictionId, status: pred.status })
    }

    // ── START-läge: skapa ett nytt jobb ──
    const base64 = body.base64
    if (!base64) return json({ error: 'Bild saknas' }, 400)

    const { version, err } = await getVersion(model, authHeaders)
    if (err) return err

    // Skapa jobbet ASYNKRONT (inget Prefer: wait) så start-anropet returnerar
    // direkt (~1–2 s) och aldrig spränger plattformens tidsgräns. Klienten
    // pollar sedan status i korta anrop. (Modellen kan kallstarta 30 s+.)
    let res: Response
    let prediction: any
    for (let attempt = 0; ; attempt++) {
      res = await fetchWithTimeout('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, input: { image: `data:image/jpeg;base64,${base64}` } }),
      }, 15_000)
      prediction = (await res.json()) as any
      if (res.status === 429 && attempt < 2) {
        await new Promise(r => setTimeout(r, throttleWaitMs(String(prediction?.detail || ''), attempt)))
        continue
      }
      break
    }
    if (!res.ok) {
      const msg = res.status === 429 ? 'Tjänsten är tillfälligt hårt belastad. Försök igen om en stund.' : (prediction?.detail || 'Bakgrundsborttagning misslyckades')
      return json({ error: msg }, res.status)
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return json({ error: prediction?.error || `Modellen svarade: ${prediction.status}` }, 502)
    }
    // Lämna tillbaka jobb-id så klienten kan polla i korta anrop.
    return json({ predictionId: prediction.id, status: prediction.status })
  } catch (e: any) {
    if (e?.name === 'AbortError') return json({ error: 'Tjänsten svarade inte i tid. Försök igen om en stund.' }, 504)
    // Logga hela felet så det syns i Vercel-loggarna.
    console.error('remove-background failed:', e?.stack || e?.message || e)
    return json({ error: e?.message || 'Bakgrundsborttagning misslyckades' }, 500)
  }
}
