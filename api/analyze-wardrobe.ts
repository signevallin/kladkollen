import { clip, getUserTier, json, langInstruction, openaiChat, parseAiJson, requireUser, tierMeets, OPENAI_MODEL } from './_utils'

export const config = { runtime: 'edge' }

// Analyserar HELA garderoben mot en referens: användarens färganalys, deras
// stil, eller deras moodboard. Returnerar ett strukturerat omdöme.
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth
  // Garderobsanalys är en Premium-funktion (alla betalda nivåer).
  if (!tierMeets(await getUserTier(request, auth.id), 'single')) {
    return json({ error: 'Kräver Skrud Premium', code: 'premium_required' }, 402)
  }

  try {
    const body = (await request.json()) as any
    const mode = body.mode === 'color' || body.mode === 'style' || body.mode === 'moodboard' ? body.mode : null
    const garmentList = clip(body.garmentList, 7000)
    const reference = clip(body.reference, 2000)
    const images: string[] = Array.isArray(body.images) ? body.images.filter((u: any) => typeof u === 'string').slice(0, 4) : []

    if (!mode) return json({ error: 'Ogiltigt analysläge' }, 400)
    if (!garmentList) return json({ error: 'Garderoben är tom' }, 400)

    const intro = 'Du är en personlig stylist. Analysera hur väl HELA användarens garderob nedan stämmer med referensen. Var konkret, ärlig och hjälpsam.'

    const focus =
      mode === 'color'
        ? `Referens – användarens FÄRGANALYS:\n${reference}\n\nBedöm hur väl garderobens FÄRGER matchar den här paletten. Vilka plagg sitter rätt i paletten? Vilka färger drar åt fel håll eller bör undvikas? Vilka färger saknas för att paletten ska bli komplett?`
        : mode === 'style'
        ? `Referens – användarens STIL:\n${reference}\n\nBedöm hur väl garderoben speglar den här stilen. Vad stämmer? Vad drar åt fel håll? Vilka plagg/typer saknas för att stärka stilen?`
        : `Referens – användarens MOODBOARD (bilderna som bifogas). Fånga den gemensamma känslan/estetiken i bilderna.\n\nBedöm hur väl garderoben matchar moodboardens känsla. Vilka plagg fångar känslan? Vad saknas för att komma närmare den?`

    const prompt = `${intro}

${focus}

GARDEROB:
${garmentList}

${langInstruction(body.lang)}

Svara ENDAST med ett JSON-objekt, inga backticks:
{
  "score": <heltal 0-100 för hur väl garderoben matchar referensen>,
  "verdict": "1-2 meningars sammanfattande omdöme",
  "strengths": ["det som funkar bra (2-4 punkter)"],
  "gaps": ["det som saknas eller skaver (2-4 punkter)"],
  "recommendations": ["konkreta nästa steg – t.ex. plagg/färger att köpa eller rensa (2-4 punkter)"]
}`

    let messages: any[]
    if (mode === 'moodboard' && images.length > 0) {
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
        ],
      }]
    } else {
      messages = [{ role: 'user', content: prompt }]
    }

    const text = await openaiChat(messages, OPENAI_MODEL, 700, 0.6)
    const parsed = parseAiJson(text)
    parsed.score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)))
    if (!Array.isArray(parsed.strengths)) parsed.strengths = []
    if (!Array.isArray(parsed.gaps)) parsed.gaps = []
    if (!Array.isArray(parsed.recommendations)) parsed.recommendations = []
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
