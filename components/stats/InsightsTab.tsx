import { MaterialIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import { useSettings } from '../../utils/settings'
import { buildInsights } from '../../utils/insights'

// "Insikter"-fliken i statistiken: personliga, stylist-lika slutsatser ur
// användarens egen data (beräknas i utils/insights.ts). Ren presentation.
type Props = {
  garments: any[]
  outfits: any[]
  calendar: { date: string; outfit_id: string | null }[]
}

export default function InsightsTab({ garments, outfits, calendar }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, formatPrice } = useSettings()

  const insights = useMemo(
    () => buildInsights({ garments, outfits, calendar, tr, formatPrice }),
    [garments, outfits, calendar, tr, formatPrice]
  )

  if (insights.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="auto-awesome" size={32} color={t.textFaint} />
        <Text style={styles.emptyText}>
          {tr('Fortsätt använda garderoben och logga outfits så lär jag känna din stil – dina insikter dyker upp här.')}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.list}>
      <Text style={styles.intro}>{tr('Vad din garderob berättar om dig.')}</Text>
      {insights.map((ins, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name={ins.icon as any} size={20} color={t.primary} />
          </View>
          <Text style={styles.cardText}>{ins.text}</Text>
        </View>
      ))}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  list: { gap: 10 },
  intro: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  cardText: { flex: 1, fontFamily: 'Lora_500Medium', fontSize: 15, color: t.textPrimary, lineHeight: 22 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 12 },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 21, fontStyle: 'italic' },
})
