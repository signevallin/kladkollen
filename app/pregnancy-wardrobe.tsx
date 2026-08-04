import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../components/SignedImage'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'
import { goBack } from '../utils/nav'
import { useSettings } from '../utils/settings'

// Gravidgarderob: hjälper dig konsumera smart (köp bara det du behöver) och
// återanvända dina gravidplagg. Bygger på befintliga köplistan och plagg-taggen.

type Essential = { key: string; label: string; category: string; hint: string }
const ESSENTIALS: Essential[] = [
  { key: 'byxor', label: 'Töjbara byxor eller leggings', category: 'Byxor', hint: 'Med hög, mjuk resår över magen.' },
  { key: 'topp', label: 'Längre topp eller tunika', category: 'Toppar', hint: 'Täcker magen även när den växer.' },
  { key: 'klanning', label: 'Bekväm klänning', category: 'Klänningar', hint: 'Empire-linje eller omlott växer med magen.' },
  { key: 'troja', label: 'Stickad tröja eller cardigan', category: 'Tröjor', hint: 'Ett lager du lätt tar av när du blir varm.' },
  { key: 'ytter', label: 'Ytterplagg med plats för magen', category: 'Ytterkläder', hint: 'Ofta räcker det med en storlek upp.' },
  { key: 'skor', label: 'Bekväma skor', category: 'Skor', hint: 'Sköna även när fötterna svullnar.' },
]

type MG = { id: string; name: string; category: string; image_url: string | null; lendable: boolean }
type Wish = { name: string; category: string | null }

export default function PregnancyWardrobe() {
  const t = useTheme()
  const { t: tr } = useSettings()
  const styles = makeStyles(t)
  const [maternity, setMaternity] = useState<MG[]>([])
  const [wishlist, setWishlist] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: g } = await supabase
      .from('garments')
      .select('id, name, category, image_url, lendable')
      .eq('maternity_friendly', true).eq('archived', false).is('person_id', null)
    setMaternity((g as MG[]) || [])
    const { data: w } = await supabase.from('wishlist').select('name, category')
    setWishlist((w as Wish[]) || [])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function addToWishlist(e: Essential) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('wishlist').insert([{
      user_id: user.id, name: e.label, category: e.category, sort_order: wishlist.length,
    }])
    if (error) { showAlert(tr('Något gick fel'), tr('Försök igen om en stund.')); return }
    setWishlist(prev => [...prev, { name: e.label, category: e.category }])
  }

  async function toggleLend(g: MG) {
    const next = !g.lendable
    setMaternity(prev => prev.map(x => (x.id === g.id ? { ...x, lendable: next } : x)))
    const { error } = await supabase.from('garments').update({ lendable: next }).eq('id', g.id)
    if (error) setMaternity(prev => prev.map(x => (x.id === g.id ? { ...x, lendable: !next } : x)))
  }

  function statusFor(e: Essential): 'have' | 'listed' | 'missing' {
    if (maternity.some(g => g.category === e.category)) return 'have'
    if (wishlist.some(w => w.name === e.label)) return 'listed'
    return 'missing'
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')}>
          <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tr('Gravidgarderob')}</Text>
        <Text style={styles.lede}>{tr('Köp bara det du faktiskt behöver – och återanvänd dina gravidplagg nästa gång.')}</Text>

        {loading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>{tr('Det du behöver')}</Text>
            <View style={styles.card}>
              {ESSENTIALS.map((e, i) => {
                const status = statusFor(e)
                return (
                  <View key={e.key} style={[styles.essential, i > 0 && styles.essentialBorder]}>
                    <View style={styles.essentialText}>
                      <Text style={styles.essentialLabel}>{tr(e.label)}</Text>
                      <Text style={styles.essentialHint}>{tr(e.hint)}</Text>
                    </View>
                    {status === 'have' ? (
                      <View style={styles.haveTag}>
                        <Ionicons name="checkmark-circle" size={16} color={t.primary} />
                        <Text style={styles.haveText}>{tr('Du har')}</Text>
                      </View>
                    ) : status === 'listed' ? (
                      <Text style={styles.listedText}>{tr('På köplistan')}</Text>
                    ) : (
                      <TouchableOpacity style={styles.addBtn} onPress={() => addToWishlist(e)}>
                        <Ionicons name="add" size={16} color={t.onPrimary} />
                        <Text style={styles.addBtnText}>{tr('Köplista')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })}
            </View>

            <Text style={styles.sectionTitle}>{tr('Mina gravidplagg')}</Text>
            <Text style={styles.reuseHint}>{tr('Dina gravid-/amningsvänliga plagg samlade. De behåller taggen till nästa graviditet – och kan lånas ut.')}</Text>
            {maternity.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{tr('Inga plagg markerade som gravid-/amningsvänliga än. Markera dem inne på varje plagg.')}</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {maternity.map((g, i) => (
                  <View key={g.id} style={[styles.mgRow, i > 0 && styles.essentialBorder]}>
                    {g.image_url
                      ? <SignedImage path={g.image_url} style={styles.mgThumb} resizeMode="contain" transform={{ width: 200, format: 'origin' }} />
                      : <View style={[styles.mgThumb, styles.mgThumbEmpty]} />}
                    <Text style={styles.mgName} numberOfLines={1}>{g.name}</Text>
                    <TouchableOpacity style={[styles.lendPill, g.lendable && styles.lendPillOn]} onPress={() => toggleLend(g)}>
                      <MaterialIcons name={g.lendable ? 'check' : 'add'} size={14} color={g.lendable ? t.onPrimary : t.textSecondary} />
                      <Text style={[styles.lendPillText, g.lendable && styles.lendPillTextOn]}>{tr('Kan lånas ut')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 60, maxWidth: 720, alignSelf: 'center', width: '100%' },
  backButton: { marginBottom: 12 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 30, color: t.textPrimary, marginBottom: 6 },
  lede: { fontFamily: 'Lora_400Regular', fontSize: 15, color: t.textSecondary, lineHeight: 22, marginBottom: 20 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginTop: 8, marginBottom: 10, letterSpacing: -0.2 },
  card: { backgroundColor: t.card, borderRadius: 16, borderWidth: 1, borderColor: t.border, overflow: 'hidden', marginBottom: 8 },

  essential: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  essentialBorder: { borderTopWidth: 1, borderTopColor: t.borderSoft },
  essentialText: { flex: 1 },
  essentialLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14.5, color: t.textPrimary, marginBottom: 3 },
  essentialHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 18 },
  haveTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  haveText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.primary },
  listedText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.onPrimary },

  reuseHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 19, marginBottom: 10 },
  emptyBox: { backgroundColor: t.surface, borderRadius: 16, padding: 18 },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21 },
  mgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  mgThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: t.surface },
  mgThumbEmpty: { borderWidth: 1, borderColor: t.border },
  mgName: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  lendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: t.border },
  lendPillOn: { backgroundColor: t.primary, borderColor: t.primary },
  lendPillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary },
  lendPillTextOn: { color: t.onPrimary },
})
