import { StyleSheet, Text, View } from 'react-native'
import SignedImage from './SignedImage'
import { useSettings } from '../utils/settings'

// Dela-kort som fångas som bild och delas på sociala medier. Byggt som ett
// flatlay-KOLLAGE: de urklippta plaggen "flyter" fritt på en ljus bakgrund,
// lätt roterade och i varierad storlek – inga rutor eller namnetiketter.
// Fast Skrud-palett (fristående från app-temat) så bilden ser likadan ut för
// alla. Renderas utanför skärmen och är avsiktligt icke-interaktiv.
const BG = '#FDF9F4'   // varm cream
const INK = '#402D21'  // mörk brun (rubrik)
const SOFT = '#6C4D38' // dämpad brun (varumärke/undertext)
const FAINT = 'rgba(64,45,33,0.42)'

// Små, varierade rotationer + storleksmultiplar ger ett organiskt kollage
// utan att något plagg döljs (flex sköter layouten, rotationen är bara visuell).
const ROTATIONS = [-6, 5, -4, 7, -5, 4, -7, 6]
const SCALES = [1.06, 0.9, 1.0, 0.94, 1.04, 0.92]

export default function OutfitShareCard({
  outfit, subtitle,
}: {
  outfit: any
  subtitle?: string
}) {
  const { t: tr } = useSettings()
  const items: any[] = (outfit?.itemsWithImages || []).filter((it: any) => it?.image_url)
  const n = items.length || 1
  // Färre plagg → större bilder, så kollaget fyller ytan balanserat.
  const base = n <= 3 ? 380 : n <= 4 ? 330 : n <= 6 ? 280 : 240

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.rule} />
        <Text style={styles.brand}>SKRUD</Text>
        <View style={styles.rule} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{outfit?.outfitName || tr('Dagens outfit')}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.collage}>
        {items.map((item, i) => {
          const size = Math.round(base * SCALES[i % SCALES.length])
          return (
            <View
              key={i}
              style={[styles.item, { width: size, height: size, transform: [{ rotate: `${ROTATIONS[i % ROTATIONS.length]}deg` }] }]}
            >
              <SignedImage
                path={item.image_url}
                style={styles.image}
                resizeMode="contain"
                flat
                transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }}
              />
            </View>
          )
        })}
      </View>

      {!!outfit?.song?.title && (
        <Text style={styles.song}>♪ {outfit.song.title}{outfit.song.artist ? ` – ${outfit.song.artist}` : ''}</Text>
      )}
      <Text style={styles.footer}>{tr('Skapad med Skrud · din digitala garderob')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { width: 1080, backgroundColor: BG, paddingVertical: 96, paddingHorizontal: 72, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  rule: { width: 84, height: 2, backgroundColor: SOFT, opacity: 0.5 },
  brand: { fontFamily: 'Poppins_700Bold', fontSize: 30, letterSpacing: 10, color: SOFT },
  title: { fontFamily: 'Lora_500Medium', fontStyle: 'italic', fontSize: 66, color: INK, textAlign: 'center', lineHeight: 76, marginTop: 20 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 30, color: SOFT, marginTop: 14, textAlign: 'center' },
  collage: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 24, rowGap: 12, marginTop: 64, marginBottom: 8, width: '100%' },
  item: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  song: { fontFamily: 'Lora_400Regular', fontSize: 30, color: SOFT, marginTop: 40, textAlign: 'center' },
  footer: { fontFamily: 'Poppins_600SemiBold', fontSize: 26, letterSpacing: 2, color: FAINT, marginTop: 52, textAlign: 'center' },
})
