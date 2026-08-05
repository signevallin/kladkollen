import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Säljlistan (visning). Presentationskomponent – parent äger datan/handlers och
// filter-state (kategori/färg styrs från garderobens header-filter).
type Props = {
  forSale: any[]
  cat: string
  color: string
  onSold: (item: any) => void
  onRemove: (item: any) => void
}

export default function SaleTab({ forSale, cat, color, onSold, onRemove }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const visible = forSale.filter(i =>
    (cat === 'Alla' || i.category === cat) && (color === 'Alla' || i.color === color)
  )

  return (
    <ScrollView contentContainerStyle={styles.saleScroll}>
      {forSale.length === 0 ? (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabText}>{tr('Inga plagg till salu')}</Text>
          <Text style={styles.emptyTabHint}>{tr('Tryck ＋ för att lägga ut plagg du inte använder')}</Text>
        </View>
      ) : (
        <>
          {visible.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>{tr('Inga plagg matchar filtren')}</Text>
            </View>
          ) : visible.map((item) => (
          <TouchableOpacity key={item.id} style={styles.saleItem} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
            {item.image_url
              ? <SignedImage path={item.image_url} style={styles.saleImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
              : <View style={styles.saleImageEmpty} />
            }
            <View style={styles.saleInfo}>
              <Text style={styles.saleName}>{item.name}</Text>
              <Text style={styles.saleCategory}>{tr(item.category)}{item.size ? ` · ${item.size}` : ''}</Text>
            </View>
            <View style={styles.saleActions}>
              <TouchableOpacity style={styles.soldBtn} onPress={() => onSold(item)}>
                <Text style={styles.soldBtnText}>{tr('Såld ✓')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  saleScroll: { padding: 16, paddingBottom: 100 },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 16, marginBottom: 8 },
  emptyTabHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  saleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  saleImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'transparent' },
  saleImageEmpty: { width: 60, height: 60, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  saleInfo: { flex: 1 },
  saleName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  saleCategory: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 2 },
  saleActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  soldBtn: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  soldBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  removeBtn: { backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: t.border },
  removeBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
})
