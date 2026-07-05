import { clip, json, openaiChat, parseAiJson, requireUser } from './_utils'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const base64 = typeof body.base64 === 'string' ? body.base64 : ''
    const garmentList = clip(body.garmentList, 8000)
    if (!base64) return json({ error: 'Bild saknas' }, 400)

    const prompt = `Du är en personlig stylist. Analysera inspirationsbilden och matcha stilen mot användarens garderob.

Garderob:
${garmentList}

1. Beskriv stilen i inspirationsbilden kort.
2. Välj 3-4 plagg från garderoben som matchar stilen bäst.
3. Lista upp till 3 specifika plagg som SAKNAS i garderoben för att uppnå denna look.

Svara ENDAST med ett JSON-objekt:
{
  "styleDescription": "beskrivning",
  "outfitName": "namn",
  "items": ["plagg1", "plagg2", "plagg3"],
  "missing": ["Saknat plagg 1", "Saknat plagg 2"],
  "tip": "styling-tips"
}

Om inget saknas, sätt "missing" till [].`

    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } },
      ],
    }]

    const text = await openaiChat(messages, 'gpt-4o', 500)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.items)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
