// Rena hjälpfunktioner för outfit-generering, delade mellan hemskärmen
// (vuxen/par) och barn-outfit-skärmen (app/child-outfit). Inga React-beroenden
// och ingen översättning – prompten byggs alltid på svenska och funktionerna
// kan enhetstestas. Kategorierna är desamma oavsett person (barn har samma
// plaggkategorier som vuxna).

// Bygger den grupperade garderobslistan som AI:n väljer ur. requiresOuterwear
// styr bara ordvalet i ytterplagg-rubriken (väderdrivet).
export function buildGroupedGarmentList(garmentList: any[], requiresOuterwear: boolean): string {
  const outerwearLabel = requiresOuterwear
    ? 'YTTERPLAGG / KAVAJ – OBLIGATORISK pga vädret (välj 1 om tillgängligt)'
    : 'YTTERPLAGG / KAVAJ – valfritt, lägg till om kontexten/vädret kräver'

  const groups: Record<string, string[]> = {
    'KLÄNNING (välj 1 om du vill ha heldress – då skippar du nederdel och överdel)': [],
    'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)': [],
    'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)': [],
    [outerwearLabel]: [],
    'SKOR – alltid obligatorisk (välj exakt 1)': [],
    'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken': [],
  }
  const categoryMap: Record<string, string> = {
    'Klänningar': 'KLÄNNING (välj 1 om du vill ha heldress – då skippar du nederdel och överdel)',
    'Byxor': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
    'Shorts': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
    'Kjolar': 'NEDERDEL – obligatorisk om ingen klänning (välj exakt 1)',
    'Toppar': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
    'Tröjor': 'ÖVERDEL – obligatorisk om ingen klänning (välj exakt 1)',
    'Kavajer': outerwearLabel,
    'Ytterkläder': outerwearLabel,
    'Skor': 'SKOR – alltid obligatorisk (välj exakt 1)',
    'Väskor': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
    'Accessoarer': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
    'Smycken': 'VÄSKA / ACCESSOAR – valfritt, lägg till om det lyfter looken',
  }
  for (const g of garmentList) {
    const group = categoryMap[g.category]
    if (group) {
      // Ta med typen (t.ex. Festklänning/Vardagsklänning) så AI:n kan matcha
      // formalitetsnivån till kontexten – annars syns bara huvudkategorin.
      const meta = [g.subcategory, g.color].filter(Boolean).join(', ')
      groups[group].push(`  • ${g.name}${meta ? ' (' + meta + ')' : ''}`)
    }
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([group, items]) => `${group}:\n${items.join('\n')}`)
    .join('\n\n')
}

// Validerar att ett förslag har de obligatoriska rollerna (skor + över-/nederdel
// eller klänning, samt ytterplagg när vädret kräver det och det finns i poolen).
export function validateOutfit(items: string[], garmentList: any[], requiresOuterwear: boolean, opts?: { requireShoes?: boolean }): { valid: boolean; missing: string } {
  // requireShoes styr om skor är obligatoriska. Default på (vuxna/gående barn);
  // stängs av för bebisar som inte går själva än (skor behövs inte).
  const requireShoes = opts?.requireShoes !== false
  const BOTTOM_CATS = ['Byxor', 'Shorts', 'Kjolar']
  const TOP_CATS = ['Toppar', 'Tröjor']
  const DRESS_CATS = ['Klänningar']
  const SHOE_CATS = ['Skor']
  const OUTER_CATS = ['Ytterkläder', 'Kavajer']

  const matched = items.map(name =>
    garmentList.find(g =>
      g.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(g.name.toLowerCase())
    )
  ).filter(Boolean)

  const hasDress = matched.some(g => DRESS_CATS.includes(g.category))
  const hasBottom = matched.some(g => BOTTOM_CATS.includes(g.category))
  const hasTop = matched.some(g => TOP_CATS.includes(g.category))
  const hasShoes = matched.some(g => SHOE_CATS.includes(g.category))
  const hasOuter = matched.some(g => OUTER_CATS.includes(g.category))

  if (requireShoes && !hasShoes) return { valid: false, missing: 'skor saknas' }
  if (!hasDress && !hasBottom) return { valid: false, missing: 'nederdel (byxor/kjol) saknas' }
  if (!hasDress && !hasTop) return { valid: false, missing: 'överdel saknas' }
  // Only require outerwear if the wardrobe actually has some
  const hasOuterwearInWardrobe = garmentList.some(g => OUTER_CATS.includes(g.category))
  if (requiresOuterwear && hasOuterwearInWardrobe && !hasOuter) return { valid: false, missing: 'ytterkläder saknas trots kallt/regnigt väder' }
  return { valid: true, missing: '' }
}

// Matchar AI:ns plaggnamn mot rätt plagg i poolen – exakt först, sedan mest
// specifikt, och aldrig samma plagg två gånger. category följer med så
// dela-kollaget kan placera över-/underdelar rätt.
export function matchItemsToPool(names: string[], pool: any[]): any[] {
  const used = new Set<string>()
  const find = (name: string) => {
    const target = (name || '').trim().toLowerCase()
    const free = (g: any) => !g.id || !used.has(g.id)
    let m = pool.find(g => free(g) && (g.name || '').trim().toLowerCase() === target)
    if (!m) m = pool.find(g => free(g) && (g.name || '').toLowerCase().includes(target))
    if (!m) m = pool.filter(g => free(g) && g.name && target.includes(g.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0]
    if (m?.id) used.add(m.id)
    return m
  }
  return (names || []).map((n: string) => {
    const m = find(n)
    return { name: n, image_url: m?.image_url || null, id: m?.id || null, category: m?.category || null }
  })
}

// Skyddsnät: ta bort dubbletter av "en-per-look"-roller (t.ex. två par skor)
// som AI:n ibland råkar välja. Accessoarer/smycken/väskor lämnas orörda.
export function dedupOutfitItems(items: any[], pool: any[]): any[] {
  const catById = new Map(pool.filter(g => g.id).map(g => [g.id, g.category]))
  const SINGLE = new Set(['Skor', 'Byxor', 'Shorts', 'Kjolar', 'Klänningar', 'Toppar', 'Tröjor', 'Kavajer', 'Ytterkläder'])
  const seen = new Set<string>()
  return items.filter(it => {
    const cat = it.id ? catById.get(it.id) : null
    if (!cat || !SINGLE.has(cat)) return true // accessoarer m.m. – behåll alla
    if (seen.has(cat)) return false
    seen.add(cat)
    return true
  })
}
