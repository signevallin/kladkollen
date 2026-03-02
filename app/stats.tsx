import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import BottomNav from '../components/BottomNav'
import { supabase } from '../supabase'

const MOOD_META: Record<string, { emoji: string; color: string }> = {
  'Lugn':      { emoji: '😌', color: '#A8B5A0' },
  'Power':     { emoji: '🔥', color: '#9E2035' },
  'Romantisk': { emoji: '💕', color: '#E8A0B4' },
  'Energisk':  { emoji: '⚡', color: '#F5C842' },
  'Introvert': { emoji: '☁️', color: '#8B9BB4' },
  'Fest':      { emoji: '🪩', color: '#B57BDB' },
}

const CTX_LABEL: Record<string, string> = {
  jobb: '💼 Jobb', fritid: '🌿 Fritid', båda: '✨ Båda',
}

interface MoodStat {
  label: string; emoji: string; color: string
  count: number; pct: number; avgRating: number | null
}
interface PowerPiece {
  name: string; avgRating: number; appearances: number; image_url: string | null
}

export default function Stats() {
  const [activeTab, setActiveTab] = useState<'stil' | 'garderob'>('stil')

  // Garderob
  const [garments, setGarments] = useState<any[]>([])
  const [totalWorn, setTotalWorn] = useState(0)

  // Stil
  const [moodStats, setMoodStats] = useState<MoodStat[]>([])
  const [powerPieces, setPowerPieces] = useState<PowerPiece[]>([])
  const [weakPieces, setWeakPieces] = useState<PowerPiece[]>([])
  const [bestCombo, setBestCombo] = useState<{ mood: string; context: string; avgRating: number } | null>(null)
  const [ratedCount, setRatedCount] = useState(0)
  const [hasStyleData, setHasStyleData] = useState(false)

  useFocusEffect(useCallback(() => { fetchAll() }, []))

  async function fetchAll() {
    await Promise.all([fetchGarmentStats(), fetchStyleStats()])
  }

  async function fetchGarmentStats() {
    const { data } = await supabase
      .from('garments').select('*').eq('archived', false)
      .order('times_worn', { ascending: false })
    if (data) {
      setGarments(data)
      setTotalWorn(data.reduce((s, g) => s + (g.times_worn || 0), 0))
    }
  }

  async function fetchStyleStats() {
    const { data: outfits } = await supabase
      .from('outfits')
      .select('mood, context, garment_names, garment_ids, rating')
      .order('created_at', { ascending: false })
    if (!outfits || outfits.length === 0) return

    const withMood = outfits.filter(o => o.mood)
    setHasStyleData(withMood.length > 0 || outfits.some(o => o.rating !== null))
    const rated = outfits.filter(o => o.rating !== null)
    setRatedCount(rated.length)

    // Fetch garments for image lookup by name
    const { data: gData } = await supabase.from('garments').select('name, image_url')
    const imgByName = new Map(gData?.map(g => [g.name.toLowerCase(), g.image_url]) || [])

    // --- Mood distribution ---
    const moodMap: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {}
    withMood.forEach(o => {
      if (!moodMap[o.mood]) moodMap[o.mood] = { count: 0, ratingSum: 0, ratingCount: 0 }
      moodMap[o.mood].count++
      if (o.rating !== null) { moodMap[o.mood].ratingSum += o.rating; moodMap[o.mood].ratingCount++ }
    })
    const total = withMood.length || 1
    const stats: MoodStat[] = Object.entries(moodMap).map(([label, d]) => ({
      label, ...( MOOD_META[label] || { emoji: '✨', color: '#9E2035' }),
      count: d.count, pct: Math.round((d.count / total) * 100),
      avgRating: d.ratingCount > 0 ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : null,
    })).sort((a, b) => b.count - a.count)
    setMoodStats(stats)

    // --- Garment rating map ---
    const garmentRatingMap: Record<string, { sum: number; count: number }> = {}
    rated.forEach(o => {
      ;(o.garment_names || []).forEach((name: string) => {
        if (!garmentRatingMap[name]) garmentRatingMap[name] = { sum: 0, count: 0 }
        garmentRatingMap[name].sum += o.rating
        garmentRatingMap[name].count++
      })
    })

    // --- Power Pieces (appear in ≥1 high-rated outfit, avg ≥ 3.5) ---
    const highNames = new Set(rated.filter(o => o.rating >= 4).flatMap(o => o.garment_names || []))
    const power: PowerPiece[] = [...highNames]
      .map(name => {
        const r = garmentRatingMap[name]
        return r ? { name, avgRating: Math.round((r.sum / r.count) * 10) / 10, appearances: r.count, image_url: imgByName.get(name.toLowerCase()) || null } : null
      })
      .filter((p): p is PowerPiece => p !== null && p.avgRating >= 3.5)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5)
    setPowerPieces(power)

    // --- Weak Pieces (only in low-rated outfits, never in high) ---
    const lowNames = new Set(rated.filter(o => o.rating <= 2).flatMap(o => o.garment_names || []))
    const weak: PowerPiece[] = [...lowNames]
      .filter(name => !highNames.has(name))
      .map(name => {
        const r = garmentRatingMap[name]
        return r ? { name, avgRating: Math.round((r.sum / r.count) * 10) / 10, appearances: r.count, image_url: imgByName.get(name.toLowerCase()) || null } : null
      })
      .filter((p): p is PowerPiece => p !== null)
      .sort((a, b) => a.avgRating - b.avgRating)
      .slice(0, 5)
    setWeakPieces(weak)

    // --- Best mood × context combo (≥2 data points) ---
    const comboMap: Record<string, { sum: number; count: number }> = {}
    outfits.filter(o => o.rating !== null && o.mood && o.context).forEach(o => {
      const key = `${o.mood}|${o.context}`
      if (!comboMap[key]) comboMap[key] = { sum: 0, count: 0 }
      comboMap[key].sum += o.rating; comboMap[key].count++
    })
    const best = Object.entries(comboMap)
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count))[0]
    if (best) {
      const [mood, ctx] = best[0].split('|')
      setBestCombo({ mood, context: ctx, avgRating: Math.round((best[1].sum / best[1].count) * 10) / 10 })
    }
  }

  async function markForSale(item: any) {
    const { error } = await supabase.from('garments').update({ for_sale: true }).eq('id', item.id)
    if (error) Alert.alert('Något gick fel', error.message)
    else { Alert.alert('🍒 Lagt till i säljlistan!', `${item.name} finns nu under Sälj-fliken i din garderob.`); fetchAll() }
  }

  const mostWorn = garments.filter(g => g.times_worn > 0).slice(0, 5)
  const neverWorn = garments.filter(g => !g.times_worn || g.times_worn === 0)
  const maxWorn = mostWorn[0]?.times_worn || 1
  const vintedTips = garments.filter(g => {
    if (g.for_sale) return false
    if (!g.times_worn || g.times_worn === 0) return true
    if (!g.last_worn) return false
    return Math.floor((Date.now() - new Date(g.last_worn).getTime()) / 86400000) >= 180
  }).slice(0, 5)

  const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))

  return (
    <SafeAreaView style={styles.container}>

      {/* Fixed header */}
      <View style={styles.header}>
        <Text style={styles.title}>Statistik</Text>
        <View style={styles.tabRow}>
          {(['stil', 'garderob'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'stil' ? 'Min stil' : 'Min garderob'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── MIN STIL ── */}
        {activeTab === 'stil' && (
          !hasStyleData ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🪄</Text>
              <Text style={styles.emptyTitle}>Ingen data än</Text>
              <Text style={styles.emptyText}>
                Generera outfits och betygsätt dem för att se din stilprofil växa fram.
              </Text>
            </View>
          ) : (
            <>
              {/* Humörprofil */}
              {moodStats.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Din humörprofil</Text>
                  {moodStats.map(m => (
                    <View key={m.label} style={styles.moodRow}>
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <View style={styles.moodInfo}>
                        <View style={styles.moodLabelRow}>
                          <Text style={styles.moodName}>{m.label}</Text>
                          <Text style={[styles.moodPct, { color: m.color }]}>{m.pct}%</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${m.pct}%`, backgroundColor: m.color }]} />
                        </View>
                        {m.avgRating !== null && (
                          <Text style={styles.moodAvg}>{stars(m.avgRating)} {m.avgRating}/5 i snitt</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Bästa kombination */}
              {bestCombo && (
                <View style={styles.insightCard}>
                  <Text style={styles.insightEmoji}>💡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightTitle}>Bästa kombination</Text>
                    <Text style={styles.insightBody}>
                      {MOOD_META[bestCombo.mood]?.emoji} {bestCombo.mood} + {CTX_LABEL[bestCombo.context] || bestCombo.context} ger dig {bestCombo.avgRating}/5 i snittbetyg.
                    </Text>
                  </View>
                </View>
              )}

              {/* Power Pieces */}
              {powerPieces.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>⭐ Power Pieces</Text>
                  <Text style={styles.sectionSubtitle}>Plagg kopplade till dina bästa outfits</Text>
                  {powerPieces.map((item, i) => (
                    <View key={item.name} style={styles.pieceRow}>
                      <Text style={styles.pieceRank}>#{i + 1}</Text>
                      {item.image_url
                        ? <Image source={{ uri: item.image_url }} style={styles.pieceImage} />
                        : <View style={styles.pieceImageEmpty}><Text style={{ fontSize: 18 }}>👗</Text></View>
                      }
                      <View style={styles.pieceInfo}>
                        <Text style={styles.pieceName}>{item.name}</Text>
                        <Text style={styles.pieceRating}>{stars(item.avgRating)} {item.avgRating}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Svaga plagg */}
              {weakPieces.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>👎 Sänker betyget</Text>
                  <Text style={styles.sectionSubtitle}>Dessa plagg är kopplade till lägre betyg</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.horizontalList}>
                      {weakPieces.map(item => (
                        <View key={item.name} style={styles.neverItem}>
                          {item.image_url
                            ? <Image source={{ uri: item.image_url }} style={styles.neverImage} />
                            : <View style={styles.neverImageEmpty}><Text style={{ fontSize: 22 }}>👗</Text></View>
                          }
                          <Text style={styles.neverName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.weakRating}>{item.avgRating}★</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Unlock fler insikter */}
              {ratedCount < 5 && (
                <View style={styles.unlockCard}>
                  <Text style={styles.unlockEmoji}>🔮</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unlockTitle}>Mer insikter väntar</Text>
                    <Text style={styles.unlockText}>
                      Betygsätt {Math.max(0, 5 - ratedCount)} outfits till för att låsa upp färgpsykologi, Mood ROI och trendanalys över tid.
                    </Text>
                    <View style={styles.unlockBar}>
                      <View style={[styles.unlockFill, { width: `${Math.min(100, (ratedCount / 5) * 100)}%` }]} />
                    </View>
                    <Text style={styles.unlockProgress}>{ratedCount}/5 betygsatta outfits</Text>
                  </View>
                </View>
              )}
            </>
          )
        )}

        {/* ── MIN GARDEROB ── */}
        {activeTab === 'garderob' && (
          <>
            <View style={styles.heroCard}>
              <View>
                <Text style={styles.heroNumber}>{totalWorn}</Text>
                <Text style={styles.heroLabel}>gånger har du använt dina kläder</Text>
              </View>
              <Text style={styles.heroIcon}>👗</Text>
            </View>

            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatNum}>{garments.length}</Text>
                <Text style={styles.miniStatLabel}>plagg totalt</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatNum}>{garments.filter(g => g.times_worn > 0).length}</Text>
                <Text style={styles.miniStatLabel}>använda</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatNum}>{neverWorn.length}</Text>
                <Text style={styles.miniStatLabel}>oanvända</Text>
              </View>
            </View>

            <View style={styles.usageCard}>
              <Text style={styles.usagePercent}>
                {garments.length > 0 ? Math.round((garments.filter(g => g.times_worn > 0).length / garments.length) * 100) : 0}%
              </Text>
              <Text style={styles.usageLabel}>av din garderob används aktivt</Text>
            </View>

            {mostWorn.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mest använda plagg</Text>
                {mostWorn.map(item => (
                  <View key={item.id} style={styles.barRow}>
                    {item.image_url
                      ? <Image source={{ uri: item.image_url }} style={styles.barImage} />
                      : <View style={styles.barImageEmpty}><Text style={{ fontSize: 18 }}>👗</Text></View>
                    }
                    <View style={styles.barInfo}>
                      <View style={styles.barLabelRow}>
                        <Text style={styles.barName}>{item.name}</Text>
                        <Text style={styles.barCount}>{item.times_worn}×</Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${(item.times_worn / maxWorn) * 100}%` }]} />
                      </View>
                      <Text style={styles.barCategory}>{item.category}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {neverWorn.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aldrig använda</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.horizontalList}>
                    {neverWorn.map(item => (
                      <View key={item.id} style={styles.neverItem}>
                        {item.image_url
                          ? <Image source={{ uri: item.image_url }} style={styles.neverImage} />
                          : <View style={styles.neverImageEmpty}><Text style={{ fontSize: 24 }}>👗</Text></View>
                        }
                        <Text style={styles.neverName} numberOfLines={1}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {vintedTips.length > 0 && (
              <View style={styles.vintedSection}>
                <View style={styles.vintedHeader}>
                  <Text style={styles.vintedTitle}>Sälj på Vinted</Text>
                  <View style={styles.vintedBadge}>
                    <Text style={styles.vintedBadgeText}>{vintedTips.length} tips</Text>
                  </View>
                </View>
                <Text style={styles.vintedSubtitle}>Dessa plagg har inte använts på länge – dags att sälja?</Text>
                {vintedTips.map(item => {
                  const daysSince = item.last_worn
                    ? Math.floor((Date.now() - new Date(item.last_worn).getTime()) / 86400000)
                    : null
                  return (
                    <View key={item.id} style={styles.vintedItem}>
                      {item.image_url
                        ? <Image source={{ uri: item.image_url }} style={styles.vintedImage} />
                        : <View style={styles.vintedImageEmpty}><Text style={{ fontSize: 24 }}>👗</Text></View>
                      }
                      <View style={styles.vintedInfo}>
                        <Text style={styles.vintedItemName}>{item.name}</Text>
                        <Text style={styles.vintedItemCategory}>{item.category}</Text>
                        <Text style={styles.vintedDays}>
                          {daysSince ? `Inte använd på ${daysSince} dagar` : 'Aldrig använd'}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.vintedButton} onPress={() => markForSale(item)}>
                        <Text style={styles.vintedButtonText}>Sälj</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}
          </>
        )}

      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },

  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FBF3EF', letterSpacing: 1, marginBottom: 14 },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: '#9E2035' },
  tabText: { fontSize: 13, color: '#C4737A', fontWeight: '600' },
  tabTextActive: { color: '#FBF3EF' },

  scroll: { padding: 24, paddingTop: 16, paddingBottom: 100 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#FBF3EF' },
  emptyText: { fontSize: 14, color: '#C4737A', textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  // Shared section
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FBF3EF', marginBottom: 4, letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 11, color: '#C4737A', fontStyle: 'italic', marginBottom: 12 },

  // Mood profile
  moodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  moodEmoji: { fontSize: 22, marginTop: 2 },
  moodInfo: { flex: 1, gap: 4 },
  moodLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodName: { fontSize: 14, color: '#FBF3EF', fontWeight: '600' },
  moodPct: { fontSize: 14, fontWeight: '700' },
  moodAvg: { fontSize: 10, color: '#C4737A', marginTop: 2 },

  // Bar
  barTrack: { height: 6, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: '#C4737A' },

  // Insight card
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(158,32,53,0.15)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', marginBottom: 24,
  },
  insightEmoji: { fontSize: 24, marginTop: 2 },
  insightTitle: { fontSize: 13, fontWeight: '700', color: '#FBF3EF', marginBottom: 4 },
  insightBody: { fontSize: 13, color: '#DDA0A7', lineHeight: 19 },

  // Power / Weak pieces
  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 14, padding: 10 },
  pieceRank: { fontSize: 13, fontWeight: '700', color: '#C4737A', width: 24 },
  pieceImage: { width: 48, height: 48, borderRadius: 10 },
  pieceImageEmpty: { width: 48, height: 48, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.5)', alignItems: 'center', justifyContent: 'center' },
  pieceInfo: { flex: 1 },
  pieceName: { fontSize: 14, color: '#FBF3EF', fontWeight: '500', marginBottom: 3 },
  pieceRating: { fontSize: 12, color: '#F5C842' },

  horizontalList: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  neverItem: { width: 80, alignItems: 'center', gap: 5 },
  neverImage: { width: 72, height: 72, borderRadius: 14 },
  neverImageEmpty: { width: 72, height: 72, borderRadius: 14, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  neverName: { fontSize: 10, color: '#C4737A', textAlign: 'center' },
  weakRating: { fontSize: 10, color: '#E8A0B4', fontWeight: '600' },

  // Unlock card
  unlockCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: 'rgba(181,123,219,0.08)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(181,123,219,0.2)', marginBottom: 8,
  },
  unlockEmoji: { fontSize: 24 },
  unlockTitle: { fontSize: 13, fontWeight: '700', color: '#FBF3EF', marginBottom: 4 },
  unlockText: { fontSize: 12, color: '#C4737A', lineHeight: 18, marginBottom: 10 },
  unlockBar: { height: 4, backgroundColor: 'rgba(181,123,219,0.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  unlockFill: { height: '100%', backgroundColor: '#B57BDB', borderRadius: 2 },
  unlockProgress: { fontSize: 10, color: 'rgba(181,123,219,0.7)' },

  // Garderob - hero
  heroCard: { backgroundColor: '#9E2035', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroNumber: { fontSize: 56, fontWeight: 'bold', color: '#FBF3EF', lineHeight: 60 },
  heroLabel: { fontSize: 13, color: 'rgba(251,243,239,0.7)', marginTop: 4, maxWidth: 160 },
  heroIcon: { fontSize: 48, opacity: 0.5 },

  miniStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  miniStat: { flex: 1, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  miniStatNum: { fontSize: 24, fontWeight: 'bold', color: '#DDA0A7' },
  miniStatLabel: { fontSize: 10, color: '#C4737A', marginTop: 2, fontStyle: 'italic' },

  usageCard: { backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  usagePercent: { fontSize: 36, fontWeight: 'bold', color: '#DDA0A7' },
  usageLabel: { fontSize: 14, color: '#C4737A', flex: 1 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  barImage: { width: 44, height: 44, borderRadius: 10 },
  barImageEmpty: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  barInfo: { flex: 1 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barName: { fontSize: 13, color: '#FBF3EF', fontWeight: '500' },
  barCount: { fontSize: 13, color: '#DDA0A7', fontWeight: '600' },
  barCategory: { fontSize: 10, color: 'rgba(196,115,122,0.6)', fontStyle: 'italic', marginTop: 2 },

  vintedSection: { backgroundColor: 'rgba(221,160,167,0.08)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(221,160,167,0.2)', marginBottom: 20 },
  vintedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  vintedTitle: { fontSize: 18, fontWeight: 'bold', color: '#FBF3EF' },
  vintedBadge: { backgroundColor: '#9E2035', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  vintedBadgeText: { fontSize: 11, color: '#FBF3EF', fontWeight: '600' },
  vintedSubtitle: { fontSize: 12, color: '#C4737A', fontStyle: 'italic', marginBottom: 14 },
  vintedItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 14, padding: 10 },
  vintedImage: { width: 52, height: 52, borderRadius: 10 },
  vintedImageEmpty: { width: 52, height: 52, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  vintedInfo: { flex: 1 },
  vintedItemName: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  vintedItemCategory: { fontSize: 11, color: '#C4737A', marginTop: 1 },
  vintedDays: { fontSize: 10, color: 'rgba(196,115,122,0.6)', fontStyle: 'italic', marginTop: 2 },
  vintedButton: { backgroundColor: '#9E2035', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  vintedButtonText: { color: '#FBF3EF', fontSize: 13, fontWeight: '600' },
})
