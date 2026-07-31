import { clip, json, langInstruction, openaiChat, parseAiJson, requireUser, OPENAI_MODEL } from './_utils'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const skinTone = clip(body.skinTone, 40)
    const skinUndertone = clip(body.skinUndertone, 40)
    const hairColor = clip(body.hairColor, 40)
    const eyeColor = clip(body.eyeColor, 40)
    const contrastLevel = clip(body.contrastLevel, 40)

    if (!skinTone || !skinUndertone || !hairColor || !eyeColor || !contrastLevel) {
      return json({ error: 'Alla fält måste fyllas i' }, 400)
    }

    const prompt = `Du är en professionell färgkonsult. Generera en detaljerad färgpalett baserat på följande färgprofil:

Hudton: ${skinTone}
Undertone: ${skinUndertone}
Hårfärg: ${hairColor}
Ögonfärg: ${eyeColor}
Kontrastnivå (hud vs hår): ${contrastLevel}

STEG 1 – Färgtonanalys:
Bekräfta undertone, värde, intensitet och kontrastnivå. Beskriv hur mörka och ljusa neutraler fungerar för denna profil, och hur svart/kritvitt upplevs.

STEG 2 – Optimal färgriktning:
Ge 5 basfärger, 5 kompletterande färger, 3 accentfärger och 5 färger att undvika nära ansiktet – alla med hex-koder och kortfattad motivering.

STEG 3 – Strategisk stilanalys:
Ge konkreta färgkombinationer (hex) som signalerar: Auktoritet, Tillgänglighet, Kreativitet, Professionalism i digitala möten.

STEG 4 – Säsongsanpassning:
Beskriv hur paletten justeras för sommar (ljusare) och vinter (djupare kontrast).

${langInstruction(body.lang)} OBS: Behåll JSON-NYCKLARNA exakt som nedan (översätt dem INTE) – språkvalet gäller bara värdena (t.ex. "undertone", "namn", "motivering", "sammanfattning").

Svara ENDAST med JSON, inga backticks:
{
  "biologisk": {
    "undertone": "...",
    "varde": "...",
    "intensitet": "...",
    "kontrast": "...",
    "hudreaktion": "...",
    "svartVitt": "..."
  },
  "palett": {
    "bas": [{"hex":"#...","namn":"...","motivering":"..."}],
    "kompletterande": [{"hex":"#...","namn":"...","motivering":"..."}],
    "accent": [{"hex":"#...","namn":"...","motivering":"..."}],
    "undvik": [{"hex":"#...","namn":"..."}]
  },
  "strategi": {
    "auktoritet": {"text":"...","farger":["#...","#..."]},
    "tillganglighet": {"text":"...","farger":["#...","#..."]},
    "kreativitet": {"text":"...","farger":["#...","#..."]},
    "professionalism": {"text":"...","farger":["#...","#..."]}
  },
  "sasong": {
    "sommar": "...",
    "vinter": "..."
  },
  "sammanfattning": ["punkt1","punkt2","punkt3","punkt4","punkt5"],
  "garderobsAlgoritm": "..."
}`

    const text = await openaiChat([{ role: 'user', content: prompt }], OPENAI_MODEL, 4096)
    return json(parseAiJson(text))
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
