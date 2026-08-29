// Basplaggs-bibliotek för "Snabbstart": en kurerad lista med generiska basplagg,
// uppdelad på kvinna/man, som en ny användare bara bockar i för att snabbt fylla
// garderoben (utan att fota). Varje post sparas sedan som ett vanligt plagg.
//
// Bilderna är AI-genererade flatlays som vi äger, upplagda i garments-bucketen
// under prefixet basics/. Sökvägen är deterministisk per (kön, id, färg), så när
// en bild laddas upp dyker den upp även på redan tillagda plagg – ingen kodändring.
// Saknas bilden visar väljaren en färgad platshållare.

import { CATEGORIES, SUBCATEGORIES, COLOR_OPTIONS } from './constants'

export type BasicGender = 'women' | 'men'

export type BasicItem = {
  id: string
  category: (typeof CATEGORIES)[number]
  subcategory: string
  /** Svensk källtext (arketyp, t.ex. "T-shirt"); wrappas i tr() vid render. */
  name: string
  /** Tillgängliga färger (namn ur COLOR_OPTIONS); första = standard. */
  colors: string[]
  /** Standardsäsong(er) som sparas på plagget. */
  season: string[]
  /** Extra engelsk stil-/formhint till bildgenereringen (scripts/generate-basics.ts). */
  promptHint?: string
}

// Slug för färg i bildsökvägen (ASCII, utan svenska tecken).
const COLOR_SLUG: Record<string, string> = {
  'Svart': 'svart', 'Vit': 'vit', 'Grå': 'gra', 'Beige': 'beige',
  'Brun': 'brun', 'Blå': 'bla', 'Grön': 'gron', 'Mörkblå': 'morkbla',
}

// Basplaggs-egna färger som inte finns i COLOR_OPTIONS (t.ex. marinblått denim).
const EXTRA_HEX: Record<string, string> = { 'Mörkblå': '#26324D' }

export function colorSlug(color: string): string {
  return COLOR_SLUG[color] || color.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]/g, '')
}

export function colorHex(color: string): string {
  return EXTRA_HEX[color] || COLOR_OPTIONS.find(c => c.name === color)?.hex || '#CCCCCC'
}

/** Sökväg i garments-bucketen till basplaggs-bilden (kan saknas ännu). */
export function basicImagePath(gender: BasicGender, item: BasicItem, color: string): string {
  return `basics/${gender}/${item.id}/${colorSlug(color)}.png`
}

const A = 'Alla årstider'

// Återkommande form-hintar till bildgenereringen (löser vanliga AI-artefakter).
const TROUSERS_HINT = 'shown full-length, laid out flat and completely unfolded, both legs straight and fully visible, no folding'
const BLAZER_HINT = 'single-breasted, both sleeves laid straight and flat alongside the body, not folded or tucked in'
const KNIT_HINT = 'chunky knitted sweater with clearly visible knit texture and ribbed cuffs and hem, wool knitwear, not a smooth sweatshirt'
const LONGSLEEVE_SHIRT_HINT = 'long-sleeved button-up shirt with full-length sleeves'

