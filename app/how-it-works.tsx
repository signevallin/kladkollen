import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { goBack } from '../utils/nav'
import { useSettings } from '../utils/settings'

// "Så funkar Skrud" – en interaktiv guide där varje knapp/ikon i appen
// förklaras. Grupperad per skärm och hopfällbar så man snabbt hittar rätt.
//
// Viktigt: guiden ska spegla appen exakt. Kontroller som har en ikon visas med
// SAMMA ikon (rätt bibliotek – vissa är Ionicons, andra MaterialIcons).
// Kontroller som i appen bara är en textknapp visas med `pill` = den exakta
// texten, i stället för en påhittad ikon. En översiktlig variant av samma
// innehåll finns som webbsida (public/support.html).
type Item = { lib?: 'ion' | 'mat'; icon?: string; pill?: string; label: string; desc: string }
// variant 'tips' = rådgivande lista (bockar), inte knappar i appen.
type Group = { key: string; title: string; variant?: 'tips'; items: Item[] }

const GROUPS: Group[] = [
  {
    key: 'nav',
    title: 'Nedersta menyn',
    items: [
      { lib: 'ion', icon: 'home', label: 'Hem', desc: 'Din startskärm. Här skapar du dagens outfit.' },
      { lib: 'ion', icon: 'shirt', label: 'Garderob', desc: 'Alla dina plagg. Här filtrerar och hanterar du dem.' },
      { lib: 'ion', icon: 'sparkles', label: 'Outfits', desc: 'Outfits du sparat och gillat.' },
      { lib: 'ion', icon: 'camera', label: 'Inspo', desc: 'Inspirationsbilder du sparat.' },
      { lib: 'ion', icon: 'add', label: 'Plus-knappen', desc: 'Lägg till ett plagg, en outfit eller en inspirationsbild.' },
    ],
  },
  {
    key: 'home',
    title: 'Hemskärmen – skapa outfit',
    items: [
      { pill: 'Ledig', label: 'Tillfälle', desc: 'Välj tillfälle högst upp: Jobb, Skola, Ledig, Aktiv, Date eller Fest. Skrud anpassar outfiten efter det.' },
      { pill: '15°', label: 'Dagens väder', desc: 'Visas överst – outfiten anpassas efter dagens temperatur och regnrisk.' },
      { lib: 'ion', icon: 'add', label: 'Utgå från ett plagg/set', desc: 'Bygg outfiten kring ett favoritplagg eller ett helt set. Tryck på plus för att välja.' },
      { pill: 'Generera outfit', label: 'Generera-knappen', desc: 'Skapar en komplett outfit ur din garderob, anpassad efter vädret.' },
      { pill: '3 av 3', label: 'Gratis kvar', desc: 'Antal gratis AI-outfits kvar denna vecka. Premium ger obegränsat.' },
      { lib: 'ion', icon: 'swap-horizontal', label: 'Byt plagg', desc: 'Byt ut ett enskilt plagg i outfiten mot ett annat.' },
      { lib: 'ion', icon: 'refresh', label: 'Nytt förslag', desc: 'Generera ett nytt outfit-förslag.' },
      { lib: 'ion', icon: 'share-outline', label: 'Dela', desc: 'Spara eller dela din outfit som bild.' },
    ],
  },
  {
    key: 'wardrobe',
    title: 'Garderoben',
    items: [
      { lib: 'mat', icon: 'tune', label: 'Filter', desc: 'Filtrera på kategori, färg, storlek och säsong.' },
      { lib: 'mat', icon: 'inventory-2', label: 'Arkiv', desc: 'Visa plagg du arkiverat.' },
      { lib: 'mat', icon: 'insights', label: 'Statistik', desc: 'Överblick över din garderob – hur ofta du bär plaggen, mest använda färger och mer.' },
      { lib: 'mat', icon: 'local-laundry-service', label: 'Tvätt-markering', desc: 'Markera ett plagg som i tvätten – då föreslås det inte förrän det är rent.' },
      { pill: 'Töm tvätten', label: 'Töm tvätten', desc: 'Markera allt i tvätten som rent igen med ett tryck.' },
      { lib: 'mat', icon: 'link', label: 'Set-markering', desc: 'En liten markering visar att plagget hör till ett set.' },
    ],
  },
  {
    key: 'garment',
    title: 'Ett plagg (tryck på ett plagg)',
    items: [
      { lib: 'ion', icon: 'sparkles-outline', label: 'Ta bort bakgrund', desc: 'Låt AI rensa bort bakgrunden på bilden igen.' },
      { lib: 'ion', icon: 'crop-outline', label: 'Beskär bild', desc: 'Beskär plaggets bild.' },
      { lib: 'ion', icon: 'link-outline', label: 'Koppla till set', desc: 'Länka plagget till ett set – eller skapa ett nytt.' },
      { lib: 'ion', icon: 'sparkles-outline', label: 'Styla hela setet', desc: 'Skapa en outfit byggd kring hela setet.' },
      { pill: 'Lägg i säljlistan', label: 'Säljlista', desc: 'Märk plagg du vill sälja vidare.' },
      { pill: 'Arkivera', label: 'Arkivera plagg', desc: 'Lägg undan plagg som inte passar just nu – med en notering om var det förvaras.' },
    ],
  },
  {
    key: 'photo',
    title: 'Fototips – så blir plaggen bäst',
    variant: 'tips',
    items: [
      { label: 'Bra, jämnt ljus', desc: 'Fota gärna i dagsljus. Undvik blixt och hårda skuggor.' },
      { label: 'Enfärgad bakgrund', desc: 'Lägg plagget på ett slätt, enfärgat underlag som kontrasterar mot färgen – då tas bakgrunden bort snyggt.' },
      { label: 'Platta ut plagget', desc: 'Släta ut veck och lägg plagget så hela formen syns.' },
      { label: 'Ett plagg i taget', desc: 'Fota ett plagg åt gången, rakt framifrån eller ovanifrån, och fyll bilden med plagget.' },
      { label: 'Naturlig färg', desc: 'Se till att färgen ser rätt ut – färgad belysning lurar AI:ns färganalys.' },
    ],
  },
  {
    key: 'profile',
    title: 'Profil & inställningar',
    items: [
      { lib: 'mat', icon: 'checkroom', label: 'Stil', desc: 'Din stilriktning och dina stilpreferenser.' },
      { lib: 'mat', icon: 'colorize', label: 'Färganalys', desc: 'Din personliga färgpalett utifrån hud-, hår- och ögonfärg.' },
      { lib: 'mat', icon: 'ac-unit', label: 'Frusen', desc: 'Ställ in hur snabbt du fryser så väderanpassningen blir rätt.' },
      { lib: 'mat', icon: 'people-outline', label: 'Min partner', desc: 'Dela garderob med din partner och samla familjens kläder (Premium).' },
      { lib: 'mat', icon: 'workspace-premium', label: 'Skrud Premium', desc: 'Obegränsad AI och delad garderob för par och familj.' },
      { lib: 'mat', icon: 'notifications-none', label: 'Notiser', desc: 'Styr påminnelser, till exempel regnvarningar.' },
    ],
  },
]

