import { dedupOutfitItems, childSizeFits } from '../utils/outfit'

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
