import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { showAlert } from '../utils/alert'
import { apiPost } from '../utils/api'
import { OUTFIT_CONTEXTS } from '../utils/constants'
import { useEntitlements } from '../utils/entitlements'
import { loadGarments } from '../utils/garmentsStore'
import { loadPartner } from '../utils/household'
import { goBack } from '../utils/nav'
import { loadPeople, type Person } from '../utils/people'
import {
  buildGroupedGarmentList, childSizeFits, dedupOutfitItems, getCurrentSeason,
  isBabyChild, matchItemsToPool, seasonAppropriate, validateOutfit,
} from '../utils/outfit'
import { tierAtLeast } from '../utils/purchases'
import { useSettings } from '../utils/settings'
import { buildWeatherContext, summarizeDayForecast, type WeatherInput } from '../utils/weather'

// "Familjen idag": ett tryck klär hela hushållet efter dagens väder (och rätt
// storlek för barnen). En egen skärm så hemskärmen slipper mer branching.
// Ligger bakom den översta nivån (Familj) – familjeabonnenter har obegränsad AI,
// så flera genereringar per tryck är gratis för dem.

type Member = {
  key: string
  kind: 'me' | 'partner' | 'child'
  name: string
  avatar: string | null
  person?: Person
  partnerId?: string
}

const LEDIG = OUTFIT_CONTEXTS[2] // vardaglig kontext för "dagens" outfit

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

// Filtrera bort off-season men fall tillbaka till hela poolen om urvalet inte
// räcker för en komplett outfit (skor + över-/nederdel eller klänning).
function seasonalOrFull(pool: any[], season: string): any[] {
  const s = pool.filter(g => seasonAppropriate(g, season))
  const ok = s.some(g => g.category === 'Skor')
    && s.some(g => ['Byxor', 'Shorts', 'Kjolar', 'Klänningar'].includes(g.category))
    && s.some(g => ['Toppar', 'Tröjor', 'Klänningar'].includes(g.category))
  return ok ? s : pool
}

