import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Byt ut-arket för ett plagg i en outfit. Presentationskomponent – parent äger
// datan (alternativen) och handlers. Används både för singel- och par-outfiten.
type Props = {
  visible: boolean
  title: string
  alternatives: any[]
  emptyText: string
  onClose: () => void
  onRemove: () => void
  onReplace: (g: any) => void
}

export default function SwapSheet({ visible, title, alternatives, emptyText, onClose, onRemove, onReplace }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.swapOverlay}>
        <View style={styles.swapSheet}>
          <View style={styles.swapHeader}>
            <Text style={styles.swapTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel={tr('Stäng')} accessibilityRole="button">
              <Text style={styles.swapClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.swapRemoveBtn} onPress={onRemove}>
            <Text style={styles.swapRemoveText}>{tr('Ta bort ur outfiten')}</Text>
          </TouchableOpacity>

          {alternatives.length === 0 ? (
            <View style={styles.swapEmpty}>
              <Text style={styles.swapEmptyText}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              data={alternatives}
              numColumns={3}
              keyExtractor={g => g.id}
              renderItem={({ item: g }) => (
                <TouchableOpacity style={styles.swapAlt} onPress={() => onReplace(g)}>
                  {g.image_url
                    ? <SignedImage path={g.image_url} style={styles.swapAltImage} resizeMode="contain" transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                    : <View style={[styles.swapAltImage, styles.swapAltEmpty]} />
                  }
                  <Text style={styles.swapAltName} numberOfLines={1}>{g.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  swapOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  swapSheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  swapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  swapTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary, flex: 1 },
  swapClose: { color: t.textSecondary, fontSize: 20 },
  swapRemoveBtn: { backgroundColor: t.surfaceMuted, borderRadius: t.radius.md, padding: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: t.border },
  swapRemoveText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 14 },
  swapEmpty: { padding: 28, alignItems: 'center' },
  swapEmptyText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  swapAlt: { flex: 1 / 3, margin: 4, alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: t.border },
  swapAltImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  swapAltEmpty: { alignItems: 'center', justifyContent: 'center' },
  swapAltName: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' },
})