const WOMEN: BasicItem[] = [
  { id: 'w-tshirt', category: 'Toppar', subcategory: 'T-shirt', name: 'T-shirt', colors: ['Vit', 'Svart', 'Grå'], season: [A] },
  { id: 'w-linne', category: 'Toppar', subcategory: 'Linne', name: 'Linne', colors: ['Vit', 'Svart'], season: ['Sommar'], promptHint: 'relaxed straight-cut tank top with medium-wide flat opaque shoulder straps that are clearly defined and laid flat, sharp crisp edges, solid opaque cotton jersey (not sheer or transparent), smooth plain front, no darts, no gathering, no shaping over the bust' },
  { id: 'w-blus', category: 'Toppar', subcategory: 'Blus', name: 'Blus', colors: ['Vit', 'Svart'], season: [A], promptHint: 'long-sleeved flowy blouse with full-length sleeves' },
  { id: 'w-skjorta', category: 'Toppar', subcategory: 'Skjorta', name: 'Skjorta', colors: ['Vit', 'Blå'], season: [A], promptHint: LONGSLEEVE_SHIRT_HINT },
  { id: 'w-stickad', category: 'Tröjor', subcategory: 'Stickad tröja', name: 'Stickad tröja', colors: ['Beige', 'Grå', 'Svart'], season: ['Höst', 'Vinter'], promptHint: KNIT_HINT },
  { id: 'w-sweatshirt', category: 'Tröjor', subcategory: 'Sweatshirt', name: 'Sweatshirt', colors: ['Grå', 'Svart'], season: [A] },
  { id: 'w-kofta', category: 'Tröjor', subcategory: 'Kofta', name: 'Kofta', colors: ['Beige', 'Svart'], season: ['Höst'] },
  { id: 'w-jeans', category: 'Byxor', subcategory: 'Jeans', name: 'Jeans', colors: ['Blå', 'Svart', 'Grå', 'Mörkblå'], season: [A], promptHint: TROUSERS_HINT },
  { id: 'w-kostymbyxor', category: 'Byxor', subcategory: 'Kostymbyxor', name: 'Kostymbyxor', colors: ['Svart', 'Beige'], season: [A], promptHint: TROUSERS_HINT },
  { id: 'w-chinos', category: 'Byxor', subcategory: 'Chinos', name: 'Chinos', colors: ['Beige', 'Blå', 'Mörkblå'], season: [A], promptHint: TROUSERS_HINT },
  { id: 'w-leggings', category: 'Byxor', subcategory: 'Leggings', name: 'Leggings', colors: ['Svart'], season: [A] },
  { id: 'w-midikjol', category: 'Kjolar', subcategory: 'Midikjol', name: 'Midikjol', colors: ['Svart', 'Beige'], season: [A] },
  { id: 'w-vardagsklanning', category: 'Klänningar', subcategory: 'Vardagsklänning', name: 'Vardagsklänning', colors: ['Svart', 'Blå'], season: [A] },
  { id: 'w-festklanning', category: 'Klänningar', subcategory: 'Festklänning', name: 'Festklänning', colors: ['Svart'], season: [A] },
  { id: 'w-blazer', category: 'Kavajer', subcategory: 'Blazer', name: 'Blazer', colors: ['Svart', 'Beige'], season: [A], promptHint: BLAZER_HINT },
  { id: 'w-trenchcoat', category: 'Ytterkläder', subcategory: 'Trenchcoat', name: 'Trenchcoat', colors: ['Beige'], season: ['Vår', 'Höst'] },
  { id: 'w-kappa', category: 'Ytterkläder', subcategory: 'Kappa', name: 'Kappa', colors: ['Svart', 'Beige'], season: ['Vinter'] },
  { id: 'w-vinterjacka', category: 'Ytterkläder', subcategory: 'Vinterjacka', name: 'Vinterjacka', colors: ['Svart'], season: ['Vinter'] },
  { id: 'w-laderjacka', category: 'Ytterkläder', subcategory: 'Läderjacka', name: 'Läderjacka', colors: ['Svart'], season: ['Vår', 'Höst'] },
  { id: 'w-sneakers', category: 'Skor', subcategory: 'Sneakers', name: 'Sneakers', colors: ['Vit', 'Svart'], season: [A] },
  { id: 'w-boots', category: 'Skor', subcategory: 'Boots', name: 'Boots', colors: ['Svart', 'Brun'], season: ['Höst', 'Vinter'] },
  { id: 'w-pumps', category: 'Skor', subcategory: 'Pumps', name: 'Pumps', colors: ['Svart'], season: [A] },
  { id: 'w-ballerina', category: 'Skor', subcategory: 'Ballerinaskor', name: 'Ballerinaskor', colors: ['Svart', 'Beige'], season: [A] },
  { id: 'w-handvaska', category: 'Väskor', subcategory: 'Handväska', name: 'Handväska', colors: ['Svart', 'Brun'], season: [A] },
  { id: 'w-halsduk', category: 'Accessoarer', subcategory: 'Halsduk', name: 'Halsduk', colors: ['Grå', 'Beige'], season: ['Höst', 'Vinter'] },
]

