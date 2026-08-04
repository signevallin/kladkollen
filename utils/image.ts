import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'

// Kodar om en base64-PNG (t.ex. en bakgrundsborttagen eller beskuren bild) till
// WebP. WebP behåller transparensen men är mycket mindre än en förlustfri PNG,
// vilket sänker både lagring och egress (varje visning drar ju hela filen).
// Faller tillbaka till PNG om omkodningen skulle misslyckas.
export async function pngToWebp(
  base64png: string,
  compress = 0.8,
): Promise<{ base64: string; ext: string; contentType: string }> {
  try {
    const tmp = `${FileSystem.cacheDirectory}webp-${Date.now()}.png`
    await FileSystem.writeAsStringAsync(tmp, base64png, { encoding: FileSystem.EncodingType.Base64 })
    const rendered = await ImageManipulator.manipulate(tmp).renderAsync()
    const out = await rendered.saveAsync({ compress, format: SaveFormat.WEBP, base64: true })
    await FileSystem.deleteAsync(tmp, { idempotent: true })
    if (out.base64) return { base64: out.base64, ext: 'webp', contentType: 'image/webp' }
  } catch {
    // omkodningen misslyckades – använd originalet
  }
  return { base64: base64png, ext: 'png', contentType: 'image/png' }
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
    const rendered = await ImageManipulator.manipulate(uri).resize({ width: maxWidth }).renderAsync()
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
