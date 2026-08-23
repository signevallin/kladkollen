import { supabase } from '../supabase'
import type { ReminderGarment } from './sizeReminders'

export type Person = {
  id: string
  household_id: string
  type: 'child' | 'adult'
  name: string
  birthdate: string | null
  gender: string | null
  current_size_cm: number | null
  size_updated_at: string | null
  // Skostorlek i EU-nummer. Egen dimension eftersom fötter varken mäts i
  // kroppslängd eller växer i samma takt som barnet i övrigt.
  current_shoe_size: number | null
  shoe_size_updated_at: string | null
  avatar_url: string | null
  // 1–5, 3 = lagom. Samma skala som profiles.cold_sensitivity. Justerar den
  // upplevda temperaturen i outfit-genereringen – och därmed mössgränsen.
  cold_sensitivity: number | null
  // NULL = inte angivet → åldersgissning används. Styr om outfiten kräver skor.
  walks: boolean | null
  // Barnet ska kunna dra ner plagget själv → inga hängselbyxor, bodys, knappgylf.
  potty_training: boolean
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
  avatar_url?: string | null
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
      avatar_url: child.avatar_url || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Person
}

// Fält som går att ändra på en befintlig person. Egen typ i stället för
// Partial<NewChild>: den saknar cold_sensitivity/walks/potty_training, vilket
// tvingade fram `as any` på varje anropsställe – och därmed lät felstavade
// kolumnnamn passera tyst förbi typkollen.
export type PersonPatch = Partial<{
  name: string
  birthdate: string | null
  gender: string | null
  current_size_cm: number | null
  current_shoe_size: number | null
  avatar_url: string | null
  cold_sensitivity: number
  walks: boolean | null
  potty_training: boolean
}>

export async function updatePerson(id: string, patch: PersonPatch): Promise<void> {
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

// Plagg med angiven barnstorlek (underlag för storlekspåminnelserna).
export async function loadSizedGarments(): Promise<ReminderGarment[]> {
  const { data, error } = await supabase
    .from('garments')
    // Skor mäts i shoe_size i stället för size_cm. Filtret måste släppa igenom
    // BÅDA, annars faller alla skor bort ur påminnelserna.
    .select('id, name, image_url, location, season, size_cm, shoe_size, status, person_id')
    .or('size_cm.not.is.null,shoe_size.not.is.null')
  if (error) throw error
  return (data ?? []) as ReminderGarment[]
}
