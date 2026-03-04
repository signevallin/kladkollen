export const config = { runtime: 'edge' }

const PROMPT = `Du är en professionell färgkonsult. Analysera färgerna i bilden och generera en detaljerad färgpalett.

STEG 1 – Färgtonanalys: Identifiera undertone (varm/kall/neutral), värde (ljust/mörkt), intensitet och kontrastnivå. Beskriv hur mörka och ljusa neutraler fungerar.

STEG 2 – Optimal färgriktning: Ge 5 basfärger, 5 kompletterande, 3 accentfärger och 5 att undvika – med hex-koder och motivering.

STEG 3 – Strategisk stilanalys: Färgkombinationer (hex) för: Auktoritet, Tillgänglighet, Kreativitet, Professionalism.

STEG 4 – Säsongsanpassning: Sommar (ljusare) och vinter (djupare kontrast).

Svara ENDAST med JSON, inga backticks:
{"biologisk":{"undertone":"...","varde":"...","intensitet":"...","kontrast":"...","hudreaktion":"...","svartVitt":"..."},"palett":{"bas":[{"hex":"#...","namn":"...","motivering":"..."}],"kompletterande":[{"hex":"#...","namn":"...","motivering":"..."}],"accent":[{"hex":"#...","namn":"...","motivering":"..."}],"undvik":[{"hex":"#...","namn":"..."}]},"strategi":{"auktoritet":{"text":"...","farger":["#..."]},"tillganglighet":{"text":"...","farger":["#..."]},"kreativitet":{"text":"...","farger":["#..."]},"professionalism":{"text":"...","farger":["#..."]}},"sasong":{"sommar":"...","vinter":"..."},"sammanfattning":["...","...","...","...","..."],"garderobsAlgoritm":"..."}`

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { base64 } = await request.json() as { base64: string }
    if (!base64) {
      return new Response(JSON.stringify({ error: 'base64 saknas' }), { status: 400 })
    }

    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY saknas på servern' }), { status: 500 })
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    const data = await claudeRes.json() as any
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message || 'Claude API-fel' }), { status: 400 })
    }

    const text = data.content?.[0]?.text
    if (!text) {
      return new Response(JSON.stringify({ error: 'Inget svar från Claude' }), { status: 500 })
    }

    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return new Response(JSON.stringify({ error: `Ogiltigt JSON-svar: ${text.slice(0, 200)}` }), { status: 500 })
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
