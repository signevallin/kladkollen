// Barnstorlekar för familjeläget. Svensk/EU-skala = längd i cm i en ren,
// stigande skala, vilket gör "närmar sig storlek"-logiken enkel (spec §2).

export const EU_CHILD_SIZES = [
  50, 56, 62, 68, 74, 80, 86, 92, 98, 104, 110,
  116, 122, 128, 134, 140, 146, 152, 158, 164, 170,
] as const

// Vilket steg på storleksstegen ett mått hamnar på. Delas av
// storlekspåminnelserna och outfit-filtret så "passar nu" betyder samma sak i
// hela appen – de hade tidigare var sin definition och sa emot varandra.
export function sizeIndex(cm: number): number {
  return (EU_CHILD_SIZES as readonly number[]).indexOf(nearestSize(cm))
}

// Ungefärlig tillväxt per månad efter ålder (spec §5, tillväxtmodell v1).
const GROWTH_CM_PER_MONTH: { maxAgeYears: number; cmPerMonth: number }[] = [
  { maxAgeYears: 1, cmPerMonth: 2.0 },
  { maxAgeYears: 2, cmPerMonth: 1.0 },
  { maxAgeYears: 4, cmPerMonth: 0.7 },
  { maxAgeYears: 8, cmPerMonth: 0.5 },
  { maxAgeYears: 12, cmPerMonth: 0.4 },
  { maxAgeYears: Infinity, cmPerMonth: 0.3 },
]

export function growthCmPerMonth(ageYears: number): number {
  return (GROWTH_CM_PER_MONTH.find(g => ageYears < g.maxAgeYears) ?? GROWTH_CM_PER_MONTH[GROWTH_CM_PER_MONTH.length - 1]).cmPerMonth
}

// Ålder i år (kan vara decimal) från ett ÅÅÅÅ-MM-DD-datum. null om ogiltigt.
export function ageYearsFromBirthdate(birthdate?: string | null): number | null {
  if (!birthdate) return null
  const d = new Date(birthdate)
  if (isNaN(d.getTime())) return null
  const ms = Date.now() - d.getTime()
  if (ms < 0) return null
  return ms / (365.25 * 24 * 60 * 60 * 1000)
}

// Snygg åldersetikett: "8 mån" för spädbarn, annars "3 år".
// Åldersenheter per språk. Lägg till en rad när ett nytt språk läggs till.
const AGE_MONTH: Record<string, string> = { sv: 'mån', en: 'mo', de: 'Mon.', es: 'mes', fr: 'mois' }
const AGE_YEAR: Record<string, string> = { sv: 'år', en: 'yr', de: 'J.', es: 'años', fr: 'ans' }

export function formatAge(birthdate?: string | null, lang: string = 'sv'): string | null {
  const years = ageYearsFromBirthdate(birthdate)
  if (years == null) return null
  if (years < 1) {
    const months = Math.max(0, Math.round(years * 12))
    return `${months} ${AGE_MONTH[lang] || AGE_MONTH.sv}`
  }
  return `${Math.floor(years)} ${AGE_YEAR[lang] || AGE_YEAR.sv}`
}

// Ungefärlig barnlängd (cm) vid en viss ålder, för att gissa startstorlek.
// Grov modell: 50 cm vid födsel, sedan ackumulerad tillväxt per åldersspann.
function estimatedHeightCm(ageYears: number): number {
  let cm = 50
  let remaining = ageYears
  let prevMax = 0
  for (const band of GROWTH_CM_PER_MONTH) {
    const bandYears = Math.min(remaining, band.maxAgeYears - prevMax)
    if (bandYears <= 0) break
    cm += bandYears * 12 * band.cmPerMonth
    remaining -= bandYears
    prevMax = band.maxAgeYears
    if (remaining <= 0) break
  }
  return cm
}

// Närmaste EU-storlek till ett cm-värde.
export function nearestSize(cm: number): number {
  return EU_CHILD_SIZES.reduce((best, s) => (Math.abs(s - cm) < Math.abs(best - cm) ? s : best), EU_CHILD_SIZES[0])
}

// Förslag på aktuell storlek utifrån ålder – användaren bekräftar bara (spec §4).
export function suggestedSizeCm(birthdate?: string | null): number | null {
  const years = ageYearsFromBirthdate(birthdate)
  if (years == null) return null
  return nearestSize(estimatedHeightCm(years))
}

