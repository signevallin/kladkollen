// Barnstorlekar för familjeläget. Svensk/EU-skala = längd i cm i en ren,
// stigande skala, vilket gör "närmar sig storlek"-logiken enkel (spec §2).

export const EU_CHILD_SIZES = [
  50, 56, 62, 68, 74, 80, 86, 92, 98, 104, 110,
  116, 122, 128, 134, 140, 146, 152, 158, 164, 170,
] as const

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
const AGE_MONTH: Record<string, string> = { sv: 'mån', en: 'mo', de: 'Mon.', fr: 'mois' }
const AGE_YEAR: Record<string, string> = { sv: 'år', en: 'yr', de: 'J.', fr: 'ans' }

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
