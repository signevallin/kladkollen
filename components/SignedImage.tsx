import { useEffect, useState } from 'react'
import { Image, ImageProps, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { resolveImageUrl } from '../utils/storage'

// flat = ingen ljus platta bakom bilden (t.ex. i kollaget där plaggen ska flyta fritt)
type Props = Omit<ImageProps, 'source'> & { path?: string | null; flat?: boolean }

/**
 * Drop-in-ersättare för <Image> för bilder i vår privata storage-bucket.
 * Tar det lagrade värdet (publik URL eller sökväg) och visar en signerad URL.
 * Lokala URI:er (file:, blob:, data:) passerar orörda.
 *
 * Lägger en ljus platta bakom bilden (imageBg) så urklippta plagg med
 * genomskinlig bakgrund syns även i mörkt läge. Passerad style kan överstyra.
 */
export default function SignedImage({ path, style, flat, ...rest }: Props) {
  const t = useTheme()
  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setUri(null)
    if (path) resolveImageUrl(path).then(url => { if (alive) setUri(url) })
    return () => { alive = false }
  }, [path])

  if (!uri) return <View style={style} />
  // imageBg läggs SIST så den vinner över enskilda stilars backgroundColor
  // (flera plaggstilar sätter 'transparent', vilket annars skulle överköra oss).
  // Med flat hoppas plattan över – plagget renderas mot underlaget som det är.
  // contain som standard: hela plagget ska alltid synas, aldrig beskäras.
  // Skicka resizeMode="cover" uttryckligen där beskärning önskas (t.ex. avatarer).
  return <Image resizeMode="contain" {...rest} style={flat ? style : [style, { backgroundColor: t.imageBg }]} source={{ uri }} />
}
