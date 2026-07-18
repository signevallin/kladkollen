import * as Crypto from 'expo-crypto'

// Slumpad, praktiskt ogissningsbar sökväg för uppladdade bilder. Viktigt när
// garments-bucketen är publik: bilder kan bara nås av den som fått länken via
// appen, inte genom att gissa löpande/tidsstämplade filnamn.
export function newImageId(): string {
  return Crypto.randomUUID()
}
