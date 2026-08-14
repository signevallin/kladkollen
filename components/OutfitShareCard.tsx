import { StyleSheet, Text, View } from 'react-native'
import SignedImage from './SignedImage'
import { useSettings } from '../utils/settings'

// Dela-kort som fångas som bild och delas. Byggt som ett rent, luftigt KOLLAGE
// i rutnät: varje plagg i sin EGEN ruta av samma storlek – inget staplas eller
// göms bakom ett annat. Ordningen speglar en outfit uppifrån och ner: överdelar
// först, sedan underdelar, sedan skor/väskor/ytterplagg, och små accessoarer/
// smycken sist. Fast Skrud-palett (fristående från app-temat). Icke-interaktiv,
// renderas utanför skärmen.
const BG = '#FDF9F4'   // varm cream
const INK = '#402D21'  // mörk brun (rubrik)
const SOFT = '#6C4D38' // dämpad brun (varumärke/undertext)

// Kategori → roll (styr bara ordningen i rutnätet).
const UPPER = ['Toppar', 'Tröjor', 'Klänningar', 'Sovkläder', 'Underkläder', 'Badkläder']
const LOWER = ['Byxor', 'Shorts', 'Kjolar']
// Smycken och accessoarer ritas ALLTID små – de ska aldrig konkurrera i storlek
// med kläderna. Väskor är undantaget: de är stora nog att ritas som ett plagg.
const SMALL_CATS = ['Smycken', 'Accessoarer']
// Reserv: gissa roll ur plaggnamnet när kategori saknas (äldre outfits m.m.).
const LOWER_KW = /\b(kjol|byx|jeans|shorts|chinos|leggings|mjukis|kostymbyx)/i
const UPPER_KW = /\b(klänning|topp|blus|skjorta|tröj|t-shirt|tshirt|linne|pik[ée]|body|sweatshirt|hoodie|kofta|polo|collegetr)/i
const SMALL_KW = /\b(halsband|örhäng|armband|\bring\b|klocka|fotlänk|bälte|hatt|keps|mössa|solglasög|halsduk|sjal|scarf|hår(band|spänne|klämma|accessoar)|scrunchie|slips|fluga|vante|handske)/i

function roleOf(it: any): 'upper' | 'lower' | 'side' {
  const cat = it?.category || ''
  if (UPPER.includes(cat)) return 'upper'
  if (LOWER.includes(cat)) return 'lower'
  if (cat) return 'side'
  const n = (it?.name || '').toLowerCase()
  if (LOWER_KW.test(n)) return 'lower'
  if (UPPER_KW.test(n)) return 'upper'
  return 'side'
}
// Litet plagg? Smycken/accessoarer (utom väskor) ritas alltid smått.
function isSmall(it: any): boolean {
  const cat = it?.category || ''
  if (SMALL_CATS.includes(cat)) return true
  if (cat) return false
  return SMALL_KW.test((it?.name || '').toLowerCase())
}
// Sorteringsvikt: överdelar (0) → underdelar (1) → skor/väskor/ytterplagg (2)
// → små accessoarer/smycken (3, alltid sist).
function rankOf(it: any): number {
  if (isSmall(it)) return 3
  const r = roleOf(it)
  return r === 'upper' ? 0 : r === 'lower' ? 1 : 2
}

const IMG_TRANSFORM = { width: 800, height: 800, resize: 'contain' as const, format: 'origin' as const }
const NORMAL = 280 // vanligt plagg
const SMALL = 150  // smycken & accessoarer

export default function OutfitShareCard({
  outfit, subtitle,
}: {
  outfit: any
  subtitle?: string
}) {
  const { t: tr } = useSettings()
  const items: any[] = (outfit?.itemsWithImages || []).filter((it: any) => it?.image_url)

  // Stabil sortering: behåll inbördes ordning inom samma roll.
  const sorted = items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => rankOf(a.it) - rankOf(b.it) || a.i - b.i)
    .map(x => x.it)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.rule} />
        <Text style={styles.brand}>SKRUD</Text>
        <View style={styles.rule} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{outfit?.outfitName || tr('Dagens outfit')}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.grid}>
        {sorted.map((it, i) => {
          const sz = isSmall(it) ? SMALL : NORMAL
          return (
            <View key={i} style={styles.cell}>
              <SignedImage
                path={it.image_url}
                style={{ width: sz, height: sz }}
                resizeMode="contain"
                flat
                transform={IMG_TRANSFORM}
              />
            </View>
          )
        })}
      </View>

      {!!outfit?.song?.title && (
        <Text style={styles.song}>♪ {outfit.song.title}{outfit.song.artist ? ` – ${outfit.song.artist}` : ''}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { width: 1080, backgroundColor: BG, paddingVertical: 64, paddingHorizontal: 40, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  rule: { width: 84, height: 2, backgroundColor: SOFT, opacity: 0.5 },
  brand: { fontFamily: 'Poppins_700Bold', fontSize: 30, letterSpacing: 10, color: SOFT },
  title: { fontFamily: 'Lora_500Medium', fontStyle: 'italic', fontSize: 66, color: INK, textAlign: 'center', lineHeight: 76, marginTop: 20 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 30, color: SOFT, marginTop: 14, textAlign: 'center' },
  // Rent rutnät: max tre plagg per rad, centrerat, jämna mellanrum. Varje ruta
  // är lika stor så bilderna radar upp sig oavsett storlek på plagget i den.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', maxWidth: 940, columnGap: 12, rowGap: 12, marginTop: 40 },
  cell: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  song: { fontFamily: 'Lora_400Regular', fontSize: 30, color: SOFT, marginTop: 44, textAlign: 'center' },
})
