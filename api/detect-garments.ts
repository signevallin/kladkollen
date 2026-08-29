import { langName, requireUser } from './_utils'
import { CATEGORIES, COLOR_NAMES as COLORS, SEASONS, SUBCATEGORIES } from '../utils/constants'

export const config = { runtime: 'edge' }

const SUBCATEGORY_HINT = Object.entries(SUBCATEGORIES)
  .map(([cat, subs]) => `${cat}: ${subs.join(', ')}`)
  .join(' | ')

// Multi-plagg-detektering: en bild med flera utlagda plagg → en lista där varje
// plagg får sina attribut OCH en ruta (bounding box) så appen kan beskära ut
// varje enskilt plagg. Rutan anges i ett 0–1000-rutnät (x,y = övre vänstra
// hörnet), vilket modellen är stabilare på än 0–1-decimaler. Samma enum-regler
// som analyze-garment: bara "name" översätts, resten är exakta svenska värden.
function buildPrompt(lang: unknown): string {
  const ln = langName(lang)
  return `Bilden innehåller ett eller flera klädesplagg (ofta utlagda på en säng, ett golv eller ett bord). Hitta VARJE separat plagg och svara ENDAST med ett JSON-objekt (inget annat):
{
  "garments": [
    {
      "name": "kort beskrivande namn på ${ln} (färg + plaggtyp, t.ex. motsvarande 'Svart ullkappa')",
      "category": "EXAKT ett av: ${CATEGORIES.join(', ')}",
      "subcategory": "baserat på vald kategori, EXAKT ett av alternativen (eller null): ${SUBCATEGORY_HINT}",
      "color": "EXAKT ett av: ${COLORS.join(', ')}",
      "seasons": ["ett eller flera av: ${SEASONS.join(', ')}"],
      "box": { "x": 0, "y": 0, "w": 1000, "h": 1000 }
    }
  ]
}

Regler:
- "box" anger plaggets ruta i ett 0–1000-rutnät över bilden: x,y = övre vänstra hörnet, w,h = bredd/höjd. Lägg lite marginal runt plagget så inget klipps bort, men ta inte med intilliggande plagg.
- Ta bara med faktiska klädesplagg och accessoarer. Ignorera galgar, tomma ytor, händer, möbler och bakgrund.
- Ett plagg per objekt. Lägg INTE ihop t.ex. en tröja och en byxa till ett objekt.
- Endast "name" ska vara på ${ln}. "category", "subcategory", "color" och "seasons" MÅSTE vara exakt de svenska värdena ur listorna – översätt dem INTE.
- Väljer du "seasons": välj det som passar plaggets material/stil; passar det året runt, använd ["Alla årstider"].`
}

type RawBox = { x?: number; y?: number; w?: number; h?: number }

function clampBox(box: RawBox | undefined) {
  const x = Math.max(0, Math.min(1000, Number(box?.x) || 0))
  const y = Math.max(0, Math.min(1000, Number(box?.y) || 0))
  let w = Math.max(1, Math.min(1000, Number(box?.w) || 1000))
  let h = Math.max(1, Math.min(1000, Number(box?.h) || 1000))
  if (x + w > 1000) w = 1000 - x
  if (y + h > 1000) h = 1000 - y
  return { x, y, w, h }
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
        max_tokens: 1500,
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
    const rawList: any[] = Array.isArray(parsed) ? parsed : (parsed.garments || [])

    // Validera varje plagg mot enum-listorna – samma regler som analyze-garment,
    // så det som visas/sparas alltid är giltiga översättningsnycklar.
    const garments = rawList.map((g: any) => {
      const category = CATEGORIES.includes(g?.category) ? g.category : ''
      const color = COLORS.includes(g?.color) ? g.color : ''
      const seasons = (g?.seasons || []).filter((s: string) => SEASONS.includes(s))
      const allowedSubs = category ? SUBCATEGORIES[category] ?? [] : []
      const subcategory = allowedSubs.includes(g?.subcategory) ? g.subcategory : ''
      return {
        name: typeof g?.name === 'string' ? g.name : '',
        category,
        subcategory,
        color,
        seasons,
        box: clampBox(g?.box),
      }
    })

    return new Response(JSON.stringify({ garments }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
