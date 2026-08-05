import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { COLOR_HEX } from '../../utils/constants'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Köplistan (visning). Presentationskomponent – wardrobe.tsx äger datan och
// skickar in handlers, så det stora render-blocket flyttar ut ur skärmen.
type Props = {
  wishlist: any[]
  outfitCounts: Record<string, number>
  onMove: (index: number, direction: 'up' | 'down') => void
  onOpenLink: (item: any) => void
  onBought: (item: any) => void
  onDelete: (item: any) => void
}

export default function WishlistTab({ wishlist, outfitCounts, onMove, onOpenLink, onBought, onDelete }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, formatPrice } = useSettings()

  return (
    <ScrollView contentContainerStyle={styles.wishScroll}>
      {wishlist.length === 0 ? (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabText}>{tr('Köplistan är tom')}</Text>
          <Text style={styles.emptyTabHint}>{tr('Tryck ＋ för att lägga till plagg du drömmer om')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.wishTotalCard}>
            <Text style={styles.wishTotalLabel}>{tr('Önskelistans värde')}</Text>
            <Text style={styles.wishTotalValue}>
              {formatPrice(wishlist.reduce((s, w) => s + (Number(w.price) || 0), 0))}
            </Text>
          </View>
          <Text style={styles.wishHint}>{tr('Tryck ▲▼ för att prioritera · Klicka på ett plagg för att redigera')}</Text>
          {wishlist.map((item, index) => {
            const count = outfitCounts[item.id] || 0
            return (
              <TouchableOpacity key={item.id} style={styles.wishItem} onPress={() => router.push(`/garment-detail?wishlistId=${item.id}`)} activeOpacity={0.8}>
                <View style={styles.reorderCol}>
                  <TouchableOpacity style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]} onPress={() => onMove(index, 'up')} disabled={index === 0} hitSlop={{ top: 10, bottom: 6, left: 10, right: 10 }} accessibilityLabel={tr('Flytta upp')} accessibilityRole="button">
                    <Text style={styles.arrowText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.dragDots}>⠿</Text>
                  <TouchableOpacity style={[styles.arrowBtn, index === wishlist.length - 1 && styles.arrowBtnDisabled]} onPress={() => onMove(index, 'down')} disabled={index === wishlist.length - 1} hitSlop={{ top: 6, bottom: 10, left: 10, right: 10 }} accessibilityLabel={tr('Flytta ner')} accessibilityRole="button">
                    <Text style={styles.arrowText}>▼</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.priorityBadge}><Text style={styles.priorityNum}>{index + 1}</Text></View>
                {item.image_url
                  ? <SignedImage path={item.image_url} style={styles.wishImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                  : <View style={styles.wishImageEmpty} />
                }
                <View style={styles.wishInfo}>
                  <Text style={styles.wishName}>{item.name}</Text>
                  {item.brand ? <Text style={styles.wishBrand} numberOfLines={1}>{item.brand}</Text> : null}
                  {item.price != null ? <Text style={styles.wishPrice}>{formatPrice(item.price)}</Text> : null}
                  <View style={styles.wishMeta}>
                    {item.category ? <Text style={styles.wishMetaText}>{tr(item.category)}</Text> : null}
                    {item.color ? (
                      <View style={styles.wishColorMeta}>
                        <View style={[styles.wishColorDot, { backgroundColor: COLOR_HEX[item.color] || t.surfaceMuted }]} />
                        <Text style={styles.wishMetaText}>{tr(item.color)}</Text>
                      </View>
                    ) : null}
                    {item.season ? <Text style={styles.wishMetaText}>· {tr(item.season)}</Text> : null}
                  </View>
                  {count > 0 && (
                    <View style={styles.outfitBadge}><Text style={styles.outfitBadgeText}>{count} outfit{count !== 1 ? 's' : ''}</Text></View>
                  )}
                </View>
                <View style={styles.wishActions}>
                  {item.url ? (
                    <TouchableOpacity style={styles.buyBtn} onPress={() => onOpenLink(item)} accessibilityLabel={`${tr('Köp')} ${item.name}`} accessibilityRole="button">
                      <Ionicons name="bag-handle-outline" size={13} color={t.onPrimary} />
                      <Text style={styles.buyBtnText}>{tr('Köp')}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.boughtBtn} onPress={() => onBought(item)} accessibilityLabel={`${tr('Markera som köpt')}: ${item.name}`} accessibilityRole="button">
                    <Text style={styles.boughtBtnText}>{tr('Köpt')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={`${tr('Ta bort')} ${item.name}`} accessibilityRole="button">
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          })}
        </>
      )}
    </ScrollView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wishScroll: { padding: 16, paddingBottom: 100 },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 16, marginBottom: 8 },
  emptyTabHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  wishTotalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  wishTotalLabel: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textSecondary },
  wishTotalValue: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary },
  wishHint: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  wishItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: t.border, minHeight: 76 },
  reorderCol: { alignItems: 'center', gap: 2 },
  arrowBtn: { width: 22, height: 22, borderRadius: 6, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  arrowBtnDisabled: { opacity: 0.15 },
  arrowText: { fontFamily: 'Poppins_700Bold', color: t.textSecondary, fontSize: 9 },
  dragDots: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 14 },
  priorityBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  priorityNum: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 11 },
  wishImage: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'transparent' },
  wishImageEmpty: { width: 52, height: 52, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, borderStyle: 'dashed' },
  wishInfo: { flex: 1 },
  wishName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  wishBrand: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: t.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 },
  wishPrice: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, marginTop: 2 },
  wishMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 3 },
  wishMetaText: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary },
  wishColorMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wishColorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: t.border },
  outfitBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: t.surfaceMuted, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: t.border },
  outfitBadgeText: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary },
  wishActions: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  buyBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  boughtBtn: { backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  boughtBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 12 },
  deleteBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
})
