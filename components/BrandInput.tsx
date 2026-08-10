import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { brandSuggestions } from '../utils/brands'
import { useSettings } from '../utils/settings'

// Textfält för märke med autocomplete – slår ihop egna märken och en inbyggd
// lista, så samma märke stavas likadant varje gång.
export default function BrandInput({
  value, onChange, ownBrands, placeholder = 'Märke (valfritt)',
}: {
  value: string
  onChange: (v: string) => void
  ownBrands: string[]
  placeholder?: string
}) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const [focused, setFocused] = useState(false)
  const suggestions = focused ? brandSuggestions(value, ownBrands) : []
  const showList = suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0].toLowerCase() === value.toLowerCase())

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={tr(placeholder)}
        placeholderTextColor={t.placeholder}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {showList && (
        <View style={styles.suggestBox}>
          {suggestions.map(s => (
            <TouchableOpacity key={s} style={styles.suggestItem} onPress={() => { onChange(s); setFocused(false) }}>
              <Text style={styles.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Samma bottenmarginal som övriga fält så mellanrummet till nästa rubrik matchar.
  container: { marginBottom: 16 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border },
  suggestBox: { backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, marginTop: 4, overflow: 'hidden' },
  suggestItem: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  suggestText: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textPrimary },
})
