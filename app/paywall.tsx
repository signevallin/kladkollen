import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useEntitlements } from '../utils/entitlements'
import { useSettings } from '../utils/settings'
import { showAlert } from '../utils/alert'
import {
  periodFromProductId, purchasesEnv, tierFromProductId,
  type BillingPeriod, type PurchasePackage, type Tier,
} from '../utils/purchases'

// Nivåerna i stigande ordning. Punkterna är medvetet formulerade som "Allt i X"
// uppåt, så att det syns att högre nivå inkluderar lägre – det är så
// entitlements är upplagda i RevenueCat.
const TIERS: { tier: Exclude<Tier, 'none'>; name: string; perks: string[] }[] = [
  {
    tier: 'single', name: 'Singel',
    perks: ['Obegränsade AI-outfits', 'Personlig färganalys', 'Djup garderobsstatistik'],
  },
  {
    tier: 'partner', name: 'Partner',
    perks: ['Allt i Singel', 'Par-matchning – klä er tillsammans', 'Gravid- och amningsläge'],
  },
  {
    tier: 'family', name: 'Familj',
    perks: ['Allt i Partner', 'Barnens garderober och storlekar', 'Delad kalender och packlistor'],
  },
]

export default function Paywall() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const { packages, purchasesAvailable, isPro, purchase, restore, purchasesDebug } = useEntitlements()
  const [busy, setBusy] = useState(false)
  const [period, setPeriod] = useState<BillingPeriod>('year')

  // Paketen kommer som en platt lista ur RevenueCats current offering (sex
  // stycken: tre nivåer × månad/år). Nyckla dem på nivå+period så skärmen kan
  // visa tre kort i taget i stället för allt på en gång.
  const byTier = useMemo(() => {
    const m = new Map<string, PurchasePackage>()
    for (const p of packages) {
      const tier = tierFromProductId(p.productId)
      const per = periodFromProductId(p.productId)
      if (tier === 'none' || !per) continue
      m.set(`${tier}:${per}`, p)
    }
    return m
  }, [packages])

  const hasMonthly = TIERS.some(x => byTier.has(`${x.tier}:month`))
  const hasYearly = TIERS.some(x => byTier.has(`${x.tier}:year`))
  // Håll oss till en period som faktiskt finns – annars blir skärmen tom om
  // offeringen bara innehåller den ena.
  const shown: BillingPeriod = period === 'year' ? (hasYearly ? 'year' : 'month') : (hasMonthly ? 'month' : 'year')

  const rows = TIERS
    .map(x => ({ ...x, pkg: byTier.get(`${x.tier}:${shown}`) }))
    .filter((x): x is typeof x & { pkg: PurchasePackage } => !!x.pkg)

  // Årsrabatt räknad på den billigaste nivån som har båda perioderna. Visas bara
  // när båda priserna gick att läsa som tal.
  const savingPct = useMemo(() => {
    for (const x of TIERS) {
      const m = byTier.get(`${x.tier}:month`), y = byTier.get(`${x.tier}:year`)
      if (m?.price && y?.price) {
        const pct = Math.round((1 - y.price / (m.price * 12)) * 100)
        if (pct > 0 && pct < 100) return pct
      }
    }
    return null
  }, [byTier])

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

        {isPro ? (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={20} color={t.primary} />
            <Text style={styles.activeText}>{tr('Du har Skrud Premium.')}</Text>
          </View>
        ) : rows.length > 0 ? (
          <>
            {hasMonthly && hasYearly && (
              <View style={styles.periodSwitch}>
                {(['month', 'year'] as const).map(pp => (
                  <TouchableOpacity
                    key={pp}
                    style={[styles.periodOption, shown === pp && styles.periodOptionActive]}
                    onPress={() => setPeriod(pp)}
                  >
                    <Text style={[styles.periodText, shown === pp && styles.periodTextActive]}>
                      {tr(pp === 'month' ? 'Månad' : 'År')}
                      {pp === 'year' && savingPct ? `  −${savingPct}%` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.plans}>
              {rows.map(row => (
                <TouchableOpacity
                  key={row.tier}
                  style={[styles.plan, busy && styles.disabled]}
                  onPress={() => buy(row.pkg)}
                  disabled={busy}
                >
                  <View style={styles.planHead}>
                    <Text style={styles.planTitle}>{tr(row.name)}</Text>
                    <Text style={styles.planPrice}>
                      {row.pkg.priceString}
                      <Text style={styles.planPer}>{tr(shown === 'month' ? '/mån' : '/år')}</Text>
                    </Text>
                  </View>
                  {row.perks.map(perk => (
                    <View key={perk} style={styles.perkRow}>
                      <Ionicons name="checkmark" size={15} color={t.primary} />
                      <Text style={styles.perkText}>{tr(perk)}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              ))}
              {busy && <ActivityIndicator color={t.primary} style={{ marginTop: 12 }} />}
            </View>
          </>
        ) : purchasesAvailable && packages.length > 0 ? (
          // Reserv: offeringen ser inte ut som tre nivåer × två perioder (t.ex.
          // ommöblerad i RevenueCat). Lista paketen rakt av i stället för att
          // visa en tom skärm.
          <View style={styles.plans}>
            {packages.map(pkg => (
              <TouchableOpacity key={pkg.id} style={[styles.plan, busy && styles.disabled]} onPress={() => buy(pkg)} disabled={busy}>
                <View style={styles.planHead}>
                  <Text style={styles.planTitle}>{pkg.title}</Text>
                  <Text style={styles.planPrice}>{pkg.priceString}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {busy && <ActivityIndicator color={t.primary} style={{ marginTop: 12 }} />}
          </View>
        ) : (
          <View style={styles.soonBox}>
            <Text style={styles.soonText}>{tr('Premium går snart att köpa här.')}</Text>
            {/* Syns bara när inga paket kunde hämtas, alltså i det trasiga
                läget. En vanlig användare får aldrig se raden. */}
            <Text style={styles.debugText}>{`${purchasesEnv}\n${purchasesDebug}`}</Text>
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
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 22 },

  periodSwitch: { flexDirection: 'row', backgroundColor: t.surfaceMuted, borderRadius: 999, padding: 4, marginBottom: 16 },
  periodOption: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  periodOptionActive: { backgroundColor: t.primary },
  periodText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textSecondary },
  periodTextActive: { color: t.bg },

  plans: { gap: 12 },
  plan: { backgroundColor: t.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: t.border, gap: 8 },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  planTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: t.textPrimary },
  planPrice: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.primary },
  planPer: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textFaint },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  perkText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, flex: 1 },
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
