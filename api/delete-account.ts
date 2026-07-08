import { createClient } from '@supabase/supabase-js'
import { json, requireUser } from './_utils'

export const config = { runtime: 'edge' }

// Raderar användarens konto och all tillhörande data (GDPR / butikskrav).
// Kräver SUPABASE_SERVICE_ROLE_KEY som miljövariabel på servern.
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
    // Samla ihop lagrade bildsökvägar innan raderna raderas.
    const paths = new Set<string>([`avatars/avatar-${userId}.jpg`])
    for (const table of ['garments', 'wishlist', 'moodboard'] as const) {
      const { data } = await admin.from(table).select('image_url').eq('user_id', userId)
      for (const row of data || []) {
        const match = (row.image_url || '').match(/\/storage\/v1\/object\/(?:public|sign)\/garments\/([^?]+)/)
        if (match) paths.add(decodeURIComponent(match[1]))
      }
    }

    for (const table of ['outfit_calendar', 'outfits', 'collages', 'wishlist', 'moodboard', 'garments', 'profiles'] as const) {
      const column = table === 'profiles' ? 'id' : 'user_id'
      const { error } = await admin.from(table).delete().eq(column, userId)
      if (error && error.code !== '42P01') throw new Error(`Kunde inte radera ${table}: ${error.message}`)
    }

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
