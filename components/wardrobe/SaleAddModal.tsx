import { useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { supabase } from '../../supabase'
import { showAlert } from '../../utils/alert'
import { localeFor } from '../../utils/i18n'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Modal för att lägga plagg till salu. Söker bland kandidat-plaggen (aktiva,
// ej redan till salu). Äger sin egen sök-state; parent skickar kandidaterna och
// får ett onAdded-anrop för att uppdatera garderoben.
type Props = {
  visible: boolean
  onClose: () => void
  candidates: any[]
  onAdded: () => void
}

export default function SaleAddModal({ visible, onClose, candidates, onAdded }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang } = useSettings()
  const [search, setSearch] = useState('')

  const filtered = (search.trim()
    ? candidates.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : candidates
  ).sort((a, b) => (a.times_worn || 0) - (b.times_worn || 0))

  async function addToSale(item: any) {
    await supabase.from('garments').update({ for_sale: true }).eq('id', item.id)
    showAlert(`${item.name} ${tr('är nu till salu!')}`)
    setSearch('')
    onClose()
    onAdded()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{tr('Lägg till till salu')}</Text>
            <TouchableOpacity
              onPress={() => { onClose(); setSearch('') }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={tr('Stäng')}
              accessibilityRole="button"
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.modalInput}
            placeholder={tr('Sök plagg...')}
            placeholderTextColor={t.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
            {filtered.length === 0 ? (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>{tr('Inga plagg att lägga till')}</Text>
                <Text style={styles.emptyTabHint}>{tr('Alla plagg är redan till salu eller garderoben är tom')}</Text>
              </View>
            ) : (
              filtered.map((item: any) => (
                <TouchableOpacity key={item.id} style={styles.salePickerItem} onPress={() => addToSale(item)}>
                  {item.image_url
                    ? <SignedImage path={item.image_url} style={styles.salePickerImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                    : <View style={styles.salePickerImageEmpty} />
                  }
                  <View style={styles.salePickerInfo}>
                    <Text style={styles.salePickerName}>{item.name}</Text>
                    <Text style={styles.salePickerCategory}>{tr(item.category)}{item.color ? ` · ${tr(item.color)}` : ''}</Text>
                    <Text style={styles.salePickerStat}>{tr('Använd')} {item.times_worn || 0} {tr('gånger')}</Text>
                    <Text style={styles.salePickerStat}>
                      {item.last_worn ? `${tr('Senast använd:')} ${new Date(item.last_worn).toLocaleDateString(localeFor(lang))}` : tr('Aldrig använd')}
                    </Text>
                  </View>
                  <View style={styles.addSaleBtn}><Text style={styles.addSaleBtnText}>＋</Text></View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
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
  modalInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 4 },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 16, marginBottom: 8 },
  emptyTabHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  salePickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  salePickerImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: 'transparent' },
  salePickerImageEmpty: { width: 56, height: 56, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  salePickerInfo: { flex: 1, gap: 2 },
  salePickerName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  salePickerCategory: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary },
  salePickerStat: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic' },
  addSaleBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  addSaleBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 18 },
})
