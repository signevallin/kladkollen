import { supabase } from '../supabase'

export type Partner = { id: string; name: string; avatar_url: string | null }

// Laddar inloggad användares id och ev. partner (den andra medlemmen i hushållet).
// Returnerar partner=null om man inte är ihopkopplad.
export async function loadPartner(): Promise<{ myId: string | null; partner: Partner | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { myId: null, partner: null }
  const { data: mem } = await supabase.from('household_members').select('user_id')
  if (!mem || mem.length < 2) return { myId: user.id, partner: null }
  const partnerId = mem.map((m: any) => m.user_id).find((id: string) => id !== user.id)
  if (!partnerId) return { myId: user.id, partner: null }
  const { data: prof } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', partnerId).single()
  return {
    myId: user.id,
    partner: { id: partnerId, name: prof?.name || 'Partner', avatar_url: prof?.avatar_url || null },
  }
}
