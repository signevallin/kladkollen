import { langName, requireUser } from './_utils'
import { CATEGORIES, COLOR_NAMES as COLORS, SEASONS, SUBCATEGORIES } from '../utils/constants'

export const config = { runtime: 'edge' }

const SUBCATEGORY_HINT = Object.entries(SUBCATEGORIES)
  .map(([cat, subs]) => `${cat}: ${subs.join(', ')}`)
  .join(' | ')

// "Smart köp?" – Vivino-parallellen. Ett foto på ett plagg i butiken bedöms mot
// användarens EGNA garderob: fyller det en lucka, matchar det färgskalan, hur
// många nya outfits kan det låsa upp, eller har man redan något liknande?
// Attribut (name/category/…) följer samma enum-regler som analyze-garment
// (bara "name" översätts). Verdikt/rubrik/motivering är fritext på användarens
// språk.
type WardrobeItem = { name?: string; category?: string; subcategory?: string; color?: string; season?: string }

function buildPrompt(lang: unknown, wardrobe: WardrobeItem[]): string {
  const ln = langName(lang)
  // Kompakt garderobssammanfattning: en rad per plagg (kategori/färg/namn).
  const list = wardrobe.length
    ? wardrobe.map(g => `- ${g.category || '?'}${g.subcategory ? '/' + g.subcategory : ''}, ${g.color || '?'}: ${g.name || ''}`).join('\n')
    : '(tom garderob)'
  return `Du är en personlig stylist. Användaren står i en butik och funderar på att köpa plagget i bilden. Bedöm om det är ett smart köp för just DEM, utifrån deras befintliga garderob nedan.

ANVÄNDARENS GARDEROB (${wardrobe.length} plagg):
${list}

Svara ENDAST med ett JSON-objekt (inget annat):
{
  "garment": {
    "name": "kort beskrivande namn på ${ln} (färg + plaggtyp)",
    "category": "EXAKT ett av: ${CATEGORIES.join(', ')}",
    "subcategory": "baserat på kategorin, EXAKT ett av (eller null): ${SUBCATEGORY_HINT}",
    "color": "EXAKT ett av: ${COLORS.join(', ')}",
    "seasons": ["ett eller flera av: ${SEASONS.join(', ')}"]
  },
  "verdict": "smart | maybe | skip",
  "score": 0-100,
  "headline": "en kort mening på ${ln} som sammanfattar bedömningen",
  "reasons": ["2–4 korta punkter på ${ln} som motiverar bedömningen"],
  "pairsWith": ["namn på 2–4 plagg UR GARDEROBEN ovan som detta skulle passa ihop med (exakt som de står i listan)"],
  "gap": true/false,
  "duplicate": true/false
}

Bedömningsregler:
- "score" = hur prisvärt/mångsidigt plagget är för just denna garderob (100 = fyller en tydlig lucka och matchar mycket, 0 = de har redan flera liknande).
- "gap" = true om plagget fyller en lucka de saknar. "duplicate" = true om de redan äger något mycket likt.
- "verdict": "smart" om det tillför tydligt värde, "skip" om det mest duplicerar, annars "maybe".
- "pairsWith": välj bara plagg som faktiskt finns i garderoben ovan. Är garderoben tom, returnera [].
- VIKTIGT: bara "name", "headline" och "reasons" ska vara på ${ln}. "category", "subcategory", "color" och "seasons" MÅSTE vara exakt de svenska värdena ur listorna – översätt dem INTE.`
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth
  try {
    const { base64, lang, wardrobe } = await request.json() as any
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      return new Response(JSON.stringify({ error: 'API-nyckel saknas' }), { status: 500 })
    }
    const wb: WardrobeItem[] = Array.isArray(wardrobe) ? wardrobe.slice(0, 250) : []
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: buildPrompt(lang, wb) },
          ],
        }],
      }),
    })
    const claudeData = await claudeRes.json()
    const text = claudeData.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    // Validera plaggattributen mot enum-listorna (samma som analyze-garment).
    const g = parsed.garment || {}
    const category = CATEGORIES.includes(g.category) ? g.category : ''
    const color = COLORS.includes(g.color) ? g.color : ''
    const seasons = (g.seasons || []).filter((s: string) => SEASONS.includes(s))
    const allowedSubs = category ? SUBCATEGORIES[category] ?? [] : []
    const subcategory = allowedSubs.includes(g.subcategory) ? g.subcategory : ''

    const verdict = ['smart', 'maybe', 'skip'].includes(parsed.verdict) ? parsed.verdict : 'maybe'
    let score = Number(parsed.score)
    if (!Number.isFinite(score)) score = 50
    score = Math.max(0, Math.min(100, Math.round(score)))

    const result = {
      garment: { name: typeof g.name === 'string' ? g.name : '', category, subcategory, color, seasons },
      verdict,
      score,
      headline: typeof parsed.headline === 'string' ? parsed.headline : '',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.filter((r: any) => typeof r === 'string').slice(0, 4) : [],
      pairsWith: Array.isArray(parsed.pairsWith) ? parsed.pairsWith.filter((r: any) => typeof r === 'string').slice(0, 4) : [],
      gap: !!parsed.gap,
      duplicate: !!parsed.duplicate,
    }
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
