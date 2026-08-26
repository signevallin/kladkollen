import { shoeSizeIndex, sizeIndex } from './childSize'
// Rena hjälpfunktioner för outfit-generering, delade mellan hemskärmen
// (vuxen/par) och barn-outfit-skärmen (app/child-outfit). Inga React-beroenden
// och ingen översättning – prompten byggs alltid på svenska och funktionerna
// kan enhetstestas. Kategorierna är desamma oavsett person (barn har samma
// plaggkategorier som vuxna).

// Aktuell årstid (svensk källtext – matchar plaggens season-fält).
export function getCurrentSeason(): string {
  const m = new Date().getMonth() // 0 = jan
  if (m === 11 || m <= 1) return 'Vinter'
  if (m <= 4) return 'Vår'
  if (m <= 8) return 'Sommar'
  return 'Höst'
}

// Ett plagg passar säsongen om: ingen säsong angiven, "Alla årstider", eller om
// den aktuella säsongen finns med i plaggets säsonger.
export function seasonAppropriate(g: any, season: string): boolean {
  const s = (g.season || '').trim()
  if (!s) return true
  if (s.includes('Alla årstider')) return true
  return s.includes(season)
}

// Sovkläder ingår aldrig i en outfit – kategorin saknas med flit i categoryMap
// ovan, man går inte till förskolan i pyjamas. Följden blev att packlistan
// aldrig nämnde dem, eftersom AI:n bygger listan runt outfitsen. Men pyjamas är
// bland det första en förälder packar.
//
// Matchar brett: kategorin heter "Sovkläder" i dagens data, men plagg importeras
// också från butiker med egna benämningar.
const SLEEPWEAR_RE = /sovkl(ä|a)der|nattkl(ä|a)der|pyjamas?|nattlinne|nattdr(ä|a)kt|sovdr(ä|a)kt|sparkdr(ä|a)kt|footie/i

/** Nämner en fritext-sak sovkläder? ("Pyjamas", "nattlinne" …) */
export function isSleepwearText(text: string): boolean {
  return SLEEPWEAR_RE.test(text || '')
}

/**
 * Ska en "glöm inte"-sak döljas för att den redan ligger i plagglistan?
 *
 * Sovkläder läggs till deterministiskt i packlistan, medan AI:n samtidigt gärna
 * skriver "Pyjamas" bland extras – samma sak hamnade då på två ställen. Utöver
 * det jämförs texten mot de packade plaggens namn, så "Regnjacka" försvinner ur
 * extras när regnjackan faktiskt är packad.
 */
export function extraAlreadyPacked(
  extra: string,
  packed: { name?: string | null }[],
  sleepwearPacked = false,
): boolean {
  const k = (extra || '').trim().toLowerCase()
  if (!k) return false
  if (sleepwearPacked && isSleepwearText(k)) return true
  return packed.some(p => {
    const n = (p?.name || '').trim().toLowerCase()
    // Korta namn matchar för lätt mot godtycklig text – kräv lite substans.
    if (!n || n.length < 4) return false
    return n === k || n.includes(k) || k.includes(n)
  })
}

/**
 * En body är barnets ÖVERDEL, inte underkläder.
 *
 * "Body" finns som underkategori under BÅDE Toppar och Underkläder, så AI:n
 * väljer olika från gång till gång. Hamnar den under Underkläder blir plagget
 * osynligt för outfitgenereringen – kategorin saknas med flit i categoryMap –
 * och en bebis vars garderob mest består av bodys får då nästan inga förslag.
 *
 * Gäller bara barn. På en vuxen kan en body mycket väl vara underkläder.
 */
export function categoryForChildGarment(
  category: string | null | undefined,
  subcategory: string | null | undefined,
  name: string | null | undefined,
  isChild: boolean,
): string | null | undefined {
  if (!isChild || category !== 'Underkläder') return category
  const text = [subcategory, name].filter(Boolean).join(' ')
  return /\bbody\b|bodysuit/i.test(text) ? 'Toppar' : category
}

export function isSleepwear(g: any): boolean {
  return SLEEPWEAR_RE.test([g?.category, g?.subcategory, g?.name].filter(Boolean).join(' '))
}

