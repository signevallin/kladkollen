import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { router } from 'expo-router'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'

// OBS: Detta är en mall. Låt en jurist granska texten och fyll i
// företagsuppgifterna innan appen börjar säljas.
const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Vem ansvarar för dina uppgifter?',
    body: 'Klädkollen ("vi") är personuppgiftsansvarig för de uppgifter som behandlas i appen. Kontakta oss på hej@kladkollen.se vid frågor om din data.',
  },
  {
    title: '2. Vilka uppgifter samlar vi in?',
    body: 'Kontouppgifter: emailadress och lösenord (lösenordet lagras krypterat hos vår driftleverantör Supabase).\n\nInnehåll du själv lägger in: foton på plagg, profilbild, garderobsdata, outfits, köplista, moodboard och stilpreferenser.\n\nValfria uppgifter för färganalys: foto eller uppgifter om hudton, hårfärg och ögonfärg som du själv anger.\n\nPlats: om du tillåter platsåtkomst används din position endast för att hämta aktuellt väder. Positionen sparas inte.',
  },
  {
    title: '3. Hur används uppgifterna?',
    body: 'Uppgifterna används enbart för att leverera appens funktioner: hålla din digitala garderob, generera outfitförslag och färganalyser med hjälp av AI, samt visa väderanpassade rekommendationer. Vi säljer aldrig dina uppgifter och använder dem inte för reklam.',
  },
  {
    title: '4. AI-behandling',
    body: 'När du använder AI-funktionerna skickas relevanta uppgifter (t.ex. ett foto på ett plagg eller din garderobslista) till våra AI-leverantörer (OpenAI och Anthropic) via våra servrar för att generera svaret. Uppgifterna används inte av leverantörerna för att träna deras modeller enligt deras API-villkor.',
  },
  {
    title: '5. Lagring och säkerhet',
    body: 'Din data lagras hos Supabase inom EU (region eu-west-1, Irland). Bilder lagras i privat lagring och nås endast via tidsbegränsade signerade länkar. All trafik är krypterad.',
  },
  {
    title: '6. Dina rättigheter',
    body: 'Enligt GDPR har du rätt att få tillgång till, rätta och radera dina uppgifter samt invända mot behandling. Du kan när som helst radera ditt konto och all din data direkt i appen under Min profil → Radera konto. Du kan också kontakta oss på hej@kladkollen.se.',
  },
  {
    title: '7. Ändringar',
    body: 'Vi kan uppdatera denna policy. Väsentliga ändringar meddelas i appen. Senast uppdaterad: juli 2026.',
  },
]

export default function Privacy() {
  const t = useTheme()
  const styles = makeStyles(t)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Integritetspolicy</Text>
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
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary, lineHeight: 28 },
  body: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 22 },
})
