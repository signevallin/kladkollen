import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { COLOR_HEX } from '../../utils/constants'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Kompakt filterrad för köp-/säljlistan: kategori- och färgchips härledda ur
// listan (visas bara när det finns mer än ett värde att välja mellan).
// Presentation – parent äger filter-state.
type Props = {
  items: any[]
  category: string
  color: string
  onCategory: (c: string) => void
  onColor: (c: string) => void
}

export default function ListFilterBar({ items, category, color, onCategory, onColor }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))
  const colors = Array.from(new Set(items.map(i => i.color).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))

  const showCats = cats.length > 1
  const showColors = colors.length > 1
  if (!showCats && !showColors) return null

  return (
    <View style={styles.wrap}>
      {showCats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {['Alla', ...cats].map(c => {
            const active = category === c
            return (
              <TouchableOpacity key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => onCategory(c)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tr(c)}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
      {showColors && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {['Alla', ...colors].map(c => {
            const active = color === c
            return (
              <TouchableOpacity key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => onColor(c)}>
                {c !== 'Alla' && <View style={[styles.dot, { backgroundColor: COLOR_HEX[c] || t.surfaceMuted }]} />}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tr(c)}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrap: { gap: 8, marginBottom: 12 },
  row: { gap: 8, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  chipActive: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  chipTextActive: { color: t.onPrimary },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
})
