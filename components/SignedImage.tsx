import { useMemo } from 'react'
import { StyleProp, StyleSheet, View } from 'react-native'
import { Image, ImageContentFit, ImageProps, ImageStyle } from 'expo-image'
import { useTheme } from '../theme/ThemeProvider'
import { imageUrl, type ImageTransform } from '../utils/storage'

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
 * Tar det lagrade värdet (publik URL eller sökväg) och visar en signerad URL.
 * Lokala URI:er (file:, blob:, data:) passerar orörda.
 *
 * Lägger en ljus platta bakom bilden (imageBg) så urklippta plagg med
 * genomskinlig bakgrund syns även i mörkt läge. Passerad style kan överstyra.
 */
export default function SignedImage({ path, style, flat, resizeMode, contentFit, transform, ...rest }: Props) {
  const t = useTheme()
  // Publik bucket → URL:en kan räknas ut synkront, så bilden får sin källa
  // direkt (ingen tom ruta + extra render per bild).
  const uri = useMemo(
    () => (path ? imageUrl(path, transform) : null),
    [path, transform?.width, transform?.height, transform?.resize, transform?.quality, transform?.format],
  )

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
