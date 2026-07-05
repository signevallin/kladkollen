import { supabase } from '../supabase'

const BUCKET = 'garments'
const SIGNED_TTL_SECONDS = 60 * 60

const cache = new Map<string, { url: string; expires: number }>()

/**
 * Plockar ut storage-sökvägen ur ett lagrat värde.
 * Hanterar fulla publika/signerade Supabase-URL:er och rena sökvägar.
 * Returnerar null för lokala/externa URI:er (file:, blob:, data: eller andra domäner).
 */
export function storagePathFrom(value: string): string | null {
  const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/garments\/([^?]+)/)
  if (match) return decodeURIComponent(match[1])
  if (/^(https?|file|blob|data):/i.test(value)) return null
  return value
}

/**
 * Löser upp ett lagrat bildvärde till en visningsbar URL.
 * Bilder i vår privata bucket får en signerad URL (cachas tills strax före utgång),
 * allt annat returneras som det är.
 */
export async function resolveImageUrl(value: string): Promise<string> {
  const path = storagePathFrom(value)
  if (!path) return value

  const now = Date.now()
  const hit = cache.get(path)
  if (hit && hit.expires > now) return hit.url

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS)
  if (error || !data?.signedUrl) return value
  cache.set(path, { url: data.signedUrl, expires: now + (SIGNED_TTL_SECONDS - 300) * 1000 })
  return data.signedUrl
}
