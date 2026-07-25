import { affiliateUrl } from '../utils/affiliate'

// Utan konfigurerat affiliate-ID (env osatt i testmiljön) ska den råa länken
// släppas igenom oförändrad – knappen fungerar direkt, tjänar bara inget än.
describe('affiliateUrl (utan konfiguration)', () => {
  it('släpper igenom giltiga http(s)-länkar', () => {
    expect(affiliateUrl('https://example.com/produkt')).toBe('https://example.com/produkt')
    expect(affiliateUrl('http://a.se/x')).toBe('http://a.se/x')
  })

  it('trimmar blanksteg', () => {
    expect(affiliateUrl('  https://a.com  ')).toBe('https://a.com')
  })

  it('returnerar null för tomt/ogiltigt/icke-webblänk', () => {
    expect(affiliateUrl('')).toBeNull()
    expect(affiliateUrl(null)).toBeNull()
    expect(affiliateUrl(undefined)).toBeNull()
    expect(affiliateUrl('ftp://a.com/x')).toBeNull()
    expect(affiliateUrl('bara text')).toBeNull()
  })
})
