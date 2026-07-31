import { clip, json, langInstruction, openaiChat, parseAiJson, requireUser, OPENAI_MODEL } from './_utils'

export const config = { runtime: 'edge' }

// Grov "roll" för dedup per person (aldrig två överdelar/nederdelar/skor).
function slotOf(name: string): string | null {
  const s = name.toLowerCase()
  if (/(kavaj|blazer|kostymjacka)/.test(s)) return 'kavaj'
  if (/(jacka|kappa|rock|ytterpl|parkas|täckjacka|trench|puffer|dun)/.test(s)) return 'ytterplagg'
  if (/(klänning)/.test(s)) return 'klanning'
  if (/(byx|jeans|chinos|leggings|shorts|kjol)/.test(s)) return 'nederdel'
  if (/(topp|tröja|skjorta|blus|linne|t-shirt|body|hoodie|sweatshirt|stickad|kofta|college|piké)/.test(s)) return 'overdel'
  if (/(sko|loafer|sneaker|boot|pumps|sandal|ballerina|toffl|känga|stövel)/.test(s)) return 'skor'
  if (/(väska|handväska|ryggsäck|tote|kuvert|crossbody|\bbag\b)/.test(s)) return 'vaska'
  if (/(bälte|skärp)/.test(s)) return 'balte'
  return null
}

function dedupeItems(items: any[]): string[] {
  const arr = Array.isArray(items) ? items.map((i) => String(i ?? '')) : []
  const hasDress = arr.some((i) => slotOf(i) === 'klanning')
  const seen = new Set<string>()
  return arr.filter((i) => {
    const slot = slotOf(i)
    if (!slot) return true
    if (hasDress && (slot === 'overdel' || slot === 'nederdel')) return false
    if (seen.has(slot)) return false
    seen.add(slot)
    return true
  })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const base64 = typeof body.base64 === 'string' ? body.base64 : ''
    const nameA = clip(body.nameA, 40) || 'Person 1'
    const nameB = clip(body.nameB, 40) || 'Person 2'
    const genderA = clip(body.genderA, 20)
    const genderB = clip(body.genderB, 20)
    const listA = clip(body.listA, 6000)
    const listB = clip(body.listB, 6000)
    if (!base64) return json({ error: 'Bild saknas' }, 400)
    if (!listA || !listB) return json({ error: 'Bådas garderober behövs' }, 400)

    const prompt = `Du är en personlig stylist. Bilden visar ETT PAR (två personer). Matcha VARJE persons look mot RÄTT garderob och håll dig strikt till plagg som faktiskt finns där.

Garderob A tillhör ${nameA}${genderA ? ` (${genderA})` : ''}.
Garderob B tillhör ${nameB}${genderB ? ` (${genderB})` : ''}.

Para ihop personerna i bilden med garderoberna efter kön: personen som ser ${genderA || 'ut som A'} ut → garderob A, den andra → garderob B. Är könen samma/oklara: vänster person → garderob A, höger → garderob B.

Garderob A (${nameA}):
${listA}

Garderob B (${nameB}):
${listB}

För VARJE person, gå igenom looken roll för roll och välj HÖGST ETT plagg per roll ur RÄTT garderob: en överdel + en nederdel (eller en klänning istället för båda) + ett par skor + ev. ytterplagg/accessoar. Aldrig två överdelar, två nederdelar eller två par skor. Saknar garderoben ett passande plagg för en roll → lägg rollen i "missing" (färg/typ), aldrig i "items".

${langInstruction(body.lang)} OBS: "items" ska vara plaggens namn EXAKT som i garderoberna (översätt dem INTE). Språkvalet gäller "styleDescription", "outfitName", "missing" och "tip" (inte "person"/"items").

Svara ENDAST med JSON i EXAKT denna ordning (results[0] = garderob A / ${nameA}, results[1] = garderob B / ${nameB}), inga backticks:
{"results":[{"person":"${nameA}","styleDescription":"kort","outfitName":"namn","items":["exakt plaggnamn ur garderob A"],"missing":["saknat plagg"],"tip":"styling-tips"},{"person":"${nameB}","styleDescription":"kort","outfitName":"namn","items":["exakt plaggnamn ur garderob B"],"missing":[],"tip":"styling-tips"}]}`

    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } },
      ],
    }]

    const text = await openaiChat(messages, OPENAI_MODEL, 800)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.results)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    parsed.results = parsed.results.slice(0, 2).map((r: any) => ({
      person: String(r?.person || ''),
      styleDescription: String(r?.styleDescription || ''),
      outfitName: String(r?.outfitName || 'Outfit'),
      items: dedupeItems(r?.items),
      missing: Array.isArray(r?.missing) ? r.missing.filter(Boolean) : [],
      tip: String(r?.tip || ''),
    }))
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
