import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import SignedImage from '../components/SignedImage'
import QueryState from '../components/QueryState'
import { showConfirm, showAlert } from '../utils/alert'
import { goBack } from '../utils/nav'
import { useQuery } from '../utils/useQuery'
import { addChild, deletePerson, loadPeople, setChildSize, updatePerson, type Person } from '../utils/people'
import { pickImageSmart } from '../utils/imagePicker'
import { uploadUserImage } from '../utils/storage'
import { downscaleForUpload } from '../utils/image'
import {
  EU_CHILD_SIZES, formatAge, nextSize, prevSize, suggestedSizeCm,
} from '../utils/childSize'
import { computeSizeReminders, type SizeReminder } from '../utils/sizeReminders'
import { loadSizedGarments } from '../utils/people'
import { useSettings } from '../utils/settings'

export default function Family() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang } = useSettings()
  const { data, loading, error, refetch } = useQuery(loadChildren, [], { cacheKey: 'people.children' })
  const children = data ?? []
  const { data: sizedGarments } = useQuery(loadSizedGarments, [], { cacheKey: 'family.sizedGarments' })
  const reminders = useMemo(
    () => computeSizeReminders(sizedGarments ?? [], children, new Date()),
    [sizedGarments, children],
  )
  // Filtrera "redo att ta fram" på tillstånd (redo nu / snart / väntar på säsong).
  const [reminderFilter, setReminderFilter] = useState<'all' | 'ready' | 'upcoming' | 'waiting_season'>('all')
  const reminderCounts = useMemo(() => ({
    ready: reminders.filter(r => r.state === 'ready').length,
    upcoming: reminders.filter(r => r.state === 'upcoming').length,
    waiting_season: reminders.filter(r => r.state === 'waiting_season').length,
  }), [reminders])
  const shownReminders = reminderFilter === 'all' ? reminders : reminders.filter(r => r.state === reminderFilter)

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [sizeCm, setSizeCm] = useState<number | null>(null)
  const [sizeTouched, setSizeTouched] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Förslag på storlek utifrån ålder – tills användaren väljer manuellt.
  const suggested = suggestedSizeCm(birthdate)
  const effectiveSize = sizeTouched ? sizeCm : (sizeCm ?? suggested)

  function resetForm() {
    setName(''); setBirthdate(''); setGender(null); setSizeCm(null); setSizeTouched(false); setAvatarUrl(null); setShowAdd(false)
  }

  async function saveChild() {
    if (!name.trim()) { showAlert(tr('Skriv ett namn')); return }
    setSaving(true)
    try {
      await addChild({ name, birthdate, gender, current_size_cm: effectiveSize ?? null, avatar_url: avatarUrl })
      resetForm()
      refetch()
    } catch (e: any) {
      showAlert(tr('Kunde inte spara'), tr('Något gick fel – försök igen.'))
    } finally {
      setSaving(false)
    }
  }

  // Bilduppladdning: aldrig spara en lokal file://-sökväg (syns bara på egna
  // telefonen) – ladda upp och spara storage-sökvägen.
  async function uploadImage(uri: string): Promise<string> {
    // Skala ner till liten WebP – barnens avatarer visas som miniatyrer.
    const { bytes, ext, contentType } = await downscaleForUpload(uri, 512)
    return uploadUserImage(bytes, ext, contentType)
  }

  async function pickFormAvatar() {
    const result = await pickImageSmart({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    if (result.canceled) return
    const uri = result.assets[0].uri
    setAvatarUrl(uri) // visa direkt
    try { setAvatarUrl(await uploadImage(uri)) }
    catch { setAvatarUrl(null); showAlert(tr('Kunde inte ladda upp bilden'), tr('Försök igen.')) }
  }

  async function changePhoto(child: Person) {
    const result = await pickImageSmart({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    if (result.canceled) return
    try {
      const url = await uploadImage(result.assets[0].uri)
      await updatePerson(child.id, { avatar_url: url })
      refetch()
    } catch { showAlert(tr('Kunde inte ladda upp bilden'), tr('Försök igen.')) }
  }

  async function bump(child: Person, dir: 1 | -1) {
    const base = child.current_size_cm ?? suggestedSizeCm(child.birthdate) ?? EU_CHILD_SIZES[0]
    const next = dir > 0 ? nextSize(base) : prevSize(base)
    try { await setChildSize(child.id, next); refetch() } catch { showAlert(tr('Kunde inte uppdatera storleken')) }
  }

  function removeChild(child: Person) {
    showConfirm(tr('Ta bort'), `${tr('Ta bort ur familjen?')} – ${child.name}`, async () => {
      try { await deletePerson(child.id); refetch() } catch { showAlert(tr('Kunde inte ta bort')) }
    }, tr('Ta bort'), true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tr('Familj')}</Text>
        <Text style={styles.subtitle}>{tr('Lägg till barnen i hushållet och håll koll på storlekarna. Då kan appen påminna när sparade kläder börjar passa.')}</Text>

        {reminders.length > 0 && (
          <View style={styles.remindersSection}>
            <Text style={styles.sectionTitle}>{tr('Redo att ta fram')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {([
                ['all', `${tr('Alla')} (${reminders.length})`],
                ['ready', `${tr('Redo nu')} (${reminderCounts.ready})`],
                ['upcoming', `${tr('Snart')} (${reminderCounts.upcoming})`],
                ['waiting_season', `${tr('Väntar på säsong')} (${reminderCounts.waiting_season})`],
              ] as const).map(([key, label]) => {
                // Dölj tomma tillståndsfilter (utom Alla).
                if (key !== 'all' && reminderCounts[key] === 0) return null
                const on = reminderFilter === key
                return (
                  <TouchableOpacity key={key} style={[styles.filterChip, on && styles.filterChipActive]} onPress={() => setReminderFilter(key)}>
                    <Text style={[styles.filterChipText, on && styles.filterChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            {shownReminders.slice(0, 20).map(r => (
              <TouchableOpacity
                key={`${r.garmentId}-${r.childId}`}
                style={styles.reminderRow}
                onPress={() => router.push(`/garment-detail?id=${r.garmentId}`)}
                activeOpacity={0.8}
              >
                {r.imageUrl
                  ? <SignedImage path={r.imageUrl} style={styles.reminderThumb} />
                  : <View style={styles.reminderThumbEmpty}><MaterialIcons name="checkroom" size={20} color={t.textSecondary} /></View>}
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderName} numberOfLines={1}>{r.garmentName}</Text>
                  <Text style={styles.reminderMeta} numberOfLines={1}>
                    {r.childName} · {tr('stl')} {r.sizeCm}{r.location ? ` · ${r.location}` : ''}
                  </Text>
                </View>
                <View style={[styles.reminderBadge, r.state === 'ready' && styles.reminderBadgeReady]}>
                  <Text style={[styles.reminderBadgeText, r.state === 'ready' && styles.reminderBadgeTextReady]}>
                    {reminderLabel(r, tr)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <QueryState loading={loading} error={error} onRetry={refetch} isEmpty={children.length === 0}
          emptyText={tr('Inga barn tillagda än. Lägg till ditt första barn nedan.')}>
          {children.map(child => (
            <View key={child.id} style={styles.childRow}>
              <TouchableOpacity
                onPress={() => changePhoto(child)}
                activeOpacity={0.8}
                accessibilityLabel={`${tr('Byt bild på')} ${child.name}`}
              >
                {child.avatar_url
                  ? <SignedImage path={child.avatar_url} style={styles.childAvatar} resizeMode="cover" />
                  : <View style={styles.childAvatarEmpty}><MaterialIcons name="child-care" size={24} color={t.textSecondary} /></View>}
                <View style={styles.childAvatarBadge}><MaterialIcons name="photo-camera" size={11} color={t.onPrimary} /></View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.childInfo}
                onPress={() => router.push(`/wardrobe?person=${child.id}&personName=${encodeURIComponent(child.name)}`)}
                activeOpacity={0.8}
                accessibilityLabel={`${tr('Öppna garderob för')} ${child.name}`}
              >
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childMeta}>
                  {[formatAge(child.birthdate, lang), tr(child.gender || '')].filter(Boolean).join(' · ') || tr('Ingen ålder angiven')}
                </Text>
              </TouchableOpacity>
              <View style={styles.sizeStepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => bump(child, -1)} accessibilityLabel={tr('Mindre storlek')}>
                  <MaterialIcons name="remove" size={16} color={t.textPrimary} />
                </TouchableOpacity>
                <View style={styles.sizeValue}>
                  <Text style={styles.sizeNum}>{child.current_size_cm ?? '–'}</Text>
                  <Text style={styles.sizeUnit}>{tr('stl')}</Text>
                </View>
                <TouchableOpacity style={styles.stepBtn} onPress={() => bump(child, 1)} accessibilityLabel={tr('Större storlek')}>
                  <MaterialIcons name="add" size={16} color={t.textPrimary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeChild(child)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </QueryState>

        {showAdd ? (
          <View style={styles.addBox}>
            <Text style={styles.addLabel}>{tr('Nytt barn')}</Text>

            <TouchableOpacity style={styles.formAvatarWrap} onPress={pickFormAvatar} accessibilityLabel={tr('Välj bild')}>
              {avatarUrl
                ? <SignedImage path={avatarUrl} style={styles.formAvatar} resizeMode="cover" />
                : <View style={styles.formAvatarEmpty}><MaterialIcons name="add-a-photo" size={22} color={t.textSecondary} /></View>}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>{tr('Namn')}</Text>
            <TextInput style={styles.input} placeholder={tr('t.ex. Alva')} placeholderTextColor={t.placeholder}
              value={name} onChangeText={setName} />

            <Text style={styles.fieldLabel}>{tr('Födelsedatum')}</Text>
            <TextInput style={styles.input} placeholder={tr('ÅÅÅÅ-MM-DD')} placeholderTextColor={t.placeholder}
              value={birthdate} onChangeText={setBirthdate} maxLength={10} keyboardType="numbers-and-punctuation" />

            <Text style={styles.fieldLabel}>{tr('Kön (valfritt)')}</Text>
            <View style={styles.pills}>
              {['Flicka', 'Pojke'].map(g => (
                <TouchableOpacity key={g} style={[styles.pill, gender === g && styles.pillActive]}
                  onPress={() => setGender(gender === g ? null : g)}>
                  <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{tr(g)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              {tr('Storlek')}{!sizeTouched && suggested != null ? `  (${tr('förslag:')} ${suggested})` : ''}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sizeScroll}>
              {EU_CHILD_SIZES.map(s => {
                const active = effectiveSize === s
                return (
                  <TouchableOpacity key={s} style={[styles.sizePill, active && styles.pillActive]}
                    onPress={() => { setSizeCm(s); setSizeTouched(true) }}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{s}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
              onPress={saveChild} disabled={!name.trim() || saving}>
              <Text style={styles.saveBtnText}>{saving ? tr('Sparar…') : tr('Lägg till barn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelText}>{tr('Avbryt')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addTrigger} onPress={() => setShowAdd(true)}>
            <MaterialIcons name="add" size={20} color={t.onPrimary} />
            <Text style={styles.addTriggerText}>{tr('Lägg till barn')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// Bara barn visas på den här sidan (vuxna hanteras via hushålls-/partnersidan).
async function loadChildren(): Promise<Person[]> {
  const people = await loadPeople()
  return people.filter(p => p.type === 'child')
}

function reminderLabel(r: SizeReminder, tr: (k: string) => string): string {
  if (r.state === 'ready') return tr('Redo nu')
  if (r.state === 'waiting_season') return `${tr('Till')} ${tr(r.season || 'säsong').toLowerCase()}`
  const m = Math.round(r.monthsToFit)
  if (m <= 1) return tr('Snart')
  return tr('family.readyInMonths').replace('{n}', String(m))
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 8 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 20 },

  remindersSection: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: t.textSecondary, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  filterChips: { gap: 8, paddingBottom: 12, paddingRight: 4 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  filterChipActive: { backgroundColor: t.primary, borderColor: t.primary },
  filterChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary },
  filterChipTextActive: { color: t.onPrimary },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: t.border },
  reminderThumb: { width: 44, height: 44, borderRadius: 8 },
  reminderThumbEmpty: { width: 44, height: 44, borderRadius: 8, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  reminderInfo: { flex: 1 },
  reminderName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  reminderMeta: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, marginTop: 2 },
  reminderBadge: { backgroundColor: t.bg, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: t.border },
  reminderBadgeReady: { backgroundColor: t.primary, borderColor: t.primary },
  reminderBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.textSecondary },
  reminderBadgeTextReady: { color: t.onPrimary },

  childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  childAvatar: { width: 48, height: 48, borderRadius: 24 },
  childAvatarEmpty: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  childAvatarBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.surfaceMuted },
  formAvatarWrap: { alignSelf: 'center', marginBottom: 16 },
  formAvatar: { width: 72, height: 72, borderRadius: 36 },
  formAvatarEmpty: { width: 72, height: 72, borderRadius: 36, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, borderStyle: 'dashed' },
  childInfo: { flex: 1 },
  childName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  childMeta: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 2 },

  sizeStepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  sizeValue: { alignItems: 'center', minWidth: 34 },
  sizeNum: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: t.textPrimary },
  sizeUnit: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary },
  remove: { fontFamily: 'Lora_400Regular', fontSize: 16, color: t.textSecondary, marginLeft: 2 },

  addBox: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border, marginTop: 12 },
  addLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginBottom: 12 },
  fieldLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, marginBottom: 8, marginTop: 4 },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.bg, borderRadius: 12, padding: 13, color: t.textPrimary, fontSize: 15, borderWidth: 1, borderColor: t.border, marginBottom: 14 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  pillTextActive: { color: t.onPrimary },

  sizeScroll: { gap: 8, paddingVertical: 2, marginBottom: 16 },
  sizePill: { minWidth: 46, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg },

  saveBtn: { backgroundColor: t.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },

  addTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  addTriggerText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
})
