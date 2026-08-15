import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import { supabase } from '../../supabase'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import { apiPost } from '../../utils/api'
import { OUTFIT_CONTEXTS } from '../../utils/constants'
import { useEntitlements } from '../../utils/entitlements'
import { loadGarments } from '../../utils/garmentsStore'
import { loadPartner } from '../../utils/household'
import { loadPeople, type Person } from '../../utils/people'
import {
  buildGroupedGarmentList, childSizeFits, dedupOutfitItems, getCurrentSeason,
  isBabyChild, matchItemsToPool, seasonAppropriate, validateOutfit,
} from '../../utils/outfit'
import { tierAtLeast } from '../../utils/purchases'
import { useSettings } from '../../utils/settings'
import { buildWeatherContext, type WeatherInput } from '../../utils/weather'

// "Generera outfits för familjen": klär hela hushållet efter dagens väder direkt
// på hemskärmen (ingen egen sida). Egen state – laddar medlemmar, genererar per
// person och renderar inline. Hemskärmen skickar bara in vädret.
//
// Bakom Familj-nivån via REQUIRE_FAMILY_TIER (håll false tills nivån går att
// köpa, annars kan den inte testas; sätt true vid lansering av Familj-nivån).
const REQUIRE_FAMILY_TIER = false

const LEDIG = OUTFIT_CONTEXTS[2] // vardaglig kontext för "dagens" outfit

type Member = {
  key: string
  kind: 'me' | 'partner' | 'child'
  name: string
  person?: Person
  partnerId?: string
}

function seasonalOrFull(pool: any[], season: string): any[] {
  const s = pool.filter(g => seasonAppropriate(g, season))
  const ok = s.some(g => g.category === 'Skor')
    && s.some(g => ['Byxor', 'Shorts', 'Kjolar', 'Klänningar'].includes(g.category))
    && s.some(g => ['Toppar', 'Tröjor', 'Klänningar'].includes(g.category))
  return ok ? s : pool
}

export default function FamilyOutfits({ weather, disabled }: { weather: (WeatherInput & { emoji?: string }) | null; disabled?: boolean }) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang } = useSettings()
  const { tier } = useEntitlements()

  const [members, setMembers] = useState<Member[]>([])
  const [myGarments, setMyGarments] = useState<any[]>([])
  const [childGarments, setChildGarments] = useState<Record<string, any[]>>({})
  const [results, setResults] = useState<Record<string, any>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [running, setRunning] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [ppl, all] = await Promise.all([
        loadPeople().catch(() => [] as Person[]),
        loadGarments().catch(() => [] as any[]),
      ])
      const { partner } = await loadPartner().catch(() => ({ partner: null as any }))
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } as any }))

      const kids = ppl.filter(p => p.type === 'child')
      const childG: Record<string, any[]> = {}
      for (const k of kids) childG[k.id] = (all as any[]).filter(g => g.person_id === k.id)
      setChildGarments(childG)
      setMyGarments((all as any[]).filter(g => g.person_id == null))

      let myName = tr('Jag')
      if (user) {
        const { data } = await supabase.from('profiles').select('name').eq('id', user.id).single()
        myName = data?.name || myName
      }
      const list: Member[] = [{ key: 'me', kind: 'me', name: myName }]
      if (partner) list.push({ key: `partner:${partner.id}`, kind: 'partner', name: partner.name, partnerId: partner.id })
      for (const k of kids) list.push({ key: `child:${k.id}`, kind: 'child', name: k.name, person: k })
      setMembers(list)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function genForMember(m: Member, season: string, weatherCtx: { summary: string; rules: string; requiresOuterwear: boolean }) {
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
      const base = { weatherSummary: weatherCtx.summary, weatherRules: weatherCtx.rules, season, groupedList, retry: attempts > 1, lang }
      const body = m.kind === 'child'
        ? { ...base, audience: 'child', childName: m.name, babyMode: baby }
        : { ...base, contextLabel: LEDIG.label, contextLogic: LEDIG.logic, intensity: 'Balanserad (3/5)' }
      parsed = await apiPost('/api/generate-outfit', body)
      const { valid } = validateOutfit(parsed.items || [], scoped, weatherCtx.requiresOuterwear, { requireShoes: !baby })
      if (valid) break
    }
    if (!parsed?.items?.length) return { error: tr('AI:n gav inget giltigt förslag – försök igen.') }
    return { outfit: { ...parsed, itemsWithImages: dedupOutfitItems(matchItemsToPool(parsed.items, scoped), scoped) } }
  }

  async function generateAll() {
    if (running || disabled) return
    // Gate bakom Familj-nivån (av tills nivån går att köpa).
    if (REQUIRE_FAMILY_TIER && !tierAtLeast(tier, 'family')) { router.push('/paywall'); return }
    setRunning(true)
    setResults({})
    const season = getCurrentSeason()
    const weatherCtx = weather ? buildWeatherContext(weather, 3) : { summary: '', rules: '', requiresOuterwear: false }
    try {
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

  const hasResults = Object.keys(results).length > 0

  return (
    <>
      <TouchableOpacity style={styles.familyBtn} onPress={generateAll} disabled={running || disabled}>
        {running
          ? <ActivityIndicator color={t.textPrimary} />
          : <>
              <MaterialIcons name="diversity-3" size={18} color={t.textPrimary} />
              <Text style={styles.familyBtnText}>{hasResults ? tr('Generera nya för familjen') : tr('Generera outfits för familjen')}</Text>
            </>}
      </TouchableOpacity>

      {hasResults && (
        <View style={styles.card}>
          {members.map(m => {
            const r = results[m.key]
            const isPending = pending[m.key]
            if (!r && !isPending) return null
            return (
              <View key={m.key} style={styles.memberBlock}>
                <Text style={styles.memberName}>{m.name}</Text>
                {isPending
                  ? <View style={styles.memberLoading}><ActivityIndicator color={t.primary} /></View>
                  : r?.error
                    ? <Text style={styles.memberError}>{r.error}</Text>
                    : r?.outfit && (
                      <>
                        <View style={styles.images}>
                          {r.outfit.itemsWithImages.map((item: any, i: number) => (
                            <View key={i} style={styles.itemWrap}>
                              {item.image_url
                                ? <SignedImage path={item.image_url} style={styles.itemImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                                : <View style={styles.itemImageEmpty}><MaterialIcons name="checkroom" size={22} color={t.textFaint} /></View>}
                              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            </View>
                          ))}
                        </View>
                        {!!r.outfit.message && <Text style={styles.message}>{r.outfit.message}</Text>}
                      </>
                    )}
              </View>
            )
          })}
        </View>
      )}
    </>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  familyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 28, backgroundColor: t.surfaceMuted, borderRadius: 16, paddingVertical: 15, borderWidth: 1, borderColor: t.border, marginBottom: 28 },
  familyBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  card: { marginHorizontal: 28, backgroundColor: t.surfaceMuted, borderRadius: 22, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: t.border, gap: 20 },
  memberBlock: { gap: 10 },
  memberName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  memberLoading: { paddingVertical: 16, alignItems: 'center' },
  memberError: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, fontStyle: 'italic' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemWrap: { alignItems: 'center', width: 80 },
  itemImage: { width: 80, height: 80, borderRadius: 14 },
  itemImageEmpty: { width: 80, height: 80, borderRadius: 14, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center', width: 80, marginTop: 4 },
  message: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 19, fontStyle: 'italic' },
})
