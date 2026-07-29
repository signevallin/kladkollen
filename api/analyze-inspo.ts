import { clip, json, langInstruction, openaiChat, parseAiJson, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Grov "roll" för ett plagg utifrån namnet – används för att hindra att samma
// roll dyker upp både i "items" och "missing" (t.ex. kavaj båda ställena).
function slotOf(name: string): string | null {
  const s = name.toLowerCase()
  if (/(kavaj|blazer|kostymjacka)/.test(s)) return 'kavaj'
  if (/(jacka|kappa|rock|ytterpl|parkas|täckjacka|trench|puffer|dun)/.test(s)) return 'ytterplagg'
  if (/(klänning)/.test(s)) return 'klanning'
  if (/(byx|jeans|chinos|leggings|shorts|kjol)/.test(s)) return 'nederdel'
  if (/(topp|tröja|skjorta|blus|linne|t-shirt|body|hoodie|sweatshirt|stickad|kofta|college)/.test(s)) return 'overdel'
  if (/(sko|loafer|sneaker|boot|pumps|sandal|ballerina|toffl|känga|stövel)/.test(s)) return 'skor'
  if (/(väska|handväska|ryggsäck|tote|kuvert|crossbody|\bbag\b)/.test(s)) return 'vaska'
  if (/(bälte|skärp)/.test(s)) return 'balte'
  if (/(halsduk|sjal|scarf)/.test(s)) return 'halsduk'
  if (/(hatt|mössa|keps|basker)/.test(s)) return 'huvudbonad'
  if (/(solglas|glasögon)/.test(s)) return 'glasogon'
  if (/(smycke|halsband|örhäng|armband|\bring\b)/.test(s)) return 'smycke'
  if (/(hår|scrunchie|diadem|spänne)/.test(s)) return 'har'
  return null
}

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
2. Gå igenom looken ROLL för ROLL (överdel, underdel/klänning, ytterplagg/kavaj,
   skor, väska/accessoar). Välj HÖGST ETT plagg per roll – aldrig två underdelar,
   två par skor eller två överdelar. Väljer du en KLÄNNING: ta INTE med separat
   överdel eller underdel (klänningen ersätter båda). För VARJE roll, gör exakt
   ETT av två val:
   • Har garderoben ett plagg som fyller rollen (samma typ)? Välj det bästa till
     "items" – även om färgen skiljer sig något. Nämn färgskillnaden i "tip".
   • Har garderoben INGET plagg av den typen alls? Lägg då rollen i "missing".

VIKTIGASTE REGELN – bryt den ALDRIG:
Samma roll/kategori får bara stå på ETT ställe. Ett plagg som finns i "items"
får ALDRIG också dyka upp i "missing", och tvärtom. Har du redan valt en kavaj
till "items" får du ALDRIG föreslå en kavaj i "missing" – inte ens i en annan
färg. (Fel: kavaj i items + "beige kavaj" i missing = TVÅ kavajer. Förbjudet.)
Föreslå aldrig att köpa något du redan har ett alternativ till i garderoben.

REGLER FÖR "missing":
A. Bara roller där garderoben helt saknar ett passande plagg. Räcker garderoben
   för hela looken? Sätt "missing" till [].
B. Varje saknat plagg måste gå att BÄRA IHOP med de valda plaggen. Föreslå
   aldrig lager som krockar (t.ex. kofta OVANPÅ en vald kavaj/blazer, eller
   två ytterplagg samtidigt).
C. Saknade plagg ska tona in färg- och materialmässigt i looken. Blanda inte
   in en tredje stark färg eller svart+brunt läder.
D. Max 3 saknade plagg, gärna färre. Kvalitet före kvantitet.

${langInstruction(body.lang)} OBS: "items" ska vara plaggens namn EXAKT som i garderoben (översätt dem INTE). Språkvalet gäller "styleDescription", "outfitName", "missing" och "tip".

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

    // Säkerhetsnät 1: högst ETT plagg per roll i items (aldrig 2 underdelar/skor),
    // och en klänning ersätter över-/underdel. Deterministiskt oavsett vad modellen
    // returnerar.
    const hasDress = parsed.items.some((i: any) => slotOf(String(i ?? '')) === 'klanning')
    const seenSlots = new Set<string>()
    parsed.items = parsed.items.filter((i: any) => {
      const slot = slotOf(String(i ?? ''))
      if (!slot) return true
      if (hasDress && (slot === 'overdel' || slot === 'nederdel')) return false
      if (seenSlots.has(slot)) return false
      seenSlots.add(slot)
      return true
    })

    // Säkerhetsnät 2: ta bort köpförslag i en roll som redan täcks av ett valt
    // plagg (t.ex. valde en kavaj → föreslå inte en kavaj till).
    if (Array.isArray(parsed.missing)) {
      const itemSlots = new Set(parsed.items.map(slotOf).filter(Boolean))
      parsed.missing = parsed.missing.filter((m: any) => {
        const slot = slotOf(String(m ?? ''))
        return !slot || !itemSlots.has(slot)
      })
    }
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
