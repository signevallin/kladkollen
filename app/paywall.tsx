import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../supabase'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useEntitlements } from '../utils/entitlements'
import { useSettings } from '../utils/settings'
import { showAlert } from '../utils/alert'
import { packageIsAnnual, packageTier, type PurchasePackage, type Tier } from '../utils/purchases'

// Nivåerna och vad som ingår (svensk källtext, översätts via tr).
const TIERS: { key: Exclude<Tier, 'none'>; name: string; features: string[] }[] = [
  { key: 'single', name: 'Singel', features: ['Obegränsade AI-outfits', 'Färganalys', 'Analysera garderoben med AI'] },
  { key: 'partner', name: 'Partner', features: ['Allt i Singel', 'Par-läge – dela & matcha outfits', 'Gravidläge'] },
  { key: 'family', name: 'Familj', features: ['Allt i Partner', 'Barnens garderober & storlekar', 'Växt-påminnelser'] },
]

// life_mode (single/couple/family) → förvald nivå.
const LIFEMODE_TO_TIER: Record<string, Exclude<Tier, 'none'>> = { single: 'single', couple: 'partner', family: 'family' }

export default function Paywall() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const { packages, purchasesAvailable, isPro, purchase, restore, purchasesDebug } = useEntitlements()
  const [busy, setBusy] = useState(false)
  const [annual, setAnnual] = useState(true)
  const [selected, setSelected] = useState<Exclude<Tier, 'none'>>('single')

  // Förvälj nivå efter användarens livssituation.
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('life_mode').eq('id', user.id).maybeSingle()
        const lm = (data as { life_mode?: string } | null)?.life_mode || 'single'
        setSelected(LIFEMODE_TO_TIER[lm] || 'single')
      } catch { /* behåll 'single' */ }
    })()
  }, [])

  const pkgFor = useMemo(() => (tier: Tier, wantAnnual: boolean): PurchasePackage | undefined =>
    packages.find(p => packageTier(p) === tier && packageIsAnnual(p) === wantAnnual), [packages])

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

  const canBuy = purchasesAvailable && packages.length > 0

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} accessibilityLabel={tr('Stäng')}>
          <Ionicons name="close" size={24} color={t.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.brand}>SKRUD</Text>
        <Text style={styles.title}>{tr('Välj din plan')}</Text>
        <Text style={styles.subtitle}>{tr('Lås upp hela din digitala garderob.')}</Text>

        {isPro ? (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={20} color={t.primary} />
            <Text style={styles.activeText}>{tr('Du har redan Skrud Premium.')}</Text>
          </View>
        ) : !canBuy ? (
          <View style={styles.soonBox}>
            <Text style={styles.soonText}>{tr('Premium går snart att köpa här.')}</Text>
            {__DEV__ && <Text style={styles.debugText}>{`SDK: ${purchasesAvailable ? 'på' : 'AV'} · paket: ${packages.length}\n${purchasesDebug}`}</Text>}
          </View>
        ) : (
          <>
            {/* Månad/År-växlare */}
            <View style={styles.periodToggle}>
              {[['month', false], ['year', true]].map(([label, isYear]) => (
                <TouchableOpacity
                  key={String(label)}
                  style={[styles.periodBtn, annual === isYear && styles.periodBtnActive]}
                  onPress={() => setAnnual(isYear as boolean)}
                >
                  <Text style={[styles.periodBtnText, annual === isYear && styles.periodBtnTextActive]}>
                    {isYear ? tr('År') : tr('Månad')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tiers}>
              {TIERS.map(tier => {
                const pkg = pkgFor(tier.key, annual)
                const isSel = selected === tier.key
                return (
                  <TouchableOpacity
                    key={tier.key}
                    activeOpacity={0.85}
                    style={[styles.tierCard, isSel && styles.tierCardSel]}
                    onPress={() => setSelected(tier.key)}
                  >
                    <View style={styles.tierHead}>
                      <Text style={styles.tierName}>{tr(tier.name)}</Text>
                      {isSel && <View style={styles.badge}><Text style={styles.badgeText}>{tr('Rekommenderas för dig')}</Text></View>}
                    </View>
                    <Text style={styles.tierPrice}>{pkg ? pkg.priceString : '—'}<Text style={styles.tierPer}>{annual ? tr('/år') : tr('/mån')}</Text></Text>
                    <View style={styles.featureList}>
                      {tier.features.map(f => (
                        <View key={f} style={styles.featureRow}>
                          <Ionicons name="checkmark" size={16} color={t.primary} />
                          <Text style={styles.featureText}>{tr(f)}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[styles.cta, (busy || !pkgFor(selected, annual)) && styles.disabled]}
              disabled={busy || !pkgFor(selected, annual)}
              onPress={() => { const p = pkgFor(selected, annual); if (p) buy(p) }}
            >
              {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.ctaText}>{tr('Fortsätt')}</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.restoreBtn} onPress={onRestore} disabled={busy}>
          <Text style={styles.restoreText}>{tr('Återställ köp')}</Text>
        </TouchableOpacity>

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

  periodToggle: { flexDirection: 'row', backgroundColor: t.surfaceMuted, borderRadius: 999, padding: 4, alignSelf: 'center', marginBottom: 20 },
  periodBtn: { paddingVertical: 8, paddingHorizontal: 26, borderRadius: 999 },
  periodBtnActive: { backgroundColor: t.primary },
  periodBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textSecondary },
  periodBtnTextActive: { color: t.onPrimary },

  tiers: { gap: 14 },
  tierCard: { backgroundColor: t.surface, borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: t.border },
  tierCardSel: { borderColor: t.primary, backgroundColor: t.surfaceMuted },
  tierHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  tierName: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary },
  badge: { backgroundColor: t.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: t.onPrimary },
  tierPrice: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: t.primary, marginBottom: 10 },
  tierPer: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary },
  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, flex: 1 },

  cta: { backgroundColor: t.primary, borderRadius: 999, paddingVertical: 17, alignItems: 'center', marginTop: 22 },
  ctaText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: t.onPrimary },
  disabled: { opacity: 0.5 },

  activeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 18 },
  activeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  soonBox: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 18, alignItems: 'center' },
  soonText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, textAlign: 'center' },
  debugText: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, textAlign: 'center', marginTop: 8 },

  restoreBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  restoreText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textFaint, textDecorationLine: 'underline' },

  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  legalLink: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, textDecorationLine: 'underline' },
  legalDot: { color: t.textFaint },
})
