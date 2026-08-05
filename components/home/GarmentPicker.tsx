import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { CATEGORIES, COLOR_HEX, COLOR_NAMES, SEASONS, SUBCATEGORIES } from '../../utils/constants'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import type { GarmentSet } from '../../utils/sets'

// Återanvändbar plagg-väljare (samma UI för utgångsplagg och "lägg till plagg").
// Äger sitt eget filter-/sök-tillstånd och nollställer det när arket stängs.
type Props = {
  visible: boolean
  title: string
  pool: any[]
  garments: any[]
  onSelect: (g: any) => void
  onClose: () => void
  accessoriesFirst?: boolean
  sets?: GarmentSet[]
  onSelectSet?: (s: GarmentSet) => void
}

export default function GarmentPicker({ visible, title, pool, garments, onSelect, onClose, accessoriesFirst, sets, onSelectSet }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Alla')
  const [type, setType] = useState('Alla')
  const [color, setColor] = useState('Alla')
  const [season, setSeason] = useState('Alla')
  const [filterOpen, setFilterOpen] = useState<string | null>(null)

  // Nollställ filtren när arket stängs, så nästa öppning börjar rent.
  useEffect(() => {
    if (!visible) { setSearch(''); setCat('Alla'); setType('Alla'); setColor('Alla'); setSeason('Alla'); setFilterOpen(null) }
  }, [visible])

  const typeOptions = cat !== 'Alla' && SUBCATEGORIES[cat]
    ? SUBCATEGORIES[cat]
    : Array.from(new Set(pool.map(g => g.subcategory).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))
  const chips = [
    { key: 'category', label: tr('Kategori'), value: cat },
    { key: 'type', label: tr('Typ'), value: type },
    { key: 'color', label: tr('Färg'), value: color },
    { key: 'season', label: tr('Säsong'), value: season },
  ]
  const optionsFor = (key: string): string[] =>
    key === 'category' ? ['Alla', ...CATEGORIES]
      : key === 'type' ? ['Alla', ...typeOptions]
      : key === 'color' ? ['Alla', ...COLOR_NAMES]
      : ['Alla', ...SEASONS]
  const valueFor = (key: string) =>
    key === 'category' ? cat : key === 'type' ? type : key === 'color' ? color : season
  const setValue = (key: string, v: string) => {
    if (key === 'category') { setCat(v); setType('Alla') }
    else if (key === 'type') setType(v)
    else if (key === 'color') setColor(v)
    else setSeason(v)
    setFilterOpen(null)
  }
  const anyActive = cat !== 'Alla' || type !== 'Alla' || color !== 'Alla' || season !== 'Alla'
  const q = search.trim().toLowerCase()
  let items = pool.filter(g =>
    !g.archived && !g.for_sale &&
    (!q || g.name?.toLowerCase().includes(q) || g.color?.toLowerCase().includes(q)) &&
    (cat === 'Alla' || g.category === cat) &&
    (type === 'Alla' || g.subcategory === type) &&
    (color === 'Alla' || g.color === color) &&
    (season === 'Alla' || g.season?.includes(season))
  )
  if (accessoriesFirst) {
    // Smycken och accessoarer överst (vanligast att vilja lägga till).
    const rank = (g: any) => g.category === 'Smycken' ? 0 : g.category === 'Accessoarer' ? 1 : 2
    items = [...items].sort((a, b) => rank(a) - rank(b))
  }

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

          {sets && sets.length > 0 && (
            <View style={styles.baseSetChipsWrap}>
              <Text style={styles.baseSetChipsLabel}>{tr('Set')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.baseSetChipsRow}>
                {sets.map(s => {
                  const members = garments.filter(g => g.set_id === s.id && !g.archived && !g.in_laundry)
                  const thumbs = members.slice(0, 3)
                  return (
                    <TouchableOpacity key={s.id} style={styles.baseSetChip} onPress={() => { onSelectSet?.(s); onClose() }}>
                      {thumbs.length > 0
                        ? (
                          <View style={styles.baseSetThumbs}>
                            {thumbs.map(g => (
                              g.image_url
                                ? <SignedImage key={g.id} path={g.image_url} style={styles.baseSetThumb} resizeMode="contain" transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                                : <View key={g.id} style={[styles.baseSetThumb, styles.baseSetThumbEmpty]} />
                            ))}
                          </View>
                        )
                        : <Ionicons name="albums-outline" size={14} color={t.textSecondary} />
                      }
                      <Text style={styles.baseSetChipText} numberOfLines={1}>{s.name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          <TextInput
            style={styles.baseSearchInput}
            placeholder={tr('Sök plagg eller färg...')}
            placeholderTextColor={t.textSecondary}
            value={search}
            onChangeText={setSearch}
          />

          <View style={styles.baseFilterRow}>
            {chips.map(c => {
              const on = c.value !== 'Alla'
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.baseChip, (on || filterOpen === c.key) && styles.baseChipActive]}
                  onPress={() => setFilterOpen(filterOpen === c.key ? null : c.key)}
                >
                  <Text style={[styles.baseChipText, (on || filterOpen === c.key) && styles.baseChipTextActive]} numberOfLines={1}>
                    {on ? tr(c.value) : c.label} ▾
                  </Text>
                </TouchableOpacity>
              )
            })}
            {anyActive && (
              <TouchableOpacity
                style={styles.baseChipClear}
                onPress={() => { setCat('Alla'); setType('Alla'); setColor('Alla'); setSeason('Alla'); setFilterOpen(null) }}
              >
                <Text style={styles.baseChipClearText}>{tr('Rensa')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {filterOpen && (
            <View style={styles.baseOptionsRow}>
              {optionsFor(filterOpen).map(opt => {
                const active = valueFor(filterOpen) === opt
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.baseOption, active && styles.baseOptionActive]}
                    onPress={() => setValue(filterOpen, opt)}
                  >
                    {filterOpen === 'color' && COLOR_HEX[opt] && (
                      <View style={[styles.baseColorDot, { backgroundColor: COLOR_HEX[opt] }]} />
                    )}
                    <Text style={[styles.baseOptionText, active && styles.baseOptionTextActive]}>{tr(opt)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {items.length === 0 ? (
            <View style={styles.swapEmpty}>
              <Text style={styles.swapEmptyText}>{tr('Inga plagg matchar filtren')}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              numColumns={3}
              keyExtractor={g => g.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: g }) => (
                <TouchableOpacity style={styles.swapAlt} onPress={() => { onSelect(g); onClose() }}>
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
  swapEmpty: { padding: 28, alignItems: 'center' },
  swapEmptyText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  swapAlt: { flex: 1 / 3, margin: 4, alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: t.border },
  swapAltImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  swapAltEmpty: { alignItems: 'center', justifyContent: 'center' },
  swapAltName: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' },
  baseSetChipsWrap: { marginBottom: 16 },
  baseSetChipsLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, marginBottom: 8, marginLeft: 2 },
  baseSetChipsRow: { gap: 8, paddingRight: 8 },
  baseSetChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surfaceMuted, borderRadius: 20, paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderWidth: 1, borderColor: t.border },
  baseSetChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, maxWidth: 160 },
  baseSetThumbs: { flexDirection: 'row', gap: 3 },
  baseSetThumb: { width: 30, height: 30, borderRadius: 8, backgroundColor: t.surface },
  baseSetThumbEmpty: { backgroundColor: t.border },
  baseSearchInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: t.textPrimary, fontSize: 15, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  baseFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  baseChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  baseChipActive: { backgroundColor: t.primary, borderColor: t.primary },
  baseChipText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  baseChipTextActive: { color: t.onPrimary },
  baseChipClear: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20 },
  baseChipClearText: { fontFamily: 'Lora_500Medium', color: t.primary, fontSize: 12 },
  baseOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  baseOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  baseOptionActive: { backgroundColor: t.primaryActive, borderColor: t.primaryActive },
  baseOptionText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  baseOptionTextActive: { color: t.onPrimary },
  baseColorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
})
