import { type ExpoRequest, type ExpoResponse } from 'expo-router/server'

const PROMPT = `Du är en professionell färgkonsult. Analysera färgerna i bilden och generera en detaljerad färgpalett.

STEG 1 – Färgtonanalys:
Identifiera undertone (varm/kall/neutral), värde (ljust/mörkt), intensitet och kontrastnivå mellan hud och hår. Beskriv hur mörka och ljusa neutraler fungerar för denna profil.

STEG 2 – Optimal färgriktning:
Ge 5 basfärger, 5 kompletterande färger, 3 accentfärger och 5 färger att undvika nära ansiktet – alla med hex-koder och kortfattad motivering.

STEG 3 – Strategisk stilanalys:
Ge konkreta färgkombinationer (hex) som signalerar: Auktoritet, Tillgänglighet, Kreativitet, Professionalism.

STEG 4 – Säsongsanpassning:
Beskriv hur paletten justeras för sommar (ljusare) och vinter (djupare kontrast).

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

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const { base64 } = await request.json()
    if (!base64) {
      return Response.json({ error: 'base64 saknas' }, { status: 400 }) as ExpoResponse
    }

    const key = process.env.GEMINI_API_KEY
    if (!key) {
      return Response.json({ error: 'GEMINI_API_KEY saknas på servern' }, { status: 500 }) as ExpoResponse
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          ]}],
          generationConfig: { maxOutputTokens: 4096 },
        }),
      }
    )

    const data = await geminiRes.json()
    if (data.error) {
      return Response.json({ error: data.error.message || 'Gemini API-fel' }, { status: 400 }) as ExpoResponse
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return Response.json({ error: 'Inget svar från Gemini' }, { status: 500 }) as ExpoResponse
    }

    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return Response.json({ error: `Ogiltigt JSON-svar: ${text.slice(0, 200)}` }, { status: 500 }) as ExpoResponse
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    return Response.json(parsed) as ExpoResponse
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 }) as ExpoResponse
  }
}
