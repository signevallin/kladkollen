import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { supabase } from '../../supabase'
import { showAlert } from '../../utils/alert'
import { ARCHIVE_REASONS, reasonFor } from '../../utils/archiveReasons'
import { CATEGORIES as CATEGORY_LIST, COLOR_HEX, COLOR_NAMES, SEASONS as SEASON_LIST } from '../../utils/constants'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Arkivvyn: filter-chips + dropdown + lista över arkiverade/sålda plagg. Äger
// sina egna filter-states (arch*) så wardrobe.tsx slipper ~10 states. Parent
// skickar in de arkiverade plaggen och ett onRefresh-anrop.
const CATEGORIES = ['Alla', ...CATEGORY_LIST]
const SEASONS = ['Alla', ...SEASON_LIST]
const COLORS = ['Alla', ...COLOR_NAMES]
const COLOR_ORDER = COLORS.slice(1)
const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'recent', label: 'Senast tillagd' },
  { key: 'name', label: 'A–Ö' },
  { key: 'most', label: 'Mest använd' },
  { key: 'least', label: 'Minst använd' },
  { key: 'color', label: 'Färg' },
]
const SORT_LABEL: Record<string, string> = Object.fromEntries(SORT_OPTIONS.map(s => [s.key, s.label]))

type Props = {
  archived: any[]
  isPerson: boolean
  onRefresh: () => void
}

