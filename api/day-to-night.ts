import { clip, json, langInstruction, openaiChat, parseAiJson, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// "Dag till fest": bygger en vardagslook för utgångskontexten och visar hur man
// förvandlar den till kvällskontexten genom att byta ut 1–3 plagg – som de gamla
// veckotidningsreportagen. Allt väljs ur användarens egen garderob.
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const fromLabel = clip(body.fromLabel, 40)
    const fromLogic = clip(body.fromLogic, 200)
    const toLabel = clip(body.toLabel, 40)
    const toLogic = clip(body.toLogic, 200)
    const season = clip(body.season, 20)
    const styleRules = clip(body.styleRules, 1200)
    const groupedList = clip(body.groupedList, 8000)
    const avoidItems = clip(body.avoidItems, 400)

    if (!groupedList) return json({ error: 'Garderobslista saknas' }, 400)

    const prompt = `Du är en personlig stylist som gör ett klassiskt "från dag till kväll"-reportage.
Bygg FÖRST en komplett vardagslook för dagkontexten, och visa sedan hur man med
MINSTA möjliga ändring (byt ut 1–3 plagg) förvandlar den till kvällskontexten.

DAG-kontext: ${fromLabel} – ${fromLogic}
KVÄLL-kontext: ${toLabel} – ${toLogic}
${season ? `Årstid: det är ${season}.` : ''}

Poängen: behåll så mycket som möjligt av dagoutfiten (samma bas) och byt bara ut
de få plagg som lyfter looken från ${fromLabel.toLowerCase()} till ${toLabel.toLowerCase()}
– t.ex. byt kavaj mot läderjacka, byt loafers mot klackar, lägg till ett smycke.
Kvällslooken ska tydligt kännas mer ${toLabel.toLowerCase()} men vara samma person, samma bas.

GARDEROB (välj ENDAST plagg härifrån, exakt som de heter):
${groupedList}
${avoidItems ? `\nFÖRRA FÖRSLAGET använde: ${avoidItems}. Ge nu en TYDLIGT ANNORLUNDA förvandling – byt ut minst hälften av plaggen (gärna en annan nederdel/överdel och andra skor). Återanvänd bara ett plagg om garderoben saknar rimliga alternativ i rätt kategori.` : ''}

REGLER:
1. Både dag- och kvällslooken MÅSTE vara kompletta: skor + nederdel + överdel, ELLER klänning + skor.
2. Byt ut 1–3 plagg mellan looken – inte fler. Resten ska vara IDENTISKA plagg (exakt samma namn) i båda.
3. Varje "out" måste finnas i dayItems och INTE i eveningItems. Varje "in" måste finnas i eveningItems och INTE i dayItems.
4. Inga dubbletter (en överdel, en nederdel, ett par skor). Färgharmoni i båda looken.
${styleRules ? `5. Användarens egna stilregler (följ noga): ${styleRules}` : ''}

${langInstruction(body.lang)} OBS: "dayItems", "eveningItems" och swap-plaggen ("out"/"in") ska vara plaggens namn EXAKT som i garderoben (översätt dem INTE). Språkvalet gäller "dayName", "eveningName" och "tip".

Svara ENDAST med JSON, inga backticks:
{"dayName": "kort namn på daglooken", "dayItems": ["exakt plaggnamn", ...], "eveningName": "kort namn på kvällslooken", "eveningItems": ["exakt plaggnamn", ...], "swaps": [{"out": "plagg som tas av", "in": "plagg som tas på"}], "tip": "Ett peppande stylist-tips om förvandlingen (1–2 meningar)."}`

    const text = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o', 500, 0.9)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.dayItems) || !Array.isArray(parsed.eveningItems)) {
      return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    }
    if (!Array.isArray(parsed.swaps)) parsed.swaps = []
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
