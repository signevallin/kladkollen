import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { goBack } from '../utils/nav'

// "Så funkar Skrud" – en interaktiv guide där varje knapp/ikon i appen
// förklaras. Grupperad per skärm och hopfällbar så man snabbt hittar rätt.
// Ikonerna speglar de som faktiskt används i appen. En mer översiktlig
// variant av samma innehåll finns som webbsida (public/support.html).

type Item = { icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }
type Group = { key: string; title: string; items: Item[] }

const GROUPS: Group[] = [
  {
    key: 'nav',
    title: 'Nedersta menyn',
    items: [
      { icon: 'home', label: 'Hem', desc: 'Din startskärm. Här skapar du dagens outfit.' },
      { icon: 'shirt', label: 'Garderob', desc: 'Alla dina plagg. Här filtrerar och hanterar du dem.' },
      { icon: 'sparkles', label: 'Outfits', desc: 'Outfits du sparat och gillat.' },
      { icon: 'camera', label: 'Inspo', desc: 'Inspirationsbilder du sparat.' },
      { icon: 'add', label: 'Plus-knappen', desc: 'Lägg till ett plagg, en outfit eller en inspirationsbild.' },
    ],
  },
  {
    key: 'home',
    title: 'Hemskärmen – skapa outfit',
    items: [
      { icon: 'options-outline', label: 'Jobb / Ledig / Fest', desc: 'Välj tillfälle. Skrud anpassar outfiten efter det.' },
      { icon: 'sparkles', label: 'Skapa outfit', desc: 'Bygger en komplett outfit ur din garderob, anpassad efter dagens väder.' },
      { icon: 'albums', label: 'Utgå från ett plagg/set', desc: 'Lås ett favoritplagg eller ett helt set som outfiten byggs runt.' },
      { icon: 'flash-outline', label: 'X av 3 gratis kvar', desc: 'Antal gratis AI-outfits kvar denna vecka. Premium ger obegränsat.' },
      { icon: 'swap-horizontal', label: 'Byt plagg', desc: 'Byt ut ett enskilt plagg i outfiten mot ett annat.' },
      { icon: 'refresh', label: 'Nytt förslag', desc: 'Generera ett nytt outfit-förslag.' },
      { icon: 'share-outline', label: 'Dela', desc: 'Spara eller dela din outfit som bild.' },
      { icon: 'partly-sunny-outline', label: 'Väder', desc: 'Dagens väder som outfiten anpassas efter.' },
    ],
  },
  {
    key: 'wardrobe',
    title: 'Garderoben',
    items: [
      { icon: 'options-outline', label: 'Filter', desc: 'Filtrera på kategori, färg, storlek och säsong.' },
      { icon: 'water-outline', label: 'Tvätt-markering', desc: 'Markera ett plagg som i tvätten – då föreslås det inte förrän det är rent.' },
      { icon: 'refresh-circle-outline', label: 'Töm tvätten', desc: 'Markera allt i tvätten som rent igen med ett tryck.' },
      { icon: 'albums-outline', label: 'Set-markering', desc: 'En liten markering visar att plagget hör till ett set.' },
      { icon: 'stats-chart-outline', label: 'Statistik', desc: 'Överblick över din garderob – hur ofta du bär plaggen, mest använda färger och mer.' },
    ],
  },
  {
    key: 'garment',
    title: 'Ett plagg (tryck på ett plagg)',
    items: [
      { icon: 'sparkles-outline', label: 'Ta bort bakgrund', desc: 'Låt AI rensa bort bakgrunden på bilden igen.' },
      { icon: 'crop-outline', label: 'Beskär bild', desc: 'Beskär plaggets bild.' },
      { icon: 'link-outline', label: 'Koppla till set', desc: 'Länka plagget till ett set – eller skapa ett nytt.' },
      { icon: 'sparkles', label: 'Styla hela setet', desc: 'Skapa en outfit byggd kring hela setet.' },
      { icon: 'cart-outline', label: 'Köplista', desc: 'Plagg du vill köpa men inte äger än.' },
      { icon: 'pricetag-outline', label: 'Sälj', desc: 'Märk plagg du vill sälja vidare.' },
      { icon: 'archive-outline', label: 'Arkivera', desc: 'Lägg undan plagg som inte passar just nu – med en notering om var det förvaras.' },
    ],
  },
  {
    key: 'profile',
    title: 'Profil & inställningar',
    items: [
      { icon: 'color-palette-outline', label: 'Min stil & färganalys', desc: 'Din personliga färgpalett och dina stilpreferenser.' },
      { icon: 'snow-outline', label: 'Frusen', desc: 'Ställ in hur snabbt du fryser så väderanpassningen blir rätt.' },
      { icon: 'people-outline', label: 'Mitt hushåll', desc: 'Dela garderob med partner och samla familjens kläder (Premium).' },
      { icon: 'star-outline', label: 'Skrud Premium', desc: 'Obegränsad AI och delad garderob för par och familj.' },
      { icon: 'notifications-outline', label: 'Notiser', desc: 'Styr påminnelser, till exempel regnvarningar.' },
    ],
  },
]

export default function HowItWorks() {
  const t = useTheme()
  const styles = makeStyles(t)
  // Första gruppen öppen från start; övriga hopfällda.
  const [open, setOpen] = useState<string[]>([GROUPS[0].key])

  function toggle(key: string) {
    setOpen(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Så funkar Skrud</Text>
        <Text style={styles.lede}>Tryck på ett avsnitt för att se vad varje knapp och ikon betyder.</Text>

        {GROUPS.map(g => {
          const isOpen = open.includes(g.key)
          return (
            <View key={g.key} style={styles.card}>
              <TouchableOpacity style={styles.cardHeader} activeOpacity={0.7} onPress={() => toggle(g.key)}>
                <Text style={styles.cardTitle}>{g.title}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={t.textFaint} />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.itemList}>
                  {g.items.map(it => (
                    <View key={it.label} style={styles.item}>
                      <View style={styles.iconChip}>
                        <Ionicons name={it.icon} size={20} color={t.primary} />
                      </View>
                      <View style={styles.itemText}>
                        <Text style={styles.itemLabel}>{it.label}</Text>
                        <Text style={styles.itemDesc}>{it.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Behöver du mer hjälp?</Text>
          <Text style={styles.helpText}>Hör av dig till oss på hej@kladkollen.se så hjälper vi dig.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 60, maxWidth: 720, alignSelf: 'center', width: '100%' },
  backButton: { marginBottom: 12 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 30, color: t.textPrimary, marginBottom: 6 },
  lede: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textSecondary, lineHeight: 22, marginBottom: 20 },

  card: { backgroundColor: t.card, borderRadius: 16, borderWidth: 1, borderColor: t.border, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18 },
  cardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, flex: 1, letterSpacing: -0.2 },

  itemList: { paddingHorizontal: 18, paddingBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.borderSoft },
  iconChip: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  itemText: { flex: 1 },
  itemLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14.5, color: t.textPrimary, marginBottom: 3 },
  itemDesc: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: t.textSecondary, lineHeight: 20 },

  helpBox: { backgroundColor: t.surface, borderRadius: 16, padding: 18, marginTop: 8 },
  helpTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, marginBottom: 4 },
  helpText: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: t.textSecondary, lineHeight: 20 },
})
