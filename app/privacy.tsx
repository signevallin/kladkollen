import { goBack } from '../utils/nav'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'

// Juridiskt dokument – hålls på engelska och alltid i ljust läge (som de publika
// webbsidorna), oberoende av appspråk/tema.
//
// ⚠️  Innehållet MÅSTE hållas identiskt med public/privacy.html – samma text
//     ligger på båda ställena, och det är den publika sidan Apple läser.
// ⚠️  Personuppgiftsansvarig i avsnitt 1 måste vara fullständig: namn, org.nr
//     OCH geografisk adress. GDPR art. 13.1(a) kräver identitet och kontakt-
//     uppgifter; e-handelslagen (2002:562) 8 § kräver dessutom adressen så
//     länge ni säljer prenumerationer. Ta aldrig bort någon av delarna.
// ⚠️  Texten beskriver hur appen FAKTISKT fungerar. Ändras bildlagring,
//     tredjepartsleverantörer eller lagringstider måste den här texten ändras
//     i samma PR – ett felaktigt påstående här är i sig ett GDPR-brott.
const C = { bg: '#FEFAF8', primary: '#402D21', secondary: '#6C4D38' }

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Who is responsible for your data?",
    body: "Elairis AB, company registration number 559590-4946, Sjuhäradsgatan 93, 441 95 Alingsås, Sweden, trading as Skrud (\u201cwe\u201d, \u201cus\u201d), is the data controller for the personal data processed in the app.\n\nYou can reach us at support@skrud.app with any question about your data, or to exercise any of the rights described in section 8.",
  },
  {
    title: "2. What data do we collect?",
    body: "Account details: email address and password (the password is stored hashed by our hosting provider Supabase). If you sign in with Apple or Google we receive an account identifier and, unless you hide it, your email address.\n\nProfile and preference details you provide to improve suggestions: name, gender, date of birth, how easily you get cold, life situation, style and colour preferences, style rules, music genres, season and free-text notes (e.g. things you want to avoid or your own wishes for a given occasion).\n\nContent you add: photos of garments and a profile picture, wardrobe data (category, colour, size, brand, price and where the garment is stored), outfits, wishlist and sale list, a calendar of planned outfits, trip plans (destination and dates), moodboard/inspiration images, and how often and when you wear your garments and your ratings of outfits.\n\nOptional colour analysis: a photo or details you provide about skin tone, undertone, hair and eye colour. If you use a photo, it is sent for analysis but never stored by us \u2014 only the resulting colour palette is saved to your profile. See section 4.\n\nOptional calendar access: if you grant calendar permission, the app reads the titles and times of your events for the current day in order to suggest an outfit that fits your plans. This happens entirely on your device \u2014 your calendar content is never sent to us or to anyone else, and is never stored. Only a short derived label (for example \u201cwork\u201d or \u201cevening out\u201d) is used, and only on the device. You can revoke the permission at any time in your phone\u2019s settings.\n\nOptional pregnancy mode: if you turn it on, we store that you are pregnant plus a due date, solely to adapt suggestions. No other health data is collected.\n\nHousehold and family (optional, Premium): if you link up with a partner or add family members, we store their name, any avatar and, for children, date of birth, gender and current size. See section 9 about adding data on other people.\n\nNotifications (optional): if you turn on notifications, we store a device identifier (push token) and your last known approximate location in order to send weather-based reminders. If you turn notifications off, this is removed.\n\nLocation: while you are in the app, your location is requested at low (approximate) accuracy, used in real time to fetch the current weather, and is not stored then. The exception is weather notifications above.\n\nPurchases: Premium purchases are handled by the App Store or Google Play and our subscription provider RevenueCat, which stores an app user identifier and your subscription status. We never see your card or payment details.\n\nReceipt import (optional): if you use import via email or store, we process the contents of the receipts you forward in order to create garments in your wardrobe.\n\nWaitlist (website): if you sign up for the waitlist on skrud.app before launch, we store your email address and, if you pick one, the life stage you selected (single, couple or family), so we can tell you when the app is available and understand who is waiting. We use it for nothing else. Ask us at support@skrud.app to be removed at any time, and the entry is also deleted if you later delete your Skrud account.\n\nCrash and performance data: if the app crashes or misbehaves we receive a technical error report through Sentry. It is configured not to send personal identifiers with the report.",
  },
  {
    title: "3. How the data is used, and on what legal basis",
    body: "The data is used solely to deliver the app\u2019s features: keeping your digital wardrobe, generating outfit suggestions and colour analyses with the help of AI, and showing weather-adapted recommendations. We never sell your data and never use it for advertising or profiling for advertising purposes.\n\nPerformance of a contract (Art. 6(1)(b) GDPR): your account, wardrobe, outfits, purchases and the features you actively use.\n\nConsent (Art. 6(1)(a) GDPR): camera and photo access, location, notifications, calendar access, colour analysis and pregnancy mode. Each is optional, is asked for separately, and can be withdrawn at any time \u2014 in the app or in your phone\u2019s settings \u2014 without losing access to the rest of the app.\n\nLegitimate interests (Art. 6(1)(f) GDPR): keeping the service secure and stable, including crash reporting and rate limiting against abuse.",
  },
  {
    title: "4. AI and other third parties",
    body: "We use a small number of processors to run the app. They act on our instructions only, and none of them uses your data for their own purposes or for advertising.\n\nOpenAI and Anthropic receive the relevant data when you use an AI feature \u2014 for example a photo of a garment, your wardrobe list, or a colour-analysis photo \u2014 in order to generate the response. Under their API terms this data is not used to train their models.\n\nReplicate receives a photo of a garment when the app removes its background, so the garment can be shown cut out in your wardrobe. The photo is processed to produce the cut-out and is not used for training.\n\nSupabase hosts the database, authentication and image storage.\n\nVercel runs the servers that sit between the app and the services above.\n\nRevenueCat handles subscription status. Sentry handles crash reports. Open-Meteo provides weather data and receives only an approximate location, never an account identifier.\n\nWhat is not sent: your calendar content never leaves your device (section 2). A photo used for colour analysis is sent for analysis but is never stored by us \u2014 we keep only the resulting palette.",
  },
  {
    title: "5. Transfers outside the EU/EEA",
    body: "Your account data, wardrobe data and images are stored with Supabase in the EU (region eu-west-1, Ireland).\n\nHowever, some processing takes place outside the EU/EEA. OpenAI, Anthropic, Replicate, RevenueCat, Sentry and Vercel are established in the United States, and our server functions run on Vercel\u2019s global network. This means that data you send to an AI feature \u2014 including garment photos and a colour-analysis photo \u2014 is transferred to the United States.\n\nThese transfers are made under the European Commission\u2019s Standard Contractual Clauses and, where the provider is certified, the EU\u2013US Data Privacy Framework. You can request a copy of the safeguards in place by contacting support@skrud.app.",
  },
  {
    title: "6. Storage and security",
    body: "All traffic between the app and our servers is encrypted with TLS, and data is encrypted at rest by our hosting provider.\n\nYour images are stored in a private storage bucket. They are not publicly accessible and cannot be reached without a valid link that we generate for your signed-in session; those links are time-limited and expire. Access rules on the storage layer restrict every image to the account that uploaded it, and to the members of your household if you have enabled partner or family mode.\n\nPasswords are hashed and never stored in readable form, and we never see your payment details.",
  },
  {
    title: "7. How long we keep your data",
    body: "We keep your data for as long as you have an account.\n\nWhen you delete your account, your profile, wardrobe, outfits, images, trips, household membership and all related records are permanently deleted straight away, and cannot be recovered. If you were the last member of a household, the household and any family members you had added are deleted with it. Encrypted backups held by our hosting provider are rotated out within 30 days.\n\nImported receipts are kept as pending imports until you either add them to your wardrobe or discard them. Crash reports are retained by Sentry for up to 90 days. Links generated to display your images expire after at most 30 days.",
  },
  {
    title: "8. Your rights",
    body: "Under the GDPR you have the right to access your data, to have it rectified, to have it erased, to restrict or object to processing, to withdraw a consent you have given, and to data portability.\n\nErasure: you can delete your account and all your data at any time directly in the app, under My profile \u2192 Delete account. This is immediate and permanent.\n\nAccess and portability: contact us at support@skrud.app and we will send you a machine-readable copy of your data. We answer within one month.\n\nWithdrawing consent: turn off the relevant feature in the app, or revoke the permission in your phone\u2019s settings. Camera, photos, location, notifications and calendar access can all be revoked without affecting the rest of the app.\n\nComplaints: if you believe we handle your data incorrectly, you have the right to lodge a complaint with the Swedish Authority for Privacy Protection (Integritetsskyddsmyndigheten, imy.se) or with the supervisory authority in your country of residence.",
  },
  {
    title: "9. Children and data about other people",
    body: "Skrud is intended for adults. The app is not directed at children and we do not knowingly create accounts for children.\n\nIn family mode, an adult can add family members, including their own children, in order to keep track of their clothes and sizes. When you do this you are adding personal data about another person, and we process it on your instructions to provide that feature. Add data about another person only where you are entitled to do so \u2014 as their parent or guardian, or with their agreement.\n\nYou can remove a family member at any time in the app, which deletes their data. If you believe a child\u2019s data has been added to Skrud without the right to do so, contact us at support@skrud.app and we will delete it.",
  },
  {
    title: "10. Changes",
    body: "We may update this policy. Significant changes are announced in the app. Last updated: August 2026.",
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
