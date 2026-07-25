// Affiliate-omslag för köplistans produktlänkar.
//
// Konfigureras via miljövariabler (app.json → extra / EAS secrets) så du kan
// koppla in ditt affiliate-ID när du skrivit på ett nätverk – helt utan kodbyte:
//   EXPO_PUBLIC_AFFILIATE_NETWORK = adtraction | adrecord | tradedoubler | awin | skimlinks
//   EXPO_PUBLIC_AFFILIATE_ID      = ditt publisher-/kanal-/program-ID
//
// Saknas ID öppnas den råa produktlänken (funkar direkt – tjänar bara inget än).
// OBS: exakta länkformat/parametrar skiljer sig mellan nätverk och ibland per
// annonsör; justera mallen nedan efter ditt nätverks deep-link-dokumentation.

const NETWORK = (process.env.EXPO_PUBLIC_AFFILIATE_NETWORK || '').toLowerCase()
const AFFILIATE_ID = process.env.EXPO_PUBLIC_AFFILIATE_ID || ''

export const affiliateConfigured = !!AFFILIATE_ID

/**
 * Gör om en produktlänk till en affiliate-spårad länk (om nätverk + ID är satt).
 * Returnerar null för tomma/ogiltiga länkar, annars minst den råa länken.
 */
export function affiliateUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null
  const url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) return null
  if (!AFFILIATE_ID) return url // ingen konfiguration → öppna produkten direkt

  const enc = encodeURIComponent(url)
  switch (NETWORK) {
    case 'adtraction':
      return `https://track.adtraction.com/t/t?a=${AFFILIATE_ID}&url=${enc}`
    case 'adrecord':
      return `https://click.adrecord.com/?c=${AFFILIATE_ID}&url=${enc}`
    case 'tradedoubler':
      return `https://clk.tradedoubler.com/click?p=${AFFILIATE_ID}&url=${enc}`
    case 'awin':
      return `https://www.awin1.com/cread.php?awinaffid=${AFFILIATE_ID}&ued=${enc}`
    case 'skimlinks':
      return `https://go.skimresources.com/?id=${AFFILIATE_ID}&url=${enc}`
    default:
      return url
  }
}
