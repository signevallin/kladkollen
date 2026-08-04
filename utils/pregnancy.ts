// Hjälpare för gravidläget. Räknar ut trimester ur beräknat födelsedatum (BF)
// och bygger den text som skickas till AI:n så outfits blir magvänliga.
// Ren logik (ingen React/native) – testbar och återanvändbar server/klient.

export type Trimester = 1 | 2 | 3

// En graviditet är ~40 veckor. Utifrån BF räknar vi ut nuvarande graviditetsvecka
// och därmed trimester. Returnerar null om datum saknas eller ligger orimligt
// långt bort (så vi inte gissar fel på ett feltryckt datum).
export function trimesterFromDueDate(dueDate: string | null | undefined, now: Date = new Date()): Trimester | null {
  if (!dueDate) return null
  const due = new Date(dueDate + 'T00:00:00')
  if (isNaN(due.getTime())) return null
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksUntilDue = (due.getTime() - now.getTime()) / msPerWeek
  const gestationWeek = 40 - weeksUntilDue
  // Rimlighetsfönster: strax efter positivt test till strax över tiden.
  if (gestationWeek < 3 || gestationWeek > 43) return null
  if (gestationWeek <= 13) return 1
  if (gestationWeek <= 27) return 2
  return 3
}

// Svensk etikett för UI (t.ex. "Andra trimestern").
export function trimesterLabel(tri: Trimester | null): string {
  switch (tri) {
    case 1: return 'Första trimestern'
    case 2: return 'Andra trimestern'
    case 3: return 'Tredje trimestern'
    default: return ''
  }
}

// Instruktion till stylist-AI:n. Tom sträng när läget är av, så prompten inte
// påverkas alls för icke-gravida.
export function pregnancyPromptContext(pregnant: boolean, tri: Trimester | null): string {
  if (!pregnant) return ''
  const triNote =
    tri === 1 ? 'Tidig graviditet – magen syns oftast inte än, men kläderna kan börja spänna kring midjan.'
    : tri === 2 ? 'Magen växer tydligt – prioritera plagg med plats över magen.'
    : tri === 3 ? 'Stor mage – välj det mest töjbara och bekväma, undvik allt som stramar.'
    : 'Anpassa för en växande mage.'
  return [
    'GRAVIDANPASSNING (VIKTIGT): Användaren är gravid.',
    triNote,
    'Välj bekväma, magvänliga plagg: töjbara/mjuka material, plats över magen,',
    '(t.ex. empire-linje, omlott, oversize, resår i midjan). Undvik hårt sittande',
    'midjor och stramande plagg. Lager-på-lager är bra eftersom kroppstemperaturen',
    'ofta svänger. Finns gravid-/amningsvänliga plagg i garderoben – prioritera dem.',
  ].join(' ')
}
