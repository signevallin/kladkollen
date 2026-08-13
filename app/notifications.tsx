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
import { DEFAULT_PREFS, registerForPush, sendTestPush, type NotifPrefs } from '../utils/push'
import { getSmartPushTime, isSmartPushEnabled, setSmartPushEnabled, setSmartPushTime, setLogReminderEnabled } from '../utils/smartPush'
import { useSettings } from '../utils/settings'

const TIME_PRESETS = [
  { hour: 6, minute: 0 }, { hour: 6, minute: 30 }, { hour: 7, minute: 0 },
  { hour: 7, minute: 30 }, { hour: 8, minute: 0 }, { hour: 8, minute: 30 }, { hour: 9, minute: 0 },
]
const pad = (n: number) => String(n).padStart(2, '0')

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
  const { t: tr } = useSettings()
  const [enabled, setEnabled] = useState(true)
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [smart, setSmart] = useState(false)
  const [smartTime, setSmartTime] = useState({ hour: 7, minute: 30 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setSmart(await isSmartPushEnabled())
    setSmartTime(await getSmartPushTime())
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('profiles').select('notif_enabled, notif_prefs').eq('id', user.id).single()
    if (data) {
      const en = data.notif_enabled ?? true
      const pf = { ...DEFAULT_PREFS, ...((data.notif_prefs as unknown as Partial<NotifPrefs>) || {}) }
      setEnabled(en)
      setPrefs(pf)
      // Spegla logreminder-preferensen till den lokala kvällspåminnelsen.
      setLogReminderEnabled(en && pf.logreminder)
    }
    setLoading(false)
  }

  async function toggleSmart(v: boolean) {
    setSmart(v)
    const ok = await setSmartPushEnabled(v)
    if (v && !ok) {
      setSmart(false)
      showAlert(tr('Kunde inte slå på Smart Push'), tr('Tillåt kalender- och notis-åtkomst för Skrud i telefonens inställningar.'))
    }
  }

  function chooseTime(hour: number, minute: number) {
    setSmartTime({ hour, minute })
    setSmartPushTime(hour, minute)
  }

  async function persist(nextEnabled: boolean, nextPrefs: NotifPrefs) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ notif_enabled: nextEnabled, notif_prefs: nextPrefs }).eq('id', user.id)
  }

  async function toggleMaster(v: boolean) {
    setEnabled(v)
    persist(v, prefs)
    // Kvällspåminnelsen följer huvudreglaget (och logreminder-preferensen).
    setLogReminderEnabled(v && prefs.logreminder)
    if (v) {
      // Se till att vi har tillstånd + token när användaren slår på notiser.
      const perm = await Notifications.getPermissionsAsync()
      if (perm.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync()
        if (req.status !== 'granted') {
          showAlert(tr('Notiser är avstängda'), tr('Tillåt notiser för Skrud i telefonens inställningar för att få påminnelser.'))
        }
      }
      registerForPush()
    }
  }

  function toggleCategory(key: keyof NotifPrefs, v: boolean) {
    const next = { ...prefs, [key]: v }
    setPrefs(next)
    persist(enabled, next)
    // "Logga dagens outfit" driver den lokala kvällspåminnelsen.
    if (key === 'logreminder') setLogReminderEnabled(enabled && v)
  }

  const [testing, setTesting] = useState(false)
  async function testPush() {
    setTesting(true)
    try {
      const r = await sendTestPush()
      if (r.ok) showAlert(tr('Testnotis skickad'), tr('Kommer den fram fungerar push på den här enheten.'))
      else showAlert(tr('Kunde inte skicka testnotis'), r.detail)
    } finally {
      setTesting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tr('Notiser')}</Text>
        <Text style={styles.subtitle}>
          {tr('Skrud kan skicka personliga, hjälpsamma notiser baserade på din garderob och vädret. Du bestämmer vilka.')}
        </Text>

        {Platform.OS === 'web' && (
          <View style={styles.webNote}>
            <Text style={styles.webNoteText}>{tr('Push-notiser fungerar i appen (iOS/Android), inte i webbläsaren.')}</Text>
          </View>
        )}

        <View style={styles.masterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.masterTitle}>{tr('Tillåt notiser')}</Text>
            <Text style={styles.masterDesc}>{tr('Slå av för att pausa alla notiser.')}</Text>
          </View>
          <Toggle value={enabled} onValueChange={toggleMaster} />
        </View>

        {CATEGORIES.map(c => (
          <View key={c.key} style={[styles.row, !enabled && styles.rowDisabled]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{tr(c.title)}</Text>
              <Text style={styles.rowDesc}>{tr(c.desc)}</Text>
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
            <Text style={styles.rowTitle}>{tr('Kalenderbaserad morgonnotis')}</Text>
            <Text style={styles.rowDesc}>
              {tr('Läser dagens kalender på din telefon och väljer en outfit som passar dina planer – t.ex. "Idag väntar 3 möten" eller en påminnelse att byta om inför kvällen. Kalendern lämnar aldrig telefonen.')}
            </Text>
          </View>
          <Toggle value={smart} onValueChange={toggleSmart} />
        </View>

        {smart && (
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>{tr('Notisen skickas kl.')}</Text>
            <View style={styles.timeChips}>
              {TIME_PRESETS.map(({ hour, minute }) => {
                const on = smartTime.hour === hour && smartTime.minute === minute
                return (
                  <TouchableOpacity
                    key={`${hour}:${minute}`}
                    style={[styles.timeChip, on && styles.timeChipActive]}
                    onPress={() => chooseTime(hour, minute)}
                  >
                    <Text style={[styles.timeChipText, on && styles.timeChipTextActive]}>{pad(hour)}:{pad(minute)}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        <Text style={styles.sectionHeading}>{tr('Familj')}</Text>
        <View style={[styles.row, !enabled && styles.rowDisabled]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{tr('Storlekspåminnelser')}</Text>
            <Text style={styles.rowDesc}>
              {tr('En veckodigest när sparade barnkläder är redo att tas fram – rätt storlek i rätt säsong, med plats ("kartong 3, vinden"). Skickas även om du inte öppnar appen.')}
            </Text>
          </View>
          <Toggle
            value={enabled && prefs.sizereminder}
            disabled={!enabled}
            onValueChange={v => toggleCategory('sizereminder', v)}
          />
        </View>

        <Text style={styles.footnote}>
          {tr('Väderbaserade notiser använder din senast kända plats. Vi hämtar aldrig platsen i bakgrunden bara för notiser.')}
        </Text>

        {/* Felsökning: skicka en riktig push till den här enheten. */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.testBtn} onPress={testPush} disabled={testing} accessibilityRole="button">
            <Text style={styles.testBtnText}>{testing ? tr('Skickar…') : tr('Skicka testnotis')}</Text>
          </TouchableOpacity>
        )}
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
  testBtn: { marginTop: 24, backgroundColor: t.surfaceMuted, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  testBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  masterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border },
  masterTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  masterDesc: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  rowDisabled: { opacity: 0.5 },
  rowTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  rowDesc: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 3, lineHeight: 19 },
  sectionHeading: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, marginTop: 18, marginBottom: 10 },
  timeBlock: { marginTop: -2, marginBottom: 4, paddingHorizontal: 4 },
  timeLabel: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginBottom: 8 },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  timeChipActive: { backgroundColor: t.primary, borderColor: t.primary },
  timeChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  timeChipTextActive: { color: t.onPrimary },
  footnote: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, marginTop: 16, lineHeight: 18 },
})
