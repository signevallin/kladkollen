import { localeFor } from '../utils/i18n'
import { CHILD_CONTEXTS, OUTFIT_CONTEXTS } from '../utils/constants'
import { dedupOutfitItems, childSizeFits, extraAlreadyPacked, categoryForChildGarment } from '../utils/outfit'

const pool = [
  { id: 'sw', name: 'Sweatshirt',  category: 'Tröjor' },
  { id: 'ko', name: 'Kofta',       category: 'Tröjor' },
  { id: 'by', name: 'Byxor',       category: 'Byxor' },
  { id: 'sk', name: 'Sneakers',    category: 'Skor' },
  { id: 'm1', name: 'Mössa',       category: 'Accessoarer' },
  { id: 'm2', name: 'Vantar',      category: 'Accessoarer' },
]
const byId = (ids: string[]) => ids.map(id => pool.find(g => g.id === id)!)

describe('dedupOutfitItems', () => {
  it('släpper igenom bara ett plagg per klädkategori', () => {
    // Det rapporterade fallet: AI:n gav både sweatshirt och kofta – båda Tröjor.
    const out = dedupOutfitItems(byId(['sw', 'ko', 'by', 'sk']), pool)
    expect(out.map(i => i.id)).toEqual(['sw', 'by', 'sk'])
  })

  it('behåller flera accessoarer', () => {
    const out = dedupOutfitItems(byId(['sw', 'by', 'sk', 'm1', 'm2']), pool)
    expect(out.map(i => i.id)).toEqual(['sw', 'by', 'sk', 'm1', 'm2'])
  })

  it('behåller ordningen och första förekomsten', () => {
    const out = dedupOutfitItems(byId(['ko', 'sw']), pool)
    expect(out.map(i => i.id)).toEqual(['ko'])
  })

  it('rör inte plagg som saknas i poolen', () => {
    const okänt = { id: 'x', name: 'Okänt' }
    const out = dedupOutfitItems([...byId(['sw']), okänt], pool)
    expect(out).toHaveLength(2)
  })
})

describe('childSizeFits – skor', () => {
  const sko = (shoe: number | null) => ({ shoe_size: shoe, size_cm: null, category: 'Skor' })

  it('släpper igenom skor när barnets skostorlek saknas', () => {
    expect(childSizeFits(sko(25), 62, null)).toBe(true)
  })

  it('accepterar aktuell storlek och ett steg ner', () => {
    expect(childSizeFits(sko(24), 62, 24)).toBe(true)
    expect(childSizeFits(sko(23), 62, 24)).toBe(true)
  })

  it('blockerar skor barnet växt ur eller ännu inte vuxit i', () => {
    expect(childSizeFits(sko(22), 62, 24)).toBe(false)
    expect(childSizeFits(sko(26), 62, 24)).toBe(false)
  })

  it('mäter skor mot skostorleken, inte mot klädstorleken', () => {
    // Klädstorleken är helt fel skala för en sko – den får inte spilla över.
    expect(childSizeFits(sko(24), null, 24)).toBe(true)
    expect(childSizeFits(sko(40), 62, 24)).toBe(false)
  })
})

describe('extraAlreadyPacked', () => {
  const packat = [{ name: 'Grön pyjamasoverall' }, { name: 'Regnjacka' }]

  it('döljer "Pyjamas" ur glöm-inte när sovkläder redan är packade', () => {
    // Det rapporterade fallet: pyjamasen låg både i plagglistan och i extras.
    expect(extraAlreadyPacked('Pyjamas', packat, true)).toBe(true)
    expect(extraAlreadyPacked('Nattlinne', packat, true)).toBe(true)
  })

  it('behåller sovkläder i glöm-inte när inga är packade', () => {
    expect(extraAlreadyPacked('Pyjamas', [{ name: 'Regnjacka' }], false)).toBe(false)
  })

  it('döljer saker som matchar ett packat plaggnamn', () => {
    expect(extraAlreadyPacked('Regnjacka', packat)).toBe(true)
  })

  it('behåller saker som inte är packade', () => {
    expect(extraAlreadyPacked('Solkräm', packat, true)).toBe(false)
    expect(extraAlreadyPacked('Napp', packat, true)).toBe(false)
  })

  it('låter korta plaggnamn inte svälja godtycklig text', () => {
    expect(extraAlreadyPacked('Solkräm', [{ name: 'Sko' }])).toBe(false)
  })
})

