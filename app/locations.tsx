import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'
import { fetchLocations, type Location } from '../utils/locations'
import { goBack } from '../utils/nav'
import { useQuery } from '../utils/useQuery'
import QueryState from '../components/QueryState'
import { useSettings } from '../utils/settings'

export default function Locations() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const { data, loading, error, refetch } = useQuery(fetchLocations, [], { cacheKey: 'locations' })
  const locations = data ?? []
  const [newName, setNewName] = useState('')
  const [newArchive, setNewArchive] = useState(false)

  const load = refetch

  async function addLocation() {
    const name = newName.trim()
    if (!name) return
    if (locations.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      showAlert(tr('Finns redan'), tr('Du har redan en plats med det namnet.'))
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('locations').insert({ user_id: user.id, name, is_archive: newArchive, sort_order: locations.length })
    setNewName(''); setNewArchive(false)
    load()
  }

  async function toggleArchive(loc: Location) {
    await supabase.from('locations').update({ is_archive: !loc.is_archive }).eq('id', loc.id)
    // Synka plaggen på den platsen så de hamnar rätt (i/ur arkivet).
    await supabase.from('garments').update({ archived: !loc.is_archive }).eq('location', loc.name)
    load()
  }

  function removeLocation(loc: Location) {
    showConfirm(tr('Ta bort plats'), `${tr('Ta bort platsen?')} ${loc.name} — ${tr('Plagg som ligger här behåller platsnamnet men du kan inte välja den längre.')}`, async () => {
      await supabase.from('locations').delete().eq('id', loc.id)
      load()
    }, tr('Ta bort'), true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tr('Egna platser')}</Text>
        <Text style={styles.subtitle}>{tr('Bestäm var dina plagg kan förvaras. Markera en plats som Arkiv om plagg där ska räknas som arkiverade (t.ex. källaren).')}</Text>

        <QueryState loading={loading} error={error} onRetry={refetch} isEmpty={locations.length === 0} emptyText={tr('Inga platser än.')}>
          {locations.map(loc => (
            <View key={loc.id} style={styles.row}>
              <Text style={styles.rowName}>{loc.name}</Text>
              <TouchableOpacity
                style={[styles.archiveToggle, loc.is_archive && styles.archiveToggleOn]}
                onPress={() => toggleArchive(loc)}
              >
                <Text style={[styles.archiveToggleText, loc.is_archive && styles.archiveToggleTextOn]}>{tr('Arkiv')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeLocation(loc)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </QueryState>

        <View style={styles.addBox}>
          <Text style={styles.addLabel}>{tr('Lägg till plats')}</Text>
          <TextInput
            style={styles.input}
            placeholder={tr('t.ex. Garderoben uppe')}
            placeholderTextColor={t.placeholder}
            value={newName}
            onChangeText={setNewName}
          />
          <TouchableOpacity style={styles.checkRow} onPress={() => setNewArchive(v => !v)}>
            <View style={[styles.checkbox, newArchive && styles.checkboxOn]}>
              {newArchive && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>{tr('Plagg här hör till arkivet')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]} onPress={addLocation} disabled={!newName.trim()}>
            <Text style={styles.addBtnText}>{tr('Lägg till')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 8 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  rowName: { flex: 1, fontFamily: 'Lora_500Medium', fontSize: 15, color: t.textPrimary },
  archiveToggle: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border },
  archiveToggleOn: { backgroundColor: t.primary, borderColor: t.primary },
  archiveToggleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary },
  archiveToggleTextOn: { color: t.onPrimary },
  remove: { fontFamily: 'Lora_400Regular', fontSize: 16, color: t.textSecondary },

  addBox: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border, marginTop: 12, gap: 10 },
  addLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  input: { fontFamily: 'Lora_400Regular', backgroundColor: t.bg, borderRadius: 12, padding: 13, color: t.textPrimary, fontSize: 15, borderWidth: 1, borderColor: t.border },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: t.primary, borderColor: t.primary },
  checkmark: { color: t.onPrimary, fontSize: 12, fontWeight: 'bold' },
  checkLabel: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary },
  addBtn: { backgroundColor: t.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 14 },
})
