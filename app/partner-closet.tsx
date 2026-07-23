import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { goBack } from '../utils/nav'
import { useSettings } from '../utils/settings'
import { COLOR_HEX } from '../utils/constants'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export default function PartnerCloset() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { user: targetId, name } = useLocalSearchParams<{ user?: string; name?: string }>()
  const { formatPrice } = useSettings()

  const [loading, setLoading] = useState(true)
  const [garments, setGarments] = useState<any[]>([])
  const [wishlist, setWishlist] = useState<any[]>([])
  const [outfits, setOutfits] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [trip, setTrip] = useState<any | null>(null)

  const [topTab, setTopTab] = useState<'garderob' | 'outfits'>('garderob')
  const [subTab, setSubTab] = useState<string>('garderob')

  useEffect(() => { load() }, [targetId])

  async function load() {
    if (!targetId) { setLoading(false); return }
    setLoading(true)
    try {
      const [g, w, o, c, tr] = await Promise.all([
        supabase.rpc('partner_garments', { target: targetId }),
        supabase.rpc('partner_wishlist', { target: targetId }),
        supabase.rpc('partner_outfits', { target: targetId }),
        supabase.rpc('partner_calendar', { target: targetId }),
        supabase.rpc('partner_trip', { target: targetId }),
      ])
      setGarments(g.data || [])
      setWishlist(w.data || [])
      setOutfits(o.data || [])
      setCalendar(c.data || [])
      setTrip(tr.data || null)
    } finally {
      setLoading(false)
    }
  }

  const active = garments.filter(g => !g.archived && !g.for_sale)
  const forSale = garments.filter(g => g.for_sale)
  const savedOutfits = outfits.filter(o => o.saved)
  const outfitsById: Record<string, any> = Object.fromEntries(outfits.map(o => [o.id, o]))
  const calEntries = calendar
    .map(c => ({ date: c.date, outfit: outfitsById[c.outfit_id] }))
    .filter(e => e.outfit)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  function fmtDate(d: string) {
    const dt = new Date(d + 'T12:00:00')
    return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`
  }

  const partnerName = name || 'Partner'

  const garderobSubs = [
    { key: 'garderob', label: `Garderob (${active.length})` },
    { key: 'kop', label: `Köp (${wishlist.length})` },
    { key: 'salj', label: `Sälj (${forSale.length})` },
  ]
  const outfitSubs = [
    { key: 'kalender', label: 'Kalender' },
    { key: 'outfits', label: `Outfits (${savedOutfits.length})` },
    { key: 'resa', label: 'Resa' },
  ]
  const subs = topTab === 'garderob' ? garderobSubs : outfitSubs
  const activeSub = subs.some(s => s.key === subTab) ? subTab : subs[0].key

  function switchTop(tab: 'garderob' | 'outfits') {
    setTopTab(tab)
    setSubTab(tab === 'garderob' ? 'garderob' : 'kalender')
  }

  const garmentGrid = (list: any[], empty: string) => (
    list.length === 0
      ? <Text style={styles.empty}>{empty}</Text>
      : <View style={styles.grid}>
          {list.map(g => (
            <View key={g.id} style={styles.gCard}>
              <View>
                {g.image_url ? <SignedImage path={g.image_url} style={styles.gImg} /> : <View style={styles.gImgEmpty} />}
                {g.lendable && (
                  <View style={styles.lendBadge}>
                    <Ionicons name="swap-horizontal" size={12} color={t.onPrimary} />
                  </View>
                )}
              </View>
              <Text style={styles.gName} numberOfLines={1}>{g.name}</Text>
            </View>
          ))}
        </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/partner')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{partnerName}s garderob</Text>
        <Text style={styles.readonly}>👁 Läsläge – du kan titta men inte ändra</Text>

        <View style={styles.tabRow}>
          {(['garderob', 'outfits'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, topTab === tab && styles.tabActive]} onPress={() => switchTop(tab)}>
              <Text style={[styles.tabText, topTab === tab && styles.tabTextActive]}>{tab === 'garderob' ? 'Garderob' : 'Outfits'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subRow}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {subs.map(s => (
              <TouchableOpacity key={s.key} style={[styles.subTab, activeSub === s.key && styles.subTabActive]} onPress={() => setSubTab(s.key)}>
                <Text style={[styles.subTabText, activeSub === s.key && styles.subTabTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeSub === 'garderob' && garmentGrid(active, 'Inga plagg i garderoben.')}
            {activeSub === 'salj' && garmentGrid(forSale, 'Inget till salu.')}

            {activeSub === 'kop' && (
              wishlist.length === 0
                ? <Text style={styles.empty}>Tom köplista.</Text>
                : wishlist.map(w => (
                    <View key={w.id} style={styles.wishRow}>
                      {w.image_url ? <SignedImage path={w.image_url} style={styles.wishImg} /> : <View style={styles.wishImgEmpty} />}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.wishName} numberOfLines={1}>{w.name}</Text>
                        <Text style={styles.wishMeta}>{[w.brand, w.subcategory || w.category].filter(Boolean).join(' · ')}</Text>
                      </View>
                      {w.color && <View style={[styles.colorDot, { backgroundColor: COLOR_HEX[w.color] || t.surfaceMuted }]} />}
                      {w.price != null && <Text style={styles.wishPrice}>{formatPrice(w.price)}</Text>}
                    </View>
                  ))
            )}

            {activeSub === 'outfits' && (
              savedOutfits.length === 0
                ? <Text style={styles.empty}>Inga sparade outfits.</Text>
                : savedOutfits.map(o => (
                    <View key={o.id} style={styles.outfitCard}>
                      <Text style={styles.outfitName}>{o.name}</Text>
                      <View style={styles.outfitImages}>
                        {(o.image_urls || []).map((url: string, i: number) => <SignedImage key={i} path={url} style={styles.outfitImg} />)}
                      </View>
                      {o.garment_names && <Text style={styles.outfitGarments}>{o.garment_names.join(' · ')}</Text>}
                    </View>
                  ))
            )}

            {activeSub === 'kalender' && (
              calEntries.length === 0
                ? <Text style={styles.empty}>Inga planerade outfits.</Text>
                : calEntries.map((e, i) => (
                    <View key={i} style={styles.calRow}>
                      <View style={styles.calDate}><Text style={styles.calDateText}>{fmtDate(e.date)}</Text></View>
                      <View style={styles.calImages}>
                        {(e.outfit.image_urls || []).slice(0, 4).map((url: string, j: number) => (
                          <SignedImage key={j} path={url} style={styles.calImg} resizeMode="contain" />
                        ))}
                      </View>
                      <Text style={styles.calName} numberOfLines={1}>{e.outfit.name}</Text>
                    </View>
                  ))
            )}

            {activeSub === 'resa' && (
              !trip
                ? <Text style={styles.empty}>Ingen planerad resa.</Text>
                : (
                  <View>
                    <View style={styles.tripHeader}>
                      <Text style={styles.tripDest}>{trip.destinationLabel}</Text>
                      <Text style={styles.tripDates}>{trip.dateLabel}{trip.days ? ` · ${trip.days} dagar` : ''}</Text>
                      {!!trip.climateNote && <Text style={styles.tripClimate}>{trip.climateNote}</Text>}
                    </View>
                    {(trip.outfits || []).length > 0 && <Text style={styles.sectionLabel}>Outfits</Text>}
                    {(trip.outfits || []).map((o: any, i: number) => (
                      <View key={i} style={styles.outfitCard}>
                        <Text style={styles.outfitName}>{o.name}</Text>
                        <Text style={styles.outfitGarments}>{(o.items || []).join(' · ')}</Text>
                      </View>
                    ))}
                    {(trip.packingList || []).length > 0 && <Text style={styles.sectionLabel}>Packlista</Text>}
                    {(trip.packingList || []).map((p: string, i: number) => (
                      <Text key={i} style={styles.packItem}>• {p}</Text>
                    ))}
                  </View>
                )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  topArea: { paddingHorizontal: 24, paddingTop: 24 },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 60 },
  backButton: { marginBottom: 12 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: t.textPrimary },
  readonly: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, fontStyle: 'italic', marginTop: 4, marginBottom: 16 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  tabActive: { backgroundColor: t.primary, borderColor: t.primary },
  tabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  tabTextActive: { color: t.onPrimary, fontWeight: '600' },
  subRow: { marginBottom: 6, flexGrow: 0 },
  subTab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  subTabActive: { backgroundColor: t.primaryActive, borderColor: t.primaryActive },
  subTabText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  subTabTextActive: { color: t.onPrimary },

  empty: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gCard: { width: '30%', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: t.border },
  lendBadge: { position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  gImg: { width: '100%', height: 80, borderRadius: 10, marginBottom: 4 },
  gImgEmpty: { width: '100%', height: 80, borderRadius: 10, backgroundColor: t.surface, marginBottom: 4 },
  gName: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary, textAlign: 'center' },

  wishRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  wishImg: { width: 46, height: 46, borderRadius: 8 },
  wishImgEmpty: { width: 46, height: 46, borderRadius: 8, backgroundColor: t.surface },
  wishName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  wishMeta: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 2 },
  colorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border },
  wishPrice: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary },

  outfitCard: { backgroundColor: t.surfaceMuted, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.border, gap: 8 },
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
