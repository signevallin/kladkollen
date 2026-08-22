import { supabase } from '../supabase'
import { newImageId } from './id'

const BUCKET = 'garments'

/**
 * Laddar upp bytes till den INLOGGADE användarens egna mapp ({userId}/...).
 *
 * Path-prefixet kontrolleras av storage-policies (20260823_storage_owner_policies.sql):
 * insert/update/delete kräver att första mappnivån är den egna user_id:n, så
 * ingen kan skriva över eller radera någon annans bilder.
 *
 * Returnerar SÖKVÄGEN (inte en URL). Bucketen är privat – visningsbara URL:er
 * signeras vid behov via utils/signedUrls. storagePathFrom() nedan hanterar
 * fortfarande äldre rader som lagrar en full publik URL.
 */
export async function uploadUserImage(bytes: Uint8Array, ext: string, contentType: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Inte inloggad')
  const path = `${user.id}/${newImageId()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true })
  if (error) throw error
  return path
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