// Hur många sovplagg som är rimligt att packa för en resa. Ett ombyte per tre
// dygn, minst ett – fler än så är sällan vad man vill släpa på.
export function sleepwearForTrip(pool: any[], days: number, alreadyPacked: any[] = []): any[] {
  const packed = new Set(alreadyPacked.map((p: any) => p?.id).filter(Boolean))
  return pool
    .filter(g => isSleepwear(g) && !packed.has(g.id))
    .slice(0, Math.max(1, Math.ceil(days / 3)))
}

// ── Säsongsfilter för resor ────────────────────────────────────────────────
// Vilka av plaggens säsonger som är relevanta för destinationens temperaturspann.
// Bygger på TEMPERATUR och inte på resans månad: juli i Australien är vinter, och
// en månadsbaserad gissning hade packat fel åt halva jordklotet.
//
// Generöst tilltaget med flit – hellre ett plagg för mycket i listan än att
// modellen står utan alternativ. Vår och Höst är samma temperaturband i praktiken
// och följs därför åt.
export function tripSeasons(minTemp?: number | null, maxTemp?: number | null): string[] | null {
  const lo = typeof minTemp === 'number' ? minTemp : (typeof maxTemp === 'number' ? maxTemp : null)
  const hi = typeof maxTemp === 'number' ? maxTemp : lo
  if (lo == null || hi == null) return null
  const out = new Set<string>()
  if (lo <= 8) out.add('Vinter')
  if (lo <= 18 && hi >= 8) { out.add('Vår'); out.add('Höst') }
  if (hi >= 17) out.add('Sommar')
  return out.size ? [...out] : null
}

// Filtrerar garderoben inför en resa. Kategorivis, och en kategori som skulle bli
// HELT tom lämnas ofiltrerad: annars kunde en varm resa sluta utan enda par skor
// i listan, och då hittar modellen på ett par – exakt det felet vi jagade.
export function filterForTrip(garments: any[], seasons: string[] | null): any[] {
  if (!seasons || !seasons.length) return garments
  const byCat: Record<string, any[]> = {}
  for (const g of garments) (byCat[g.category || 'Övrigt'] ||= []).push(g)

  const out: any[] = []
  for (const items of Object.values(byCat)) {
    const keep = items.filter(g => seasons.some(s => seasonAppropriate(g, s)))
    out.push(...(keep.length ? keep : items))
  }
  return out
}

// Ålder i månader från födelsedatum (null om okänt).
export function ageMonths(birthdate: string | null | undefined): number | null {
  if (!birthdate) return null
  const b = new Date(birthdate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) m -= 1
  return Math.max(0, m)
}

// Bebis styr TILLTALET i prompten (bebis vs barn, golvlek, onesies tillåtna) –
// inte skorna. De två föll isär när "går själv" blev en egen inställning: ett
// treårigt barn som inte går ännu ska slippa skor, men ska inte kallas bebis.
export function isBabyChild(birthdate: string | null | undefined, sizeCm: number | null): boolean {
  const m = ageMonths(birthdate)
  if (m != null) return m < 18
  if (sizeCm != null) return sizeCm < 86
  return false
}

// Går barnet själv? Avgör om outfiten ska innehålla skor.
//
// Ett uttryckligt val vinner alltid. Saknas det faller vi tillbaka på samma
// åldersgissning som förut – men den är trubbig: barn börjar gå mellan ca 9 och
// 18 månader, så en tidig gångare fick tidigare inga skor i upp till ett halvår.
// Vet vi ingenting alls antas barnet gå, vilket är det säkra felet (en skopar
// för mycket är lättare att bortse från än en outfit utan skor).
export function childWalks(
  birthdate: string | null | undefined,
  sizeCm: number | null,
  walks?: boolean | null,
): boolean {
  if (walks != null) return walks
  return !isBabyChild(birthdate, sizeCm)
}

// Plagg som passar barnets aktuella storlek: osizeade plagg tas alltid med,
// annars ett generöst fönster runt current_size_cm (lite för stort går bra att
// växa i, för litet döljs). Saknas storlek på barnet → visa allt.
/**
 * Passar plagget barnet just nu?
 *
 * allowLarger öppnar fönstret ETT steg uppåt (people.allow_larger_size). Utan
 * det är bara nuvarande storlek och ett steg ner giltiga, vilket gör plagg man
 * köpt att växa i osynliga för genereringen. Med det på räknas nästa storlek
 * också – barn bär ofta lite stort. Valet är per barn eftersom det skiljer sig
 * mellan syskon.
 */
