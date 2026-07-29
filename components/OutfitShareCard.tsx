import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import SignedImage from './SignedImage'
import { useSettings } from '../utils/settings'

// Ren, varumärkt vy av dagens outfit som fångas som bild och delas på
// sociala medier. Renderas utanför skärmen (se home.tsx) och är avsiktligt
// icke-interaktiv – inga byt-knappar eller betyg med i bilden.
export default function OutfitShareCard({
  outfit, subtitle,
}: {
  outfit: any
  subtitle?: string
}) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const items: any[] = outfit?.itemsWithImages || []

  return (
    <View style={styles.card}>
      <Text style={styles.brand}>KLÄDKOLLEN</Text>
      <Text style={styles.title} numberOfLines={2}>{outfit?.outfitName || tr('Dagens outfit')}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.grid}>
        {items.map((item, i) => (
          <View key={i} style={styles.itemWrap}>
            {item.image_url
              ? <SignedImage path={item.image_url} style={styles.image} resizeMode="contain" />
              : <View style={styles.imageEmpty} />}
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          </View>
        ))}
      </View>

      {!!outfit?.song?.title && (
        <Text style={styles.song}>🎵 {outfit.song.title}{outfit.song.artist ? ` – ${outfit.song.artist}` : ''}</Text>
      )}

      <Text style={styles.footer}>{tr('Skapad med Klädkollen · din digitala garderob')}</Text>
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: { width: 1080, padding: 72, backgroundColor: t.bg, alignItems: 'center' },
  brand: { fontFamily: 'Poppins_700Bold', fontSize: 34, letterSpacing: 6, color: t.primary, marginBottom: 24 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 68, color: t.textPrimary, textAlign: 'center', lineHeight: 76 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 34, color: t.textSecondary, marginTop: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 28, marginTop: 56 },
  itemWrap: { width: 280, alignItems: 'center' },
  image: { width: 280, height: 280, borderRadius: 28, backgroundColor: t.surfaceMuted },
  imageEmpty: { width: 280, height: 280, borderRadius: 28, backgroundColor: t.surfaceMuted },
  itemName: { fontFamily: 'Lora_400Regular', fontSize: 28, color: t.textPrimary, marginTop: 16, textAlign: 'center' },
  song: { fontFamily: 'Lora_400Regular', fontSize: 32, color: t.textSecondary, marginTop: 48, textAlign: 'center' },
  footer: { fontFamily: 'Poppins_600SemiBold', fontSize: 28, color: t.textFaint, marginTop: 56, textAlign: 'center' },
})
