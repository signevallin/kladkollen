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
import { addChild, deletePerson, loadPeople, setChildSize, type Person } from '../utils/people'
import {
  EU_CHILD_SIZES, formatAge, nextSize, prevSize, suggestedSizeCm,
} from '../utils/childSize'
import { computeSizeReminders, type SizeReminder } from '../utils/sizeReminders'
import { loadSizedGarments } from '../utils/people'

export default function Family() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { data, loading, error, refetch } = useQuery(loadChildren, [], { cacheKey: 'people.children' })
  const children = data ?? []
  const { data: sizedGarments } = useQuery(loadSizedGarments, [], { cacheKey: 'family.sizedGarments' })
  const reminders = useMemo(
    () => computeSizeReminders(sizedGarments ?? [], children, new Date()),
    [sizedGarments, children],
  )

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [sizeCm, setSizeCm] = useState<number | null>(null)
  const [sizeTouched, setSizeTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  // Förslag på storlek utifrån ålder – tills användaren väljer manuellt.
  const suggested = suggestedSizeCm(birthdate)
  const effectiveSize = sizeTouched ? sizeCm : (sizeCm ?? suggested)

  function resetForm() {
    setName(''); setBirthdate(''); setGender(null); setSizeCm(null); setSizeTouched(false); setShowAdd(false)
  }

  async function saveChild() {
    if (!name.trim()) { showAlert('Skriv ett namn'); return }
    setSaving(true)
    try {
      await addChild({ name, birthdate, gender, current_size_cm: effectiveSize ?? null })
      resetForm()
      refetch()
    } catch (e: any) {
      showAlert('Kunde inte spara', 'Något gick fel – försök igen.')
    } finally {
      setSaving(false)
    }
  }

  async function bump(child: Person, dir: 1 | -1) {
    const base = child.current_size_cm ?? suggestedSizeCm(child.birthdate) ?? EU_CHILD_SIZES[0]
    const next = dir > 0 ? nextSize(base) : prevSize(base)
    try { await setChildSize(child.id, next); refetch() } catch { showAlert('Kunde inte uppdatera storleken') }
  }

  function removeChild(child: Person) {
    showConfirm('Ta bort', `Ta bort ${child.name} ur familjen?`, async () => {
      try { await deletePerson(child.id); refetch() } catch { showAlert('Kunde inte ta bort') }
    }, 'Ta bort', true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Familj</Text>
        <Text style={styles.subtitle}>Lägg till barnen i hushållet och håll koll på storlekarna. Då kan appen påminna när sparade kläder börjar passa.</Text>

        {reminders.length > 0 && (
          <View style={styles.remindersSection}>
            <Text style={styles.sectionTitle}>Redo att ta fram</Text>
            {reminders.slice(0, 12).map(r => (
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
                    {r.childName} · stl {r.sizeCm}{r.location ? ` · ${r.location}` : ''}
                  </Text>
                </View>
                <View style={[styles.reminderBadge, r.state === 'ready' && styles.reminderBadgeReady]}>
                  <Text style={[styles.reminderBadgeText, r.state === 'ready' && styles.reminderBadgeTextReady]}>
                    {reminderLabel(r)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <QueryState loading={loading} error={error} onRetry={refetch} isEmpty={children.length === 0}
          emptyText="Inga barn tillagda än. Lägg till ditt första barn nedan.">
          {children.map(child => (
            <View key={child.id} style={styles.childRow}>
              <TouchableOpacity
                style={styles.childTap}
                onPress={() => router.push(`/child-closet?child=${child.id}&name=${encodeURIComponent(child.name)}`)}
                activeOpacity={0.8}
                accessibilityLabel={`Öppna ${child.name}s garderob`}
              >
                {child.avatar_url
                  ? <SignedImage path={child.avatar_url} style={styles.childAvatar} />
                  : <View style={styles.childAvatarEmpty}><MaterialIcons name="child-care" size={24} color={t.textSecondary} /></View>}
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childMeta}>
                    {[formatAge(child.birthdate), child.gender].filter(Boolean).join(' · ') || 'Ingen ålder angiven'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.sizeStepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => bump(child, -1)} accessibilityLabel="Mindre storlek">
                  <MaterialIcons name="remove" size={16} color={t.textPrimary} />
                </TouchableOpacity>
                <View style={styles.sizeValue}>
                  <Text style={styles.sizeNum}>{child.current_size_cm ?? '–'}</Text>
                  <Text style={styles.sizeUnit}>stl</Text>
                </View>
                <TouchableOpacity style={styles.stepBtn} onPress={() => bump(child, 1)} accessibilityLabel="Större storlek">
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
            <Text style={styles.addLabel}>Nytt barn</Text>

            <Text style={styles.fieldLabel}>Namn</Text>
            <TextInput style={styles.input} placeholder="t.ex. Alva" placeholderTextColor={t.placeholder}
              value={name} onChangeText={setName} />

            <Text style={styles.fieldLabel}>Födelsedatum</Text>
            <TextInput style={styles.input} placeholder="ÅÅÅÅ-MM-DD" placeholderTextColor={t.placeholder}
              value={birthdate} onChangeText={setBirthdate} maxLength={10} keyboardType="numbers-and-punctuation" />

            <Text style={styles.fieldLabel}>Kön (valfritt)</Text>
            <View style={styles.pills}>
              {['Flicka', 'Pojke'].map(g => (
                <TouchableOpacity key={g} style={[styles.pill, gender === g && styles.pillActive]}
                  onPress={() => setGender(gender === g ? null : g)}>
                  <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              Storlek{!sizeTouched && suggested != null ? `  (förslag: ${suggested})` : ''}
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
              <Text style={styles.saveBtnText}>{saving ? 'Sparar…' : 'Lägg till barn'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addTrigger} onPress={() => setShowAdd(true)}>
            <MaterialIcons name="add" size={20} color={t.onPrimary} />
            <Text style={styles.addTriggerText}>Lägg till barn</Text>
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

function reminderLabel(r: SizeReminder): string {
  if (r.state === 'ready') return 'Redo nu'
  if (r.state === 'waiting_season') return `Till ${(r.season || 'säsong').toLowerCase()}`
  const m = Math.round(r.monthsToFit)
  return m <= 1 ? 'Snart' : `Om ~${m} mån`
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
  childTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  childAvatar: { width: 48, height: 48, borderRadius: 24 },
  childAvatarEmpty: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
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
