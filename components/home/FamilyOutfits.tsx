import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from '../SignedImage'
import GarmentPicker from './GarmentPicker'
import SwapSheet from './SwapSheet'
import { supabase } from '../../supabase'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import { showAlert } from '../../utils/alert'
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
import { markOutfitLoggedToday } from '../../utils/smartPush'
import { buildWeatherContext, type WeatherInput } from '../../utils/weather'

// "Generera outfits för familjen": klär hela hushållet efter dagens väder direkt
// på hemskärmen. Varje medlem kan – precis som singel-/par-flödet – byta ut
// plagg, lägga till plagg, spara outfiten och logga den som buren idag.
//
// Egen state (fetchar/sparar själv). Hemskärmen skickar bara in vädret.
//
// Bakom Familj-nivån via REQUIRE_FAMILY_TIER (håll false tills nivån går att
// köpa; sätt true vid lansering av Familj-nivån).
const REQUIRE_FAMILY_TIER = false

const LEDIG = OUTFIT_CONTEXTS[2] // vardaglig kontext för "dagens" outfit
const MAX_ADDED = 3

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

function today(): string { return new Date().toISOString().split('T')[0] }

export default function FamilyOutfits({ weather, disabled }: { weather: (WeatherInput & { emoji?: string }) | null; disabled?: boolean }) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang } = useSettings()
  const { tier } = useEntitlements()

  const [members, setMembers] = useState<Member[]>([])
  const [myGarments, setMyGarments] = useState<any[]>([])
  const [childGarments, setChildGarments] = useState<Record<string, any[]>>({})
  const [results, setResults] = useState<Record<string, any>>({}) // key → { outfit } | { error }
  const [pools, setPools] = useState<Record<string, any[]>>({})   // key → plaggpool (för byt/lägg till)
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [running, setRunning] = useState(false)

  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [savedId, setSavedId] = useState<Record<string, string | null>>({})
  const [worn, setWorn] = useState<Record<string, boolean>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [wearingKey, setWearingKey] = useState<string | null>(null)

  const [swapTarget, setSwapTarget] = useState<{ key: string; index: number } | null>(null)
  const [addTarget, setAddTarget] = useState<{ key: string } | null>(null)

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

  const memberByKey = (key: string) => members.find(m => m.key === key)
  const nameFor = (m: Member) => results[m.key]?.outfit?.outfitName || `${m.name} – ${tr(LEDIG.label)}`

  // Nollställ spar-/burit-status för en medlem efter manuell ändring.
  function resetMemberState(key: string) {
    setSaved(s => ({ ...s, [key]: false }))
    setWorn(w => ({ ...w, [key]: false }))
    setSavedId(s => ({ ...s, [key]: null }))
  }

  function updateMemberItems(key: string, updater: (items: any[]) => any[]) {
    setResults(prev => {
      const r = prev[key]
      if (!r?.outfit) return prev
      return { ...prev, [key]: { ...r, outfit: { ...r.outfit, itemsWithImages: updater(r.outfit.itemsWithImages) } } }
    })
    resetMemberState(key)
  }

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
    setPools(prev => ({ ...prev, [m.key]: scoped }))
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
    if (REQUIRE_FAMILY_TIER && !tierAtLeast(tier, 'family')) { router.push('/paywall'); return }
    setRunning(true)
    setResults({}); setSaved({}); setSavedId({}); setWorn({})
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

  // ── Byt ut / lägg till ────────────────────────────────────────────────────
  function replaceItem(key: string, index: number, g: any) {
    updateMemberItems(key, items => items.map((it, i) => i === index
      ? { name: g.name, image_url: g.image_url || null, id: g.id, category: g.category || null }
      : it))
    setSwapTarget(null)
  }
  function removeItem(key: string, index: number) {
    updateMemberItems(key, items => items.filter((_, i) => i !== index))
    setSwapTarget(null)
  }
  function addItem(key: string, g: any) {
    updateMemberItems(key, items => [...items, { name: g.name, image_url: g.image_url || null, id: g.id, category: g.category || null, added: true }])
    setAddTarget(null)
  }

  const swapPool: any[] = swapTarget ? (pools[swapTarget.key] || []) : []
  const swapItem = swapTarget ? results[swapTarget.key]?.outfit?.itemsWithImages?.[swapTarget.index] : null
  const swapCategory = swapItem ? swapPool.find(g => g.id === swapItem.id)?.category : null
  const swapUsedIds = new Set((swapTarget ? results[swapTarget.key]?.outfit?.itemsWithImages || [] : []).map((i: any) => i.id).filter(Boolean))
  const swapAlternatives = swapPool.filter(g =>
    !g.archived && g.id !== swapItem?.id && !swapUsedIds.has(g.id) &&
    (swapCategory ? g.category === swapCategory : true))

  const addPool: any[] = addTarget ? (pools[addTarget.key] || []).filter(g => !g.archived && !g.in_laundry) : []

  // ── Spara / logga ─────────────────────────────────────────────────────────
  async function saveMember(m: Member) {
    const r = results[m.key]
    if (!r?.outfit || savingKey) return
    setSavingKey(m.key)
    try {
      const items = r.outfit.itemsWithImages
      const names = items.map((i: any) => i.name)
      const imageUrls = items.map((i: any) => i.image_url).filter(Boolean)
      const ids = items.map((i: any) => i.id).filter(Boolean)
      if (m.kind === 'partner' && m.partnerId) {
        const { error } = await supabase.rpc('save_partner_outfit', { target: m.partnerId, p_name: nameFor(m), p_garment_names: names, p_image_urls: imageUrls })
        if (error) throw error
      } else {
        const existing = savedId[m.key]
        if (existing) {
          const { error } = await supabase.from('outfits').update({ saved: true }).eq('id', existing)
          if (error) throw error
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          const { data, error } = await supabase.from('outfits').insert([{
            user_id: user?.id,
            person_id: m.kind === 'child' ? m.person!.id : null,
            name: nameFor(m), garment_ids: ids, garment_names: names, image_urls: imageUrls,
            mood: LEDIG.label, context: LEDIG.label.toLowerCase(), saved: true,
          }]).select('id').single()
          if (error) throw error
          setSavedId(s => ({ ...s, [m.key]: data.id }))
        }
      }
      setSaved(s => ({ ...s, [m.key]: true }))
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setSavingKey(null)
    }
  }

  async function wearMember(m: Member) {
    const r = results[m.key]
    if (!r?.outfit || wearingKey) return
    setWearingKey(m.key)
    const day = today()
    try {
      const items = r.outfit.itemsWithImages
      const names = items.map((i: any) => i.name)
      const imageUrls = items.map((i: any) => i.image_url).filter(Boolean)
      const ids = items.map((i: any) => i.id).filter(Boolean)
      const { data: { user } } = await supabase.auth.getUser()

      if (m.kind === 'partner' && m.partnerId) {
        const { error } = await supabase.rpc('wear_partner_outfit', { target: m.partnerId, p_name: nameFor(m), p_garment_names: names, p_image_urls: imageUrls, p_date: day })
        if (error) throw error
      } else if (m.kind === 'me') {
        let id = savedId[m.key]
        if (!id) {
          const { data, error } = await supabase.from('outfits').insert([{
            user_id: user?.id, person_id: null, name: nameFor(m),
            garment_ids: ids, garment_names: names, image_urls: imageUrls,
            mood: LEDIG.label, context: LEDIG.label.toLowerCase(),
          }]).select('id').single()
          if (error) throw error
          id = data.id; setSavedId(s => ({ ...s, [m.key]: id }))
        }
        const { error: calErr } = await supabase.from('outfit_calendar').upsert({ user_id: user?.id, outfit_id: id, date: day }, { onConflict: 'user_id,date' })
        if (calErr) throw calErr
        markOutfitLoggedToday()
        if (ids.length) await supabase.rpc('adjust_garment_wear', { p_ids: ids, p_delta: 1, p_date: day })
      } else if (m.kind === 'child') {
        // Barnets outfit lagras med person_id + worn_on (ingen kalender – den är
        // per konto/dag). Plaggens användning räknas upp (mina rader → RLS ok).
        let id = savedId[m.key]
        if (id) {
          const { error } = await supabase.from('outfits').update({ worn_on: day, saved: true }).eq('id', id)
          if (error) throw error
        } else {
          const { data, error } = await supabase.from('outfits').insert([{
            user_id: user?.id, person_id: m.person!.id, name: nameFor(m),
            garment_ids: ids, garment_names: names, image_urls: imageUrls,
            mood: LEDIG.label, context: LEDIG.label.toLowerCase(), saved: true, worn_on: day,
          }]).select('id').single()
          if (error) throw error
          id = data.id; setSavedId(s => ({ ...s, [m.key]: id }))
        }
        setSaved(s => ({ ...s, [m.key]: true }))
        if (ids.length) await supabase.rpc('adjust_garment_wear', { p_ids: ids, p_delta: 1, p_date: day })
      }
      setWorn(w => ({ ...w, [m.key]: true }))
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setWearingKey(null)
    }
  }

  const hasResults = Object.keys(results).length > 0

  return (
    <>
      <TouchableOpacity style={styles.familyBtn} onPress={generateAll} disabled={running || disabled}>
        {running
          ? <ActivityIndicator color={t.textPrimary} />
          : <Text style={styles.familyBtnText}>{hasResults ? tr('Generera nya för familjen') : tr('Generera outfits för familjen')}</Text>}
      </TouchableOpacity>

      {hasResults && (
        <View style={styles.card}>
          {members.map(m => {
            const r = results[m.key]
            const isPending = pending[m.key]
            if (!r && !isPending) return null
            const addedCount = (r?.outfit?.itemsWithImages || []).filter((i: any) => i.added).length
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
                            <TouchableOpacity
                              key={i}
                              style={styles.itemWrap}
                              onPress={() => setSwapTarget({ key: m.key, index: i })}
                              activeOpacity={0.7}
                              accessibilityLabel={`${tr('Byt ut')} ${item.name}`}
                              accessibilityRole="button"
                            >
                              {item.image_url
                                ? <SignedImage path={item.image_url} style={styles.itemImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                                : <View style={styles.itemImageEmpty}><MaterialIcons name="checkroom" size={22} color={t.textFaint} /></View>}
                              <View style={styles.swapBadge}><Text style={styles.swapBadgeText}>⇄</Text></View>
                              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            </TouchableOpacity>
                          ))}
                          {addedCount < MAX_ADDED && (
                            <TouchableOpacity
                              style={styles.itemWrap}
                              onPress={() => setAddTarget({ key: m.key })}
                              activeOpacity={0.7}
                              accessibilityLabel={tr('Lägg till plagg')}
                              accessibilityRole="button"
                            >
                              <View style={styles.addBox}><View style={styles.addCircle}><Ionicons name="add" size={18} color={t.onPrimary} /></View></View>
                            </TouchableOpacity>
                          )}
                        </View>
                        {!!r.outfit.message && <Text style={styles.message}>{r.outfit.message}</Text>}
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, saved[m.key] && styles.actionBtnDone]}
                            onPress={() => saveMember(m)}
                            disabled={savingKey === m.key || saved[m.key]}
                          >
                            {savingKey === m.key
                              ? <ActivityIndicator size="small" color={t.primary} />
                              : <Text style={[styles.actionText, saved[m.key] && styles.actionTextDone]}>{saved[m.key] ? `✓ ${tr('Sparad')}` : tr('Spara')}</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPrimary, worn[m.key] && styles.actionBtnDone]}
                            onPress={() => wearMember(m)}
                            disabled={wearingKey === m.key || worn[m.key]}
                          >
                            {wearingKey === m.key
                              ? <ActivityIndicator size="small" color={t.onPrimary} />
                              : <Text style={[styles.actionTextPrimary, worn[m.key] && styles.actionTextDone]}>{worn[m.key] ? `✓ ${tr('Buren idag')}` : tr('Buren idag')}</Text>}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
              </View>
            )
          })}
        </View>
      )}

      {/* Byt ut-ark (ett i taget, delas av alla medlemmar) */}
      <SwapSheet
        visible={!!swapTarget}
        title={swapItem?.name ? `${tr('Byt ut')} ${swapItem.name}` : tr('Byt ut plagg')}
        alternatives={swapAlternatives}
        emptyText={tr('Inga andra plagg i den kategorin.')}
        onClose={() => setSwapTarget(null)}
        onRemove={() => swapTarget && removeItem(swapTarget.key, swapTarget.index)}
        onReplace={(g) => swapTarget && replaceItem(swapTarget.key, swapTarget.index, g)}
      />

      {/* Lägg till-väljare */}
      <GarmentPicker
        visible={!!addTarget}
        title={tr('Lägg till plagg')}
        pool={addPool}
        garments={addPool}
        onSelect={(g) => addTarget && addItem(addTarget.key, g)}
        onClose={() => setAddTarget(null)}
        accessoriesFirst
      />
    </>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  familyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 28, backgroundColor: t.surfaceMuted, borderRadius: 16, paddingVertical: 15, borderWidth: 1, borderColor: t.border, marginBottom: 28 },
  familyBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  card: { marginHorizontal: 28, backgroundColor: t.surfaceMuted, borderRadius: 22, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: t.border, gap: 24 },
  memberBlock: { gap: 10 },
  memberName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },
  memberLoading: { paddingVertical: 16, alignItems: 'center' },
  memberError: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, fontStyle: 'italic' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemWrap: { alignItems: 'center', width: 80 },
  itemImage: { width: 80, height: 80, borderRadius: 14 },
  itemImageEmpty: { width: 80, height: 80, borderRadius: 14, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  addBox: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  addCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  swapBadge: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  swapBadgeText: { color: t.onPrimary, fontSize: 12, fontFamily: 'Poppins_700Bold' },
  itemName: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center', width: 80, marginTop: 4 },
  message: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 19, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, minHeight: 42 },
  actionBtnPrimary: { backgroundColor: t.primary, borderColor: t.primary },
  actionBtnDone: { opacity: 0.6 },
  actionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary },
  actionTextPrimary: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.onPrimary },
  actionTextDone: { color: t.textSecondary },
})
