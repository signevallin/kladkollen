import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as Clipboard from 'expo-clipboard'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'
import { goBack } from '../utils/nav'

// Domänen där import-adresserna tas emot. Byt om du använder en annan subdomän.
const IMPORT_DOMAIN = 'import.kladkollen.se'

type Pending = {
  id: string
  name: string
  brand: string | null
  price: string | null
  order_date: string | null
  category: string | null
  color: string | null
  season: string | null
}

export default function ImportEmail() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [token, setToken] = useState<string | null>(null)
  const [forwardCode, setForwardCode] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useFocusEffect(useCallback(() => { load() }, []))

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('import_token, forward_code').eq('id', user.id).single()
    setToken(profile?.import_token || null)
    setForwardCode(profile?.forward_code || null)
    const { data } = await supabase.from('pending_imports').select('*').order('created_at', { ascending: false })
    if (data) {
      setPending(data)
      setSelected(new Set(data.map((d: any) => d.id)))
    }
    setLoading(false)
  }

  const address = token ? `${token}@${IMPORT_DOMAIN}` : null

  async function copyAddress() {
    if (!address) return
    await Clipboard.setStringAsync(address)
    showAlert('Kopierat!', 'Import-adressen ligger nu i urklipp.')
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function addSelected() {
    const chosen = pending.filter(p => selected.has(p.id))
    if (chosen.length === 0) return
    setAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')
      const rows = chosen.map(p => ({
        user_id: user.id,
        name: p.name,
        category: p.category || '',
        color: p.color || '',
        season: p.season || 'Alla årstider',
        image_url: null,
      }))
      const { error } = await supabase.from('garments').insert(rows)
      if (error) throw error
      await supabase.from('pending_imports').delete().in('id', chosen.map(p => p.id))
      showAlert(`${chosen.length} plagg tillagda!`, 'Öppna dem i garderoben för att lägga till foton och finjustera.')
      goBack('/wardrobe')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setAdding(false)
    }
  }

  async function dismiss(id: string) {
    await supabase.from('pending_imports').delete().eq('id', id)
    setPending(prev => prev.filter(p => p.id !== id))
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/wardrobe')}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Importera från mejl</Text>

        {loading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Din import-adress */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>DIN IMPORT-ADRESS</Text>
              <Text style={styles.address} selectable>{address || '—'}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyAddress}>
                <Text style={styles.copyBtnText}>Kopiera adress</Text>
              </TouchableOpacity>
            </View>

            {forwardCode && (
              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>Bekräftelsekod från Gmail</Text>
                <Text style={styles.code}>{forwardCode}</Text>
                <Text style={styles.codeHint}>Klistra in denna i Gmail för att bekräfta vidarebefordran.</Text>
              </View>
            )}

            {/* Så här ställer du in det */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>Så här kopplar du din Gmail (en gång)</Text>
              <Text style={styles.step}>1. Gmail på datorn → Inställningar → “Vidarebefordran och POP/IMAP”.</Text>
              <Text style={styles.step}>2. “Lägg till en vidarebefordringsadress” → klistra in adressen ovan.</Text>
              <Text style={styles.step}>3. Gmail skickar en bekräftelsekod – den dyker upp här i appen inom någon minut. Klistra in den i Gmail.</Text>
              <Text style={styles.step}>4. Skapa ett filter: sök t.ex. “orderbekräftelse OR order confirmation” → “Skapa filter” → “Vidarebefordra till” din adress.</Text>
              <Text style={styles.stepNote}>Klart! Nya orderbekräftelser dyker upp här automatiskt för granskning.</Text>
            </View>

            {/* Väntande importer */}
            <Text style={styles.sectionTitle}>
              {pending.length > 0 ? `${pending.length} plagg att granska` : 'Inga nya importer än'}
            </Text>
            {pending.length === 0 ? (
              <Text style={styles.emptyText}>
                När ett kvitto vidarebefordrats dyker plaggen upp här. Vidarebefordra gärna ett gammalt kvitto för att testa.
              </Text>
            ) : (
              <>
                {pending.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.itemRow, selected.has(p.id) && styles.itemRowSelected]}
                    onPress={() => toggle(p.id)}
                    disabled={adding}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>{p.name}</Text>
                      <Text style={styles.itemMeta}>
                        {[p.category, p.color, p.brand, p.price].filter(Boolean).join(' · ') || 'Okänd kategori'}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, selected.has(p.id) && styles.checkboxOn]}>
                      {selected.has(p.id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.primaryBtn, (selected.size === 0 || adding) && styles.primaryBtnDisabled]}
                  onPress={addSelected}
                  disabled={selected.size === 0 || adding}
                >
                  {adding
                    ? <ActivityIndicator color={t.onPrimary} />
                    : <Text style={styles.primaryBtnText}>Lägg till {selected.size} plagg i garderoben</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </>
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
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 20 },

  card: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
  cardLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 8 },
  address: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, marginBottom: 12 },
  copyBtn: { backgroundColor: t.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  copyBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 14 },

  codeCard: { backgroundColor: t.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.primary, marginBottom: 12, alignItems: 'center' },
  codeLabel: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary },
  code: { fontFamily: 'Poppins_700Bold', fontSize: 30, color: t.textPrimary, letterSpacing: 3, marginVertical: 4 },
  codeHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, textAlign: 'center' },

  stepsCard: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 24, gap: 8 },
  stepsTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, marginBottom: 4 },
  step: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },
  stepNote: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textPrimary, fontStyle: 'italic', marginTop: 4 },

  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginBottom: 8 },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: t.border, opacity: 0.6 },
  itemRowSelected: { opacity: 1, borderColor: t.primary },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  itemMeta: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 3 },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: t.primary, borderColor: t.primary },
  checkmark: { color: t.onPrimary, fontSize: 14, fontWeight: 'bold' },

  primaryBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
})
