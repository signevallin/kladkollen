import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import BottomNav from '../components/BottomNav'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'

// Donut-diagram över garderobens färger. Ritar varje färg som ett segment
// med strokeDasharray – börjar högst upp (roterad -90°).
function ColorPie({ data, total }: { data: { name: string; count: number; hex: string }[]; total: number }) {
  const size = 168, stroke = 38
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        {data.map(seg => {
          const dash = (seg.count / total) * circ
          const el = (
            <Circle
              key={seg.name}
              cx={size / 2} cy={size / 2} r={r}
              stroke={seg.hex} strokeWidth={stroke} fill="none"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
            />
          )
          offset += dash
          return el
        })}
      </G>
    </Svg>
  )
}

// Speglar kontexterna i home.tsx (Jobb / Ledig / Fest). Det är dessa som
// sparas på outfits numera – det gamla "humör"-fältet finns inte längre.
const CTX_META: Record<string, { emoji: string; color: string }> = {
  'Jobb':  { emoji: '', color: '#B5896E' },
  'Skola': { emoji: '', color: '#8B9BB4' },
  'Ledig': { emoji: '', color: '#A8B5A0' },
  'Date':  { emoji: '', color: '#E8A0B4' },
  'Fest':  { emoji: '', color: '#B57BDB' },
}

const COLOR_GROUPS: Record<string, string[]> = {
  'Mörka neutraler': ['Svart'],
  'Neutraler':       ['Vit', 'Grå', 'Beige', 'Brun'],
  'Varmt & kraftfullt': ['Röd', 'Orange', 'Gul', 'Guld'],
  'Svalt & lugnt':   ['Blå', 'Ljusblå', 'Grön'],
  'Romantiskt':      ['Rosa', 'Lila'],
}
const COLOR_EMOJIS: Record<string, string> = {
  'Mörka neutraler': '', 'Neutraler': '',
  'Varmt & kraftfullt': '', 'Svalt & lugnt': '', 'Romantiskt': '',
}

// Färgprickarnas hex – speglar färgvalen i Lägg till plagg.
const COLOR_HEX: Record<string, string> = {
  'Svart': '#1A1A1A', 'Vit': '#F5F5F5', 'Grå': '#9E9E9E', 'Beige': '#D4B896',
  'Brun': '#795548', 'Röd': '#E53935', 'Rosa': '#EC407A', 'Lila': '#8E24AA',
  'Blå': '#1E88E5', 'Ljusblå': '#81D4FA', 'Grön': '#43A047', 'Olivgrön': '#708238',
  'Gul': '#FDD835', 'Orange': '#FB8C00', 'Vinröd': '#7B2D3A', 'Guld': '#C9A96E',
}

interface MoodStat {
  label: string; emoji: string; color: string
  count: number; pct: number; avgRating: number | null
}
interface PowerPiece {
  name: string; avgRating: number; appearances: number; image_url: string | null
}
interface MoodROI {
  bestLabel: string; bestEmoji: string; bestAvg: number
  worstLabel: string; worstEmoji: string
  pctDiff: number
}
interface ColorInsight {
  group: string; emoji: string; avgRating: number; count: number
}
interface WinningCombo {
  group: string; groupEmoji: string
  context: string; ctxEmoji: string
  avgRating: number
}

