import { useEffect, useState } from 'react'
import { Image, ImageProps, View } from 'react-native'
import { resolveImageUrl } from '../utils/storage'

type Props = Omit<ImageProps, 'source'> & { path?: string | null }

/**
 * Drop-in-ersättare för <Image> för bilder i vår privata storage-bucket.
 * Tar det lagrade värdet (publik URL eller sökväg) och visar en signerad URL.
 * Lokala URI:er (file:, blob:, data:) passerar orörda.
 */
export default function SignedImage({ path, style, ...rest }: Props) {
  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setUri(null)
    if (path) resolveImageUrl(path).then(url => { if (alive) setUri(url) })
    return () => { alive = false }
  }, [path])

  if (!uri) return <View style={style} />
  return <Image {...rest} style={style} source={{ uri }} />
}