export default function ArchiveView({ archived, isPerson, onRefresh }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const [showHint, setShowHint] = useState(false)
  const [archCat, setArchCat] = useState('Alla')
  const [archType, setArchType] = useState('Alla')
  const [archColor, setArchColor] = useState('Alla')
  const [archSeason, setArchSeason] = useState('Alla')
  const [archPlace, setArchPlace] = useState('Alla')
  const [archReason, setArchReason] = useState('Alla')
  const [archSize, setArchSize] = useState('Alla')
  const [archSort, setArchSort] = useState('recent')
  const [archDropdown, setArchDropdown] = useState<string | null>(null)

  const archTypeOptions = useMemo(() =>
    ['Alla', ...Array.from(new Set(archived.map(g => g.subcategory).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))],
    [archived])
  const archPlaceOptions = useMemo(() =>
    ['Alla', ...Array.from(new Set(archived.map(g => g.location).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'sv'))],
    [archived])
  const archSizeOptions = useMemo(() =>
    ['Alla', ...Array.from(new Set(archived.map(g => g.size_cm).filter(v => v != null))).sort((a, b) => a - b).map(String)],
    [archived])

  const filteredArchive = useMemo(() => {
    let r = archived
    if (archCat !== 'Alla') r = r.filter(g => g.category === archCat)
    if (archType !== 'Alla') r = r.filter(g => g.subcategory === archType)
    if (archColor !== 'Alla') r = r.filter(g => g.color === archColor)
    if (archSeason !== 'Alla') r = r.filter(g => g.season?.includes(archSeason))
    if (archPlace !== 'Alla') r = r.filter(g => g.location === archPlace)
    if (archReason !== 'Alla') r = r.filter(g => (g.archive_reason || '') === archReason)
    if (archSize !== 'Alla') r = r.filter(g => String(g.size_cm) === archSize)
    const sorted = [...r]
    switch (archSort) {
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name, 'sv')); break
      case 'most': sorted.sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0)); break
      case 'least': sorted.sort((a, b) => (a.times_worn || 0) - (b.times_worn || 0)); break
      case 'color': sorted.sort((a, b) => {
        const ai = COLOR_ORDER.indexOf(a.color), bi = COLOR_ORDER.indexOf(b.color)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      }); break
      default: sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    }
    return sorted
  }, [archived, archCat, archType, archColor, archSeason, archPlace, archReason, archSize, archSort])

  const archHasFilters = archCat !== 'Alla' || archType !== 'Alla' || archColor !== 'Alla' || archSeason !== 'Alla' || archPlace !== 'Alla' || archReason !== 'Alla' || archSize !== 'Alla'

  function clearArchiveFilters() {
    setArchCat('Alla'); setArchType('Alla'); setArchColor('Alla'); setArchSeason('Alla'); setArchPlace('Alla'); setArchReason('Alla'); setArchSize('Alla'); setArchSort('recent'); setArchDropdown(null)
  }
  async function unarchive(item: any) {
    await supabase.from('garments').update({ archived: false, sold: false }).eq('id', item.id)
    onRefresh()
    showAlert(tr('Välkommen tillbaka!'), `${item.name} ${tr('är nu i garderoben igen.')}`)
  }
  async function sellFromArchive(item: any) {
    await supabase.from('garments').update({ for_sale: true, sold: false }).eq('id', item.id)
    onRefresh()
    showAlert(tr('Lagt till salu!'), `${item.name} ${tr('finns nu på säljlistan.')}`)
  }

  return (
    <ScrollView contentContainerStyle={styles.saleScroll}>
      <View style={styles.archiveTitleRow}>
        <Text style={styles.archiveTitle}>{tr('Arkiv')}</Text>
        <TouchableOpacity onPress={() => setShowHint(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={tr('Om arkivet')} accessibilityRole="button">
          <Ionicons name="information-circle-outline" size={20} color={t.textSecondary} />
        </TouchableOpacity>
      </View>
      {showHint && (
        <Text style={styles.archiveHint}>
          {tr('Plagg som inte passar just nu, är undanpackade eller sålda. Ange plats på plagget så vet du alltid var det finns.')}
        </Text>
      )}

      {archived.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRowContent}>
            {[
              { key: 'place', label: tr('Plats'), value: tr(archPlace), on: archPlace !== 'Alla' },
              { key: 'reason', label: tr('Anledning'), value: reasonFor(archReason)?.label ? tr(reasonFor(archReason)!.label) : tr(archReason), on: archReason !== 'Alla' },
              { key: 'sort', label: tr('Sortera'), value: tr(SORT_LABEL[archSort]), on: archSort !== 'recent' },
              { key: 'category', label: tr('Kategori'), value: tr(archCat), on: archCat !== 'Alla' },
              { key: 'type', label: tr('Typ'), value: tr(archType), on: archType !== 'Alla' },
              ...(isPerson ? [{ key: 'size', label: tr('Storlek'), value: tr(archSize), on: archSize !== 'Alla' }] : []),
              { key: 'color', label: tr('Färg'), value: tr(archColor), on: archColor !== 'Alla' },
              { key: 'season', label: tr('Säsong'), value: tr(archSeason), on: archSeason !== 'Alla' },
            ].map(f => (
              <TouchableOpacity key={f.key} style={[styles.chip, (f.on || archDropdown === f.key) && styles.chipActive]} onPress={() => setArchDropdown(archDropdown === f.key ? null : f.key)}>
                <Text style={[styles.chipText, (f.on || archDropdown === f.key) && styles.chipTextActive]}>
                  {f.key === 'sort' ? `${f.label}: ${f.value}` : (f.on ? f.value : f.label)} ▾
                </Text>
              </TouchableOpacity>
            ))}
            {(archHasFilters || archSort !== 'recent') && (
              <TouchableOpacity style={styles.chipClear} onPress={clearArchiveFilters}>
                <Text style={styles.chipClearText}>{tr('Rensa')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {archDropdown && (
            <View style={styles.dropdown}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dropdownRow}>
                  {archDropdown === 'sort'
                    ? SORT_OPTIONS.map(opt => (
                        <TouchableOpacity key={opt.key} style={[styles.dropdownPill, archSort === opt.key && styles.dropdownPillActive]} onPress={() => { setArchSort(opt.key); setArchDropdown(null) }}>
                          <Text style={[styles.dropdownPillText, archSort === opt.key && styles.dropdownPillTextActive]}>{tr(opt.label)}</Text>
                        </TouchableOpacity>
                      ))
                    : (archDropdown === 'category' ? CATEGORIES : archDropdown === 'type' ? archTypeOptions : archDropdown === 'size' ? archSizeOptions : archDropdown === 'season' ? SEASONS : archDropdown === 'place' ? archPlaceOptions : archDropdown === 'reason' ? ['Alla', ...ARCHIVE_REASONS.map(r => r.key)] : COLORS).map(item => {
                        const isActive = archDropdown === 'category' ? archCat === item : archDropdown === 'type' ? archType === item : archDropdown === 'size' ? archSize === item : archDropdown === 'season' ? archSeason === item : archDropdown === 'place' ? archPlace === item : archDropdown === 'reason' ? archReason === item : archColor === item
                        const reasonMeta = archDropdown === 'reason' && item !== 'Alla' ? reasonFor(item) : undefined
                        return (
                          <TouchableOpacity key={item} style={[styles.dropdownPill, isActive && styles.dropdownPillActive]} onPress={() => {
                            if (archDropdown === 'category') setArchCat(item)
                            else if (archDropdown === 'type') setArchType(item)
                            else if (archDropdown === 'size') setArchSize(item)
                            else if (archDropdown === 'season') setArchSeason(item)
                            else if (archDropdown === 'place') setArchPlace(item)
                            else if (archDropdown === 'reason') setArchReason(item)
                            else setArchColor(item)
                            setArchDropdown(null)
                          }}>
                            {archDropdown === 'color' && COLOR_HEX[item] && <View style={[styles.pillColorDot, { backgroundColor: COLOR_HEX[item] }]} />}
                            {reasonMeta && <Ionicons name={reasonMeta.icon as any} size={14} color={isActive ? t.onPrimary : t.textSecondary} style={{ marginRight: 4 }} />}
                            <Text style={[styles.dropdownPillText, isActive && styles.dropdownPillTextActive]}>{reasonMeta ? tr(reasonMeta.label) : tr(item)}</Text>
                          </TouchableOpacity>
                        )
                      })}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}

      {archived.length === 0 ? (
        <View style={styles.emptyTab}><Text style={styles.emptyTabText}>{tr('Inga arkiverade plagg')}</Text></View>
      ) : filteredArchive.length === 0 ? (
        <View style={styles.emptyTab}><Text style={styles.emptyTabText}>{tr('Inga plagg matchar filtret')}</Text></View>
      ) : (
        filteredArchive.map((item) => (
          <TouchableOpacity key={item.id} style={[styles.saleItem, item.sold && styles.archivedItem]} onPress={() => router.push(`/garment-detail?id=${item.id}`)}>
            <View style={styles.archImageWrap}>
              {item.image_url
                ? <SignedImage path={item.image_url} style={[styles.saleImage, item.sold && { opacity: 0.6 }]} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                : <View style={styles.saleImageEmpty} />
              }
              {!item.sold && reasonFor(item.archive_reason) && (
                <View style={styles.reasonBadge}>
                  <Ionicons name={reasonFor(item.archive_reason)!.icon as any} size={14} color={t.onPrimary} />
                </View>
              )}
            </View>
            <View style={styles.saleInfo}>
              <Text style={styles.saleName}>{item.name}</Text>
              <Text style={styles.saleCategory}>{tr(item.subcategory || item.category)}{item.size ? ` · ${item.size}` : ''}</Text>
              {item.location ? (
                <View style={styles.archMetaRow}>
                  <Ionicons name="location-outline" size={13} color={t.textSecondary} />
                  <Text style={styles.archMetaText}>{item.location}</Text>
                </View>
              ) : null}
              {item.sold && <Text style={styles.soldTag}>{tr('Såld')}</Text>}
            </View>
            {!item.sold && (
              <View style={styles.archActions}>
                <TouchableOpacity style={styles.unarchiveBtn} onPress={() => unarchive(item)} accessibilityLabel={`${tr('Ta tillbaka till garderoben')}: ${item.name}`} accessibilityRole="button">
                  <Text style={styles.unarchiveBtnText}>{tr('Ta tillbaka')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sellArchiveBtn} onPress={() => sellFromArchive(item)} accessibilityLabel={`${tr('Sälj')} ${item.name}`} accessibilityRole="button">
                  <Text style={styles.sellArchiveBtnText}>{tr('Sälj')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  saleScroll: { padding: 16, paddingBottom: 100 },
  archiveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  archiveTitle: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: t.textPrimary },
  archiveHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', marginBottom: 16, lineHeight: 18 },
  chipScroll: { height: 52, marginBottom: 10, flexGrow: 0 },
  chipRowContent: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  chipActive: { backgroundColor: t.primary, borderColor: t.primary },
  chipText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  chipTextActive: { color: t.onPrimary },
  chipClear: { paddingVertical: 8, paddingHorizontal: 12 },
  chipClearText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  dropdown: { marginHorizontal: 16, marginBottom: 8, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: t.border },
  dropdownRow: { flexDirection: 'row', gap: 8 },
  dropdownPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  dropdownPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  dropdownPillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  dropdownPillTextActive: { color: t.onPrimary },
  pillColorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: t.border },
  emptyTab: { alignItems: 'center', paddingTop: 60 },
  emptyTabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 16, marginBottom: 8 },
  saleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  archivedItem: { opacity: 0.7 },
  archImageWrap: { position: 'relative' },
  saleImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: 'transparent' },
  saleImageEmpty: { width: 60, height: 60, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  reasonBadge: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  saleInfo: { flex: 1 },
  saleName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  saleCategory: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 2 },
  archMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  archMetaText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary },
  soldTag: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 4, fontStyle: 'italic' },
  archActions: { gap: 6, alignItems: 'stretch' },
  unarchiveBtn: { backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  unarchiveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 12 },
  sellArchiveBtn: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  sellArchiveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
})
