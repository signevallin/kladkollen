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
  // Läs partnerns profil via household-vaktad RPC (oberoende av profiles-RLS),
  // så namn + avatar alltid kan hämtas för en hushållsmedlem.
  const { data: prof } = await supabase.rpc('partner_profile', { target: partnerId })
  const p = Array.isArray(prof) ? prof[0] : prof
  return {
    myId: user.id,
    partner: { id: partnerId, name: p?.name || 'Partner', avatar_url: p?.avatar_url || null },
  }
}
