import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'

// Maxbredd för bilder användaren laddar upp. 1000 px räcker för miniatyrer,
// detaljvy och dela-kort. Bredden spelar roll eftersom SignedImage medvetet
// hämtar originalet (format:'origin') – server-transformen är bortplockad av
// kostnadsskäl, så det som ligger i lagringen är också det som laddas ner.
export const UPLOAD_MAX_WIDTH = 1000

/**
 * Kodar om en base64-bild till WebP inför uppladdning, och skalar ner den om
 * den är bredare än maxWidth. Skalar ALDRIG upp.
 *
 * WebP behåller transparensen – avgörande för bakgrundsborttagna plagg – och är
 * dramatiskt mycket mindre än förlustfri PNG för fotografiskt innehåll.
 *
 * Faller tillbaka på originalet om omkodningen misslyckas: en bild som blev för
 * stor är bättre än ingen bild alls.
 */
export async function reencodeForUpload(
  base64: string,
  contentType = 'image/png',
  maxWidth?: number,
  compress = 0.8,
): Promise<{ base64: string; ext: string; contentType: string }> {
  // Filändelsen på temp-filen måste matcha innehållet – vissa avkodare går på
  // den och inte på bytesen.
  const srcExt = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const tmp = `${FileSystem.cacheDirectory}upload-${Date.now()}.${srcExt}`
  try {
    await FileSystem.writeAsStringAsync(tmp, base64, { encoding: FileSystem.EncodingType.Base64 })
    let rendered = await ImageManipulator.manipulate(tmp).renderAsync()
    if (maxWidth && rendered.width > maxWidth) {
      rendered = await ImageManipulator.manipulate(tmp).resize({ width: maxWidth }).renderAsync()
    }
    const out = await rendered.saveAsync({ compress, format: SaveFormat.WEBP, base64: true })
    if (out.base64) return { base64: out.base64, ext: 'webp', contentType: 'image/webp' }
  } catch {
    // omkodningen misslyckades – originalet används nedan
  } finally {
    await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => {})
  }
  return { base64, ext: srcExt, contentType }
}

/**
 * Kodar om en bakgrundsborttagen base64-PNG till WebP. Tunn wrapper över
 * reencodeForUpload utan nedskalning – anroparna (add-garment, garment-detail)
 * har redan skalat ner originalfotot innan bakgrunden togs bort.
 */
export async function pngToWebp(
  base64png: string,
  compress = 0.8,
): Promise<{ base64: string; ext: string; contentType: string }> {
  return reencodeForUpload(base64png, 'image/png', undefined, compress)
}

// Skalar ner en vald bild (t.ex. en avatar) till en liten WebP innan
// uppladdning. Annars lagras fullstora foton och varje liten miniatyr drar ner
// hela originalet vid visning – märkbart segt i t.ex. hushållsraden på profilen.
// Returnerar bytes redo för Supabase Storage. Faller tillbaka på originalet vid fel.
export async function downscaleForUpload(
  uri: string,
  maxWidth = 512,
  compress = 0.8,
): Promise<{ bytes: Uint8Array; ext: string; contentType: string }> {
  try {
    // Skala aldrig UPP: en redan liten bild blir bara större av att förstoras.
    let rendered = await ImageManipulator.manipulate(uri).renderAsync()
    if (rendered.width > maxWidth) {
      rendered = await ImageManipulator.manipulate(uri).resize({ width: maxWidth }).renderAsync()
    }
    const out = await rendered.saveAsync({ compress, format: SaveFormat.WEBP, base64: true })
    if (out.base64) return { bytes: base64ToBytes(out.base64), ext: 'webp', contentType: 'image/webp' }
  } catch {
    // omkodningen misslyckades – ladda upp originalet nedan
  }
  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()
  return { bytes: new Uint8Array(arrayBuffer), ext: 'jpg', contentType: 'image/jpeg' }
}

// base64 → bytes för Supabase Storage-uppladdning.
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