export default function HowItWorks() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  // Första gruppen öppen från start; övriga hopfällda.
  const [open, setOpen] = useState<string[]>([GROUPS[0].key])

  function toggle(key: string) {
    setOpen(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tr('Så funkar Skrud')}</Text>
        <Text style={styles.lede}>{tr('Tryck på ett avsnitt för att se vad varje knapp och ikon betyder.')}</Text>

        {GROUPS.map(g => {
          const isOpen = open.includes(g.key)
          return (
            <View key={g.key} style={styles.card}>
              <TouchableOpacity style={styles.cardHeader} activeOpacity={0.7} onPress={() => toggle(g.key)}>
                <Text style={styles.cardTitle}>{tr(g.title)}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={t.textFaint} />
              </TouchableOpacity>
              {isOpen && g.variant === 'tips' && (
                <View style={styles.itemList}>
                  {g.items.map(it => (
                    <View key={it.label} style={styles.tipRow}>
                      <Ionicons name="checkmark-circle" size={18} color={t.primary} style={styles.tipIcon} />
                      <View style={styles.itemText}>
                        <Text style={styles.itemLabel}>{tr(it.label)}</Text>
                        <Text style={styles.itemDesc}>{tr(it.desc)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {isOpen && g.variant !== 'tips' && (
                <View style={styles.itemList}>
                  {g.items.map(it => (
                    <View key={it.label} style={styles.item}>
                      {it.pill
                        ? <View style={styles.pillChip}><Text style={styles.pillChipText} numberOfLines={2}>{tr(it.pill)}</Text></View>
                        : (
                          <View style={styles.iconChip}>
                            {it.lib === 'mat'
                              ? <MaterialIcons name={it.icon as any} size={20} color={t.primary} />
                              : <Ionicons name={it.icon as any} size={20} color={t.primary} />}
                          </View>
                        )}
                      <View style={styles.itemText}>
                        <Text style={styles.itemLabel}>{tr(it.label)}</Text>
                        <Text style={styles.itemDesc}>{tr(it.desc)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        })}

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>{tr('Behöver du mer hjälp?')}</Text>
          <Text style={styles.helpText}>{tr('Hör av dig till oss på hej@kladkollen.se så hjälper vi dig.')}</Text>
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
  pillChip: { minWidth: 40, maxWidth: 96, minHeight: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, paddingHorizontal: 8, paddingVertical: 4 },
  pillChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5, color: t.primary, textAlign: 'center' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.borderSoft },
  tipIcon: { marginTop: 2 },
  itemText: { flex: 1 },
  itemLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14.5, color: t.textPrimary, marginBottom: 3 },
  itemDesc: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: t.textSecondary, lineHeight: 20 },

  helpBox: { backgroundColor: t.surface, borderRadius: 16, padding: 18, marginTop: 8 },
  helpTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, marginBottom: 4 },
  helpText: { fontFamily: 'Lora_400Regular', fontSize: 13.5, color: t.textSecondary, lineHeight: 20 },
})
