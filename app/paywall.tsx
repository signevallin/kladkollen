import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useEntitlements } from '../utils/entitlements'
import { useSettings } from '../utils/settings'
import { showAlert } from '../utils/alert'
import { PurchasesUI, paywallUiAvailable, type PurchasePackage } from '../utils/purchases'

const BENEFITS: { icon: any; text: string }[] = [
  { icon: 'sparkles-outline', text: 'Obegränsade AI-outfits' },
  { icon: 'people-outline', text: 'Par-matchning' },
  { icon: 'happy-outline', text: 'Familjeläge – barnens storlekar & påminnelser' },
]

export default function Paywall() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const { packages, purchasesAvailable, isPro, purchase, restore, refresh, purchasesDebug } = useEntitlements()
  const [busy, setBusy] = useState(false)

  // RevenueCats designade paywall (från deras editor). Visas när UI-modulen finns
  // och användaren inte redan är Premium; annars faller vi tillbaka på den egna
  // skärmen nedan (web/utan native, eller om ingen paywall är kopplad).
  if (paywallUiAvailable && !isPro) {
    const RCPaywall = PurchasesUI.Paywall
    return (
      <RCPaywall
        style={{ flex: 1 }}
        onPurchaseCompleted={async () => { await refresh(); router.back() }}
        onRestoreCompleted={async () => { await refresh(); router.back() }}
        onDismiss={() => router.back()}
      />
    )
  }

  async function buy(pkg: PurchasePackage) {
    setBusy(true)
    const res = await purchase(pkg)
    setBusy(false)
    if (res.ok) { showAlert(tr('Välkommen till Skrud Premium! 🎉')); router.back() }
    else if (!res.cancelled) showAlert(tr('Något gick fel'), res.error || tr('Försök igen.'))
  }

  async function onRestore() {
    setBusy(true)
    const ok = await restore()
    setBusy(false)
    showAlert(ok ? tr('Ditt köp återställdes ✓') : tr('Inget köp att återställa'))
    if (ok) router.back()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} accessibilityLabel={tr('Stäng')}>
          <Ionicons name="close" size={24} color={t.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.brand}>SKRUD</Text>
        <Text style={styles.title}>{tr('Skrud Premium')}</Text>
        <Text style={styles.subtitle}>{tr('Lås upp hela din digitala garderob.')}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map(b => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIcon}><Ionicons name={b.icon} size={18} color={t.primary} /></View>
              <Text style={styles.benefitText}>{tr(b.text)}</Text>
            </View>
          ))}
        </View>

        {isPro ? (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={20} color={t.primary} />
            <Text style={styles.activeText}>{tr('Du har Skrud Premium.')}</Text>
          </View>
        ) : purchasesAvailable && packages.length > 0 ? (
          <View style={styles.plans}>
            {packages.map(pkg => (
              <TouchableOpacity key={pkg.id} style={[styles.plan, busy && styles.disabled]} onPress={() => buy(pkg)} disabled={busy}>
                <Text style={styles.planTitle}>{pkg.title}</Text>
                <Text style={styles.planPrice}>{pkg.priceString}</Text>
              </TouchableOpacity>
            ))}
            {busy && <ActivityIndicator color={t.primary} style={{ marginTop: 12 }} />}
          </View>
        ) : (
          <View style={styles.soonBox}>
            <Text style={styles.soonText}>{tr('Premium går snart att köpa här.')}</Text>
            {__DEV__ && (
              <Text style={styles.debugText}>
                {`SDK: ${purchasesAvailable ? 'på' : 'AV'} · RC-paywall-UI: ${paywallUiAvailable ? 'på' : 'AV (kräver native-bygge)'} · paket: ${packages.length}\n${purchasesDebug}`}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.restoreBtn} onPress={onRestore} disabled={busy}>
          <Text style={styles.restoreText}>{tr('Återställ köp')}</Text>
        </TouchableOpacity>

        <Text style={styles.subLegal}>{tr('Skrud Premium är en prenumeration som förnyas automatiskt. Betalningen dras från ditt Apple-ID vid köp och förnyas till samma pris om den inte sägs upp minst 24 timmar före periodens slut. Hantera eller säg upp i App Store-inställningarna.')}</Text>

        <View style={styles.legal}>
          <TouchableOpacity onPress={() => router.push('/terms')}><Text style={styles.legalLink}>{tr('Villkor')}</Text></TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}><Text style={styles.legalLink}>{tr('Integritetspolicy')}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingTop: 8 },
  closeBtn: { alignSelf: 'flex-end', padding: 6, marginBottom: 4 },
  brand: { fontFamily: 'Poppins_700Bold', fontSize: 14, letterSpacing: 4, color: t.textSecondary, textAlign: 'center' },
  title: { fontFamily: 'Lora_500Medium', fontSize: 30, color: t.textPrimary, textAlign: 'center', marginTop: 8 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 24 },

  benefits: { gap: 14, marginBottom: 26 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, flex: 1 },

  plans: { gap: 12 },
  plan: { backgroundColor: t.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: t.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  planPrice: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: t.primary },
  disabled: { opacity: 0.6 },

  activeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 18 },
  activeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  soonBox: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 18, alignItems: 'center' },
  soonText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, textAlign: 'center' },
  debugText: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, textAlign: 'center', marginTop: 8 },

  restoreBtn: { alignItems: 'center', paddingVertical: 16 },
  restoreText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textFaint, textDecorationLine: 'underline' },
  subLegal: { fontFamily: 'Lora_400Regular', fontSize: 11, lineHeight: 16, color: t.textFaint, textAlign: 'center', marginBottom: 12 },

  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  legalLink: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, textDecorationLine: 'underline' },
  legalDot: { color: t.textFaint },
})
