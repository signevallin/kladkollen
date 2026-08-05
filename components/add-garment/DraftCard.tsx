import { router } from 'expo-router'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import BrandInput from '../BrandInput'
import { CATEGORIES, COLOR_OPTIONS as COLORS, FITS, SEASONS, SUBCATEGORIES } from '../../utils/constants'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import type { Location } from '../../utils/locations'
import type { Person } from '../../utils/people'
import type { GarmentDraft } from '../../app/add-garment'

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const FAMILY_STATUS_LABELS: Record<string, string> = {
  in_use: 'Används', stored: 'Sparad i låda', outgrown: 'Urvuxen',
}

// Ett redigerbart plaggkort i granska-steget. Presentationskomponent – parent
// (add-garment) äger draft-listan och skickar in uppdaterings-/borttagningshandlers.
type Props = {
  draft: GarmentDraft
  people: Person[]
  ownBrands: string[]
  locations: Location[]
  currency: string
  onUpdate: (id: string, field: keyof GarmentDraft, value: any) => void
  onToggleSeason: (id: string, season: string) => void
  onRemove: (id: string) => void
}

export default function DraftCard({ draft, people, ownBrands, locations, currency, onUpdate, onToggleSeason, onRemove }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const isProcessing = draft.analyzing || draft.removingBg
  const statusText = draft.analyzing && draft.removingBg
    ? tr('AI analyserar & tar bort bakgrund...')
    : draft.analyzing ? tr('AI analyserar...') : tr('Tar bort bakgrund...')

  return (
    <View style={styles.card}>
      {/* Header: thumbnail + name + remove */}
      <View style={styles.cardHeader}>
        <View style={styles.cardThumbWrap}>
          <Image source={{ uri: draft.uri }} style={styles.cardThumb} resizeMode="contain" />
        </View>
        <View style={styles.cardNameWrap}>
          {isProcessing ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={t.textSecondary} size="small" />
              <Text style={styles.analyzingText}>{statusText}</Text>
            </View>
          ) : (
            <TextInput
              style={styles.cardNameInput}
              value={draft.name}
              onChangeText={v => onUpdate(draft.id, 'name', v)}
              placeholder={tr('Namn på plagget')}
              placeholderTextColor={t.placeholder}
            />
          )}
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(draft.id)}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {!isProcessing && (
        <>
          {draft.personId && (
            <View style={styles.familyChip}>
              <Text style={styles.familyChipText}>
                👶 {people.find(c => c.id === draft.personId)?.name ?? tr('Barn')}
                {draft.sizeCm ? ` · ${tr('stl')} ${draft.sizeCm}` : ''} · {tr(FAMILY_STATUS_LABELS[draft.familyStatus])}
              </Text>
            </View>
          )}
          {/* Brand */}
          <Text style={styles.cardLabel}>{tr('MÄRKE (VALFRITT)')}</Text>
          <BrandInput value={draft.brand} onChange={v => onUpdate(draft.id, 'brand', v)} ownBrands={ownBrands} />

          {/* Category */}
          <Text style={styles.cardLabel}>{tr('KATEGORI')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pillRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pill, draft.category === cat && styles.pillActive]}
                  onPress={() => onUpdate(draft.id, 'category', cat)}
                >
                  <Text style={[styles.pillText, draft.category === cat && styles.pillTextActive]}>{tr(cat)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Subcategory */}
          {draft.category && SUBCATEGORIES[draft.category] && (
            <>
              <Text style={styles.cardLabel}>{tr('TYP')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pillRow}>
                  {SUBCATEGORIES[draft.category].map(sub => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.pill, draft.subcategory === sub && styles.pillActive]}
                      onPress={() => onUpdate(draft.id, 'subcategory', draft.subcategory === sub ? '' : sub)}
                    >
                      <Text style={[styles.pillText, draft.subcategory === sub && styles.pillTextActive]}>{tr(sub)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Color */}
          <Text style={styles.cardLabel}>{tr('FÄRG')}</Text>
          <View style={styles.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c.name}
                style={[styles.colorDot, { backgroundColor: c.hex }, draft.color === c.name && styles.colorDotActive]}
                onPress={() => onUpdate(draft.id, 'color', c.name)}
              >
                {draft.color === c.name && <Text style={styles.colorCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Season */}
          <Text style={styles.cardLabel}>{tr('SÄSONG *')}</Text>
          <View style={styles.pillRow}>
            {SEASONS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, draft.seasons.includes(s) && styles.pillActive]}
                onPress={() => onToggleSeason(draft.id, s)}
              >
                <Text style={[styles.pillText, draft.seasons.includes(s) && styles.pillTextActive]}>{tr(s)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Size */}
          <Text style={styles.cardLabel}>{tr('STORLEK (VALFRITT)')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pillRow}>
              {SIZES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, draft.size === s && styles.pillActive]}
                  onPress={() => onUpdate(draft.id, 'size', draft.size === s ? '' : s)}
                >
                  <Text style={[styles.pillText, draft.size === s && styles.pillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={styles.sizeInput}
            placeholder={tr('Egen storlek, t.ex. 38 eller W29/L32')}
            placeholderTextColor={t.placeholder}
            value={SIZES.includes(draft.size) ? '' : draft.size}
            onChangeText={v => onUpdate(draft.id, 'size', v)}
          />

          {/* Fit / passform */}
          <Text style={styles.cardLabel}>{tr('PASSFORM (VALFRITT)')}</Text>
          <View style={styles.pillRow}>
            {FITS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.pill, draft.fit === f && styles.pillActive]}
                onPress={() => onUpdate(draft.id, 'fit', draft.fit === f ? '' : f)}
              >
                <Text style={[styles.pillText, draft.fit === f && styles.pillTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price */}
          <Text style={styles.cardLabel}>{tr('PRIS I')} {currency} ({tr('VALFRITT')})</Text>
          <TextInput
            style={styles.sizeInput}
            placeholder={tr('t.ex. 299')}
            placeholderTextColor={t.placeholder}
            value={draft.price}
            onChangeText={v => onUpdate(draft.id, 'price', v)}
            keyboardType="numeric"
          />

          {/* Var finns plagget? */}
          <View style={styles.labelRow}>
            <Text style={styles.cardLabel}>{tr('VAR FINNS PLAGGET? (VALFRITT)')}</Text>
            <TouchableOpacity onPress={() => router.push('/locations')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.manageLink}>{tr('Hantera platser')}</Text>
            </TouchableOpacity>
          </View>
          {locations.length > 0 ? (
            <View style={styles.pillRow}>
              {locations.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.pill, draft.location === l.name && styles.pillActive]}
                  onPress={() => onUpdate(draft.id, 'location', draft.location === l.name ? '' : l.name)}
                >
                  <Text style={[styles.pillText, draft.location === l.name && styles.pillTextActive]}>
                    {l.name}{l.is_archive ? tr(' (arkiv)') : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.placeHint}>{tr('Inga platser än – tryck "Hantera platser" för att skapa en.')}</Text>
          )}
        </>
      )}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: {
    backgroundColor: t.surfaceMuted,
    borderRadius: 16, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: t.border, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardThumbWrap: {
    width: 64, height: 80, borderRadius: 10, overflow: 'hidden',
  },
  cardThumb: { width: 64, height: 80, borderRadius: 8, backgroundColor: t.imageBg },
  cardNameWrap: { flex: 1 },
  cardNameInput: {
    backgroundColor: t.surfaceMuted, borderRadius: 10,
    padding: 10, color: t.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: t.border,
  },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzingText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, fontStyle: 'italic' },
  removeBtn: { padding: 6 },
  removeBtnText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 18 },
  familyChip: { alignSelf: 'flex-start', backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  familyChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textPrimary },
  cardLabel: { fontFamily: 'Poppins_700Bold', color: t.textFaint, fontSize: 11, letterSpacing: 1.5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageLink: { fontFamily: 'Poppins_600SemiBold', color: t.primary, fontSize: 12 },
  placeHint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  sizeInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 10, padding: 10, color: t.textPrimary, fontSize: 14, borderWidth: 1, borderColor: t.border },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: t.surfaceMuted,
    borderWidth: 1, borderColor: t.border,
  },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  pillTextActive: { color: t.onPrimary },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotActive: { borderColor: t.primary, transform: [{ scale: 1.15 }] },
  colorCheck: {
    color: t.textPrimary, fontSize: 13, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
})
