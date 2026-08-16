import { clip, json, openaiChat, parseAiJson, requireUser, OPENAI_MODEL } from './_utils'

export const config = { runtime: 'edge' }

/**
 * Tolkar innehållet på en butiks orderhistorik-sida (extraherat i appens
 * WebView i användarens egen inloggade session) och plockar ut köpta plagg.
 *
 * Ingen skrapning per butik: AI:n läser sidans synliga text + bildlänkar,
 * så samma kod fungerar för alla butiker och överlever omdesigner.
 *
 * Integritet: rå-innehållet lagras aldrig. Prompten instruerar modellen att
 * utesluta namn, adresser och betalningsuppgifter, och svaret innehåller
 * bara produktdata (namn, märke, pris, datum, bild-URL).
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const store = clip(body.store, 40)
    const content = clip(body.content, 60000)
    // 'wishlist' = användaren bläddrar och vill lägga plagg på köplistan (produkt-
    // sida/varukorg/favoriter). 'orders' (default) = orderhistorik till garderoben.
    const wishlist = body.mode === 'wishlist'
    if (!content) return json({ error: 'Sidinnehåll saknas' }, 400)

    // Gemensamma delar oavsett läge.
    const shared = `Rader som börjar med [BILD] är bild-URL:er som förekom på samma plats på sidan.

VIKTIGT – INTEGRITET: Ta ALDRIG med personuppgifter i svaret. Uteslut köparens
namn, adress, e-post, telefonnummer och alla betalningsuppgifter.

För varje produkt, para ihop den med den [BILD]-URL som ligger närmast produktnamnet
(produktbilder är oftast från butikens CDN – ignorera logotyper och ikoner).

Svara ENDAST med JSON, inga backticks:
{"items": [{"name": "produktnamn", "brand": "märke eller null", "price": "pris som text eller null", "orderDate": "datum som text eller null", "imageUrl": "bild-URL eller null"}]}`

    const prompt = wishlist
      ? `Nedan är det synliga innehållet på en produktsida, varukorg eller favoritlista från nätbutiken ${store || 'okänd butik'}.

Extrahera de plagg, skor, väskor och accessoarer som visas som produkter på sidan
just nu – t.ex. huvudprodukten på en produktsida, eller alla varor i varukorgen/
favoritlistan. Produkterna behöver INTE vara köpta; användaren tittar på dem för att
lägga dem på sin köplista.

Ignorera navigering, sidfot, annonser, heminredning/skönhet och rekommendations-
sektioner ("du kanske också gillar", "liknande produkter", "andra köpte"). Om sidan
visar en tydlig huvudprodukt: ta med den även om den står ensam.

${shared}

Hittar du inga produkter alls (t.ex. om sidan är en start-/inloggningssida eller
kategorilista utan tydlig produkt), svara {"items": []}.

SIDINNEHÅLL:
${content}`
      : `Nedan är det synliga innehållet på en orderhistorik-sida från nätbutiken ${store || 'okänd butik'}.

Extrahera alla KÖPTA PRODUKTER som är kläder, skor, väskor eller accessoarer.
Ignorera allt annat: heminredning, skönhetsprodukter, navigering, rekommendationer
("du kanske gillar", "liknande produkter"), varukorg och annonser.

${shared}

Hittar du inga produkter alls (t.ex. om sidan är en inloggningssida eller tom
orderhistorik), svara {"items": []}.

SIDINNEHÅLL:
${content}`

    const text = await openaiChat([{ role: 'user', content: prompt }], OPENAI_MODEL, 2000)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.items)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)

    // Behåll bara fälten vi bett om – inget annat släpps vidare till klienten.
    const items = parsed.items.slice(0, 60).map((it: any) => ({
      name: typeof it.name === 'string' ? it.name.slice(0, 120) : '',
      brand: typeof it.brand === 'string' ? it.brand.slice(0, 60) : null,
      price: typeof it.price === 'string' ? it.price.slice(0, 30) : null,
      orderDate: typeof it.orderDate === 'string' ? it.orderDate.slice(0, 30) : null,
      imageUrl: typeof it.imageUrl === 'string' && /^https?:\/\//.test(it.imageUrl) ? it.imageUrl.slice(0, 500) : null,
    })).filter((it: any) => it.name)

    return json({ items })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
