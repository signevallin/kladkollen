import { supabase } from '../supabase'

const BUCKET = 'garments'

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
 *
 * Bucketen är publik, så vi returnerar en stabil publik URL (ingen signering).
 * Det gör att både Supabase-CDN:n och telefonens bildcache kan återanvända
 * bilden mellan appstarter – annars skulle en ny signerad token vid varje
 * start ge cache-miss och ladda ner allt på nytt (hög egress).
 *
 * Funktionen är async för bakåtkompatibilitet med anropen; getPublicUrl gör
 * inget nätverksanrop.
 */
export async function resolveImageUrl(value: string): Promise<string> {
  return imageUrl(value)
}

/**
 * Synkron variant – eftersom bucketen är publik behövs inget nätverksanrop.
 * Används i SignedImage så bilder får sin URL direkt vid render, utan en tom
 * ruta + extra omrendering per bild (märkbart i stora rutnät).
 */
export function imageUrl(value: string): string {
  const path = storagePathFrom(value)
  if (!path) return value
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
