import { langName, requireUser } from './_utils'
import { CATEGORIES, COLOR_NAMES as COLORS, SEASONS, SUBCATEGORIES } from '../utils/constants'

export const config = { runtime: 'edge' }

const SUBCATEGORY_HINT = Object.entries(SUBCATEGORIES)
  .map(([cat, subs]) => `${cat}: ${subs.join(', ')}`)
  .join(' | ')

// Namnet skrivs på användarens språk; kategori/underkategori/färg/säsong MÅSTE
// vara de exakta svenska enum-värdena (de är översättningsnycklar som visas via
// tr() i appen), så de får INTE översättas av AI:n.
function buildPrompt(lang: unknown): string {
  const ln = langName(lang)
  return `Analysera plagget i bilden och svara ENDAST med ett JSON-objekt (inget annat):
{
  "name": "kort beskrivande namn skrivet på ${ln} (färg + plaggtyp, t.ex. motsvarande 'Svart ullkappa')",
  "category": "EXAKT ett av: ${CATEGORIES.join(', ')}",
  "subcategory": "baserat på vald kategori, EXAKT ett av alternativen nedan (eller null om inget passar): ${SUBCATEGORY_HINT}",
  "color": "EXAKT ett av: ${COLORS.join(', ')}",
  "seasons": ["ett eller flera av: ${SEASONS.join(', ')}"]
}

VIKTIGT: Endast "name" ska vara på ${ln}. Fälten "category", "subcategory", "color" och "seasons" MÅSTE vara exakt de svenska värdena ur listorna ovan – översätt dem INTE.
Välj den årstid som passar plaggets material och stil bäst. Om plagget passar hela året, använd ["Alla årstider"].`
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth
  try {
    const { base64, lang } = await request.json() as any
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
            { type: 'text', text: buildPrompt(lang) },
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
    const allowedSubs = parsed.category ? SUBCATEGORIES[parsed.category] ?? [] : []
    if (!allowedSubs.includes(parsed.subcategory)) parsed.subcategory = ''
    return new Response(JSON.stringify(parsed), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
