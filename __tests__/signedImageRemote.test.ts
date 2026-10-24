// Regeln SignedImage använder för att avgöra om en bild ska signeras eller
// skickas rakt till expo-image. Pinterest-pins sparas som länk, inte som fil,
// och storagePathFrom() ger null för dem – utan undantaget blev rutan tom.
// Samma mockning som storage.test.ts: storage.ts drar in supabase-klienten och
// expo-crypto, som inte går att ladda i node. storagePathFrom är ren.
jest.mock('../supabase', () => ({ supabase: {} }))
jest.mock('../utils/id', () => ({ newImageId: () => 'test-id' }))

import { storagePathFrom } from '../utils/storage'

const isRemote = (p: string) =>
  /^https?:\/\//i.test(p) && !/\/storage\/v1\/object\//i.test(p)

describe('extern bild kontra bild i egen bucket', () => {
  it('pekar ut Pinterest-URL:er som externa', () => {
    expect(isRemote('https://i.pinimg.com/1200x/ab/cd/ef.jpg')).toBe(true)
    // ...och att det är just de som saknar sökväg i vår lagring
    expect(storagePathFrom('https://i.pinimg.com/1200x/ab/cd/ef.jpg')).toBeNull()
  })

  it('behandlar INTE våra egna lagrings-URL:er som externa', () => {
    const egen = 'https://kplapbfyetzeyplmllto.supabase.co/storage/v1/object/sign/garments/uid/bild.webp'
    expect(isRemote(egen)).toBe(false)
    expect(storagePathFrom(egen)).toBe('uid/bild.webp')
  })

  it('behandlar INTE rena sökvägar som externa', () => {
    expect(isRemote('97ac49ff/bild.webp')).toBe(false)
    expect(storagePathFrom('97ac49ff/bild.webp')).toBe('97ac49ff/bild.webp')
  })
})
