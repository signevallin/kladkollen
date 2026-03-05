export const config = { runtime: 'edge' }

const CATEGORIES = ['Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const COLORS = ['Svart', 'Vit', 'Grå', 'Beige', 'Brun', 'Röd', 'Rosa', 'Lila', 'Blå', 'Ljusblå', 'Grön', 'Gul', 'Orange', 'Guld']
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']

const PROMPT = `Analysera plagget i bilden och svara ENDAST med ett JSON-objekt (inget annat):
{
  "name": "kort beskrivande namn på svenska, t.ex. 'Svart ullkappa' eller 'Beige linnebyxor'",
  "category": "EXAKT ett av: ${CATEGORIES.join(', ')}",
  "color": "EXAKT ett av: ${COLORS.join(', ')}",
  "seasons": ["ett eller flera av: ${SEASONS.join(', ')}"]
}

Välj den årstid som passar plaggets material och stil bäst. Om plagget passar hela året, använd ["Alla årstider"].`

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }
  try {
    const { base64 } = await request.json() as any
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      return new Response(JSON.stringify({ error: 'API-nyckel saknas' }), { status: 500 })
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
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })
    const claudeData = await claudeRes.json()
    const text = claudeData.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    // Validate fields fall within allowed values
    if (!CATEGORIES.includes(parsed.category)) parsed.category = ''
    if (!COLORS.includes(parsed.color)) parsed.color = ''
    parsed.seasons = (parsed.seasons || []).filter((s: string) => SEASONS.includes(s))
    return new Response(JSON.stringify(parsed), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