describe('childSizeFits – "får bära ett steg större"', () => {
  // EU_CHILD_SIZES: … 56, 62, 68 … Barnet är 62.
  const plagg = (cm: number) => ({ size_cm: cm, shoe_size: null })

  it('blockerar nästa storlek när reglaget är av', () => {
    expect(childSizeFits(plagg(68), 62, null, false)).toBe(false)
  })

  it('släpper igenom nästa storlek när reglaget är på', () => {
    expect(childSizeFits(plagg(68), 62, null, true)).toBe(true)
  })

  it('öppnar bara ETT steg, inte två', () => {
    expect(childSizeFits(plagg(74), 62, null, true)).toBe(false)
  })

  it('påverkar inte nedåtgränsen', () => {
    expect(childSizeFits(plagg(56), 62, null, true)).toBe(true)
    expect(childSizeFits(plagg(50), 62, null, true)).toBe(false)
  })

  it('gäller skor på samma sätt', () => {
    const sko = (n: number) => ({ shoe_size: n, size_cm: null })
    expect(childSizeFits(sko(25), 62, 24, false)).toBe(false)
    expect(childSizeFits(sko(25), 62, 24, true)).toBe(true)
    expect(childSizeFits(sko(26), 62, 24, true)).toBe(false)
  })

  it('är av som standard', () => {
    expect(childSizeFits(plagg(68), 62)).toBe(false)
  })
})

describe('categoryForChildGarment', () => {
  it('flyttar barnets body från Underkläder till Toppar', () => {
    expect(categoryForChildGarment('Underkläder', 'Body', 'Vit kortärmad body', true)).toBe('Toppar')
    expect(categoryForChildGarment('Underkläder', null, 'White short-sleeved bodysuit', true)).toBe('Toppar')
  })

  it('rör inte vuxnas bodys – där kan det vara underkläder', () => {
    expect(categoryForChildGarment('Underkläder', 'Body', 'Stringbody i trikå', false)).toBe('Underkläder')
  })

  it('rör inte barnets övriga underkläder', () => {
    expect(categoryForChildGarment('Underkläder', 'Strumpor', 'Ullstrumpor', true)).toBe('Underkläder')
    expect(categoryForChildGarment('Underkläder', 'Trosor', 'Trosor 3-pack', true)).toBe('Underkläder')
  })

  it('luras inte av crossbody-väskor', () => {
    // Ordgränsen är hela poängen: "Crossbody" innehåller "body" men är en väska.
    expect(categoryForChildGarment('Väskor', 'Crossbody', 'Crossbody väska', true)).toBe('Väskor')
  })

  it('rör inte bodys som redan ligger rätt', () => {
    expect(categoryForChildGarment('Toppar', 'Body', 'Mönstrad body', true)).toBe('Toppar')
  })
})

describe('CHILD_CONTEXTS', () => {
  it('mappar förälderns tillfällen till barnets vardag', () => {
    // "Jobb" och "Date" gäller föräldern – en tvååring går inte till jobbet.
    expect(CHILD_CONTEXTS['Jobb'].label).toBe('Förskola/vardag')
    expect(CHILD_CONTEXTS['Date'].label).toBe('Ledig')
  })

  it('släpper igenom tillfällen som betyder samma sak för barn', () => {
    expect(CHILD_CONTEXTS['Fest'].label).toBe('Fest/kalas')
    expect(CHILD_CONTEXTS['Aktiv'].label).toBe('Aktiv')
    expect(CHILD_CONTEXTS['Skola'].label).toBe('Skola')
  })

  it('har en post för varje tillfälle i OUTFIT_CONTEXTS', () => {
    // Läggs ett nytt tillfälle till ska det synas här och inte tyst falla
    // tillbaka på Ledig.
    for (const c of OUTFIT_CONTEXTS) {
      expect(CHILD_CONTEXTS[c.label]).toBeDefined()
    }
  })

  it('nämner alltid bekvämlighet – barn ska kunna leka i det', () => {
    for (const k of Object.keys(CHILD_CONTEXTS)) {
      expect(CHILD_CONTEXTS[k].logic).toMatch(/bekväm|leka|rör|praktisk/i)
    }
  })
})

describe('lokaliserad sifferformatering', () => {
  // Regressionsskydd: formatWithCurrency hårdkodade 'sv-SE', vilket gav svensk
  // gruppering i fyra av fem språk. Testar Intl-beteendet vi förlitar oss på.
  const n = 1234567
  it('grupperar olika per språk', () => {
    expect(n.toLocaleString('sv-SE')).not.toBe(n.toLocaleString('de-DE'))
    expect(n.toLocaleString('de-DE')).not.toBe(n.toLocaleString('en-GB'))
  })

  it('localeFor ger en egen locale per språk', () => {
    const locales = ['sv', 'en', 'de', 'es', 'fr'].map(localeFor)
    expect(new Set(locales).size).toBe(5)
  })

  it('faller tillbaka på svenska för okänt språk', () => {
    expect(localeFor('xx')).toBe('sv-SE')
  })
})
