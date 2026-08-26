import { createClient } from '@supabase/supabase-js'
import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Raderar användarens konto och all tillhörande data (GDPR art. 17 / butikskrav).
// Kräver SUPABASE_SERVICE_ROLE_KEY som miljövariabel på servern.

// storage.list() returnerar max 100 poster per anrop (Supabase-default). En
// användare med fler bilder än så skulle annars lämna kvar resten i lagringen.
const PAGE = 1000

async function listAllPaths(admin: any, folder: string): Promise<string[]> {
  const out: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from('garments').list(folder, { limit: PAGE, offset })
    if (error || !data?.length) break
    for (const f of data) out.push(`${folder}/${f.name}`)
    if (data.length < PAGE) break
  }
  return out
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Serverkonfiguration för kontoradering saknas' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const userId = auth.id

  try {
    // ── 1. Samla bildsökvägar innan raderna försvinner ───────────────────
    // Legacy: äldre bilder låg under avatars/ resp. public/. Nya bilder ligger
    // i användarens egen mapp ({userId}/...) – lista HELA mappen, sidvis.
    const paths = new Set<string>([`avatars/avatar-${userId}.jpg`])
    for (const p of await listAllPaths(admin, userId)) paths.add(p)
    for (const table of ['garments', 'wishlist', 'moodboard'] as const) {
      const { data } = await admin.from(table).select('image_url').eq('user_id', userId)
      for (const row of data || []) {
        const match = (row.image_url || '').match(/\/storage\/v1\/object\/(?:public|sign)\/garments\/([^?]+)/)
        if (match) paths.add(decodeURIComponent(match[1]))
        else if (row.image_url && !/^(https?|file|blob|data):/i.test(row.image_url)) paths.add(row.image_url)
      }
    }

    // ── 2. Hushåll: notera medlemskapen INNAN de raderas ─────────────────
    // households.created_by är "on delete set null", så hushållet överlever
    // radering av auth-användaren. people (barnens namn, födelsedatum, kön,
    // storlek) hänger på hushållet med "on delete cascade" – utan det här
    // steget blev barnuppgifterna kvar för alltid när sista medlemmen gick.
    const { data: memberships } = await admin
      .from('household_members').select('household_id').eq('user_id', userId)
    const householdIds = (memberships || []).map((m: any) => m.household_id).filter(Boolean)

    // ── 3. Radera användarens egna rader ─────────────────────────────────
    // Tabeller med "references auth.users on delete cascade" (garment_sets,
    // outfit_likes, person_outfit_calendar, entitlements, ai_quota …) städas
    // av deleteUser i steg 6 och behöver inte listas här.
    for (const table of ['outfit_calendar', 'outfits', 'collages', 'wishlist', 'moodboard', 'pending_imports', 'garments', 'locations', 'trips', 'household_members', 'profiles'] as const) {
      const column = table === 'profiles' ? 'id' : 'user_id'
      const { error } = await admin.from(table).delete().eq(column, userId)
      if (error && error.code !== '42P01') throw new Error(`Kunde inte radera ${table}: ${error.message}`)
    }

    // ── 4. Städa bort hushåll som blev tomma ─────────────────────────────
    // Kaskaderar bort people (barn), household_invites och person-kopplingar.
    // Samma regel som leave_household() använder.
    for (const hid of householdIds) {
      const { data: rest } = await admin
        .from('household_members').select('user_id').eq('household_id', hid).limit(1)
      if (!rest?.length) {
        const { error } = await admin.from('households').delete().eq('id', hid)
        if (error && error.code !== '42P01') throw new Error(`Kunde inte radera hushållet: ${error.message}`)
      }
    }
    // ── 5. Bilder och slutligen själva auth-användaren ───────────────────
    if (paths.size > 0) {
      await admin.storage.from('garments').remove([...paths])
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) throw new Error(`Kunde inte radera kontot: ${authError.message}`)

    return json({ success: true })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