const MEN: BasicItem[] = [
  { id: 'm-tshirt', category: 'Toppar', subcategory: 'T-shirt', name: 'T-shirt', colors: ['Vit', 'Svart', 'Grå'], season: [A] },
  { id: 'm-pike', category: 'Toppar', subcategory: 'Piké', name: 'Piké', colors: ['Vit', 'Blå'], season: ['Sommar'] },
  { id: 'm-skjorta', category: 'Toppar', subcategory: 'Skjorta', name: 'Skjorta', colors: ['Vit', 'Blå'], season: [A], promptHint: LONGSLEEVE_SHIRT_HINT },
  { id: 'm-sweatshirt', category: 'Tröjor', subcategory: 'Sweatshirt', name: 'Sweatshirt', colors: ['Grå', 'Svart'], season: [A] },
  { id: 'm-hoodie', category: 'Tröjor', subcategory: 'Hoodie', name: 'Hoodie', colors: ['Grå', 'Svart'], season: [A] },
  { id: 'm-stickad', category: 'Tröjor', subcategory: 'Stickad tröja', name: 'Stickad tröja', colors: ['Beige', 'Blå'], season: ['Höst', 'Vinter'], promptHint: KNIT_HINT },
  { id: 'm-jeans', category: 'Byxor', subcategory: 'Jeans', name: 'Jeans', colors: ['Blå', 'Svart', 'Mörkblå'], season: [A], promptHint: TROUSERS_HINT },
  { id: 'm-chinos', category: 'Byxor', subcategory: 'Chinos', name: 'Chinos', colors: ['Beige', 'Blå', 'Mörkblå'], season: [A], promptHint: TROUSERS_HINT },
  { id: 'm-kostymbyxor', category: 'Byxor', subcategory: 'Kostymbyxor', name: 'Kostymbyxor', colors: ['Svart', 'Grå'], season: [A], promptHint: TROUSERS_HINT },
  { id: 'm-mjukisbyxor', category: 'Byxor', subcategory: 'Mjukisbyxor', name: 'Mjukisbyxor', colors: ['Grå', 'Svart'], season: [A] },
  { id: 'm-shorts', category: 'Shorts', subcategory: 'Chinosshorts', name: 'Chinosshorts', colors: ['Beige', 'Blå'], season: ['Sommar'] },
  { id: 'm-kavaj', category: 'Kavajer', subcategory: 'Kavaj', name: 'Kavaj', colors: ['Svart', 'Blå'], season: [A], promptHint: BLAZER_HINT },
  { id: 'm-kostymjacka', category: 'Kavajer', subcategory: 'Kostymjacka', name: 'Kostymjacka', colors: ['Grå', 'Svart'], season: [A], promptHint: BLAZER_HINT },
  { id: 'm-trenchcoat', category: 'Ytterkläder', subcategory: 'Trenchcoat', name: 'Trenchcoat', colors: ['Beige'], season: ['Vår', 'Höst'] },
  { id: 'm-vinterjacka', category: 'Ytterkläder', subcategory: 'Vinterjacka', name: 'Vinterjacka', colors: ['Svart'], season: ['Vinter'] },
  { id: 'm-puffer', category: 'Ytterkläder', subcategory: 'Pufferjacka', name: 'Pufferjacka', colors: ['Svart'], season: ['Vinter'] },
  { id: 'm-laderjacka', category: 'Ytterkläder', subcategory: 'Läderjacka', name: 'Läderjacka', colors: ['Svart', 'Brun'], season: ['Vår', 'Höst'] },
  { id: 'm-sneakers', category: 'Skor', subcategory: 'Sneakers', name: 'Sneakers', colors: ['Vit', 'Svart'], season: [A] },
  { id: 'm-boots', category: 'Skor', subcategory: 'Boots', name: 'Boots', colors: ['Brun', 'Svart'], season: ['Höst', 'Vinter'] },
  { id: 'm-loafers', category: 'Skor', subcategory: 'Loafers', name: 'Loafers', colors: ['Brun', 'Svart'], season: [A] },
  { id: 'm-ryggsack', category: 'Väskor', subcategory: 'Ryggsäck', name: 'Ryggsäck', colors: ['Svart'], season: [A] },
  { id: 'm-balte', category: 'Accessoarer', subcategory: 'Bälte', name: 'Bälte', colors: ['Brun', 'Svart'], season: [A] },
  { id: 'm-keps', category: 'Accessoarer', subcategory: 'Keps', name: 'Keps', colors: ['Svart'], season: ['Sommar'] },
  { id: 'm-mossa', category: 'Accessoarer', subcategory: 'Mössa', name: 'Mössa', colors: ['Grå', 'Svart'], season: ['Vinter'] },
]

export function basicsFor(gender: BasicGender): BasicItem[] {
  return gender === 'men' ? MEN : WOMEN
}

// Grupperad per kategori i CATEGORIES-ordning (för sektioner i väljaren).
export function basicsByCategory(gender: BasicGender): { category: string; items: BasicItem[] }[] {
  const list = basicsFor(gender)
  return CATEGORIES
    .map(category => ({ category, items: list.filter(i => i.category === category) }))
    .filter(g => g.items.length > 0)
}

// Sanity: alla subcategory-värden måste finnas i SUBCATEGORIES (annars fångas de
// inte av filtren i appen). Körs bara i dev.
if (__DEV__) {
  for (const item of [...WOMEN, ...MEN]) {
    const subs = SUBCATEGORIES[item.category] ?? []
    if (!subs.includes(item.subcategory)) {
      // eslint-disable-next-line no-console
      console.warn(`[basics] ogiltig subcategory "${item.subcategory}" för ${item.id} (${item.category})`)
    }
  }
}
