import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, Modal, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Ionicons } from '@expo/vector-icons'
import SignedImage from '../SignedImage'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import { supabase } from '../../supabase'
import { apiGet, apiPost } from '../../utils/api'
import { useSettings } from '../../utils/settings'

// Väljare för egna Pinterest-pins → moodboarden.
//
// Äger all sin state (kopplingsstatus, pins, markeringar) och säger bara till
// föräldern när något lagts till. Pinnarna sparas som LÄNK, inte som kopia:
// moodboard.image_url får Pinterests bildadress. Därför måste SignedImage
// kunna rita externa URL:er – se kommentaren där.
//
// Appen ser aldrig access-token. Status läses via pinterest_status(), som bara
// svarar OM kontot är kopplat, och pinnarna hämtas genom vår egen endpoint.

type Pin = { id: string; imageUrl: string; link: string | null; title: string | null }
type Props = { visible: boolean; onClose: () => void; onAdded: () => void }

const RETURN_URL = 'kladkollen://inspiration'

export default function PinterestPicker({ visible, onClose, onAdded }: Props) {
  const t = useTheme()
  const { t: tt } = useSettings()
  const styles = makeStyles(t)
  const { width } = useWindowDimensions()
  const size = Math.floor((width - 32 - 8) / 3)

  const [checking, setChecking] = useState(true)
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pins, setPins] = useState<Pin[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  // Toasten (showAlert) ritas av ToastHost i rot-layouten och hamnar DÄRFÖR
  // bakom den här fullskärmsmodalen på iOS – fel måste visas inuti modalen.
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    setChecking(true)
    try {
      const { data } = await (supabase.rpc as any)('pinterest_status')
      const row: any = Array.isArray(data) ? data[0] : data
      setConnected(!!row?.connected)
      setUsername(row?.username ?? null)
      return !!row?.connected
    } catch {
      setConnected(false)
      return false
    } finally {
      setChecking(false)
    }
  }, [])

  const loadPins = useCallback(async (next?: string) => {
    setLoading(true)
    setError(null)
    try {
      const q = next ? `?cursor=${encodeURIComponent(next)}` : ''
      const data = await apiGet<{ pins: Pin[]; cursor: string | null }>(`/api/pinterest-pins${q}`)
      setPins(prev => (next ? [...prev, ...data.pins] : data.pins))
      setCursor(data.cursor)
    } catch (e: any) {
      // Kopplingen kan ha gått ut sedan status hämtades – visa kopplingsvyn
      // i stället för ett felmeddelande användaren inte kan göra något åt.
      if (e?.code === 'not_connected' || e?.code === 'expired') {
        setConnected(false)
      } else {
        setError(e?.message || tt('Kunde inte hämta från Pinterest.'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    setPicked(new Set())
    setError(null)
    checkStatus().then(ok => { if (ok) loadPins() })
  }, [visible, checkStatus, loadPins])

  async function connect() {
    setConnecting(true)
    setError(null)
    try {
      const { url } = await apiPost<{ url: string }>('/api/pinterest-auth', {})
      const res = await WebBrowser.openAuthSessionAsync(url, RETURN_URL)
      if (res.type !== 'success') return // användaren avbröt
      // Servern har skrivit token vid det här laget; läs om statusen.
      const ok = await checkStatus()
      if (ok) loadPins()
      else setError(tt('Kopplingen blev inte klar. Försök igen.'))
    } catch (e: any) {
      setError(e?.message || tt('Kunde inte koppla Pinterest.'))
    } finally {
      setConnecting(false)
    }
  }


  function toggle(id: string) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function addPicked() {
    if (picked.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(tt('Inte inloggad'))
      const rows = pins
        .filter(p => picked.has(p.id))
        .map(p => ({ user_id: user.id, image_url: p.imageUrl }))
      const { error } = await supabase.from('moodboard').insert(rows)
      if (error) throw error
      onAdded()
      onClose()
    } catch (e: any) {
      setError(e?.message || tt('Kunde inte spara bilderna.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{tt('Hämta från Pinterest')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={tt('Stäng')}>
            <Ionicons name="close" size={26} color={t.primary} />
          </TouchableOpacity>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={t.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {checking ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : !connected ? (
          <View style={styles.connectBox}>
            <Text style={styles.connectText}>
              {tt('Koppla ditt Pinterest-konto så kan du välja bland dina sparade pins.')}
            </Text>
            <Text style={styles.connectHint}>
              {tt('Skrud läser bara dina pins. Bilderna länkas hit – de kopieras inte.')}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={connect} disabled={connecting}>
              {connecting
                ? <ActivityIndicator color={t.onPrimary} />
                : <Text style={styles.primaryBtnText}>{tt('Koppla Pinterest')}</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!!username && <Text style={styles.connectedAs}>{tt('Kopplad som')} @{username}</Text>}
            <ScrollView contentContainerStyle={styles.grid}>
              {pins.map(p => {
                const on = picked.has(p.id)
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[{ width: size, height: size }, styles.item, on && styles.itemOn]}
                    onPress={() => toggle(p.id)}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={p.title || tt('Pin')}
                  >
                    <SignedImage path={p.imageUrl} style={styles.image} resizeMode="cover" />
                    {on && (
                      <View style={styles.check}>
                        <Ionicons name="checkmark" size={16} color={t.onPrimary} />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
              {loading && <ActivityIndicator color={t.primary} style={{ margin: 20 }} />}
              {!loading && !!cursor && (
                <TouchableOpacity style={styles.moreBtn} onPress={() => loadPins(cursor)}>
                  <Text style={styles.moreText}>{tt('Visa fler')}</Text>
                </TouchableOpacity>
              )}
              {!loading && pins.length === 0 && (
                <Text style={styles.empty}>{tt('Du har inga sparade pins än.')}</Text>
              )}
            </ScrollView>

            {picked.size > 0 && (
              <TouchableOpacity style={styles.primaryBtn} onPress={addPicked} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={t.onPrimary} />
                  : <Text style={styles.primaryBtnText}>
                      {picked.size === 1
                        ? tt('Lägg till 1 bild')
                        : `${tt('Lägg till')} ${picked.size} ${tt('bilder')}`}
                    </Text>}
              </TouchableOpacity>
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: t.primary },
  connectBox: { paddingTop: 40, gap: 12 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.danger,
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  errorText: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 13.5, color: t.danger, lineHeight: 19 },
  connectText: { fontFamily: 'Lora_500Medium', fontSize: 16, color: t.textSecondary, textAlign: 'center' },
  connectHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textFaint, textAlign: 'center', marginBottom: 8 },
  connectedAs: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textFaint, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingBottom: 16 },
  item: { borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  itemOn: { borderColor: t.primary },
  image: { width: '100%', height: '100%' },
  check: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center',
  },
  moreBtn: { padding: 14, alignSelf: 'center' },
  moreText: { fontFamily: 'Poppins_600SemiBold', color: t.primary, fontSize: 14 },
  empty: { fontFamily: 'Lora_400Regular', color: t.textFaint, textAlign: 'center', padding: 40, width: '100%' },
  primaryBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
})
