import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { goBack } from '../utils/nav'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'

// "Så funkar Skrud" – en hjälpsida som förklarar appens funktioner. Samma
// innehåll ligger även som webbsida (public/support.html) och används där som
// Apples Support URL. Håll de två i synk om texten ändras.
const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Kom igång – fyll din garderob',
    body: 'Du kan fylla din garderob på tre sätt: importera dina plagg från kvitton, importera från butiker du handlat i, eller fota ett plagg. Fotar du fyller Skrud automatiskt i namn, kategori, färg och säsong och tar bort bakgrunden. Välj det som passar dig – du kan blanda fritt.',
  },
  {
    title: 'Skapa outfits med AI',
    body: 'På hemskärmen väljer du ett tillfälle – Jobb, Ledig eller Fest – och trycker en gång. Skrud sätter ihop en komplett outfit ur din egen garderob. Vill du kan du utgå från ett favoritplagg eller ett helt set.',
  },
  {
    title: 'Väder hela dagen',
    body: 'Skrud väger in hela dagens väderprognos – temperatur, väderomslag och risk för regn – och tar hänsyn till hur snabbt du fryser. Ser det ut att bli regn påminner appen dig om att ta med regnjackan eller paraplyet.',
  },
  {
    title: 'Set – plagg som hör ihop',
    body: 'Länka plagg som hör ihop, till exempel en kostym eller träningskläder. Du kan fortfarande styla dem var för sig, och med ett tryck bygga en outfit kring hela setet.',
  },
  {
    title: 'Håll koll på tvätten',
    body: 'Markera plagg som ligger i tvätten så att de inte föreslås förrän de är rena. När allt är tvättat tömmer du tvätten med ett tryck.',
  },
  {
    title: 'Ordning och överblick',
    body: 'Filtrera din garderob på kategori, färg, storlek och säsong. Spara plagg du vill köpa i köplistan, märk sådant du vill sälja i säljlistan, och arkivera det du inte använder just nu – med en notering om var det förvaras.',
  },
  {
    title: 'Färgpalett och capsule wardrobe',
    body: 'Gör en färganalys för att få din personliga palett med bas-, komplement- och accentfärger. Med capsule wardrobe ser du dina bästa basplagg och hur många outfits de kan bli.',
  },
  {
    title: 'En garderob för hela livet',
    body: 'Börja med din egen garderob. Med Skrud Premium kan du dela garderob med din partner och samla hela familjens kläder på ett ställe – samma app, oavsett var i livet du är.',
  },
  {
    title: 'Konto och data',
    body: 'Du äger dina uppgifter. Du kan när som helst radera ditt konto och all din data under Min profil → Radera konto.',
  },
  {
    title: 'Behöver du hjälp?',
    body: 'Hör av dig till oss på hej@kladkollen.se så hjälper vi dig.',
  },
]

export default function HowItWorks() {
  const t = useTheme()
  const styles = makeStyles(t)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Så funkar Skrud</Text>
        <Text style={styles.lede}>En snabb guide till hur du får ut mest av din digitala garderob.</Text>
        {SECTIONS.map(s => (
          <Text key={s.title}>
            <Text style={styles.heading}>{'\n'}{s.title}{'\n'}</Text>
            <Text style={styles.body}>{s.body}{'\n'}</Text>
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60, maxWidth: 720, alignSelf: 'center', width: '100%' },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: t.textPrimary, marginBottom: 8 },
  lede: { fontFamily: 'Lora_400Regular', fontSize: 16, color: t.textSecondary, lineHeight: 24 },
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary, lineHeight: 28 },
  body: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 22 },
})