export default function Stats() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [activeTab, setActiveTab] = useState<'stil' | 'garderob'>('stil')

  // Garderob
  const [garments, setGarments] = useState<any[]>([])
  const [totalWorn, setTotalWorn] = useState(0)

  // Stil
  const [moodStats, setMoodStats] = useState<MoodStat[]>([])
  const [moodROI, setMoodROI] = useState<MoodROI | null>(null)
  const [colorInsights, setColorInsights] = useState<ColorInsight[]>([])
  const [winningCombo, setWinningCombo] = useState<WinningCombo | null>(null)
  const [powerPieces, setPowerPieces] = useState<PowerPiece[]>([])
  const [weakPieces, setWeakPieces] = useState<PowerPiece[]>([])
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
      .select('mood, context, garment_names, garment_ids, rating, created_at')
      .order('created_at', { ascending: true })
    if (!outfits || outfits.length === 0) return

    // Räkna bara nuvarande kontexter (Jobb/Ledig/Fest). Äldre outfits kan ha
    // värden från det gamla humör-systemet (Lugn, Power osv) – de hoppas över
    // här men räknas fortfarande i betygsbaserad statistik (Power Pieces m.m.).
    const withMood = outfits.filter(o => o.mood && CTX_META[o.mood])
    setHasStyleData(withMood.length > 0 || outfits.some(o => o.rating !== null))
    const rated = outfits.filter(o => o.rating !== null)
    setRatedCount(rated.length)

    const { data: gData } = await supabase.from('garments').select('id, name, image_url, color')
    const colorById = new Map(gData?.map(g => [g.id, g.color]) || [])

    // Outfits lagrar AI:ns plaggnamn, som sällan är exakt samma som namnet i
    // garderoben. Matcha därför luddigt (som i resten av appen): exakt träff
    // först, annars den vars namn innehåller / ingår i det sparade namnet.
    const findImage = (name: string): string | null => {
      const n = name.toLowerCase()
      const exact = gData?.find(g => g.name.toLowerCase() === n)
      if (exact) return exact.image_url
      const fuzzy = gData?.find(g => g.name.toLowerCase().includes(n) || n.includes(g.name.toLowerCase()))
      return fuzzy?.image_url || null
    }

    // ── Mood distribution ──
    const moodMap: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {}
    withMood.forEach(o => {
      if (!moodMap[o.mood]) moodMap[o.mood] = { count: 0, ratingSum: 0, ratingCount: 0 }
      moodMap[o.mood].count++
      if (o.rating !== null) { moodMap[o.mood].ratingSum += o.rating; moodMap[o.mood].ratingCount++ }
    })
    const total = withMood.length || 1
    const stats: MoodStat[] = Object.entries(moodMap).map(([label, d]) => ({
      label, ...(CTX_META[label] || { emoji: '', color: t.textPrimary }),
      count: d.count, pct: Math.round((d.count / total) * 100),
      avgRating: d.ratingCount > 0 ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : null,
    })).sort((a, b) => b.count - a.count)
    setMoodStats(stats)

    // ── Mood ROI ──
    const ratedMoods = stats.filter(m => m.avgRating !== null)
    if (ratedMoods.length >= 2) {
      const byRating = [...ratedMoods].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
      const best = byRating[0], worst = byRating[byRating.length - 1]
      if (best.avgRating && worst.avgRating && worst.avgRating > 0) {
        const pct = Math.round(((best.avgRating - worst.avgRating) / worst.avgRating) * 100)
        if (pct >= 5) setMoodROI({ bestLabel: best.label, bestEmoji: best.emoji, bestAvg: best.avgRating, worstLabel: worst.label, worstEmoji: worst.emoji, pctDiff: pct })
      }
    }

    // ── Garment rating map ──
    const garmentRatingMap: Record<string, { sum: number; count: number }> = {}
    rated.forEach(o => {
      ;(o.garment_names || []).forEach((name: string) => {
        if (!garmentRatingMap[name]) garmentRatingMap[name] = { sum: 0, count: 0 }
        garmentRatingMap[name].sum += o.rating; garmentRatingMap[name].count++
      })
    })

    // ── Power Pieces ──
    const highNames = new Set(rated.filter(o => o.rating >= 4).flatMap(o => o.garment_names || []))
    const power: PowerPiece[] = [...highNames]
      .map(name => { const r = garmentRatingMap[name]; return r ? { name, avgRating: Math.round((r.sum / r.count) * 10) / 10, appearances: r.count, image_url: findImage(name) } : null })
      .filter((p): p is PowerPiece => p !== null && p.avgRating >= 3.5)
      .sort((a, b) => b.avgRating - a.avgRating).slice(0, 5)
    setPowerPieces(power)

    // ── Weak Pieces ──
    const lowNames = new Set(rated.filter(o => o.rating <= 2).flatMap(o => o.garment_names || []))
    const weak: PowerPiece[] = [...lowNames]
      .filter(name => !highNames.has(name))
      .map(name => { const r = garmentRatingMap[name]; return r ? { name, avgRating: Math.round((r.sum / r.count) * 10) / 10, appearances: r.count, image_url: findImage(name) } : null })
      .filter((p): p is PowerPiece => p !== null)
      .sort((a, b) => a.avgRating - b.avgRating).slice(0, 5)
    setWeakPieces(weak)

    // ── Color Psychology + Vinnande kombination (färggrupp × kontext) ──
    const colorGroupRatings: Record<string, { sum: number; count: number }> = {}
    const comboRatings: Record<string, { sum: number; count: number }> = {}
    rated.filter(o => o.garment_ids?.length > 0).forEach(o => {
      const usedGroups = new Set<string>()
      ;(o.garment_ids || []).forEach((id: string) => {
        const color = colorById.get(id)
        if (color) {
          for (const [group, colors] of Object.entries(COLOR_GROUPS)) {
            if (colors.includes(color)) { usedGroups.add(group); break }
          }
        }
      })
      usedGroups.forEach(group => {
        if (!colorGroupRatings[group]) colorGroupRatings[group] = { sum: 0, count: 0 }
        colorGroupRatings[group].sum += o.rating; colorGroupRatings[group].count++
        if (o.mood && CTX_META[o.mood]) {
          const key = `${group}|${o.mood}`
          if (!comboRatings[key]) comboRatings[key] = { sum: 0, count: 0 }
          comboRatings[key].sum += o.rating; comboRatings[key].count++
        }
      })
    })
    const colorIns: ColorInsight[] = Object.entries(colorGroupRatings)
      .filter(([, v]) => v.count >= 2)
      .map(([group, d]) => ({ group, emoji: COLOR_EMOJIS[group] || '', avgRating: Math.round((d.sum / d.count) * 10) / 10, count: d.count }))
      .sort((a, b) => b.avgRating - a.avgRating)
    setColorInsights(colorIns)

    const bestCombo = Object.entries(comboRatings)
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count))[0]
    if (bestCombo) {
      const [group, context] = bestCombo[0].split('|')
      setWinningCombo({
        group, groupEmoji: COLOR_EMOJIS[group] || '',
        context, ctxEmoji: CTX_META[context]?.emoji || '',
        avgRating: Math.round((bestCombo[1].sum / bestCombo[1].count) * 10) / 10,
      })
    }
  }

  async function markForSale(item: any) {
    const { error } = await supabase.from('garments').update({ for_sale: true }).eq('id', item.id)
    if (error) Alert.alert('Något gick fel', error.message)
    else { Alert.alert('Lagt till i säljlistan!', `${item.name} finns nu under Sälj-fliken i din garderob.`); fetchAll() }
  }

  const mostWorn = garments.filter(g => g.times_worn > 0).slice(0, 5)
  const neverWorn = garments.filter(g => !g.times_worn || g.times_worn === 0)
  const maxWorn = mostWorn[0]?.times_worn || 1
  const daysSince = (date: string | null) =>
    date ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000) : null

  // Säljtips: aldrig använda plagg föreslås först efter 90 dagar i garderoben
  // (ett plagg som lades in i förrgår har man förstås inte hunnit använda).
  // Använda plagg föreslås när de inte burits på ett halvår.
  const vintedTips = garments.filter(g => {
    if (g.for_sale) return false
    if (!g.times_worn || g.times_worn === 0) {
      const owned = daysSince(g.created_at)
      return owned !== null && owned >= 90
    }
    const idle = daysSince(g.last_worn)
    return idle !== null && idle >= 180
  }).slice(0, 5)

  const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))
  const maxColorRating = colorInsights[0]?.avgRating || 5

  // Färgfördelning i garderoben – antal plagg per färg, mest först.
  const colorBreakdown = (() => {
    const counts: Record<string, number> = {}
    garments.forEach(g => { if (g.color) counts[g.color] = (counts[g.color] || 0) + 1 })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, hex: COLOR_HEX[name] || '#B5896E' }))
      .sort((a, b) => b.count - a.count)
  })()
  const colorTotal = colorBreakdown.reduce((s, c) => s + c.count, 0) || 1

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Statistik</Text>
        <View style={styles.tabRow}>
          {(['stil', 'garderob'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
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
              <Text style={styles.emptyTitle}>Ingen data än</Text>
              <Text style={styles.emptyText}>Generera outfits och betygsätt dem för att se din stilprofil växa fram.</Text>
            </View>
          ) : (
            <>
              {/* Stilprofil */}
              {moodStats.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Din stilprofil</Text>
                  <Text style={styles.sectionSubtitle}>Hur ofta du klär dig för olika tillfällen</Text>
                  {moodStats.map(m => (
                    <View key={m.label} style={styles.moodRow}>
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

              {/* Stil-ROI */}
              {moodROI && (
                <View style={[styles.insightCard, { marginBottom: 24 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightTitle}>Din bästa stil</Text>
                    <Text style={styles.insightBody}>
                      {moodROI.bestLabel}-outfits ger {moodROI.pctDiff}% högre betyg än {moodROI.worstLabel}-outfits.
                    </Text>
                  </View>
                </View>
              )}

              {/* Vinnande kombination (färg × kontext) */}
              {winningCombo && (
                <View style={[styles.insightCard, { marginBottom: 24 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightTitle}>Vinnande kombination</Text>
                    <Text style={styles.insightBody}>
                      {winningCombo.group} till {winningCombo.context} ger dig {winningCombo.avgRating}/5 i snitt – din mest lyckade färg × tillfälle.
                    </Text>
                  </View>
                </View>
              )}

              {/* Power Pieces */}
              {powerPieces.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Power Pieces</Text>
                  <Text style={styles.sectionSubtitle}>Plagg kopplade till dina bästa outfits</Text>
                  {powerPieces.map((item, i) => (
                    <View key={item.name} style={styles.pieceRow}>
                      <Text style={styles.pieceRank}>#{i + 1}</Text>
                      {item.image_url
                        ? <SignedImage path={item.image_url} style={styles.pieceImage} />
                        : <View style={styles.pieceImageEmpty} />
                      }
                      <View style={styles.pieceInfo}>
                        <Text style={styles.pieceName}>{item.name}</Text>
                        <Text style={styles.pieceRating}>{stars(item.avgRating)} {item.avgRating}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Färgpsykologi */}
              {colorInsights.length >= 2 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Färgpsykologi</Text>
                  <Text style={styles.sectionSubtitle}>Vilka färggrupper ger dig höga betyg</Text>
                  {colorInsights.map(c => (
                    <View key={c.group} style={styles.colorRow}>
                      <View style={styles.colorInfo}>
                        <View style={styles.colorLabelRow}>
                          <Text style={styles.colorName}>{c.group}</Text>
                          <Text style={styles.colorRating}>{c.avgRating}★</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${(c.avgRating / maxColorRating) * 100}%`, backgroundColor: t.textSecondary }]} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Svaga plagg */}
              {weakPieces.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sänker betyget</Text>
                  <Text style={styles.sectionSubtitle}>Dessa plagg är kopplade till lägre betyg</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.horizontalList}>
                      {weakPieces.map(item => (
                        <View key={item.name} style={styles.neverItem}>
                          {item.image_url
                            ? <SignedImage path={item.image_url} style={styles.neverImage} />
                            : <View style={styles.neverImageEmpty} />
                          }
                          <Text style={styles.neverName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.weakRating}>{item.avgRating}★</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Unlock */}
              {ratedCount < 10 && (
                <View style={styles.unlockCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unlockTitle}>Mer insikter väntar</Text>
                    <Text style={styles.unlockText}>
                      {ratedCount < 5
                        ? `Betygsätt ${5 - ratedCount} outfits till för Power Pieces och Mood ROI.`
                        : `Betygsätt ${10 - ratedCount} outfits till för färgpsykologi och djupare trendanalys.`}
                    </Text>
                    <View style={styles.unlockBar}>
                      <View style={[styles.unlockFill, { width: `${Math.min(100, (ratedCount / 10) * 100)}%` }]} />
                    </View>
                    <Text style={styles.unlockProgress}>{ratedCount}/10 betygsatta outfits</Text>
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

            {colorBreakdown.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Din garderobs färger</Text>
                <Text style={styles.sectionSubtitle}>Så här fördelar sig färgerna i din garderob</Text>
                <View style={styles.pieWrap}>
                  <ColorPie data={colorBreakdown} total={colorTotal} />
                  <View style={styles.legend}>
                    {colorBreakdown.map(c => (
                      <View key={c.name} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: c.hex }]} />
                        <Text style={styles.legendName} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.legendCount}>{Math.round((c.count / colorTotal) * 100)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {mostWorn.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mest använda plagg</Text>
                {mostWorn.map(item => (
                  <View key={item.id} style={styles.barRow}>
                    {item.image_url
                      ? <SignedImage path={item.image_url} style={styles.barImage} />
                      : <View style={styles.barImageEmpty} />
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
                          ? <SignedImage path={item.image_url} style={styles.neverImage} />
                          : <View style={styles.neverImageEmpty} />
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
                  const idleDays = daysSince(item.last_worn)
                  const ownedDays = daysSince(item.created_at)
                  const label = idleDays !== null
                    ? `Inte använd på ${idleDays} dagar`
                    : ownedDays !== null
                      ? `Aldrig använd – i garderoben i ${Math.round(ownedDays / 30)} månader`
                      : 'Aldrig använd'
                  return (
                    <View key={item.id} style={styles.vintedItem}>
                      {item.image_url
                        ? <SignedImage path={item.image_url} style={styles.vintedImage} />
                        : <View style={styles.vintedImageEmpty} />
                      }
                      <View style={styles.vintedInfo}>
                        <Text style={styles.vintedItemName}>{item.name}</Text>
                        <Text style={styles.vintedItemCategory}>{item.category}</Text>
                        <Text style={styles.vintedDays}>{label}</Text>
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

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },

  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 14 },
  tabRow: { flexDirection: 'row', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: t.primary },
  tabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  tabTextActive: { color: t.onPrimary },

  scroll: { padding: 24, paddingTop: 16, paddingBottom: 100 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontFamily: 'Lora_400Regular', fontSize: 52 },
  emptyTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginBottom: 4, letterSpacing: 0.5 },
  sectionSubtitle: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, fontStyle: 'italic', marginBottom: 12 },

  moodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  moodEmoji: { fontFamily: 'Lora_400Regular', fontSize: 22, marginTop: 2 },
  moodInfo: { flex: 1, gap: 4 },
  moodLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary },
  moodPct: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
  moodAvg: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary, marginTop: 2 },

  barTrack: { height: 6, backgroundColor: t.surfaceMuted, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: t.textSecondary },

  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(64,45,33,0.15)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.border },
  insightEmoji: { fontFamily: 'Lora_400Regular', fontSize: 22, marginTop: 2 },
  insightTitle: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: t.textPrimary, marginBottom: 4 },
  insightBody: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 19 },

  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10 },
  pieceRank: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: t.textSecondary, width: 24 },
  pieceImage: { width: 48, height: 48, borderRadius: 10 },
  pieceImageEmpty: { width: 48, height: 48, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  pieceInfo: { flex: 1 },
  pieceName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, marginBottom: 3 },
  pieceRating: { fontFamily: 'Lora_400Regular', fontSize: 12, color: '#F5C842' },

  // Color Psychology
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  colorEmoji: { fontFamily: 'Lora_400Regular', fontSize: 20, width: 28 },
  colorInfo: { flex: 1, gap: 4 },
  colorLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  colorName: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textPrimary },
  colorRating: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#F5C842' },
  pieWrap: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: t.border },
  legendName: { flex: 1, fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textPrimary },
  legendCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary },

  horizontalList: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  neverItem: { width: 80, alignItems: 'center', gap: 5 },
  neverImage: { width: 72, height: 72, borderRadius: 14 },
  neverImageEmpty: { width: 72, height: 72, borderRadius: 14, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  neverName: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary, textAlign: 'center' },
  weakRating: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: '#E8A0B4' },

  unlockCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(181,123,219,0.08)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(181,123,219,0.2)', marginBottom: 8 },
  unlockEmoji: { fontFamily: 'Lora_400Regular', fontSize: 24 },
  unlockTitle: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: t.textPrimary, marginBottom: 4 },
  unlockText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, lineHeight: 18, marginBottom: 10 },
  unlockBar: { height: 4, backgroundColor: 'rgba(181,123,219,0.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  unlockFill: { height: '100%', backgroundColor: '#B57BDB', borderRadius: 2 },
  unlockProgress: { fontFamily: 'Lora_400Regular', fontSize: 10, color: 'rgba(181,123,219,0.7)' },

  heroCard: { backgroundColor: t.primary, borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroNumber: { fontFamily: 'Poppins_700Bold', fontSize: 56, color: t.textPrimary, lineHeight: 60 },
  heroLabel: { fontFamily: 'Lora_400Regular', fontSize: 13, color: 'rgba(64,45,33,0.7)', marginTop: 4, maxWidth: 160 },
  heroIcon: { fontFamily: 'Lora_400Regular', fontSize: 48, opacity: 0.5 },

  miniStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  miniStat: { flex: 1, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  miniStatNum: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: t.textSecondary },
  miniStatLabel: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textSecondary, marginTop: 2, fontStyle: 'italic' },

  usageCard: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: t.border },
  usagePercent: { fontFamily: 'Poppins_700Bold', fontSize: 36, color: t.textSecondary },
  usageLabel: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, flex: 1 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  barImage: { width: 44, height: 44, borderRadius: 10 },
  barImageEmpty: { width: 44, height: 44, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  barInfo: { flex: 1 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barName: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textPrimary },
  barCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  barCategory: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textFaint, fontStyle: 'italic', marginTop: 2 },

  vintedSection: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 20 },
  vintedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  vintedTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary },
  vintedBadge: { backgroundColor: t.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  vintedBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.onPrimary },
  vintedSubtitle: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic', marginBottom: 14 },
  vintedItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10 },
  vintedImage: { width: 52, height: 52, borderRadius: 10 },
  vintedImageEmpty: { width: 52, height: 52, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  vintedInfo: { flex: 1 },
  vintedItemName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  vintedItemCategory: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 1 },
  vintedDays: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textFaint, fontStyle: 'italic', marginTop: 2 },
  vintedButton: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  vintedButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 13 },
})
