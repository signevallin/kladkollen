import { supabase } from '../supabase'

export type Person = {
  id: string
  household_id: string
  type: 'child' | 'adult'
  name: string
  birthdate: string | null
  gender: string | null
  current_size_cm: number | null
  size_updated_at: string | null
  avatar_url: string | null
  created_at: string
}

// Alla personer i mitt hushåll (barn först, sedan efter namn). Tom lista om man
// inte har något hushåll än.
export async function loadPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('type', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Person[]
}

type NewChild = {
  name: string
  birthdate?: string | null
  gender?: string | null
  current_size_cm?: number | null
}

// Lägger till ett barn. Ser först till att ett hushåll finns (skapar ett
// solo-hushåll vid behov) så även ensamstående föräldrar kan lägga till barn.
export async function addChild(child: NewChild): Promise<Person> {
  const { data: hid, error: hErr } = await supabase.rpc('ensure_household')
  if (hErr) throw hErr
  const { data, error } = await supabase
    .from('people')
    .insert({
      household_id: hid,
      type: 'child',
      name: child.name.trim(),
      birthdate: child.birthdate || null,
      gender: child.gender || null,
      current_size_cm: child.current_size_cm ?? null,
      size_updated_at: child.current_size_cm != null ? new Date().toISOString() : null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Person
}

export async function updatePerson(id: string, patch: Partial<NewChild>): Promise<void> {
  const row: any = { ...patch }
  if ('current_size_cm' in patch) row.size_updated_at = new Date().toISOString()
  const { error } = await supabase.from('people').update(row).eq('id', id)
  if (error) throw error
}

// Sätter en ny aktuell storlek (från "bumpa"-knappen) och stämplar tiden.
export async function setChildSize(id: string, sizeCm: number): Promise<void> {
  const { error } = await supabase
    .from('people')
    .update({ current_size_cm: sizeCm, size_updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('people').delete().eq('id', id)
  if (error) throw error
}
