// storage.ts importerar supabase-klienten och id-hjälparen (expo-crypto), som
// inte kan laddas i node. Vi mockar dem – storagePathFrom är en ren funktion och
// använder ingen av dem vid körning.
jest.mock('../supabase', () => ({ supabase: {} }))
jest.mock('../utils/id', () => ({ newImageId: () => 'test-id' }))

import { storagePathFrom } from '../utils/storage'

describe('storagePathFrom', () => {
  it('plockar ut sökvägen ur en publik Supabase-URL', () => {
    expect(
      storagePathFrom('https://x.supabase.co/storage/v1/object/public/garments/abc/def.jpg'),
    ).toBe('abc/def.jpg')
  })

  it('plockar ut sökvägen ur en signerad URL (utan query)', () => {
    expect(
      storagePathFrom('https://x.supabase.co/storage/v1/object/sign/garments/u1/img.jpg?token=xyz'),
    ).toBe('u1/img.jpg')
  })

  it('avkodar URL-kodade tecken i sökvägen', () => {
    expect(
      storagePathFrom('https://x.supabase.co/storage/v1/object/public/garments/u%201/a%20b.jpg'),
    ).toBe('u 1/a b.jpg')
  })

  it('släpper igenom en ren lagringssökväg oförändrad', () => {
    expect(storagePathFrom('abc/def.jpg')).toBe('abc/def.jpg')
  })

  it('returnerar null för lokala/externa URI:er', () => {
    expect(storagePathFrom('file:///local/x.jpg')).toBeNull()
    expect(storagePathFrom('data:image/png;base64,AAAA')).toBeNull()
    expect(storagePathFrom('blob:abc')).toBeNull()
    expect(storagePathFrom('https://annan-domän.se/bild.jpg')).toBeNull()
  })
})
