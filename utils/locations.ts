import { supabase } from '../supabase'

export type Location = { id: string; name: string; is_archive: boolean; sort_order: number }

// Standardplatser som seedas första gången (går att ändra/ta bort sedan).
const DEFAULTS: { name: string; is_archive: boolean }[] = [
  { name: 'Garderoben', is_archive: false },
  { name: 'Källaren', is_archive: true },
  { name: 'Vinden', is_archive: true },
  { name: 'Förrådet', is_archive: true },
  { name: 'Utlånad', is_archive: false },
]

// Hämtar användarens platser. Seedar standardlistan om användaren saknar platser.
export async function fetchLocations(): Promise<Location[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  let { data } = await supabase.from('locations').select('*').eq('user_id', user.id).order('sort_order', { ascending: true })
  if (!data || data.length === 0) {
    const rows = DEFAULTS.map((d, i) => ({ user_id: user.id, name: d.name, is_archive: d.is_archive, sort_order: i }))
    await supabase.from('locations').insert(rows)
    const res = await supabase.from('locations').select('*').eq('user_id', user.id).order('sort_order', { ascending: true })
    data = res.data
  }
  return (data || []) as Location[]
}
