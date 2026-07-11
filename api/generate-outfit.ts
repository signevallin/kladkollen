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
    const contextLabel = clip(body.contextLabel, 40)
    const contextLogic = clip(body.contextLogic, 200)
    const intensity = clip(body.intensity, 40)
    const weatherSummary = clip(body.weatherSummary, 300)
    const weatherRules = clip(body.weatherRules, 600)
    const avoid = clip(body.avoid, 400)
    const feedback = clip(body.feedback, 800)
    const groupedList = clip(body.groupedList, 8000)
    const retry = body.retry === true

    if (!groupedList) return json({ error: 'Garderobslista saknas' }, 400)

    const retryInstruction = retry
      ? '\nVIKTIGT: Föregående försök saknade obligatoriska plagg. Se till att inkludera SKOR och NEDERDEL (eller klänning) denna gång.'
      : ''

    const prompt = `Du är en personlig stylist. Välj en komplett outfit från garderoben nedan.

Kontext: ${contextLabel} – ${contextLogic}
Intensitet: ${intensity}
${weatherSummary}
${avoid}${feedback ? `\nSmakprofil:\n${feedback}` : ''}
${retryInstruction}

GARDEROB (välj ENDAST plagg från listan nedan, exakt som de heter):

${groupedList}

OBLIGATORISKA REGLER – följ dessa EXAKT:
1. SKOR: Du MÅSTE välja ett par skor. Outfit utan skor är ogiltig.
2. NEDERDEL: Du MÅSTE välja byxor eller kjol – SÅVIDA du inte väljer klänning.
3. ÖVERDEL: Du MÅSTE välja topp eller tröja – SÅVIDA du inte väljer klänning.
4. Väljer du klänning → lägg inte till separata byxor/kjol/topp.
${weatherRules ? '5. VÄDER: ' + weatherRules : ''}

Föreslå också EN låt som matchar outfitens känsla och kontexten (t.ex. en powerlåt
inför ett viktigt möte, något lugnt till en ledig dag). Välj en riktig, känd låt som
går att hitta på Apple Music.

Svara ENDAST med JSON, inga backticks:
{"outfitName": "namn", "items": ["exakt plaggnamn 1", "exakt plaggnamn 2", "exakt plaggnamn 3"], "message": "Personligt, emotionellt budskap om looken (1–2 meningar).", "song": {"title": "låttitel", "artist": "artist", "reason": "kort varför den passar dagens känsla (max 1 mening)"}}`

    const text = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o-mini', 350)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.items)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
