import { supabase } from '../supabase'

export type Partner = {
  id: string
  name: string
  avatar_url: string | null
  cold_sensitivity: number
  // Rå färganalys; kör den genom colorPalettePrompt() för promptsträngen.
  color_analysis: unknown | null
  // Vald stil (Profil → Stil), kommaseparerad.
  style_prefs: string
}

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
    partner: {
      id: partnerId,
      name: p?.name || 'Partner',
      avatar_url: p?.avatar_url || null,
      // Partnerns egen köldkänslighet – familjeoutfits antog tidigare 3 för
      // alla vuxna, så en lättfrusen partner fick samma lager som alla andra.
      cold_sensitivity: typeof p?.cold_sensitivity === 'number' ? p.cold_sensitivity : 3,
      color_analysis: p?.color_analysis ?? null,
      style_prefs: p?.style_prefs || '',
    },
  }
}
