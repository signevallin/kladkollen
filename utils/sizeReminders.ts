import {
  ageYearsFromBirthdate, growthCmPerMonth, sizeIndex, suggestedSizeCm,
  shoeGrowthPerMonth, shoeSizeIndex, suggestedShoeSize,
} from './childSize'

// Säsongssmart storlekspåminnelse (spec §2): korsa barnets storlek över tid ×
// plaggets säsong × plaggtyp. Ren logik → enkel att testa.

const SEASON_START_MONTH: Record<string, number> = { 'Vår': 3, 'Sommar': 6, 'Höst': 9, 'Vinter': 12 }
const ALL_SEASON = 'Alla årstider'

export function seasonForMonth(month1to12: number): string {
  if (month1to12 === 12 || month1to12 <= 2) return 'Vinter'
  if (month1to12 <= 5) return 'Vår'
  if (month1to12 <= 8) return 'Sommar'
  return 'Höst'
}

// Nästa datum (>= from) då en säsong börjar.
function nextSeasonStart(season: string, from: Date): Date {
  const m = SEASON_START_MONTH[season]
  if (!m) return from
  let d = new Date(from.getFullYear(), m - 1, 1)
  if (d < from) d = new Date(from.getFullYear() + 1, m - 1, 1)
  return d
}

export type ReminderGarment = {
  id: string
  name: string
  image_url: string | null
  location: string | null
  season: string | null      // komma-separerad, t.ex. "Vår, Sommar"
  size_cm: number | null
  shoe_size: number | null   // EU-nummer; sätts i stället för size_cm på skor
  status: string | null      // 'in_use' | 'stored' | 'outgrown'
  person_id: string | null
}

export type ReminderChild = {
  id: string
  name: string
  birthdate: string | null
  current_size_cm: number | null
  current_shoe_size: number | null
}

export type SizeReminder = {
  garmentId: string
  childId: string
  childName: string
  garmentName: string
  sizeCm: number             // plaggets storlek i sin egen skala (cm eller EU-nummer)
  isShoe: boolean            // avgör hur sizeCm ska presenteras
  location: string | null
  imageUrl: string | null
  monthsToFit: number
  readyDate: string          // ISO (YYYY-MM-DD)
  seasonOk: boolean
  season: string | null      // relevant säsong att vänta på (null = alla årstider)
  state: 'ready' | 'upcoming' | 'waiting_season'
}

const READY_WINDOW_DAYS = 45  // ~4–6 veckor före passform → "redo att ta fram"

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)
}

// Formaterar i LOKAL tid, inte UTC. Datumen här byggs lokalt – nextSeasonStart
// ger new Date(år, månad, 1), alltså lokal midnatt – och toISOString() hade då
// backat till föregående dygn i alla tidszoner öster om Greenwich. 1 juni blev
// "2027-05-31", så ett sommarplagg fick ett readyDate som låg i maj: fel dag,
// fel månad och fel säsong i det som visas för användaren.
function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Räknar ut vilka sparade plagg som snart passar vilket barn, i rätt säsong.
 * Returnerar sorterat: mest brådskande (redo nu) först.
 */
export function computeSizeReminders(
  garments: ReminderGarment[],
  children: ReminderChild[],
  now: Date = new Date(),
): SizeReminder[] {
  const out: SizeReminder[] = []

  for (const child of children) {
    // Barnets aktuella mått i båda skalorna: satt värde, annars gissat från ålder.
    const cCm = child.current_size_cm ?? suggestedSizeCm(child.birthdate)
    const cShoe = child.current_shoe_size ?? suggestedShoeSize(child.birthdate)
    const ageYears = ageYearsFromBirthdate(child.birthdate) ?? 4

    for (const g of garments) {
      if (g.status === 'outgrown') continue
      // Öronmärkt för ett annat barn → hoppa över. Omärkt = valfritt barn.
      if (g.person_id && g.person_id !== child.id) continue

      // Skor och kläder mäts i olika skalor. Välj rätt skala per plagg i
      // stället för att duplicera hela loopen – resten av resonemanget
      // (storlekssteg, säsong, beredskapsfönster) är identiskt för båda.
      const isShoe = g.shoe_size != null
      const gSize = isShoe ? g.shoe_size : g.size_cm
      const cSize = isShoe ? cShoe : cCm
      if (gSize == null || cSize == null) continue

      const idxOf = isShoe ? shoeSizeIndex : sizeIndex
      const growth = isShoe ? shoeGrowthPerMonth(ageYears) : growthCmPerMonth(ageYears)

      const steps = idxOf(gSize) - idxOf(cSize)
      // Kandidat om plagget är 0–2 storlekssteg STÖRRE (snart, inte om år).
      if (steps < 0 || steps > 2) continue

      const monthsToFit = Math.max(0, (gSize - cSize) / growth)
      const fitDate = new Date(now.getTime() + monthsToFit * 30.44 * 24 * 60 * 60 * 1000)

      const seasons = (g.season || '').split(',').map(s => s.trim()).filter(Boolean)
      const allSeason = seasons.length === 0 || seasons.includes(ALL_SEASON)

      let seasonOk = true
      let readyDate = fitDate
      let season: string | null = null

      if (!allSeason) {
        const fitSeason = seasonForMonth(fitDate.getMonth() + 1)
        if (seasons.includes(fitSeason)) {
          seasonOk = true
          season = fitSeason
        } else {
          // Fel säsong när det passar → skjut fram till plaggets nästa säsong.
          seasonOk = false
          let best: Date | null = null
          for (const s of seasons) {
            const start = nextSeasonStart(s, fitDate)
            if (!best || start < best) { best = start; season = s }
          }
          readyDate = best ?? fitDate
        }
      }

      const state: SizeReminder['state'] =
        daysBetween(now, readyDate) <= READY_WINDOW_DAYS ? 'ready'
          : !seasonOk ? 'waiting_season'
            : 'upcoming'

      out.push({
        garmentId: g.id,
        childId: child.id,
        childName: child.name,
        garmentName: g.name,
        sizeCm: gSize,
        isShoe,
        location: g.location,
        imageUrl: g.image_url,
        monthsToFit,
        readyDate: toISODate(readyDate),
        seasonOk,
        season,
        state,
      })
    }
  }

  const order = { ready: 0, upcoming: 1, waiting_season: 2 }
  return out.sort((a, b) =>
    order[a.state] - order[b.state] || a.readyDate.localeCompare(b.readyDate))
}
