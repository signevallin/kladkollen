import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

type Variant = 'primary' | 'secondary' | 'danger'

type Props = {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  accessibilityLabel?: string
}

// Central knapp. Ändra knapparnas utseende här så slår det igenom i hela appen.
export default function Button({
  label, onPress, variant = 'primary', loading, disabled, style, accessibilityLabel,
}: Props) {
  const t = useTheme()

  const bg =
    variant === 'primary' ? t.primary
    : variant === 'danger' ? 'transparent'
    : 'transparent'
  const border =
    variant === 'secondary' ? t.border
    : variant === 'danger' ? t.danger
    : 'transparent'
  const fg =
    variant === 'primary' ? t.onPrimary
    : variant === 'danger' ? t.danger
    : t.textPrimary

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      style={[
        styles.base,
        { backgroundColor: bg, borderColor: border, borderRadius: t.radius.lg, opacity: disabled ? 0.5 : 1 },
        variant !== 'primary' && styles.outlined,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={fg} size="small" />
        : <Text style={[styles.label, { color: fg }]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  outlined: { borderWidth: 1 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
})
