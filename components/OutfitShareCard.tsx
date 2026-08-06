import { StyleSheet, Text, View } from 'react-native'
import SignedImage from './SignedImage'
import { useSettings } from '../utils/settings'

// Dela-kort som fångas som bild och delas. Byggt som ett strukturerat flatlay-
// KOLLAGE: överdelar överst, underdelar under (lätt intuckade), och resten
// (jackor, skor, väskor, accessoarer, smycken) vid sidorna – tätt packat.
// Fast Skrud-palett (fristående från app-temat). Icke-interaktiv, renderas
// utanför skärmen.
const BG = '#FDF9F4'   // varm cream
const INK = '#402D21'  // mörk brun (rubrik)
const SOFT = '#6C4D38' // dämpad brun (varumärke/undertext)

// Kategori → placering. Överdelar/klänningar i mitten upptill, byxor/kjolar/
// shorts i mitten nedtill, allt annat vid sidorna.
const UPPER = ['Toppar', 'Tröjor', 'Klänningar', 'Sovkläder', 'Underkläder', 'Badkläder']
const LOWER = ['Byxor', 'Shorts', 'Kjolar']
// Reserv: gissa placering ur plaggnamnet när kategori saknas (t.ex. äldre
// sparade outfits eller plagg som inte matchat garderoben), så kollaget aldrig
// faller tillbaka på en enda vertikal rad.
const LOWER_KW = /\b(kjol|byx|jeans|shorts|chinos|leggings|mjukis|kostymbyx)/i
const UPPER_KW = /\b(klänning|topp|blus|skjorta|tröj|t-shirt|tshirt|linne|pik[ée]|body|sweatshirt|hoodie|kofta|polo|collegetr)/i
// Rollen för ett plagg: kategori först, annars gissning ur namnet.
function roleOf(it: any): 'upper' | 'lower' | 'side' {
  const cat = it?.category || ''
  if (UPPER.includes(cat)) return 'upper'
  if (LOWER.includes(cat)) return 'lower'
  if (cat) return 'side' // känd kategori som inte är över-/underdel
  const n = (it?.name || '').toLowerCase()
  if (LOWER_KW.test(n)) return 'lower'
  if (UPPER_KW.test(n)) return 'upper'
  return 'side'
}
const IMG_TRANSFORM = { width: 800, height: 800, resize: 'contain' as const, format: 'origin' as const }

export default function OutfitShareCard({
  outfit, subtitle,
}: {
  outfit: any
  subtitle?: string
}) {
  const { t: tr } = useSettings()
  const items: any[] = (outfit?.itemsWithImages || []).filter((it: any) => it?.image_url)

  const uppers = items.filter(i => roleOf(i) === 'upper')
  const lowers = items.filter(i => roleOf(i) === 'lower')
  const sides = items.filter(i => roleOf(i) === 'side')

  // Om inget hamnar i mitten (t.ex. bara accessoarer) – lägg allt i mitten.
  const centerHasContent = uppers.length > 0 || lowers.length > 0
  const centerUppers = centerHasContent ? uppers : items
  const centerLowers = centerHasContent ? lowers : []
  const sideItems = centerHasContent ? sides : []

  // Dela sidoplaggen jämnt mellan vänster och höger för balans.
  const left: any[] = []
  const right: any[] = []
  sideItems.forEach((s, i) => (i % 2 === 0 ? left : right).push(s))

  const total = items.length
  const centerSize = total <= 3 ? 460 : 420
  const sideSize = 220

  const renderSide = (list: any[]) => (
    <View style={styles.sideCol}>
      {list.map((it, i) => (
        <SignedImage
          key={i}
          path={it.image_url}
          style={[{ width: sideSize, height: sideSize }, i > 0 && { marginTop: -28 }]}
          resizeMode="contain"
          flat
          transform={IMG_TRANSFORM}
        />
      ))}
    </View>
  )

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.rule} />
        <Text style={styles.brand}>SKRUD</Text>
        <View style={styles.rule} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{outfit?.outfitName || tr('Dagens outfit')}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.stage}>
        {left.length > 0 && renderSide(left)}

        <View style={styles.centerCol}>
          {centerUppers.map((it, i) => (
            <SignedImage
              key={`u${i}`}
              path={it.image_url}
              style={[{ width: centerSize, height: centerSize }, i > 0 && { marginTop: -40 }]}
              resizeMode="contain"
              flat
              transform={IMG_TRANSFORM}
            />
          ))}
          {centerLowers.map((it, i) => (
            <SignedImage
              key={`l${i}`}
              path={it.image_url}
              // Första underdelen tuckas in under överdelen; övriga staplas tätt.
              style={[{ width: centerSize, height: centerSize }, { marginTop: i === 0 && centerUppers.length > 0 ? -80 : -40 }]}
              resizeMode="contain"
              flat
              transform={IMG_TRANSFORM}
            />
          ))}
        </View>

        {right.length > 0 && renderSide(right)}
      </View>

      {!!outfit?.song?.title && (
        <Text style={styles.song}>♪ {outfit.song.title}{outfit.song.artist ? ` – ${outfit.song.artist}` : ''}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { width: 1080, backgroundColor: BG, paddingVertical: 90, paddingHorizontal: 56, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  rule: { width: 84, height: 2, backgroundColor: SOFT, opacity: 0.5 },
  brand: { fontFamily: 'Poppins_700Bold', fontSize: 30, letterSpacing: 10, color: SOFT },
  title: { fontFamily: 'Lora_500Medium', fontStyle: 'italic', fontSize: 66, color: INK, textAlign: 'center', lineHeight: 76, marginTop: 20 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 30, color: SOFT, marginTop: 14, textAlign: 'center' },
  stage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 48, width: '100%' },
  sideCol: { alignItems: 'center', justifyContent: 'center' },
  centerCol: { alignItems: 'center', justifyContent: 'center' },
  song: { fontFamily: 'Lora_400Regular', fontSize: 30, color: SOFT, marginTop: 40, textAlign: 'center' },
})
