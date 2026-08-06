import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { supabase } from '../../supabase'
import { useSettings } from '../../utils/settings'
import { localeFor } from '../../utils/i18n'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Läslägesvy för partnerns outfits: kalender, sparade outfits och resa – hämtas
// via household-vaktade RPC:er. Man kan gilla (❤) men inte ändra. Visas inuti
// Outfits-fliken när man valt partnern i personväljaren.
type Props = { targetId: string }

export default function PartnerOutfitsView({ targetId }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang } = useSettings()

  const [loading, setLoading] = useState(true)
  const [outfits, setOutfits] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [trip, setTrip] = useState<any | null>(null)
  const [likes, setLikes] = useState<Set<string>>(new Set())
  const [sub, setSub] = useState<'kalender' | 'outfits' | 'resa'>('kalender')

  useEffect(() => { load() }, [targetId])

  async function load() {
    if (!targetId) { setLoading(false); return }
    setLoading(true)
    try {
      const [o, c, tp] = await Promise.all([
        supabase.rpc('partner_outfits', { target: targetId }),
        supabase.rpc('partner_calendar', { target: targetId }),
        supabase.rpc('partner_trip', { target: targetId }),
      ])
      setOutfits(o.data || [])
      setCalendar(c.data || [])
      setTrip(tp.data || null)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: lk } = await supabase.from('outfit_likes').select('outfit_id').eq('user_id', user.id)
        setLikes(new Set((lk || []).map((l: any) => l.outfit_id)))
      }
    } finally {
      setLoading(false)
    }
  }

  async function toggleLike(outfitId: string) {
    setLikes(prev => {
      const next = new Set(prev)
      if (next.has(outfitId)) next.delete(outfitId); else next.add(outfitId)
      return next
    })
    const { error } = await supabase.rpc('toggle_outfit_like', { target_outfit: outfitId })
    if (error) {
      setLikes(prev => {
        const next = new Set(prev)
        if (next.has(outfitId)) next.delete(outfitId); else next.add(outfitId)
        return next
      })
    }
  }

  const savedOutfits = outfits.filter(o => o.saved)
  const outfitsById: Record<string, any> = Object.fromEntries(outfits.map(o => [o.id, o]))
  const calEntries = calendar
    .map(c => ({ date: c.date, outfit: outfitsById[c.outfit_id] }))
    .filter(e => e.outfit)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  function fmtDate(d: string) {
    const dt = new Date(d + 'T12:00:00')
    return `${dt.getDate()} ${new Intl.DateTimeFormat(localeFor(lang), { month: 'short' }).format(dt)}`
  }

  const subs = [
    { key: 'kalender', label: tr('Kalender') },
    { key: 'outfits', label: `${tr('Outfits')} (${savedOutfits.length})` },
    { key: 'resa', label: tr('Resa') },
  ] as const

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {subs.map(s => (
          <TouchableOpacity key={s.key} style={[styles.subTab, sub === s.key && styles.subTabActive]} onPress={() => setSub(s.key)}>
            <Text style={[styles.subTabText, sub === s.key && styles.subTabTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {sub === 'outfits' && (
            savedOutfits.length === 0
              ? <Text style={styles.empty}>{tr('Inga sparade outfits.')}</Text>
              : savedOutfits.map(o => (
                  <View key={o.id} style={styles.outfitCard}>
                    <View style={styles.outfitHeader}>
                      <Text style={[styles.outfitName, { flex: 1 }]}>{o.name}</Text>
                      <TouchableOpacity onPress={() => toggleLike(o.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={tr('Gilla outfit')}>
                        <Ionicons name={likes.has(o.id) ? 'heart' : 'heart-outline'} size={24} color={likes.has(o.id) ? t.danger : t.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.outfitImages}>
                      {(o.image_urls || []).map((url: string, i: number) => <SignedImage key={i} path={url} style={styles.outfitImg} transform={{ width: 400, height: 400, resize: 'contain', format: 'origin' }} />)}
                    </View>
                    {o.garment_names && <Text style={styles.outfitGarments}>{o.garment_names.join(' · ')}</Text>}
                  </View>
                ))
          )}

          {sub === 'kalender' && (
            calEntries.length === 0
              ? <Text style={styles.empty}>{tr('Inga planerade outfits.')}</Text>
              : calEntries.map((e, i) => (
                  <View key={i} style={styles.calRow}>
                    <View style={styles.calDate}><Text style={styles.calDateText}>{fmtDate(e.date)}</Text></View>
                    <View style={styles.calImages}>
                      {(e.outfit.image_urls || []).slice(0, 4).map((url: string, j: number) => (
                        <SignedImage key={j} path={url} style={styles.calImg} resizeMode="contain" transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                      ))}
                    </View>
                    <Text style={styles.calName} numberOfLines={1}>{e.outfit.name}</Text>
                  </View>
                ))
          )}

          {sub === 'resa' && (
            !trip
              ? <Text style={styles.empty}>{tr('Ingen planerad resa.')}</Text>
              : (
                <View>
                  <View style={styles.tripHeader}>
                    <Text style={styles.tripDest}>{trip.destinationLabel}</Text>
                    <Text style={styles.tripDates}>{trip.dateLabel}{trip.days ? ` · ${trip.days} ${tr('dagar')}` : ''}</Text>
                    {!!trip.climateNote && <Text style={styles.tripClimate}>{trip.climateNote}</Text>}
                  </View>
                  {(trip.outfits || []).length > 0 && <Text style={styles.sectionLabel}>{tr('Outfits')}</Text>}
                  {(trip.outfits || []).map((o: any, i: number) => (
                    <View key={i} style={styles.outfitCard}>
                      <Text style={styles.outfitName}>{o.name}</Text>
                      <Text style={styles.outfitGarments}>{(o.items || []).join(' · ')}</Text>
                    </View>
                  ))}
                  {(trip.packingList || []).length > 0 && <Text style={styles.sectionLabel}>{tr('Packlista')}</Text>}
                  {(trip.packingList || []).map((p: string, i: number) => (
                    <Text key={i} style={styles.packItem}>• {p}</Text>
                  ))}
                </View>
              )
          )}
        </ScrollView>
      )}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 60 },
  subRow: { marginBottom: 6, flexGrow: 0 },
  subTab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  subTabActive: { backgroundColor: t.primaryActive, borderColor: t.primaryActive },
  subTabText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  subTabTextActive: { color: t.onPrimary },
  empty: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  outfitCard: { backgroundColor: t.surfaceMuted, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border, gap: 8 },
  outfitHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outfitName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  outfitImages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outfitImg: { width: 64, height: 64, borderRadius: 10 },
  outfitGarments: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, fontStyle: 'italic' },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  calDate: { width: 54, alignItems: 'center' },
  calDateText: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: t.textPrimary },
  calImages: { flexDirection: 'row', gap: 2 },
  calImg: { width: 34, height: 34, borderRadius: 6 },
  calName: { flex: 1, fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textPrimary, textAlign: 'right' },
  tripHeader: { backgroundColor: t.surfaceMuted, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 8 },
  tripDest: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  tripDates: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textSecondary, marginTop: 2 },
  tripClimate: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 19, marginTop: 8 },
  sectionLabel: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: t.textPrimary, marginTop: 16, marginBottom: 10 },
  packItem: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textPrimary, lineHeight: 24 },
})
