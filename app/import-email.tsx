import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as Clipboard from 'expo-clipboard'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { apiPost } from '../utils/api'
import { showAlert } from '../utils/alert'
import { parsePrice } from '../utils/brands'
import { goBack } from '../utils/nav'
import { toast } from '../components/Toast'
import { newImageId } from '../utils/id'

// Domänen där import-adresserna tas emot. Ligger på Elairis (företaget) så den
// överlever en framtida namnändring av appen. Byt om du använder en annan subdomän.
const IMPORT_DOMAIN = 'import.elairis.se'

type Pending = {
  id: string
  name: string
  brand: string | null
  price: string | null
  order_date: string | null
  category: string | null
  color: string | null
  season: string | null
  image_url: string | null
}

export default function ImportEmail() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [token, setToken] = useState<string | null>(null)
  const [lastStatus, setLastStatus] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [addProgress, setAddProgress] = useState('')

  // Kända id:n så vi kan förbocka nya rader utan att röra befintliga val.
  const knownIds = useRef<Set<string>>(new Set())

  // Ladda direkt vid mount och sedan var 6:e sekund, så bekräftelsekoden och
  // nya importer dyker upp automatiskt. (useEffect kör tillförlitligt på webben,
  // till skillnad från useFocusEffect.)
  useEffect(() => {
    load()
    const timer = setInterval(load, 6000)
    return () => clearInterval(timer)
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('import_token, last_import_status').eq('id', user.id).single()
    setToken(profile?.import_token || null)
    setLastStatus(profile?.last_import_status || null)
    const { data } = await supabase.from('pending_imports').select('*').order('created_at', { ascending: false })
    if (data) {
      setPending(data)
      const newIds = data.filter((d: any) => !knownIds.current.has(d.id)).map((d: any) => d.id)
      if (newIds.length > 0) setSelected(sel => { const next = new Set(sel); newIds.forEach(id => next.add(id)); return next })
      knownIds.current = new Set(data.map((d: any) => d.id))
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

  // Hämtar bilden via server-proxyn (butikers CDN blockerar direkt fetch på webb).
  async function fetchImageBase64(url: string): Promise<{ base64: string; contentType: string } | null> {
    try {
      const data = await apiPost('/api/fetch-image', { url })
      if (!data?.base64) return null
      return { base64: data.base64, contentType: data.contentType || 'image/jpeg' }
    } catch {
      return null
    }
  }

  async function addSelected() {
    const chosen = pending.filter(p => selected.has(p.id))
    if (chosen.length === 0) return
    setAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')

      let done = 0
      for (const p of chosen) {
        done++
        setAddProgress(`Lägger till ${done}/${chosen.length}…`)

        // Hämta produktbilden ur kvittot, ta bort bakgrunden och ladda upp den.
        let imageUrl: string | null = null
        if (p.image_url) {
          const img = await fetchImageBase64(p.image_url)
          if (img) {
            let uploadBase64 = img.base64
            let uploadType = img.contentType
            try {
              const data = await apiPost('/api/remove-background', { base64: img.base64 })
              if (data.base64) { uploadBase64 = data.base64; uploadType = 'image/png' }
            } catch { /* misslyckad borttagning → originalbilden */ }
            try {
              const ext = uploadType.includes('png') ? 'png' : 'jpg'
              const filePath = `public/${newImageId()}.${ext}`
              const binaryStr = atob(uploadBase64)
              const bytes = new Uint8Array(binaryStr.length)
              for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
              const { error } = await supabase.storage.from('garments').upload(filePath, bytes, { contentType: uploadType, upsert: true })
              if (!error) {
                const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
                imageUrl = urlData.publicUrl
              }
            } catch { /* bild är bonus */ }
          }
        }

        await supabase.from('garments').insert([{
          user_id: user.id,
          name: p.name,
          category: p.category || '',
          color: p.color || '',
          season: p.season || 'Alla årstider',
          brand: p.brand || null,
          price: parsePrice(p.price),
          image_url: imageUrl,
        }])
      }

      await supabase.from('pending_imports').delete().in('id', chosen.map(p => p.id))
      toast(`${chosen.length} ${chosen.length === 1 ? 'plagg tillagt' : 'plagg tillagda'}!`, 'Ligger nu i garderoben – med bild och bakgrunden borttagen.')
      goBack('/wardrobe')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setAdding(false)
      setAddProgress('')
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
            {/* Väntande importer – högst upp så nya importer syns direkt */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {pending.length > 0 ? `${pending.length} plagg att granska` : 'Inga nya importer än'}
              </Text>
              <TouchableOpacity onPress={load} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.refreshText}>Uppdatera</Text>
              </TouchableOpacity>
            </View>
            {lastStatus && (
              <Text style={styles.statusLine}>Senaste mejl: {lastStatus}</Text>
            )}
            {pending.length === 0 ? (
              <Text style={styles.emptyText}>
                Vidarebefordra en orderbekräftelse eller ett kvitto till din import-adress nedan, så dyker plaggen upp här för granskning. Testa gärna med ett gammalt kvitto.
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
                    {p.image_url
                      ? <Image source={{ uri: p.image_url }} style={styles.itemImage} resizeMode="contain" />
                      : <View style={styles.itemImageEmpty} />
                    }
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>{p.name}</Text>
                      <Text style={styles.itemMeta}>
                        {[p.category, p.color, p.brand, p.price].filter(Boolean).join(' · ') || 'Okänd kategori'}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, selected.has(p.id) && styles.checkboxOn]}>
                      {selected.has(p.id) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <TouchableOpacity
                      onPress={() => dismiss(p.id)}
                      disabled={adding}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel={`Ta bort ${p.name}`}
                      accessibilityRole="button"
                      style={styles.dismissBtn}
                    >
                      <Text style={styles.dismissX}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.primaryBtn, (selected.size === 0 || adding) && styles.primaryBtnDisabled]}
                  onPress={addSelected}
                  disabled={selected.size === 0 || adding}
                >
                  {adding
                    ? <View style={styles.btnRow}><ActivityIndicator color={t.onPrimary} /><Text style={styles.primaryBtnText}>  {addProgress}</Text></View>
                    : <Text style={styles.primaryBtnText}>Lägg till {selected.size} plagg i garderoben</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {/* Din import-adress */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>DIN IMPORT-ADRESS</Text>
              <Text style={styles.address} selectable>{address || '—'}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyAddress}>
                <Text style={styles.copyBtnText}>Kopiera adress</Text>
              </TouchableOpacity>
            </View>

            {/* Så importerar du ett kvitto */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>Så importerar du ett kvitto</Text>
              <Text style={styles.step}>1. Öppna en orderbekräftelse eller ett kvitto i din mejl.</Text>
              <Text style={styles.step}>2. Tryck på “Vidarebefordra” och skicka mejlet till din import-adress ovan.</Text>
              <Text style={styles.step}>3. Inom någon minut dyker plaggen upp här för granskning.</Text>
              <Text style={styles.stepNote}>Fungerar från vilken mejlapp som helst – ingen Gmail-inställning eller filter behövs.</Text>
            </View>
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

  stepsCard: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 24, gap: 8 },
  stepsTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, marginBottom: 4 },
  step: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },
  stepNote: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textPrimary, fontStyle: 'italic', marginTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  refreshText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary, textDecorationLine: 'underline' },
  statusLine: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic', marginBottom: 10 },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: t.border, opacity: 0.6 },
  itemRowSelected: { opacity: 1, borderColor: t.primary },
  itemImage: { width: 48, height: 60, borderRadius: 8, backgroundColor: t.imageBg },
  itemImageEmpty: { width: 48, height: 60, borderRadius: 8, backgroundColor: t.surfaceMuted },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  itemMeta: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 3 },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  dismissBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dismissX: { fontFamily: 'Lora_400Regular', fontSize: 16, color: t.textFaint },
  checkboxOn: { backgroundColor: t.primary, borderColor: t.primary },
  checkmark: { color: t.onPrimary, fontSize: 14, fontWeight: 'bold' },

  primaryBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
})
