import { goBack } from '../utils/nav'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'

// Juridiskt dokument – hålls på engelska och alltid i ljust läge (som de publika
// webbsidorna), oberoende av appspråk/tema. OBS: mall – låt en jurist granska
// texten och fyll i företagsuppgifterna innan appen börjar säljas.
const C = { bg: '#FEFAF8', primary: '#402D21', secondary: '#6C4D38' }

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Who is responsible for your data?',
    body: 'Skrud ("we") is the data controller for the data processed in the app. Contact us at support@skrud.app with any questions about your data.',
  },
  {
    title: '2. What data do we collect?',
    body: 'Account details: email address and password (the password is stored encrypted with our hosting provider Supabase).\n\n' +
      'Profile and preference details you provide to improve suggestions: name, gender, date of birth, how easily you get cold, life situation, style and colour preferences, style rules, music genres, season and free-text notes (e.g. things you want to avoid or your own wishes for a given occasion).\n\n' +
      'Content you add: photos of garments and a profile picture, wardrobe data (category, colour, size, brand, price and where the garment is stored), outfits, wishlist and sale list, a calendar of planned outfits, trip plans (destination and dates), moodboard/inspiration images, and how often and when you wear your garments and your ratings of outfits.\n\n' +
      'Optional colour analysis: a photo or details you provide about skin tone, undertone, hair and eye colour.\n\n' +
      'Optional pregnancy mode: if you turn it on, we store that you are pregnant plus a due date, solely to adapt suggestions. No other health data is collected.\n\n' +
      'Household and family (optional, Premium): if you link up with a partner or add family members, we store their name, any avatar and, for children, date of birth, gender and current size. Only add details about other people if you have the right to do so.\n\n' +
      'Notifications (optional): if you turn on notifications, we store a device identifier (push token) and your last known location in order to send weather-based reminders. If you turn notifications off, this is removed.\n\n' +
      'Location: while you are in the app, your location is used in real time to fetch the current weather and is not stored then. (Exception: weather notifications above.)\n\n' +
      'Purchases: Premium purchases are handled by the App Store or Google Play and our subscription provider RevenueCat, which stores an app user identifier and your subscription status. We never see your card or payment details.\n\n' +
      'Receipt import (optional): if you use import via email or store, we process the contents of the receipts you forward in order to create garments in your wardrobe.',
  },
  {
    title: '3. How is the data used?',
    body: 'The data is used solely to deliver the app’s features: keeping your digital wardrobe, generating outfit suggestions and colour analyses with the help of AI, and showing weather-adapted recommendations. We never sell your data and do not use it for advertising.',
  },
  {
    title: '4. AI processing',
    body: 'When you use the AI features, relevant data (e.g. a photo of a garment or your wardrobe list) is sent to our AI providers (OpenAI and Anthropic) via our servers to generate the response. The data is not used by the providers to train their models, per their API terms.',
  },
  {
    title: '5. Storage and security',
    body: 'Your data is stored with Supabase within the EU (region eu-west-1, Ireland). Images are stored in private storage and accessed only via time-limited signed links. All traffic is encrypted.',
  },
  {
    title: '6. Your rights',
    body: 'Under GDPR you have the right to access, rectify and erase your data, and to object to processing. You can delete your account and all your data at any time directly in the app under My profile → Delete account. You can also contact us at support@skrud.app.',
  },
  {
    title: '7. Changes',
    body: 'We may update this policy. Significant changes are announced in the app. Last updated: August 2026.',
  },
]

export default function Privacy() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy policy</Text>
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
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24, paddingBottom: 60, maxWidth: 720, alignSelf: 'center', width: '100%' },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: C.secondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 32, color: C.primary, marginBottom: 8 },
  heading: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: C.primary, lineHeight: 28 },
  body: { fontFamily: 'Lora_400Regular', fontSize: 14, color: C.secondary, lineHeight: 22 },
})
