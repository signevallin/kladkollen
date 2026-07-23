import { MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
import { supabase } from '../supabase'
import { apiPost } from '../utils/api'
import { showAlert } from '../utils/alert'
import { goBack } from '../utils/nav'
import { STYLE_RULES } from '../utils/constants'

type Mode = 'color' | 'style' | 'moodboard'

const ANALYSIS_KEY = 'kladkollen_wardrobe_analysis'

const MODES: { key: Mode; icon: any; title: string; desc: string }[] = [
  { key: 'color', icon: 'palette', title: 'Färganalys', desc: 'Hur väl garderobens färger matchar din färgpalett.' },
  { key: 'style', icon: 'checkroom', title: 'Din stil', desc: 'Hur väl garderoben speglar din valda stil.' },
  { key: 'moodboard', icon: 'dashboard', title: 'Din moodboard', desc: 'Hur väl garderoben matchar din moodboards känsla.' },
]

export default function WardrobeAnalysis() {
  const t = useTheme()
  const styles = makeStyles(t)

  const [garments, setGarments] = useState<any[]>([])
  const [colorAnalysis, setColorAnalysis] = useState<any | null>(null)
  const [stylePrefs, setStylePrefs] = useState<string[]>([])
  const [stilProfil, setStilProfil] = useState<string[]>([])
  const [styleRules, setStyleRules] = useState<string[]>([])
  const [colorPrefs, setColorPrefs] = useState<string[]>([])
  const [moodboard, setMoodboard] = useState<string[]>([])

  const [loadingMode, setLoadingMode] = useState<Mode | null>(null)
  // Sparade resultat per läge, så de överlever flikbyten och appstarter.
  const [results, setResults] = useState<Record<string, any>>({})

  useEffect(() => { load() }, [])

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ANALYSIS_KEY)
        if (raw) setResults(JSON.parse(raw))
      } catch { /* ignorera */ }
    })()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: g } = await supabase.from('garments').select('name, category, subcategory, color').eq('archived', false)
    if (g) setGarments(g)
    const { data: p } = await supabase.from('profiles').select('color_analysis, style_prefs, stil_profil, style_rules, color_prefs').eq('id', user.id).single()
    if (p) {
      if (p.color_analysis) setColorAnalysis(p.color_analysis)
      setStylePrefs(p.style_prefs ? p.style_prefs.split(', ').filter(Boolean) : [])
      setStilProfil(p.stil_profil ? p.stil_profil.split(', ').filter(Boolean) : [])
      setStyleRules(p.style_rules ? p.style_rules.split(', ').filter(Boolean) : [])
      setColorPrefs(p.color_prefs ? p.color_prefs.split(', ').filter(Boolean) : [])
    }
    const { data: mb } = await supabase.from('moodboard').select('image_url').eq('user_id', user.id).order('created_at', { ascending: false })
    if (mb) setMoodboard(mb.map((m: any) => m.image_url).filter(Boolean))
  }

  function garmentListText() {
    return garments.map(gr => {
      const meta = [gr.subcategory || gr.category, gr.color].filter(Boolean).join(', ')
      return `- ${gr.name}${meta ? ` (${meta})` : ''}`
    }).join('\n')
  }

  function colorReference() {
    if (!colorAnalysis) return ''
    const bio = colorAnalysis.biologisk || {}
    const pal = colorAnalysis.palett || {}
    const names = (arr: any[]) => (arr || []).map((c: any) => c.namn).filter(Boolean).join(', ')
    return [
      bio.undertone ? `Undertone: ${bio.undertone}.` : '',
      pal.bas?.length ? `Basfärger: ${names(pal.bas)}.` : '',
      pal.accent?.length ? `Accentfärger: ${names(pal.accent)}.` : '',
      pal.undvik?.length ? `Undvik: ${names(pal.undvik)}.` : '',
    ].filter(Boolean).join(' ')
  }

  function styleReference() {
    const ruleLabels = STYLE_RULES.filter(r => styleRules.includes(r.key)).map(r => r.label)
    return [
      stylePrefs.length ? `Stil: ${stylePrefs.join(', ')}.` : '',
      stilProfil.length ? `Stilriktning: ${stilProfil.join(', ')}.` : '',
      ruleLabels.length ? `Stilregler: ${ruleLabels.join(', ')}.` : '',
      colorPrefs.length ? `Favoritfärger: ${colorPrefs.join(', ')}.` : '',
    ].filter(Boolean).join(' ')
  }

  function ready(mode: Mode): boolean {
    if (mode === 'color') return !!colorAnalysis
    if (mode === 'moodboard') return moodboard.length > 0
    return stylePrefs.length + stilProfil.length + styleRules.length + colorPrefs.length > 0
  }

  function missingHint(mode: Mode): string {
    if (mode === 'color') return 'Gör en färganalys under Min profil → Färganalys först.'
    if (mode === 'moodboard') return 'Lägg till bilder i din moodboard under Inspiration först.'
    return 'Fyll i din stil under Min profil först.'
  }

  async function analyze(mode: Mode) {
    if (garments.length === 0) { showAlert('Tom garderob', 'Lägg till plagg först så kan jag analysera.'); return }
    if (!ready(mode)) { showAlert('Saknar underlag', missingHint(mode)); return }
    setLoadingMode(mode)
    try {
      const payload: any = { mode, garmentList: garmentListText() }
      if (mode === 'color') payload.reference = colorReference()
      if (mode === 'style') payload.reference = styleReference()
      if (mode === 'moodboard') payload.images = moodboard.slice(0, 4)
      const parsed = await apiPost('/api/analyze-wardrobe', payload)
      const withTs = { ...parsed, _ts: Date.now() }
      setResults(prev => {
        const next = { ...prev, [mode]: withTs }
        AsyncStorage.setItem(ANALYSIS_KEY, JSON.stringify(next)).catch(() => {})
        return next
      })
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setLoadingMode(null)
    }
  }

  const scoreColor = (s: number) => (s >= 70 ? '#4B7B4B' : s >= 45 ? t.primaryActive : t.danger)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/stats')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Garderobsanalys</Text>
        <Text style={styles.intro}>Låt AI:n analysera hela din garderob mot olika referenser och ge dig konkreta råd.</Text>

        {MODES.map(m => {
          const isReady = ready(m.key)
          const isLoading = loadingMode === m.key
          const result = results[m.key]
          return (
            <View key={m.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name={m.icon} size={22} color={t.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                  <Text style={styles.cardDesc}>{m.desc}</Text>
                </View>
              </View>
              {!isReady && <Text style={styles.cardMissing}>{missingHint(m.key)}</Text>}
              <TouchableOpacity
                style={[styles.analyzeBtn, (!isReady || isLoading) && styles.analyzeBtnDisabled]}
                onPress={() => analyze(m.key)}
                disabled={!isReady || isLoading}
              >
                {isLoading
                  ? <ActivityIndicator color={t.onPrimary} size="small" />
                  : <Text style={styles.analyzeBtnText}>{result ? 'Analysera igen' : 'Analysera'}</Text>}
              </TouchableOpacity>

              {result && (
                <View style={styles.result}>
                  {result._ts && <Text style={styles.resultTs}>Senast analyserad {new Date(result._ts).toLocaleDateString('sv-SE')}</Text>}
                  <View style={styles.scoreRow}>
                    <View style={[styles.scoreCircle, { borderColor: scoreColor(result.score) }]}>
                      <Text style={[styles.scoreNum, { color: scoreColor(result.score) }]}>{result.score}</Text>
                    </View>
                    <Text style={styles.verdict}>{result.verdict}</Text>
                  </View>

                  {result.strengths?.length > 0 && (
                    <View style={styles.block}>
                      <Text style={styles.blockTitle}>Styrkor</Text>
                      {result.strengths.map((s: string, i: number) => (
                        <View key={i} style={styles.line}><Text style={styles.bulletOk}>✓</Text><Text style={styles.lineText}>{s}</Text></View>
                      ))}
                    </View>
                  )}
                  {result.gaps?.length > 0 && (
                    <View style={styles.block}>
                      <Text style={styles.blockTitle}>Luckor</Text>
                      {result.gaps.map((s: string, i: number) => (
                        <View key={i} style={styles.line}><Text style={styles.bulletGap}>•</Text><Text style={styles.lineText}>{s}</Text></View>
                      ))}
                    </View>
                  )}
                  {result.recommendations?.length > 0 && (
                    <View style={styles.block}>
                      <Text style={styles.blockTitle}>Rekommendationer</Text>
                      {result.recommendations.map((s: string, i: number) => (
                        <View key={i} style={styles.line}><Text style={styles.bulletRec}>→</Text><Text style={styles.lineText}>{s}</Text></View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        })}
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

  card: { backgroundColor: t.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: t.border, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, color: t.textPrimary },
  cardDesc: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: t.textSecondary, marginTop: 2, lineHeight: 18 },
  cardMissing: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, fontStyle: 'italic', marginBottom: 10 },
  analyzeBtn: { backgroundColor: t.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },

  result: { marginTop: 18, gap: 16 },
  resultTs: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontFamily: 'Poppins_700Bold', fontSize: 22 },
  verdict: { flex: 1, fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, lineHeight: 20 },
  block: { gap: 6 },
  blockTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletOk: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: '#4B7B4B', marginTop: 1, width: 14 },
  bulletGap: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: t.primaryActive, marginTop: -1, width: 14 },
  bulletRec: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: t.primary, marginTop: 1, width: 14 },
  lineText: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 13.5, color: t.textPrimary, lineHeight: 20 },
})
