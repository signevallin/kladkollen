import { useMemo, useState } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import BottomNav from '../BottomNav'
import SignedImage from '../SignedImage'
import { supabase } from '../../supabase'
import { showAlert } from '../../utils/alert'
import { CATEGORIES as CATEGORY_LIST, COLOR_NAMES, SEASONS as SEASON_LIST } from '../../utils/constants'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

const CATEGORIES = ['Alla', ...CATEGORY_LIST]
const SEASONS = ['Alla', ...SEASON_LIST]
const COLORS = ['Alla', ...COLOR_NAMES]
const STYLE_TAGS = ['Minimalistisk', 'Klassisk', 'Streetwear', 'Bohemisk', 'Sportig', 'Romantisk', 'Edgy', 'Preppy']

// Skapa/ändra outfit – en egen helskärmsvy som bröts ut ur my-outfit.tsx.
// Äger all create-state (valda plagg, namn, filter) och sparar själv; parent
// säger bara vilken outfit som redigeras (eller null för ny) och får en signal
// när något sparats.
type Props = {
  garments: any[]
  wishlist: any[]
  editOutfit: any | null
  locale: string
  onClose: () => void
  onSaved: () => void
}

export default function CreateOutfitView({ garments, wishlist, editOutfit, locale, onClose, onSaved }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const editingId: string | null = editOutfit?.id ?? null
  const [selectedGarments, setSelectedGarments] = useState<any[]>(() => {
    const ids: string[] = editOutfit?.garment_ids || []
    return ids.map(id => garments.find(g => g.id === id)).filter(Boolean)
  })
  const [outfitName, setOutfitName] = useState(editOutfit?.name || '')
  const [activeStyle, setActiveStyle] = useState('Alla')
  const [activeCategory, setActiveCategory] = useState('Alla')
  const [activeSeason, setActiveSeason] = useState('Alla')
  const [activeColor, setActiveColor] = useState('Alla')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showWishlistItems, setShowWishlistItems] = useState(true)

  const wishlistAsGarments = wishlist.map(w => ({ ...w, isWishlist: true, times_worn: 0, season: null, color: null }))

  const filteredGarments = useMemo(() => {
    let result = garments
    if (activeCategory !== 'Alla') result = result.filter(g => g.category === activeCategory)
    if (activeSeason !== 'Alla') result = result.filter(g => g.season?.includes(activeSeason))
    if (activeColor !== 'Alla') result = result.filter(g => g.color === activeColor)
    return result
  }, [garments, activeCategory, activeSeason, activeColor])

  function toggleGarment(garment: any) {
    setSelectedGarments(prev => {
      const exists = prev.find(g => g.id === garment.id)
      if (exists) return prev.filter(g => g.id !== garment.id)
      return [...prev, garment]
    })
  }

  function handleCategory(cat: string) { setActiveCategory(cat); setOpenDropdown(null) }
  function handleSeason(s: string) { setActiveSeason(s); setOpenDropdown(null) }
  function handleColor(c: string) { setActiveColor(c); setOpenDropdown(null) }

  async function saveManualOutfit() {
    if (selectedGarments.length === 0) { showAlert(tr('Välj minst ett plagg!')); return }
    const { data: { user } } = await supabase.auth.getUser()
    const name = outfitName.trim() || `Outfit ${new Date().toLocaleDateString(locale)}`
    const garmentIds = selectedGarments.filter(g => !g.isWishlist).map(g => g.id)
    const garmentNames = selectedGarments.map(g => g.name)
    const imageUrls = selectedGarments.map(g => g.image_url).filter(Boolean)

    const error = editingId
      ? (await supabase.from('outfits').update({ name, garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls }).eq('id', editingId)).error
      : (await supabase.from('outfits').insert([{
          user_id: user?.id, name, garment_ids: garmentIds, garment_names: garmentNames,
          image_urls: imageUrls, style: activeStyle !== 'Alla' ? activeStyle : null,
        }])).error

    if (error) {
      showAlert(tr('Något gick fel'), error.message)
    } else {
      showAlert(editingId ? tr('Outfit uppdaterad!') : tr('Outfit sparad!'))
      onSaved()
      onClose()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.createHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>✕ Avbryt</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{editingId ? 'Ändra outfit' : 'Skapa outfit'}</Text>
          <TouchableOpacity onPress={saveManualOutfit}>
            <Text style={styles.saveText}>{tr('Spara')}</Text>
          </TouchableOpacity>
        </View>

        {selectedGarments.length > 0 && (
          <View style={styles.selectedPreview}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.selectedRow}>
                {selectedGarments.map((g: any) => (
                  <View key={g.id} style={styles.selectedItem}>
                    {g.image_url
                      ? <SignedImage path={g.image_url} style={[styles.selectedImage, g.isWishlist && styles.wishlistImageBorder]} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                      : <View style={[styles.selectedImageEmpty, g.isWishlist && styles.wishlistImageEmptyBorder]}><Text style={{ fontSize: 20 }}>{g.isWishlist ? '' : ''}</Text></View>
                    }
                    {g.isWishlist && <View style={styles.notOwnedBadgeTiny}><Text style={styles.notOwnedBadgeTinyText}>{tr('Äger ej')}</Text></View>}
                    <Text style={styles.selectedName} numberOfLines={1}>{g.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <Text style={styles.label}>{tr('Namnge din outfit')}</Text>
        <TextInput style={styles.nameInput} placeholder={tr('t.ex. Fredagslook')} placeholderTextColor={t.placeholder} value={outfitName} onChangeText={setOutfitName} />

        <Text style={styles.label}>{tr('Stil')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
            {['Alla', ...STYLE_TAGS].map(s => (
              <TouchableOpacity key={s} style={[styles.pill, activeStyle === s && styles.pillActive]} onPress={() => setActiveStyle(s)}>
                <Text style={[styles.pillText, activeStyle === s && styles.pillTextActive]}>{tr(s)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>{tr('Välj plagg från garderoben')}</Text>
        <View style={styles.filterBar}>
          {[{ key: 'category', label: tr('Kategori'), active: activeCategory }, { key: 'season', label: tr('Säsong'), active: activeSeason }, { key: 'color', label: tr('Färg'), active: activeColor }].map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterBtn, f.active !== 'Alla' && styles.filterBtnActive]} onPress={() => setOpenDropdown(openDropdown === f.key ? null : f.key)}>
              <Text style={[styles.filterBtnText, f.active !== 'Alla' && styles.filterBtnTextActive]}>{f.active !== 'Alla' ? tr(f.active) : f.label} ▾</Text>
            </TouchableOpacity>
          ))}
        </View>
        {openDropdown && (
          <View style={styles.dropdown}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dropdownRow}>
                {(openDropdown === 'category' ? CATEGORIES : openDropdown === 'season' ? SEASONS : COLORS).map(item => {
                  const isActive = openDropdown === 'category' ? activeCategory === item : openDropdown === 'season' ? activeSeason === item : activeColor === item
                  return (
                    <TouchableOpacity key={item} style={[styles.dropdownPill, isActive && styles.dropdownPillActive]} onPress={() => openDropdown === 'category' ? handleCategory(item) : openDropdown === 'season' ? handleSeason(item) : handleColor(item)}>
                      <Text style={[styles.dropdownPillText, isActive && styles.dropdownPillTextActive]}>{tr(item)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.garmentGrid}>
          {filteredGarments.map((g: any) => {
            const selected = selectedGarments.find(s => s.id === g.id)
            return (
              <TouchableOpacity key={g.id} style={[styles.garmentItem, selected && styles.garmentItemSelected]} onPress={() => toggleGarment(g)}>
                {g.image_url ? <SignedImage path={g.image_url} style={styles.garmentImage} /> : <View style={styles.garmentImageEmpty} />}
                {selected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
                <Text style={styles.garmentName} numberOfLines={1}>{g.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {wishlist.length > 0 && (
          <>
            <TouchableOpacity style={styles.wishlistToggle} onPress={() => setShowWishlistItems(!showWishlistItems)}>
              <View style={styles.wishlistToggleLeft}>
                <View>
                  <Text style={styles.wishlistToggleTitle}>{tr('Köplista')} ({wishlist.length})</Text>
                  <Text style={styles.wishlistToggleSub}>{tr('Plagg du planerar att köpa')}</Text>
                </View>
              </View>
              <Text style={styles.wishlistToggleArrow}>{showWishlistItems ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showWishlistItems && (
              <View style={styles.garmentGrid}>
                {wishlistAsGarments.map((g: any) => {
                  const selected = selectedGarments.find(s => s.id === g.id)
                  return (
                    <TouchableOpacity key={g.id} style={[styles.garmentItem, styles.wishlistGarmentItem, selected && styles.garmentItemSelected]} onPress={() => toggleGarment(g)}>
                      {g.image_url ? <SignedImage path={g.image_url} style={[styles.garmentImage, { opacity: 0.85 }]} /> : <View style={[styles.garmentImageEmpty, styles.wishlistImageEmptyStyle]} />}
                      {selected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
                      <View style={styles.notOwnedBadge}><Text style={styles.notOwnedBadgeText}>{tr('Äger ej')}</Text></View>
                      <Text style={styles.garmentName} numberOfLines={1}>{g.name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary },
  createHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cancelText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  saveText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 14 },
  nameInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 16 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 12, marginTop: 8 },
  selectedPreview: { marginBottom: 16, backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 12 },
  selectedRow: { flexDirection: 'row', gap: 10 },
  selectedItem: { alignItems: 'center', width: 64 },
  selectedImage: { width: 60, height: 60, borderRadius: 10 },
  selectedImageEmpty: { width: 60, height: 60, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  wishlistImageBorder: { borderWidth: 2, borderColor: t.border, borderRadius: 10 },
  wishlistImageEmptyBorder: { borderWidth: 2, borderColor: t.surfaceMuted, borderStyle: 'dashed' },
  notOwnedBadgeTiny: { backgroundColor: t.surfaceMuted, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  notOwnedBadgeTinyText: { fontFamily: 'Poppins_600SemiBold', fontSize: 7, color: t.textSecondary },
  selectedName: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textSecondary, marginTop: 4, textAlign: 'center' },
  garmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  garmentItem: { width: '30%', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: t.border },
  garmentItemSelected: { borderColor: t.primary, borderWidth: 2, backgroundColor: 'rgba(64,45,33,0.25)' },
  garmentImage: { width: '100%', height: 70, borderRadius: 10, marginBottom: 4 },
  garmentImageEmpty: { width: '100%', height: 70, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  checkmark: { position: 'absolute', top: 6, right: 6, backgroundColor: t.primary, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 11 },
  garmentName: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary, textAlign: 'center' },
  wishlistGarmentItem: { borderColor: t.surfaceMuted, backgroundColor: t.surfaceMuted },
  wishlistImageEmptyStyle: { backgroundColor: t.surfaceMuted },
  notOwnedBadge: { backgroundColor: t.surfaceMuted, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 2, alignSelf: 'center' },
  notOwnedBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 8, color: t.textSecondary, letterSpacing: 0.3 },
  wishlistToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.surfaceMuted },
  wishlistToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wishlistToggleTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  wishlistToggleSub: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.surfaceMuted, marginTop: 1 },
  wishlistToggleArrow: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  filterBar: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  filterBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  filterBtnText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 12 },
  filterBtnTextActive: { color: t.onPrimary },
  dropdown: { marginBottom: 10, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: t.border },
  dropdownRow: { flexDirection: 'row', gap: 8 },
  dropdownPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  dropdownPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  dropdownPillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  dropdownPillTextActive: { color: t.onPrimary },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
})
