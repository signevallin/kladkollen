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
    const base64 = typeof body.base64 === 'string' ? body.base64 : ''
    const garmentList = clip(body.garmentList, 8000)
    if (!base64) return json({ error: 'Bild saknas' }, 400)

    const prompt = `Du är en personlig stylist. Analysera inspirationsbilden och matcha stilen mot användarens garderob.

Garderob:
${garmentList}

1. Beskriv stilen i inspirationsbilden kort.
2. Välj plagg från garderoben (exakt som de heter i listan) som ÄKTA matchar
   looken. Välj bara plagg som verkligen liknar det i bilden i typ OCH färg.
   Byt ALDRIG ut ett definierande plagg mot något som skiljer sig tydligt bara
   för att fylla en plats – har bilden vita byxor och garderoben bara har svarta,
   räknas de svarta INTE som en matchning. Hoppa då över plaggplatsen i "items"
   och lägg det i "missing" istället. Hellre en ärligt ofullständig look än en
   påhittad matchning.
3. Lista plagg som SAKNAS för att fullborda looken – enligt reglerna nedan.

REGLER FÖR "missing" (viktigt – följ exakt):
A. Föreslå ALDRIG ett plagg i en kategori du redan täckt med en ÄKTA matchning
   i "items". Har du matchat en kavaj → föreslå INTE en annan kavaj. Det ska
   komplettera looken, inte dubblera den.
B. Lägg till det definierande plagg som saknas i garderoben (t.ex. de vita
   byxorna) med rätt färg/typ – beskriv det så som det ser ut i bilden.
C. Varje saknat plagg måste gå att BÄRA IHOP med de valda plaggen. Föreslå
   aldrig lager som krockar (t.ex. kofta OVANPÅ en redan vald kavaj/blazer,
   eller två ytterplagg samtidigt).
D. Saknade plagg ska tona in färg- och materialmässigt i looken. Blanda inte
   in en tredje stark färg eller svart+brunt läder.
E. Räcker garderoben redan för hela looken? Sätt "missing" till [].
F. Max 3 saknade plagg, gärna färre. Kvalitet före kvantitet.

Svara ENDAST med ett JSON-objekt:
{
  "styleDescription": "beskrivning",
  "outfitName": "namn",
  "items": ["plagg1", "plagg2", "plagg3"],
  "missing": ["Saknat plagg 1", "Saknat plagg 2"],
  "tip": "styling-tips"
}`

    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } },
      ],
    }]

    const text = await openaiChat(messages, 'gpt-4o', 500)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.items)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
