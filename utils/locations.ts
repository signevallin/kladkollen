import { supabase } from '../supabase'
import { translate } from './i18n'
import { getApiLang } from './api'

export type Location = { id: string; name: string; is_archive: boolean; sort_order: number }

// Standardplatser som seedas första gången (går att ändra/ta bort sedan).
const DEFAULTS: { name: string; is_archive: boolean }[] = [
  { name: 'Garderoben', is_archive: false },
  { name: 'Källaren', is_archive: true },
  { name: 'Vinden', is_archive: true },
  { name: 'Förrådet', is_archive: true },
  { name: 'Utlånad', is_archive: false },
]

// Slår ihop samtidiga anrop så standardplatserna inte seedas två gånger. Flera
// skärmar hämtar platser (add-garment kör t.o.m. två anrop vid öppning), och en
// ny användare med noll platser fick då dubbel-seed → dubbletter i listan.
let inflight: Promise<Location[]> | null = null

export function fetchLocations(): Promise<Location[]> {
  if (inflight) return inflight
  inflight = doFetch().finally(() => { inflight = null })
  return inflight
}

async function doFetch(): Promise<Location[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let { data } = await supabase.from('locations').select('*').eq('user_id', user.id).order('sort_order', { ascending: true })
  if (!data || data.length === 0) {
    // Seeda på användarens språk – platsnamnen är redigerbar data, och arkiv-/
    // hemlogiken utgår från is_archive-flaggan (inte namnet), så det är säkert.
    const lang = getApiLang()
    const rows = DEFAULTS.map((d, i) => ({ user_id: user.id, name: translate(lang, d.name), is_archive: d.is_archive, sort_order: i }))
    await supabase.from('locations').insert(rows)
    const res = await supabase.from('locations').select('*').eq('user_id', user.id).order('sort_order', { ascending: true })
    data = res.data
  }
  return dedupe((data || []) as Location[])
}

// Tar bort ev. dubbletter (samma namn) som uppstått vid tidigare samtidiga
// seed-anrop: behåll den första, radera resten. Självläker gamla konton.
// Plagg refererar plats via NAMN (inte id), så inget plagg tappar sin plats.
function dedupe(rows: Location[]): Location[] {
  const seen = new Set<string>()
  const keep: Location[] = []
  const dupeIds: string[] = []
  for (const l of rows) {
    const key = (l.name || '').trim().toLowerCase()
    if (seen.has(key)) dupeIds.push(l.id)
    else { seen.add(key); keep.push(l) }
  }
  if (dupeIds.length) {
    supabase.from('locations').delete().in('id', dupeIds).then(() => {}, () => {})
  }
  return keep
}
