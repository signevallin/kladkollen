import { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'

// Enhetliga laddnings-/fel-/tomlägen. Wrappa datadrivet innehåll så alla skärmar
// beter sig likadant i stället för att vissa visar spinner och andra bara tomt.
type Props = {
  loading: boolean
  error?: Error | null
  isEmpty?: boolean
  onRetry?: () => void
  emptyText?: string
  emptyIcon?: ReactNode
  children: ReactNode
}

export default function QueryState({ loading, error, isEmpty, onRetry, emptyText, emptyIcon, children }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Något gick fel</Text>
        <Text style={styles.sub}>Kontrollera din uppkoppling och försök igen.</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry} accessibilityRole="button">
            <Text style={styles.retryText}>Försök igen</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (isEmpty) {
    return (
      <View style={styles.center}>
        {emptyIcon}
        <Text style={styles.sub}>{emptyText || 'Inget att visa än.'}</Text>
      </View>
    )
  }

  return <>{children}</>
}

const makeStyles = (t: Theme) => StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  sub: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 21 },
  retryBtn: { marginTop: 6, backgroundColor: t.surfaceMuted, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: t.border },
  retryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
})