export function childSizeFits(
  g: any,
  currentCm: number | null,
  currentShoe: number | null = null,
  allowLarger = false,
): boolean {
  const up = allowLarger ? 1 : 0
  // Skor mäts i EU-nummer och har egen skala. Utan den här grenen slank alla
  // skor igenom ofiltrerat, eftersom de saknar size_cm – ett barn kunde få
  // förslag på skor det växt ur för länge sedan.
  if (g.shoe_size != null) {
    if (currentShoe == null) return true
    const shoeSteps = shoeSizeIndex(g.shoe_size) - shoeSizeIndex(currentShoe)
    return shoeSteps <= up && shoeSteps >= -1
  }
  if (g.size_cm == null) return true
  if (currentCm == null) return true
  // Räknas i STORLEKSSTEG, inte centimeter. Det gamla fönstret (-6/+10 cm)
  // släppte igenom ett helt steg uppåt: ett barn i 62 fick plagg i 68 – precis
  // de plagg familjeskärmen samtidigt märker "Om ~3 mån". Appen sa alltså emot
  // sig själv. Ett steg NER går oftast fortfarande att ha på sig och behålls,
  // annars blir urvalet för tunt i en liten garderob.
  const steps = sizeIndex(g.size_cm) - sizeIndex(currentCm)
  return steps <= up && steps >= -1
}

// Bygger den grupperade garderobslistan som AI:n väljer ur. requiresOuterwear
// styr bara ordvalet i ytterplagg-rubriken (väderdrivet).
// Serialiserar kategorigrupperna till prompttext inom en teckenbudget.
//
// Servern klipper listan med ett rakt slice() vid 8000 tecken. En garderob på
// ett par hundra plagg är längre än så, och eftersom grupperna skrivs i ordning
// försvann de SISTA helt – i praktiken skor och accessoarer. Modellen fick
// samtidigt regeln "varje outfit MÅSTE ha exakt ett par skor" och hittade då på
// ett par som inte finns.
//
// Fördela därför budgeten runt-om mellan grupperna: ett plagg från varje grupp i
// tur och ordning tills budgeten är slut. Då överlever alltid minst några skor,
// oavsett hur många toppar garderoben råkar innehålla. Grupper som beskurits får
// en rad som säger hur många som inte fick plats, så modellen vet att listan är
// ett urval och inte hela sanningen.
export function renderGarmentGroups(groups: Record<string, string[]>, budget = 7500): string {
  const entries = Object.entries(groups).filter(([, items]) => items.length > 0)
  if (!entries.length) return ''

  const headerCost = entries.reduce((n, [g]) => n + g.length + 3, 0)
  let left = budget - headerCost
  const taken: Record<string, string[]> = {}
  for (const [g] of entries) taken[g] = []

  let round = 0, added = true
  while (added && left > 0) {
    added = false
    for (const [g, items] of entries) {
      if (round >= items.length) continue
      const cost = items[round].length + 1
      if (cost > left) continue
      taken[g].push(items[round]); left -= cost; added = true
    }
    round++
  }

  return entries
    .map(([g, items]) => {
      const rest = items.length - taken[g].length
      const more = rest > 0 ? `\n  … och ${rest} till i den här kategorin` : ''
      return `${g}:\n${taken[g].join('\n')}${more}`
    })
    .join('\n\n')
}

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
  return renderGarmentGroups(groups)
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

/**
 * Varför garderoben inte kan bli en outfit – eller null om den kan.
 *
 * buildGroupedGarmentList returnerar en TOM sträng när ingen grupp fick
 * innehåll, och servern avvisar det. Att upptäcka det på klienten gör två
 * saker: användaren får ett besked som säger vad hen ska göra i stället för
 * "Garderobslista saknas", och anropet blir aldrig av – vilket sparar både
 * väntetid och en AI-kredit.
 *
 * Skiljer på de två fallen med flit. Tom garderob är självförklarande. Att ha
 * plagg men ändå få tom lista är däremot förvirrande, och beror på att
 * Sovkläder, Underkläder och Badkläder medvetet saknas bland outfit-
 * kategorierna – de plaggen är osynliga för genereringen.
 */
export function wardrobeGapReason(groupedList: string, garmentCount: number): 'empty' | 'no-usable' | null {
  if (groupedList) return null
  return garmentCount > 0 ? 'no-usable' : 'empty'
}
