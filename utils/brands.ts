// Vanliga märken för autocomplete (svenska + internationella). Listan är bara
// förslag – man kan skriva vad som helst.
export const COMMON_BRANDS = [
  'H&M', 'Zara', 'COS', 'Arket', 'Weekday', 'Monki', '& Other Stories', 'Gina Tricot',
  'NA-KD', 'Nelly', 'Boozt', 'Bik Bok', 'Lindex', 'Kappahl', 'Cubus', 'Åhléns',
  'Uniqlo', 'Mango', 'Massimo Dutti', 'Ganni', 'Acne Studios', 'Filippa K', 'Rodebjer',
  'Tiger of Sweden', 'Whyred', 'Hope', 'Stylein', 'Dagmar', 'Busnel',
  'Levi\'s', 'Nudie Jeans', 'Dr. Denim', 'Carin Wester', 'Vero Moda', 'Only', 'Pieces',
  'Nike', 'Adidas', 'New Balance', 'Converse', 'Vans', 'Puma', 'Asics',
  'Ralph Lauren', 'Tommy Hilfiger', 'Calvin Klein', 'Gant', 'Lacoste', 'Fjällräven',
  'The North Face', 'Patagonia', 'Sandqvist', 'Rains', 'Stutterheim',
  'Zalando', 'ASOS', 'Sellpy', 'Vinted', 'Boozt',
]

// Normaliserad nyckel för att slå ihop stavningsvarianter (t.ex. "hm", "H & M").
export function normalizeBrand(s: string): string {
  return (s || '').toLowerCase().replace(/[\s.&'’\-]/g, '').trim()
}

// Förslag som matchar det man skriver – slår ihop egna märken och listan,
// deduplicerat på normaliserad form. Egna märken prioriteras.
export function brandSuggestions(query: string, ownBrands: string[]): string[] {
  const q = normalizeBrand(query)
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const b of [...ownBrands, ...COMMON_BRANDS]) {
    if (!b) continue
    const key = normalizeBrand(b)
    if (seen.has(key)) continue
    if (key.includes(q)) { seen.add(key); out.push(b) }
    if (out.length >= 6) break
  }
  return out
}

// Plockar ut ett numeriskt pris (SEK) ur en text som "299 kr" / "1 299,00 kr".
export function parsePrice(text: unknown): number | null {
  if (typeof text === 'number') return isFinite(text) ? text : null
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/\s/g, '').replace(',', '.')
  const m = cleaned.match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Math.round(parseFloat(m[1]))
  return isFinite(n) ? n : null
}
