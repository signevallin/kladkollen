import { useEffect, useState } from 'react'
import { StyleProp, StyleSheet, View } from 'react-native'
import { Image, ImageContentFit, ImageProps, ImageStyle } from 'expo-image'
import { useTheme } from '../theme/ThemeProvider'
import { type ImageTransform } from '../utils/storage'
import { cachedSignedUrl, signedUrl } from '../utils/signedUrls'

// Bygger på expo-image istället för RN Image: bilderna nedskalas till
// vyns storlek (allowDownscaling) och cachas på disk, så små miniatyrer
// inte längre laddar in fullstora bilder i minnet.

type ResizeMode = 'contain' | 'cover' | 'stretch' | 'center'

// flat = ingen ljus platta bakom bilden (t.ex. i kollaget där plaggen ska flyta fritt)
type Props = Omit<ImageProps, 'source' | 'style'> & {
  path?: string | null
  flat?: boolean
  style?: StyleProp<ImageStyle>
  // Bakåtkompatibelt: kod skickar resizeMode (som RN Image), vi översätter till contentFit.
  resizeMode?: ResizeMode
  // Be servern skicka en nedskalad bild (miniatyrer). Kräver betald Supabase-plan.
  transform?: ImageTransform
}

const RESIZE_TO_FIT: Record<ResizeMode, ImageContentFit> = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'fill',
  center: 'none',
}

/**
 * Drop-in-ersättare för <Image> för bilder i vår privata storage-bucket.
 * Tar det lagrade värdet (sökväg eller äldre publik URL) och visar en signerad
 * URL. Lokala URI:er (file:, blob:, data:) passerar orörda.
 *
 * Lägger en ljus platta bakom bilden (imageBg) så urklippta plagg med
 * genomskinlig bakgrund syns även i mörkt läge. Passerad style kan överstyra.
 */
export default function SignedImage({ path, style, flat, resizeMode, contentFit, transform, ...rest }: Props) {
  const t = useTheme()
  // Supabase fakturerar per origin-bild som transformeras, och varje STORLEK av
  // samma bild är en egen transformation – sju avatarer i fem vystorlekar blev
  // 14 % av månadskvoten vid elva användare. Därför använder ALLA bilder
  // format:'origin': vi hoppar över server-transformen helt och låter expo-image
  // skala ner till vyns storlek på enheten (samma minnesvinst, ingen kostnad).
  // Avatarer förlorar inget på det – de laddas redan upp som 512 px WebP
  // (downscaleForUpload) och beskärningen görs av contentFit:'cover' lokalt.
  // Bonus: alla vystorlekar delar nu samma cache-nyckel, alltså en nedladdning.
  const effTransform = transform?.format === 'origin' ? undefined : transform
  // Signaturen cachas på disk och hydreras vid appstart, så en redan sedd bild
  // får sin URL SYNKRONT här – ingen tom ruta och ingen extra render, precis som
  // när bucketen var publik. Bara första gången en bild ses krävs ett anrop,
  // och då signeras hela rutnätet i en batch (utils/signedUrls).
  const transformKey = [
    effTransform?.width, effTransform?.height, effTransform?.resize,
    effTransform?.quality, effTransform?.format,
  ].join(',')

  const key = path ? `${path}|${transformKey}` : ''
  const cached = path ? cachedSignedUrl(path, effTransform) : null

  // Hämtade signaturer nycklas på bilden de tillhör. Utan nyckeln skulle ett
  // byte av `path` (t.ex. återanvänd rad i en lista) visa FÖREGÅENDE plaggs
  // bild tills den nya signaturen landat.
  const [fetched, setFetched] = useState<{ key: string; url: string } | null>(null)
  const uri = cached ?? (fetched?.key === key ? fetched.url : null)

  useEffect(() => {
    if (!path || cached) return
    let alive = true
    signedUrl(path, effTransform).then(url => {
      if (alive && url) setFetched({ key, url })
    })
    return () => { alive = false }
    // effTransform är ett nytt objekt vid varje render – jämför på innehållet
    // via transformKey (ingår i key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cached])

  if (!uri) return <View style={style} />

  // resizeMode kan komma som prop ELLER ligga i style-objektet (RN-stil). expo-image
  // läser inte style.resizeMode, så vi plockar ut det och översätter till contentFit.
  // contain som standard: hela plagget ska alltid synas, aldrig beskäras.
  const flatStyle = StyleSheet.flatten(style) || {}
  const styleResize = (flatStyle as { resizeMode?: ResizeMode }).resizeMode
  const fit: ImageContentFit = contentFit ?? RESIZE_TO_FIT[resizeMode ?? styleResize ?? 'contain'] ?? 'contain'

  // imageBg läggs SIST så den vinner över enskilda stilars backgroundColor
  // (flera plaggstilar sätter 'transparent', vilket annars skulle överköra oss).
  // Med flat hoppas plattan över – plagget renderas mot underlaget som det är.
  return (
    <Image
      {...rest}
      contentFit={fit}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      style={flat ? style : [style, { backgroundColor: t.imageBg }]}
      source={{ uri }}
    />
  )
}