// Vilken storlek barnet har vid ett FRAMTIDA datum. En resa packas för den dag
// kläderna faktiskt ska bäras, inte för idag: under ett år växer ett barn ~2
// cm/mån och storlekarna ligger 6 cm isär, alltså ett storlekssteg var tredje
// månad. Packar man en resa två månader fram med dagens storlek blir kläderna
// för små på plats. Bakåt i tiden justeras inget – då gäller nuvarande storlek.
export function sizeCmAtDate(
  currentCm: number | null,
  birthdate: string | null | undefined,
  when: Date,
  now: Date = new Date(),
): number | null {
  if (currentCm == null) return null
  const months = (when.getTime() - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
  if (!Number.isFinite(months) || months <= 0) return currentCm
  const years = ageYearsFromBirthdate(birthdate) ?? 4
  return nearestSize(currentCm + months * growthCmPerMonth(years))
}

// Nästa/föregående storlek i skalan (för "bumpa till 92"-knappen).
export function nextSize(cm: number): number {
  const sizes = EU_CHILD_SIZES as readonly number[]
  const i = sizes.indexOf(nearestSize(cm))
  return sizes[Math.min(i + 1, sizes.length - 1)]
}

export function prevSize(cm: number): number {
  const sizes = EU_CHILD_SIZES as readonly number[]
  const i = sizes.indexOf(nearestSize(cm))
  return sizes[Math.max(i - 1, 0)]
}

// ── SKOSTORLEKAR ──────────────────────────────────────────────────────────
// Skor mäts i EU-nummer, inte i kroppslängd. Modellen speglar klädernas
// medvetet (samma funktionsnamn med Shoe-suffix) så storlekspåminnelser och
// "passar nu"-filtret kan behandla båda dimensionerna med samma logik.

export const EU_SHOE_SIZES = [
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
  33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
] as const

// Fötter växer i EU-nummer per månad. Snabbast första året, sedan avtagande,
// och i praktiken stilla efter ~14. Grov modell i samma anda som
// GROWTH_CM_PER_MONTH – tillräcklig för "ungefär när blir de för små", inte
// för att förutsäga en exakt månad.
// Kalibrerad mot kända EU-skostorlekar per ålder (16 vid födsel, ~20,5 vid 1 år,
// 25,5 vid 3, 29,5 vid 6, 34 vid 10, 39 vid 14). Största avvikelse 0,3 storlekar
// över hela spannet. En tidigare gissad uppsättning låg upp till 8 storlekar fel
// – kontrollera alltid mot referensvärden om siffrorna ändras.
const SHOE_GROWTH_PER_MONTH: { maxAgeYears: number; sizesPerMonth: number }[] = [
  { maxAgeYears: 1,        sizesPerMonth: 0.375 },
  { maxAgeYears: 3,        sizesPerMonth: 0.21  },
  { maxAgeYears: 6,        sizesPerMonth: 0.11  },
  { maxAgeYears: 10,       sizesPerMonth: 0.095 },
  { maxAgeYears: 14,       sizesPerMonth: 0.105 },
  { maxAgeYears: Infinity, sizesPerMonth: 0.02  },
]

export function shoeGrowthPerMonth(ageYears: number): number {
  return (SHOE_GROWTH_PER_MONTH.find(g => ageYears < g.maxAgeYears)
    ?? SHOE_GROWTH_PER_MONTH[SHOE_GROWTH_PER_MONTH.length - 1]).sizesPerMonth
}

/** Närmaste EU-skostorlek till ett godtyckligt tal. */
export function nearestShoeSize(size: number): number {
  return EU_SHOE_SIZES.reduce(
    (best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best),
    EU_SHOE_SIZES[0],
  )
}

/** Vilket steg på skoskalan en storlek hamnar på. */
export function shoeSizeIndex(size: number): number {
  return (EU_SHOE_SIZES as readonly number[]).indexOf(nearestShoeSize(size))
}

// Ungefärlig skostorlek vid en viss ålder – för att gissa startvärde.
// Nyfödd ligger runt 16–17 och växer sedan enligt modellen ovan.
function estimatedShoeSize(ageYears: number): number {
  let size = 16
  let remaining = ageYears
  let prevMax = 0
  for (const band of SHOE_GROWTH_PER_MONTH) {
    const bandYears = Math.min(remaining, band.maxAgeYears - prevMax)
    if (bandYears <= 0) break
    size += bandYears * 12 * band.sizesPerMonth
    remaining -= bandYears
    prevMax = band.maxAgeYears
    if (remaining <= 0) break
  }
  return size
}

/** Förslag på aktuell skostorlek utifrån ålder – användaren bekräftar bara. */
export function suggestedShoeSize(birthdate?: string | null): number | null {
  const years = ageYearsFromBirthdate(birthdate)
  if (years == null) return null
  return nearestShoeSize(estimatedShoeSize(years))
}

/**
 * Vilken skostorlek barnet har vid ett FRAMTIDA datum. Samma resonemang som
 * sizeCmAtDate: en resa packas för den dag skorna ska bäras. Bakåt i tiden
 * justeras inget.
 */
export function shoeSizeAtDate(
  currentSize: number | null,
  birthdate: string | null | undefined,
  when: Date,
  now: Date = new Date(),
): number | null {
  if (currentSize == null) return null
  const months = (when.getTime() - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
  if (!Number.isFinite(months) || months <= 0) return currentSize
  const years = ageYearsFromBirthdate(birthdate) ?? 4
  return nearestShoeSize(currentSize + months * shoeGrowthPerMonth(years))
}

/** Nästa/föregående storlek i skoskalan. */
export function nextShoeSize(size: number): number {
  const sizes = EU_SHOE_SIZES as readonly number[]
  return sizes[Math.min(shoeSizeIndex(size) + 1, sizes.length - 1)]
}

export function prevShoeSize(size: number): number {
  const sizes = EU_SHOE_SIZES as readonly number[]
  return sizes[Math.max(shoeSizeIndex(size) - 1, 0)]
}
