import { supabase } from '../supabase'
import { newImageId } from './id'

const BUCKET = 'garments'

/**
 * Laddar upp bytes till den INLOGGADE användarens egna mapp ({userId}/...).
 * Path-prefixet + storage-policies (se migration) gör att en användare bara kan
 * skriva i sin egen mapp – ingen kan skriva över någon annans bilder.
 * Returnerar en publik URL.
 */
export async function uploadUserImage(bytes: Uint8Array, ext: string, contentType: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Inte inloggad')
  const path = `${user.id}/${newImageId()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

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

// Bild-transformation (kräver betald Supabase-plan). Låter servern skicka en
// nedskalad version så att en liten miniatyr inte drar ner hela originalet –
// gäller även redan uppladdade bilder, utan ombuild.
export type ImageTransform = {
  width?: number
  height?: number
  resize?: 'cover' | 'contain' | 'fill'
  quality?: number
  // 'origin' behåller originalformatet – viktigt för urklippta plagg så att
  // transparensen bevaras (annars kan en platta läggas bakom).
  format?: 'origin'
}

/**
 * Synkron variant – eftersom bucketen är publik behövs inget nätverksanrop.
 * Används i SignedImage så bilder får sin URL direkt vid render, utan en tom
 * ruta + extra omrendering per bild (märkbart i stora rutnät).
 *
 * Med `transform` returneras en render-URL som serverar en nedskalad bild.
 */
export function imageUrl(value: string, transform?: ImageTransform): string {
  const path = storagePathFrom(value)
  if (!path) return value
  const hasTransform = !!transform && (transform.width != null || transform.height != null)
  return supabase.storage
    .from(BUCKET)
    .getPublicUrl(path, hasTransform ? { transform } : undefined).data.publicUrl
}
