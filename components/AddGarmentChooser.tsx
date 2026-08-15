import { router } from 'expo-router'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useSettings } from '../utils/settings'

// Delad valruta för "Lägg till plagg" så att flödet ser likadant ut oavsett
// varifrån man öppnar det (hemskärmen, garderoben, ...). Tidigare gick plus →
// "Lägg till plagg" från hemskärmen rakt in i den helsides-vyn i stället.
export default function AddGarmentChooser({
  visible, onClose, person, personName,
}: {
  visible: boolean
  onClose: () => void
  person?: string
  personName?: string
}) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  // I barn-läge förväljs barnet så alla flöden (foto/import) taggar plaggen
  // med rätt person. personQs börjar med &, personQ1 med ? (för rena rutter).
  const personQs = person ? `&person=${person}&personName=${encodeURIComponent(personName || '')}` : ''
  const personQ1 = person ? `?person=${person}&personName=${encodeURIComponent(personName || '')}` : ''

  function goto(path: string) {
    onClose()
    router.push(path as any)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{tr('Lägg till plagg')}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel={tr('Stäng')} accessibilityRole="button">
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.choiceBtn} onPress={() => goto(`/add-garment?start=photos${personQs}`)}>
            <Text style={styles.choiceTitle}>{tr('Välj foton')}</Text>
            <Text style={styles.choiceHint}>{tr('Välj ett eller flera plagg – AI fyller i detaljerna & tar bort bakgrunden')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choiceBtn} onPress={() => goto(`/import-purchases${personQ1}`)}>
            <Text style={styles.choiceTitle}>{tr('Importera via butiker')}</Text>
            <Text style={styles.choiceHint}>{tr('Hämta plagg automatiskt från din orderhistorik hos H&M, Zalando m.fl.')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choiceBtn} onPress={() => goto(`/import-email${personQ1}`)}>
            <Text style={styles.choiceTitle}>{tr('Importera från mejl')}</Text>
            <Text style={styles.choiceHint}>{tr('Vidarebefordra orderbekräftelser så läggs plaggen till automatiskt')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  modalClose: { fontFamily: 'Lora_400Regular', fontSize: 18, color: t.textSecondary, padding: 4 },
  choiceBtn: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  choiceTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginBottom: 3 },
  choiceHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 18 },
})
