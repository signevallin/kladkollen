import { clip, json, openaiChat, parseAiJson, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Skapar TVÅ koordinerade outfits – en till varje partner – ur bådas garderober.
// Plagg markerade [LÅN] får lånas av den andra personen.
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const nameA = clip(body.nameA, 40) || 'Person 1'
    const nameB = clip(body.nameB, 40) || 'Person 2'
    const listA = clip(body.listA, 6000)
    const listB = clip(body.listB, 6000)
    const contextLabel = clip(body.contextLabel, 40)
    const contextLogic = clip(body.contextLogic, 200)
    const weatherSummary = clip(body.weatherSummary, 300)
    const weatherRules = clip(body.weatherRules, 600)
    const styleRules = clip(body.styleRules, 1200)
    const avoid = clip(body.avoid, 400)
    const contextNote = clip(body.contextNote, 400)
    const season = clip(body.season, 20)

    if (!listA || !listB) return json({ error: 'Bådas garderober behövs' }, 400)

    const prompt = `Du är en personlig stylist för ett PAR som ska gå bort TILLSAMMANS. Sätt ihop TVÅ outfits – en till var och en – som harmoniserar men INTE är identiska (inte matchande uniformer).

Tillfälle: ${contextLabel || 'Fest/date'}${contextLogic ? ` – ${contextLogic}` : ''}
${season ? `Årstid: det är ${season}.` : ''}
${weatherSummary}
${contextNote ? `Användarens egen önskan för "${contextLabel}": ${contextNote} (väg in det).` : ''}

TILLGÄNGLIGT FÖR ${nameA} (välj ${nameA}s outfit ENDAST härifrån):
${listA}

TILLGÄNGLIGT FÖR ${nameB} (välj ${nameB}s outfit ENDAST härifrån):
${listB}

VIKTIGT: Varje persons outfit får ENDAST innehålla plagg ur den personens EGEN lista ovan. Plagg markerade [LÅN] är partnerns plagg som lånats in i den här personens lista – de FÅR användas, och ska då anges i "borrowed". Ta ALDRIG ett plagg som inte står i personens egen lista.

OBLIGATORISKA REGLER FÖR VARJE OUTFIT:
1. SKOR: exakt ett par.
2. NEDERDEL: byxor/kjol/shorts – SÅVIDA du inte väljer klänning.
3. ÖVERDEL: exakt en – SÅVIDA du inte väljer klänning (då ingen separat över/underdel).
4. Aldrig två överdelar, två nederdelar eller två par skor.

PARREGLER:
- De två looksen ska kännas ihop: samma formalitetsnivå och en GEMENSAM färgtråd (en delad accent- eller neutralton), men spegla varsin person.
- Undvik att båda bär exakt samma starka statementfärg om det blir "matchande".
- Använd EXAKT samma plaggnamn som i garderoberna.
${weatherRules ? `\nVÄDERREGLER (gäller BÅDA):\n${weatherRules}` : ''}
${styleRules ? `\nSTILREGLER (gäller BÅDA, väger tungt):\n${styleRules}` : ''}
${avoid ? `\nUNDVIK (respektera för båda): ${avoid}` : ''}

Svara ENDAST med JSON, inga backticks:
{"vibe":"1 mening om den gemensamma känslan","outfits":[{"person":"${nameA}","items":["exakt plaggnamn","..."],"borrowed":["ev. plagg lånat från partnern"]},{"person":"${nameB}","items":["..."],"borrowed":[]}],"tip":"kort parstyling-tips (1 mening)"}`

    const text = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o', 700, 0.8)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.outfits)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    parsed.outfits = parsed.outfits.map((o: any) => ({
      person: String(o?.person || ''),
      items: Array.isArray(o?.items) ? o.items : [],
      borrowed: Array.isArray(o?.borrowed) ? o.borrowed : [],
    }))
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
