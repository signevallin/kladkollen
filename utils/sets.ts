import { supabase } from '../supabase'

// Hjälpare för "set" – grupper av plagg som hör ihop. Ett plagg tillhör högst
// ett set (garments.set_id). Set:en är personliga (RLS på user_id).

export type GarmentSet = { id: string; name: string }
export type SetMember = { id: string; name: string; image_url: string | null; subcategory: string | null; color: string | null }

export async function fetchSets(): Promise<GarmentSet[]> {
  const { data } = await supabase.from('garment_sets').select('id, name').order('created_at', { ascending: false })
  return (data as GarmentSet[]) || []
}

// Skapar ett nytt set ägt av inloggad användare. Returnerar setet eller null.
export async function createSet(name: string): Promise<GarmentSet | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('garment_sets')
    .insert({ user_id: user.id, name: name.trim() || 'Set' })
    .select('id, name')
    .single()
  if (error) return null
  return data as GarmentSet
}

// Kopplar (eller frikopplar med null) ett plagg till ett set.
export async function setGarmentSet(garmentId: string, setId: string | null): Promise<boolean> {
  const { error } = await supabase.from('garments').update({ set_id: setId }).eq('id', garmentId)
  return !error
}

// Hämtar plaggen i ett set (ej arkiverade).
export async function fetchSetMembers(setId: string): Promise<SetMember[]> {
  const { data } = await supabase
    .from('garments')
    .select('id, name, image_url, subcategory, color')
    .eq('set_id', setId)
    .eq('archived', false)
  return (data as SetMember[]) || []
}
