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
    const destination = clip(body.destination, 120)
    const dateLabel = clip(body.dateLabel, 80)
    const monthLabel = clip(body.monthLabel, 60)
    const days = Math.max(1, Math.min(60, Number(body.days) || 1))
    const weatherSummary = clip(body.weatherSummary, 300)
    const groupedList = clip(body.groupedList, 8000)

    if (!destination) return json({ error: 'Destination saknas' }, 400)
    if (!groupedList) return json({ error: 'Garderobslista saknas' }, 400)

    // Antal outfitsförslag: ungefär en per dag, men rimligt tak.
    const outfitCount = Math.max(2, Math.min(days, 7))

    const weatherLine = weatherSummary
      ? `Väder på destinationen under perioden: ${weatherSummary}`
      : `Ingen exakt prognos finns (resan ligger längre fram än 16 dagar). Utgå från ditt kunnande om TYPISKT väder i ${destination} under ${monthLabel} – nämn ungefärlig temperatur och om det brukar regna.`

    const prompt = `Du är en personlig stylist och reseexpert. Användaren ska resa till ${destination} under ${dateLabel} (${days} dagar) och behöver hjälp att packa RÄTT plagg ur sin egen garderob.

${weatherLine}

GARDEROB (välj ENDAST plagg härifrån, exakt som de heter):
${groupedList}

Din uppgift:
1. PACKLISTA: Välj ut en smart, mix-and-match-vänlig uppsättning plagg ur garderoben som räcker för ${days} dagar utan att man packar för mycket. Prioritera plagg som passar vädret och som går att kombinera med varandra. Ta med lämpliga skor och ytterplagg om vädret kräver.
2. OUTFITS: Sätt ihop ${outfitCount} färdiga outfits av de packade plaggen (varje outfit ska ha skor + hel look). Ge varje outfit ett kort namn som antyder tillfälle (t.ex. "Middag ute", "Sightseeing", "Resedag").
3. EXTRAS: Lista praktiska saker att inte glömma som INTE är plagg i garderoben (t.ex. underkläder, strumpor, pyjamas, necessär, laddare, adapter, badkläder om relevant) – anpassa efter destination och väder.

VIKTIGT:
- Använd EXAKT samma plaggnamn som i garderoben (för både packlista och outfits).
- Anpassa TYDLIGT efter vädret: inga tjocka vinterplagg till en varm destination, och tvärtom.
- Packlistan ska innehålla varje plagg som används i outfitsen, plus ev. extra basplagg.

Svara ENDAST med JSON, inga backticks:
{"climateNote": "1–2 meningar om vädret på plats och vad det betyder för packningen", "packingList": ["exakt plaggnamn", "..."], "outfits": [{"name": "outfitnamn", "items": ["exakt plaggnamn", "..."]}], "extras": ["Underkläder ×${days}", "Laddare", "..."]}`

    const text = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o', 1300, 0.7)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.packingList)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    if (!Array.isArray(parsed.outfits)) parsed.outfits = []
    if (!Array.isArray(parsed.extras)) parsed.extras = []
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
