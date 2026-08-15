import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

// Egen toggle så på/av ser likadant ut på både native och webb.
// (RN-Switchens tumme får en grön standardfärg på webben som inte går att
//  styra med thumbColor.) Mörkbrun (temats primary) när på, neutral när av,
//  vit tumme.

export default function Toggle({
  value, onValueChange, disabled,
}: {
  value: boolean
  onValueChange: (v: boolean) => void
  disabled?: boolean
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={() => { if (!disabled) onValueChange(!value) }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.track,
        {
          backgroundColor: value ? t.primary : t.border,
          justifyContent: value ? 'flex-end' : 'flex-start',
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.thumb} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 16, padding: 3, flexDirection: 'row' },
  thumb: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
})