export default function FamilyToday() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang, tempLabel } = useSettings()
  const { tier } = useEntitlements()
  const entitled = tierAtLeast(tier, 'family')

  const [members, setMembers] = useState<Member[]>([])
  const [myGarments, setMyGarments] = useState<any[]>([])
  const [childGarments, setChildGarments] = useState<Record<string, any[]>>({})
  const [weather, setWeather] = useState<(WeatherInput & { emoji?: string }) | null>(null)
  const [results, setResults] = useState<Record<string, any>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!entitled) return
    ;(async () => {
      const [{ user }, ppl, all] = await Promise.all([
        supabase.auth.getUser().then(r => ({ user: r.data.user })).catch(() => ({ user: null })),
        loadPeople().catch(() => [] as Person[]),
        loadGarments().catch(() => [] as any[]),
      ])
      const { partner } = await loadPartner().catch(() => ({ partner: null as any }))

      const kids = ppl.filter(p => p.type === 'child')
      const childG: Record<string, any[]> = {}
      for (const k of kids) childG[k.id] = (all as any[]).filter(g => g.person_id === k.id)
      setChildGarments(childG)
      setMyGarments((all as any[]).filter(g => g.person_id == null))

      let myName = tr('Jag'); let myAvatar: string | null = null
      if (user) {
        const { data } = await supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single()
        myName = data?.name || myName
        myAvatar = data?.avatar_url || null
      }

      const list: Member[] = [{ key: 'me', kind: 'me', name: myName, avatar: myAvatar }]
      if (partner) list.push({ key: `partner:${partner.id}`, kind: 'partner', name: partner.name, avatar: partner.avatar_url ?? null, partnerId: partner.id })
      for (const k of kids) list.push({ key: `child:${k.id}`, kind: 'child', name: k.name, avatar: k.avatar_url ?? null, person: k })
      setMembers(list)
      fetchWeather()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitled])

  async function fetchWeather() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      const { latitude, longitude } = loc.coords
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`)
      const data = await res.json()
      const code = data.current.weathercode
      setWeather({ temp: Math.round(data.current.temperature_2m), rain: code >= 51 && code <= 82, emoji: weatherEmoji(code), ...summarizeDayForecast(data) })
    } catch { /* utan väder genereras ändå säsongsanpassat */ }
  }

  // Genererar en outfit för en medlem. Returnerar { outfit } eller { error }.
  async function genForMember(m: Member, season: string, weatherCtx: { summary: string; rules: string; requiresOuterwear: boolean }) {
    // Hämta medlemmens plaggpool.
    let pool: any[] = []
    if (m.kind === 'me') pool = myGarments.filter(g => !g.archived && !g.in_laundry)
    else if (m.kind === 'partner' && m.partnerId) {
      const { data } = await supabase.rpc('partner_garments', { target: m.partnerId })
      pool = (data || []).filter((g: any) => !g.archived && !g.for_sale)
    } else if (m.kind === 'child') {
      const active = (childGarments[m.person!.id] || []).filter(g => !g.archived && !g.in_laundry)
      pool = active.filter(g => childSizeFits(g, m.person?.current_size_cm ?? null))
      if (pool.length === 0) pool = active
    }

    const baby = m.kind === 'child' && isBabyChild(m.person?.birthdate, m.person?.current_size_cm ?? null)
    const scoped = seasonalOrFull(pool, season)
    if (scoped.length === 0) return { error: tr('För få plagg i garderoben.') }

    const groupedList = buildGroupedGarmentList(scoped, weatherCtx.requiresOuterwear)

    let parsed: any = null
    let attempts = 0
    while (attempts < 3) {
      attempts++
      const base = {
        weatherSummary: weatherCtx.summary,
        weatherRules: weatherCtx.rules,
        season,
        groupedList,
        retry: attempts > 1,
        lang,
      }
      const body = m.kind === 'child'
        ? { ...base, audience: 'child', childName: m.name, babyMode: baby }
        : { ...base, contextLabel: LEDIG.label, contextLogic: LEDIG.logic, intensity: 'Balanserad (3/5)' }
      parsed = await apiPost('/api/generate-outfit', body)
      const { valid } = validateOutfit(parsed.items || [], scoped, weatherCtx.requiresOuterwear, { requireShoes: !baby })
      if (valid) break
    }
    if (!parsed?.items?.length) return { error: tr('AI:n gav inget giltigt förslag – försök igen.') }
    const itemsWithImages = dedupOutfitItems(matchItemsToPool(parsed.items, scoped), scoped)
    return { outfit: { ...parsed, itemsWithImages } }
  }

  async function generateAll() {
    if (running) return
    setRunning(true)
    setResults({})
    const season = getCurrentSeason()
    const weatherCtx = weather ? buildWeatherContext(weather, 3) : { summary: '', rules: '', requiresOuterwear: false }
    try {
      // Sekventiellt så resultaten dyker upp en i taget och vi är snälla mot API:t.
      for (const m of members) {
        setPending(p => ({ ...p, [m.key]: true }))
        try {
          const r = await genForMember(m, season, weatherCtx)
          setResults(prev => ({ ...prev, [m.key]: r }))
        } catch (e: any) {
          if (e?.code === 'quota_exceeded') { router.push('/paywall'); return }
          setResults(prev => ({ ...prev, [m.key]: { error: e?.message || tr('Något gick fel') } }))
        } finally {
          setPending(p => ({ ...p, [m.key]: false }))
        }
      }
    } finally {
      setRunning(false)
    }
  }

  // ── Upsell för dem som inte har Familj-nivån ──────────────────────────────
  if (!entitled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBack('/home')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{tr('Familjen idag')}</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.upsell}>
          <MaterialIcons name="diversity-3" size={48} color={t.primary} />
          <Text style={styles.upsellTitle}>{tr('Klä hela familjen med ett tryck')}</Text>
          <Text style={styles.upsellText}>
            {tr('Få en outfit till varje familjemedlem anpassad efter dagens väder – och rätt storlek för barnen. Ingår i Familj-abonnemanget.')}
          </Text>
          <TouchableOpacity style={styles.generateBtn} onPress={() => router.push('/paywall')} activeOpacity={0.85}>
            <Text style={styles.generateText}>{tr('Uppgradera till Familj')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack('/home')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{tr('Familjen idag')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {weather && (
          <View style={styles.weatherRow}>
            <Text style={styles.weatherText}>{weather.emoji} {tempLabel(weather.temp)}</Text>
            {typeof weather.dayMin === 'number' && typeof weather.dayMax === 'number' && weather.dayMax - weather.dayMin >= 4 && (
              <Text style={styles.weatherSub}>{tempLabel(weather.dayMin)}–{tempLabel(weather.dayMax)}</Text>
            )}
          </View>
        )}

        <Text style={styles.intro}>{tr('En outfit till varje familjemedlem, anpassad efter dagens väder.')}</Text>

        <TouchableOpacity style={styles.generateBtn} onPress={generateAll} disabled={running} activeOpacity={0.85}>
          {running
            ? <ActivityIndicator color={t.onPrimary} />
            : <Text style={styles.generateText}>{Object.keys(results).length ? tr('Skapa nya') : tr('Skapa dagens outfits')}</Text>}
        </TouchableOpacity>

        {members.map(m => {
          const r = results[m.key]
          const isPending = pending[m.key]
          if (!r && !isPending) return null
          return (
            <View key={m.key} style={styles.section}>
              <View style={styles.memberRow}>
                {m.avatar
                  ? <SignedImage path={m.avatar} style={styles.memberAvatar} resizeMode="cover" transform={{ width: 96, height: 96, resize: 'cover' }} />
                  : <View style={[styles.memberAvatar, styles.avatarPlaceholder]}><MaterialIcons name={m.kind === 'child' ? 'child-care' : 'person'} size={20} color={t.textSecondary} /></View>}
                <Text style={styles.memberName}>{m.name}</Text>
              </View>
              {isPending
                ? <View style={styles.sectionLoading}><ActivityIndicator color={t.primary} /></View>
                : r?.error
                  ? <Text style={styles.sectionError}>{r.error}</Text>
                  : r?.outfit && (
                    <>
                      {!!r.outfit.message && <Text style={styles.message}>{r.outfit.message}</Text>}
                      <View style={styles.grid}>
                        {r.outfit.itemsWithImages.map((item: any, i: number) => (
                          <View key={i} style={styles.card}>
                            {item.image_url
                              ? <SignedImage path={item.image_url} style={styles.cardImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                              : <View style={[styles.cardImage, styles.cardEmpty]}><MaterialIcons name="checkroom" size={26} color={t.textFaint} /></View>}
                            <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                          </View>
                        ))}
                      </View>
                    </>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  title: { flex: 1, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: t.textPrimary },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  weatherRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, justifyContent: 'center', marginBottom: 6 },
  weatherText: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary },
  weatherSub: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary },
  intro: { fontFamily: 'Lora_400Regular', fontSize: 15, lineHeight: 22, color: t.textSecondary, textAlign: 'center', marginBottom: 18 },
  generateBtn: { backgroundColor: t.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  generateText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.onPrimary },
  section: { marginTop: 28 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: t.border },
  avatarPlaceholder: { backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary },
  sectionLoading: { paddingVertical: 24, alignItems: 'center' },
  sectionError: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, fontStyle: 'italic' },
  message: { fontFamily: 'Lora_400Regular', fontSize: 15, lineHeight: 22, color: t.textSecondary, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { width: '47%', backgroundColor: t.surface, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: t.border },
  cardImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: t.surfaceMuted },
  cardEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary, marginTop: 8, textAlign: 'center' },
  upsell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  upsellTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: t.textPrimary, textAlign: 'center' },
  upsellText: { fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 24, color: t.textSecondary, textAlign: 'center', marginBottom: 8 },
})
