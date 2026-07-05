import { router } from 'expo-router'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'

// OBS: Detta är en mall. Låt en jurist granska texten och fyll i
// företagsuppgifterna innan appen börjar säljas.
const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Om tjänsten',
    body: 'Klädkollen är en digital garderobstjänst som hjälper dig organisera dina kläder och få AI-genererade outfit- och stilförslag. Genom att skapa ett konto godkänner du dessa villkor.',
  },
  {
    title: '2. Ditt konto',
    body: 'Du ansvarar för att hålla dina inloggningsuppgifter hemliga och för aktivitet som sker via ditt konto. Du måste vara minst 16 år för att använda tjänsten.',
  },
  {
    title: '3. Ditt innehåll',
    body: 'Du äger de bilder och uppgifter du laddar upp. Du ger oss rätt att lagra och behandla innehållet i den utsträckning som krävs för att leverera tjänsten. Ladda inte upp innehåll du saknar rätt till eller som är olagligt.',
  },
  {
    title: '4. AI-genererade förslag',
    body: 'Outfitförslag, färganalyser och liknande genereras av AI och är just förslag – vi lämnar inga garantier om att de passar dig eller är felfria.',
  },
  {
    title: '5. Tillgänglighet och ändringar',
    body: 'Vi strävar efter hög tillgänglighet men garanterar inte att tjänsten alltid är fri från avbrott. Vi kan ändra, lägga till eller ta bort funktioner. Väsentliga försämringar meddelas i förväg.',
  },
  {
    title: '6. Uppsägning',
    body: 'Du kan när som helst avsluta ditt konto under Min profil → Radera konto, varvid all din data raderas. Vi kan stänga av konton som bryter mot villkoren.',
  },
  {
    title: '7. Ansvarsbegränsning',
    body: 'Tjänsten tillhandahålls i befintligt skick. I den utsträckning lagen tillåter ansvarar vi inte för indirekta skador. Inget i dessa villkor begränsar dina rättigheter som konsument enligt tvingande lag.',
  },
  {
    title: '8. Kontakt',
    body: 'Frågor om villkoren? Kontakta oss på hej@kladkollen.se. Senast uppdaterad: juli 2026.',
  },
]

export default function Terms() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Användarvillkor</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24, paddingBottom: 60, maxWidth: 720, alignSelf: 'center', width: '100%' },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#C4737A', fontSize: 15 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FBF3EF', marginBottom: 8 },
  heading: { fontSize: 17, fontWeight: '700', color: '#FBF3EF', lineHeight: 28 },
  body: { fontSize: 14, color: '#DDA0A7', lineHeight: 22 },
})
