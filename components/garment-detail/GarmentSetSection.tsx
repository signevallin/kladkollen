import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { showAlert } from '../../utils/alert'
import { createSet, fetchSetMembers, fetchSets, setGarmentSet, type GarmentSet, type SetMember } from '../../utils/sets'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Set-sektionen på plaggets detaljvy (bara garderobsplagg, inte köplista).
// Äger sitt eget set-tillstånd och sparar direkt via utils/sets. Följer
// plaggets set_id via initialSetId (parent laddar om plagget vid fokus).
type Props = {
  garmentId: string
  initialSetId: string | null
}

export default function GarmentSetSection({ garmentId, initialSetId }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const [setId, setSetId] = useState<string | null>(initialSetId)
  const [allSets, setAllSets] = useState<GarmentSet[]>([])
  const [setMembers, setSetMembers] = useState<SetMember[]>([])
  const [showSetPicker, setShowSetPicker] = useState(false)
  const [newSetName, setNewSetName] = useState('')

  useEffect(() => { setSetId(initialSetId) }, [initialSetId])
  useEffect(() => { fetchSets().then(setAllSets) }, [])

  // Ladda set-medlemmar när plaggets set ändras.
  useEffect(() => {
    if (setId) fetchSetMembers(setId).then(setSetMembers)
    else setSetMembers([])
  }, [setId])

  const currentSetName = allSets.find(s => s.id === setId)?.name || ''

  async function joinSet(sid: string) {
    await setGarmentSet(garmentId, sid)
    setSetId(sid)
    setShowSetPicker(false)
  }
  async function createAndJoinSet() {
    if (!newSetName.trim()) return
    const s = await createSet(newSetName.trim())
    if (!s) { showAlert(tr('Något gick fel')); return }
    setAllSets(prev => [s, ...prev])
    setNewSetName('')
    await joinSet(s.id)
  }
  async function leaveSet() {
    await setGarmentSet(garmentId, null)
    setSetId(null)
    setSetMembers([])
  }

  return (
    <View style={styles.setSection}>
      <Text style={styles.setLabel}>{tr('Set')}</Text>
      {setId ? (
        <>
          {!!currentSetName && <Text style={styles.setName}>{currentSetName}</Text>}
          {setMembers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.setMembers}>
              {setMembers.map(m => (
                <View key={m.id} style={styles.setThumb}><SignedImage path={m.image_url} style={styles.setThumbImg} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} /></View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={styles.setPrimaryBtn} onPress={() => router.push(`/home?styleSet=${setId}` as any)}>
            <Ionicons name="sparkles-outline" size={16} color={t.onPrimary} />
            <Text style={styles.setPrimaryText}>{tr('Styla hela setet')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.setSecondaryBtn} onPress={leaveSet}>
            <Text style={styles.setSecondaryText}>{tr('Ta bort ur set')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.setSecondaryBtn} onPress={() => setShowSetPicker(true)}>
          <Ionicons name="link-outline" size={16} color={t.textPrimary} />
          <Text style={styles.setSecondaryText}>{tr('Lägg till i set')}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showSetPicker} transparent animationType="fade" onRequestClose={() => setShowSetPicker(false)}>
        <TouchableOpacity style={styles.reasonBackdrop} activeOpacity={1} onPress={() => setShowSetPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.setModalCard}>
            <Text style={styles.setModalTitle}>{tr('Lägg till i set')}</Text>
            <TextInput
              style={styles.setInput}
              placeholder={tr('Namn på nytt set')}
              placeholderTextColor={t.placeholder}
              value={newSetName}
              onChangeText={setNewSetName}
            />
            <TouchableOpacity style={[styles.setPrimaryBtn, !newSetName.trim() && styles.setBtnDisabled]} onPress={createAndJoinSet} disabled={!newSetName.trim()}>
              <Text style={styles.setPrimaryText}>{tr('Skapa set')}</Text>
            </TouchableOpacity>
            {allSets.length > 0 && <Text style={styles.setModalSub}>{tr('Eller välj befintligt:')}</Text>}
            <ScrollView style={{ maxHeight: 220 }}>
              {allSets.map(s => (
                <TouchableOpacity key={s.id} style={styles.setRow} onPress={() => joinSet(s.id)}>
                  <Ionicons name="albums-outline" size={16} color={t.textSecondary} />
                  <Text style={styles.setRowText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  reasonBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  setSection: { marginTop: 20, marginBottom: 4 },
  setLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, marginBottom: 8 },
  setName: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textSecondary, marginBottom: 8 },
  setMembers: { gap: 8, paddingVertical: 2 },
  setThumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: t.surfaceMuted },
  setThumbImg: { width: '100%', height: '100%' },
  setPrimaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 14, paddingVertical: 13, marginTop: 12 },
  setPrimaryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.onPrimary },
  setSecondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 12, marginTop: 8, borderWidth: 1, borderColor: t.border },
  setSecondaryText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textPrimary },
  setBtnDisabled: { opacity: 0.5 },
  setModalCard: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  setModalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary, marginBottom: 14 },
  setModalSub: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 16, marginBottom: 8 },
  setInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 13, color: t.textPrimary, fontSize: 15, borderWidth: 1, borderColor: t.border },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  setRowText: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textPrimary },
})
