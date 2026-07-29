import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import SignedImage from './SignedImage'
import { useSettings } from '../utils/settings'

// Varumärkt "dag till fest"-kort som fångas som bild och delas. Renderas utanför
// skärmen (se inspiration.tsx). Visar båda looken staplade med en pil emellan.
export default function DayToNightShareCard({
  fromLabel, toLabel, dayName, dayItems, eveningName, eveningItems,
}: {
  fromLabel: string
  toLabel: string
  dayName?: string
  dayItems: { name: string; image_url: string | null }[]
  eveningName?: string
  eveningItems: { name: string; image_url: string | null }[]
}) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const look = (label: string, name: string | undefined, items: { name: string; image_url: string | null }[]) => (
    <View style={styles.look}>
      <Text style={styles.lookLabel}>{label}</Text>
      {!!name && <Text style={styles.lookName} numberOfLines={1}>{name}</Text>}
      <View style={styles.grid}>
        {items.map((item, i) => (
          <View key={i} style={styles.itemWrap}>
            {item.image_url
              ? <SignedImage path={item.image_url} style={styles.image} resizeMode="contain" />
              : <View style={styles.imageEmpty} />}
          </View>
        ))}
      </View>
    </View>
  )

  return (
    <View style={styles.card}>
      <Text style={styles.brand}>KLÄDKOLLEN</Text>
      <Text style={styles.title}>{tr(fromLabel)} {tr('till')} {tr(toLabel)}</Text>
      {look(tr('DAG'), dayName, dayItems)}
      <Text style={styles.arrow}>↓</Text>
      {look(tr('KVÄLL'), eveningName, eveningItems)}
      <Text style={styles.footer}>{tr('Skapad med Klädkollen · din digitala garderob')}</Text>
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: { width: 1080, padding: 72, backgroundColor: t.bg, alignItems: 'center' },
  brand: { fontFamily: 'Poppins_700Bold', fontSize: 32, letterSpacing: 6, color: t.primary, marginBottom: 16 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 64, color: t.textPrimary, textAlign: 'center', marginBottom: 40 },
  look: { alignItems: 'center' },
  lookLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, letterSpacing: 4, color: t.textSecondary },
  lookName: { fontFamily: 'Lora_400Regular', fontSize: 34, color: t.textPrimary, marginTop: 8, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24, marginTop: 24 },
  itemWrap: { width: 220 },
  image: { width: 220, height: 220, borderRadius: 24, backgroundColor: t.surfaceMuted },
  imageEmpty: { width: 220, height: 220, borderRadius: 24, backgroundColor: t.surfaceMuted },
  arrow: { fontFamily: 'Poppins_700Bold', fontSize: 60, color: t.primary, marginVertical: 24 },
  footer: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, color: t.textFaint, marginTop: 56, textAlign: 'center' },
})
