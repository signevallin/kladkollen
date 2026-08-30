import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useSettings } from '../utils/settings'

// "Smart köp?"-bedömning från api/evaluate-purchase. Delas av köp-skanningen
// (WishlistAddModals) och köplistepostens detaljvy (garment-detail).
export type PurchaseEval = {
  garment: { name: string; category: string; subcategory: string; color: string; seasons: string[] }
  verdict: 'smart' | 'maybe' | 'skip'
  score: number
  headline: string
  reasons: string[]
  pairsWith: string[]
  gap: boolean
  duplicate: boolean
}

export default function PurchaseEvalResult({ result }: { result: PurchaseEval }) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const v = result.verdict
  const col = v === 'smart' ? t.primary : v === 'skip' ? t.danger : t.textSecondary
  const label = v === 'smart' ? tr('Smart köp') : v === 'skip' ? tr('Tänk efter') : tr('Kanske')

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={[styles.verdictBadge, { backgroundColor: col }]}>
        <Text style={styles.verdictBadgeText}>{label}</Text>
      </View>

      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${result.score}%`, backgroundColor: col }]} />
      </View>
      <Text style={styles.scoreLabel}>{tr('Matchning med din garderob')}: {result.score}/100</Text>

      {!!result.headline && <Text style={styles.headline}>{result.headline}</Text>}

      {result.reasons.length > 0 && (
        <View style={styles.reasons}>
          {result.reasons.map((r, i) => (
            <View key={i} style={styles.reasonRow}>
              <Text style={styles.reasonDot}>•</Text>
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {result.pairsWith.length > 0 && (
        <View style={styles.pairsBox}>
          <Text style={styles.pairsLabel}>{tr('Passar ihop med')}</Text>
          <Text style={styles.pairsText}>{result.pairsWith.join(' · ')}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  verdictBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  verdictBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: t.onPrimary },
  scoreBarTrack: { height: 8, borderRadius: 4, backgroundColor: t.surfaceMuted, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, marginTop: 6, marginBottom: 14 },
  headline: { fontFamily: 'Lora_500Medium', fontSize: 17, color: t.textPrimary, lineHeight: 24, marginBottom: 14 },
  reasons: { gap: 8, marginBottom: 16 },
  reasonRow: { flexDirection: 'row', gap: 8 },
  reasonDot: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: t.primary, lineHeight: 20 },
  reasonText: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 20 },
  pairsBox: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14 },
  pairsLabel: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1, color: t.textFaint, marginBottom: 4 },
  pairsText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textPrimary, lineHeight: 20 },
})
