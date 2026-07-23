import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
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
import { apiPost } from '../utils/api'
import { showAlert } from '../utils/alert'
import { goBack } from '../utils/nav'
import { loadPartner } from '../utils/household'
import { fetchCurrentWeather, buildWeatherContext, getCurrentSeason } from '../utils/weather'
import { OUTFIT_CONTEXTS, STYLE_RULES } from '../utils/constants'

export default function CoupleMatch() {
  const t = useTheme()
  const styles = makeStyles(t)

  const [myName, setMyName] = useState('Du')
  const [partnerName, setPartnerName] = useState('Partner')
  const [myGarments, setMyGarments] = useState<any[]>([])
  const [partnerGarments, setPartnerGarments] = useState<any[]>([])
  const [ready, setReady] = useState(false)

  const [ctxIndex, setCtxIndex] = useState(OUTFIT_CONTEXTS.findIndex(c => c.label === 'Date'))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)

  // Samma regler som vanlig outfit-generering (från min profil).
  const [styleRuleKeys, setStyleRuleKeys] = useState<string[]>([])
  const [avoidNote, setAvoidNote] = useState('')
  const [contextNotes, setContextNotes] = useState<Record<string, string>>({})
  const [coldSensitivity, setColdSensitivity] = useState(3)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { partner } = await loadPartner()
    if (!user || !partner) { setReady(true); return }
    setPartnerName(partner.name)
    const [{ data: prof }, mine, theirs] = await Promise.all([
      supabase.from('profiles').select('name, style_rules, avoid_note, outfit_context_notes, cold_sensitivity').eq('id', user.id).single(),
      supabase.from('garments').select('*').eq('user_id', user.id),
      supabase.rpc('partner_garments', { target: partner.id }),
    ])
    if (prof?.name) setMyName(prof.name)
    setStyleRuleKeys(prof?.style_rules ? prof.style_rules.split(', ').filter(Boolean) : [])
    setAvoidNote(prof?.avoid_note || '')
    setContextNotes(prof?.outfit_context_notes || {})
    if (prof?.cold_sensitivity != null) setColdSensitivity(prof.cold_sensitivity)
    setMyGarments((mine.data || []).filter((g: any) => !g.archived && !g.for_sale))
    setPartnerGarments((theirs.data || []).filter((g: any) => !g.archived && !g.for_sale))
    setReady(true)
  }

  function groupList(garments: any[]) {
    const byCat: Record<string, string[]> = {}
    for (const g of garments) {
      const cat = g.category || 'Övrigt'
      const parts = [g.subcategory, g.color].filter(Boolean).join(', ')
      const lend = g.lendable ? ' [LÅN]' : ''
      ;(byCat[cat] ||= []).push(`${g.name}${parts ? ` (${parts})` : ''}${lend}`)
    }
    return Object.entries(byCat).map(([c, items]) => `${c.toUpperCase()}:\n${items.map(i => '- ' + i).join('\n')}`).join('\n\n')
  }

  // Matchar ett plaggnamn mot rätt plagg i den KOMBINERADE poolen (för bilder).
  function matchGarment(name: string) {
    const pool = [...myGarments, ...partnerGarments]
    const target = (name || '').trim().toLowerCase()
    if (!target) return null
    let m = pool.find(g => (g.name || '').trim().toLowerCase() === target)
    if (!m) m = pool.find(g => (g.name || '').toLowerCase().includes(target))
    if (!m) m = pool.filter(g => g.name && target.includes(g.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0]
    return m || null
  }

  async function generate() {
    if (myGarments.length === 0 || partnerGarments.length === 0) {
      showAlert('För få plagg', 'Ni behöver båda ha plagg i garderoben för att matcha en look.')
      return
    }
    setLoading(true); setResult(null)
    try {
      const ctx = OUTFIT_CONTEXTS[ctxIndex] || OUTFIT_CONTEXTS[0]
      const weather = await fetchCurrentWeather()
      const weatherCtx = buildWeatherContext(weather, coldSensitivity)
      const styleRules = STYLE_RULES.filter(r => styleRuleKeys.includes(r.key)).map(r => `- ${r.rule}`).join('\n')
      const parsed = await apiPost('/api/match-couple', {
        nameA: myName,
        nameB: partnerName,
        listA: groupList(myGarments),
        listB: groupList(partnerGarments),
        contextLabel: ctx.label,
        contextLogic: ctx.logic,
        weatherSummary: weatherCtx.summary,
        weatherRules: weatherCtx.rules,
        styleRules,
        avoid: avoidNote.trim(),
        contextNote: (contextNotes[ctx.label] || '').trim(),
        season: getCurrentSeason(),
      })
      setResult(parsed)
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/partner')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Matcha outfits</Text>
        <Text style={styles.intro}>Sätt ihop en harmonisk look för er båda – ur bådas garderober. Plagg din partner markerat som "får lånas" kan bli en del av din outfit.</Text>

        {ready && (myGarments.length === 0 || partnerGarments.length === 0) ? (
          <Text style={styles.empty}>Ni behöver båda ha plagg i garderoben (och vara ihopkopplade) för att matcha en look.</Text>
        ) : (
          <>
            <Text style={styles.label}>Tillfälle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {OUTFIT_CONTEXTS.map((c, i) => (
                  <TouchableOpacity key={c.label} style={[styles.pill, ctxIndex === i && styles.pillActive]} onPress={() => setCtxIndex(i)}>
                    <Text style={[styles.pillText, ctxIndex === i && styles.pillTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.genBtn, loading && { opacity: 0.7 }]} onPress={generate} disabled={loading}>
              {loading ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.genBtnText}>{result ? 'Matcha igen' : 'Matcha vår look'}</Text>}
            </TouchableOpacity>

            {result && (
              <View style={{ marginTop: 20 }}>
                {!!result.vibe && <Text style={styles.vibe}>{result.vibe}</Text>}
                {(result.outfits || []).map((o: any, i: number) => (
                  <View key={i} style={styles.personCard}>
                    <Text style={styles.personName}>{o.person}</Text>
                    <View style={styles.imgRow}>
                      {(o.items || []).map((name: string, j: number) => {
                        const m = matchGarment(name)
                        return m?.image_url
                          ? <SignedImage key={j} path={m.image_url} style={styles.img} />
                          : <View key={j} style={styles.imgEmpty} />
                      })}
                    </View>
                    <Text style={styles.items}>{(o.items || []).join(' · ')}</Text>
                    {(o.borrowed || []).length > 0 && (
                      <Text style={styles.borrowed}>🔄 Lånar: {o.borrowed.join(', ')}</Text>
                    )}
                  </View>
                ))}
                {!!result.tip && (
                  <View style={styles.tipCard}><Text style={styles.tipText}>💡 {result.tip}</Text></View>
                )}
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
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 8 },
  intro: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 20 },
  empty: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, marginTop: 30, fontStyle: 'italic', lineHeight: 21 },
  label: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14, marginBottom: 10 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  genBtn: { backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  genBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  vibe: { fontFamily: 'Lora_500Medium', fontSize: 15, color: t.textPrimary, lineHeight: 22, marginBottom: 16, textAlign: 'center' },
  personCard: { backgroundColor: t.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 14, gap: 10 },
  personName: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary },
  imgRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  img: { width: 68, height: 68, borderRadius: 12 },
  imgEmpty: { width: 68, height: 68, borderRadius: 12, backgroundColor: t.surfaceMuted },
  items: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
  borrowed: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.primaryActive },
  tipCard: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border, marginTop: 4 },
  tipText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 20 },
})
