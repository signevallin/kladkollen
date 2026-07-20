import * as Notifications from 'expo-notifications'
import { useEffect, useState } from 'react'
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Toggle from '../components/Toggle'
import { supabase } from '../supabase'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { showAlert } from '../utils/alert'
import { goBack } from '../utils/nav'
import { DEFAULT_PREFS, registerForPush, type NotifPrefs } from '../utils/push'
import { isSmartPushEnabled, setSmartPushEnabled } from '../utils/smartPush'

const CATEGORIES: { key: keyof NotifPrefs; title: string; desc: string }[] = [
  { key: 'weather', title: 'Väder & kläder', desc: 'Tips baserade på dagens väder – t.ex. plocka fram din stickade tröja när det blir kallare.' },
  { key: 'ootd', title: 'Dagens outfit', desc: 'Ett outfitförslag på morgonen anpassat efter vädret.' },
  { key: 'rediscovery', title: 'Återupptäck garderoben', desc: 'Glömda favoriter, veckans statistik och pris-per-användning.' },
  { key: 'logreminder', title: 'Logga dagens outfit', desc: 'En vänlig påminnelse på kvällen att logga vad du hade på dig.' },
  { key: 'seasonal', title: 'Säsong & rensning', desc: 'Säsongsbyten och tips om att arkivera plagg du inte använder.' },
]

export default function NotificationsSettings() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [enabled, setEnabled] = useState(true)
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [smart, setSmart] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setSmart(await isSmartPushEnabled())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('profiles').select('notif_enabled, notif_prefs').eq('id', user.id).single()
    if (data) {
      setEnabled(data.notif_enabled ?? true)
      setPrefs({ ...DEFAULT_PREFS, ...(data.notif_prefs || {}) })
    }
    setLoading(false)
  }

  async function toggleSmart(v: boolean) {
    setSmart(v)
    const ok = await setSmartPushEnabled(v)
    if (v && !ok) {
      setSmart(false)
      showAlert('Kunde inte slå på Smart Push', 'Tillåt kalender- och notis-åtkomst för Klädkollen i telefonens inställningar.')
    }
  }

  async function persist(nextEnabled: boolean, nextPrefs: NotifPrefs) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ notif_enabled: nextEnabled, notif_prefs: nextPrefs }).eq('id', user.id)
  }

  async function toggleMaster(v: boolean) {
    setEnabled(v)
    persist(v, prefs)
    if (v) {
      // Se till att vi har tillstånd + token när användaren slår på notiser.
      const perm = await Notifications.getPermissionsAsync()
      if (perm.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync()
        if (req.status !== 'granted') {
          showAlert('Notiser är avstängda', 'Tillåt notiser för Klädkollen i telefonens inställningar för att få påminnelser.')
        }
      }
      registerForPush()
    }
  }

  function toggleCategory(key: keyof NotifPrefs, v: boolean) {
    const next = { ...prefs, [key]: v }
    setPrefs(next)
    persist(enabled, next)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notiser</Text>
        <Text style={styles.subtitle}>
          Klädkollen kan skicka personliga, hjälpsamma notiser baserade på din garderob och vädret. Du bestämmer vilka.
        </Text>

        {Platform.OS === 'web' && (
          <View style={styles.webNote}>
            <Text style={styles.webNoteText}>Push-notiser fungerar i appen (iOS/Android), inte i webbläsaren.</Text>
          </View>
        )}

        <View style={styles.masterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.masterTitle}>Tillåt notiser</Text>
            <Text style={styles.masterDesc}>Slå av för att pausa alla notiser.</Text>
          </View>
          <Toggle value={enabled} onValueChange={toggleMaster} />
        </View>

        {CATEGORIES.map(c => (
          <View key={c.key} style={[styles.row, !enabled && styles.rowDisabled]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{c.title}</Text>
              <Text style={styles.rowDesc}>{c.desc}</Text>
            </View>
            <Toggle
              value={enabled && prefs[c.key]}
              disabled={!enabled}
              onValueChange={v => toggleCategory(c.key, v)}
            />
          </View>
        ))}

        <Text style={styles.sectionHeading}>Smart Push</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Kalenderbaserad morgonnotis</Text>
            <Text style={styles.rowDesc}>
              Läser dagens kalender på din telefon och väljer en outfit som passar dina planer – t.ex. "Idag väntar 3 möten" eller en påminnelse att byta om inför kvällen. Kalendern lämnar aldrig telefonen.
            </Text>
          </View>
          <Toggle value={smart} onValueChange={toggleSmart} />
        </View>

        <Text style={styles.footnote}>
          Väderbaserade notiser använder din senast kända plats. Vi hämtar aldrig platsen i bakgrunden bara för notiser.
        </Text>
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
  webNote: { backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: t.border },
  webNoteText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary },
  masterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border },
  masterTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  masterDesc: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  rowDisabled: { opacity: 0.5 },
  rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  rowDesc: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 3, lineHeight: 19 },
  sectionHeading: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, marginTop: 18, marginBottom: 10 },
  footnote: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, marginTop: 16, lineHeight: 18 },
})
