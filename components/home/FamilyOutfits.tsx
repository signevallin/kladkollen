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
import { useEntitlements, familyFeaturesEnabled } from '../../utils/entitlements'
import { invalidateGarments, loadGarments } from '../../utils/garmentsStore'
import { loadPartner } from '../../utils/household'
import { cacheGet } from '../../utils/cache'
import { loadPeople, type Person } from '../../utils/people'
import { ageMonths,
  buildGroupedGarmentList, childSizeFits, dedupOutfitItems, getCurrentSeason,
  childWalks, isBabyChild, matchItemsToPool, seasonAppropriate, validateOutfit,
} from '../../utils/outfit'
import { colorPalettePrompt } from '../../utils/colorAnalysis'
import { STYLE_RULES } from '../../utils/constants'
import { pregnancyPromptContext, trimesterFromDueDate, nursingPromptContext } from '../../utils/pregnancy'
import { useSettings } from '../../utils/settings'
import SongCard from '../SongCard'
import { resolveSong, songHistory } from '../../utils/song'
import { markOutfitLoggedToday } from '../../utils/smartPush'
import { buildWeatherContext, childHeadwearRule, type WeatherInput } from '../../utils/weather'

// "Generera outfits för familjen": klär hela hushållet efter dagens väder direkt
// på hemskärmen. Varje medlem kan – precis som singel-/par-flödet – byta ut
// plagg, lägga till plagg, spara outfiten och logga den som buren idag.
//
// Egen state (fetchar/sparar själv). Hemskärmen skickar bara in vädret.
//
// Bakom Familj-nivån (familjeläget) via familyFeaturesEnabled() – delad grind
// med "packa barnen"-toggeln i reseläget.
const LEDIG = OUTFIT_CONTEXTS[2] // vardaglig kontext för "dagens" outfit
const MAX_ADDED = 3

type Member = {
  key: string
  kind: 'me' | 'partner' | 'child'
  name: string
  person?: Person
  partnerId?: string
  partnerCold?: number
  partnerPalette?: string
  partnerStyle?: string
}

function seasonalOrFull(pool: any[], season: string): any[] {
  const s = pool.filter(g => seasonAppropriate(g, season))
  const ok = s.some(g => g.category === 'Skor')
    && s.some(g => ['Byxor', 'Shorts', 'Kjolar', 'Klänningar'].includes(g.category))
    && s.some(g => ['Toppar', 'Tröjor', 'Klänningar'].includes(g.category))
  return ok ? s : pool
}

function today(): string { return new Date().toISOString().split('T')[0] }

export default function FamilyOutfits(
  { weather, disabled, musicGenres = '' }:
  { weather: (WeatherInput & { emoji?: string }) | null; disabled?: boolean; musicGenres?: string },
) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, lang, showDailySong, useColorAnalysis } = useSettings()
  const { tier } = useEntitlements()

  // Seedas ur cachen som home.tsx redan fyller (household.partner/.children,
  // home.userName). Utan detta stod sektionen tom tills fyra nätverksanrop var
  // klara, trots att svaren redan låg på disk. Listan skrivs över av effekten
  // nedan så fort färsk data finns.
  const [members, setMembers] = useState<Member[]>(() => {
    const partner = cacheGet<{ id: string; name: string; cold_sensitivity?: number } | null>('household.partner') ?? null
    const kids = cacheGet<Person[]>('household.children') ?? []
    const list: Member[] = [{ key: 'me', kind: 'me', name: cacheGet<string>('home.userName') || tr('Jag') }]
    if (partner) list.push({ key: `partner:${partner.id}`, kind: 'partner', name: partner.name, partnerId: partner.id, partnerCold: partner.cold_sensitivity, partnerPalette: colorPalettePrompt((partner as any).color_analysis), partnerStyle: (partner as any).style_prefs || '' })
    for (const k of kids) list.push({ key: `child:${k.id}`, kind: 'child', name: k.name, person: k })
    return list
  })
  const [myGarments, setMyGarments] = useState<any[]>([])
  // Egen köldkänslighet + gravidflagga. Låg tidigare inte alls här, vilket
  // var hela felet: vuxna kördes som 'lagom' oavsett vad de fyllt i.
  const [myCold, setMyCold] = useState<{ stated: number; pregnant: boolean }>({ stated: 3, pregnant: false })
  // Egen färgpalett. Vägdes tidigare in när man genererade åt sig själv från
  // hemskärmen men försvann i familjeoutfiten – samma inkonsekvens som
  // köldkänsligheten hade.
  const [myPalette, setMyPalette] = useState('')
  // Resten av personaliseringen. Familjeflödet skickade tidigare bara väder,
  // årstid och plagglista – stilregler, undvik, stil och gravidläge nådde
  // aldrig fram, så samma person fick en fattigare outfit här än på hemskärmen.
  const [myProfile, setMyProfile] = useState<{
    styleRules: string; stylePrefs: string; avoid: string; pregnancy: string; nursing: string
  }>({ styleRules: '', stylePrefs: '', avoid: '', pregnancy: '', nursing: '' })
  const [childGarments, setChildGarments] = useState<Record<string, any[]>>({})
  const [results, setResults] = useState<Record<string, any>>({}) // key → { outfit } | { error }
  // Dagens låt gäller HELA familjen – en låt för stunden, inte en per person.
  // Fyra låtkort under varandra hade varit brus, och "Dagens låt" är singular.
  const [song, setSong] = useState<any>(null)
  // key → HELA medlemmens aktiva garderob. Byt-ut och lägg-till ska visa allt
  // personen äger; genereringens snävare urval (storlek + säsong) används bara
  // när AI:n väljer åt en. Låg den filtrerade poolen här saknades plagg
  // användaren vet finns – ett barn ett steg från nästa storlek fick nästan
  // inget att välja på, trots full garderob.
  const [pools, setPools] = useState<Record<string, any[]>>({})
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
      // Fyra oberoende anrop låg tidigare i rad; bara profilnamnet behöver
      // vänta (det kräver user-id). Väntan blir det långsammaste, inte summan.
      const [ppl, all, partnerRes, userRes] = await Promise.all([
        loadPeople().catch(() => [] as Person[]),
        loadGarments().catch(() => [] as any[]),
        loadPartner().catch(() => ({ partner: null as any })),
        supabase.auth.getUser().catch(() => ({ data: { user: null } as any })),
      ])
      const { partner } = partnerRes
      const { data: { user } } = userRes

      const kids = ppl.filter(p => p.type === 'child')
      const childG: Record<string, any[]> = {}
      for (const k of kids) childG[k.id] = (all as any[]).filter(g => g.person_id === k.id)
      setChildGarments(childG)
      setMyGarments((all as any[]).filter(g => g.person_id == null))

      let myName = tr('Jag')
      let statedCold = 3
      let isPregnant = false
      if (user) {
        const { data } = await supabase.from('profiles')
          .select('name, cold_sensitivity, pregnant, due_date, nursing, color_analysis, style_rules, style_prefs, avoid_note')
          .eq('id', user.id).single()
        myName = data?.name || myName
        if (typeof data?.cold_sensitivity === 'number') statedCold = data.cold_sensitivity
        isPregnant = !!data?.pregnant
        setMyPalette(colorPalettePrompt((data as any)?.color_analysis))
        const ruleKeys = (data as any)?.style_rules ? String((data as any).style_rules).split(', ').filter(Boolean) : []
        setMyProfile({
          styleRules: STYLE_RULES.filter(r => ruleKeys.includes(r.key)).map(r => `- ${r.rule}`).join('\n'),
          stylePrefs: (data as any)?.style_prefs || '',
          avoid: ((data as any)?.avoid_note || '').trim(),
          pregnancy: pregnancyPromptContext(!!(data as any)?.pregnant, trimesterFromDueDate((data as any)?.due_date)),
          nursing: nursingPromptContext(!!(data as any)?.nursing),
        })
      }
      setMyCold({ stated: statedCold, pregnant: isPregnant })
      const list: Member[] = [{ key: 'me', kind: 'me', name: myName }]
      if (partner) list.push({ key: `partner:${partner.id}`, kind: 'partner', name: partner.name, partnerId: partner.id, partnerCold: partner.cold_sensitivity, partnerPalette: colorPalettePrompt((partner as any).color_analysis), partnerStyle: (partner as any).style_prefs || '' })
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

  async function genForMember(m: Member, season: string, weatherCtx: { summary: string; rules: string; requiresOuterwear: boolean }, songHist: { avoidSongs: string; previousSong: string }) {
    let pool: any[] = []
    // full = allt medlemmen äger, pool = det AI:n får välja ur. De skiljer sig
    // bara för barn, där storleksfiltret gäller.
    let full: any[] = []
    // Samma filter som hemskärmen: i gravidläget döljs plagg man pausat.
    // Saknades här, så ett pausat plagg kunde dyka upp i familjeoutfiten.
    if (m.kind === 'me') pool = full = myGarments.filter(g => !g.archived && !g.in_laundry && !(myCold.pregnant && g.paused_pregnancy))
    else if (m.kind === 'partner' && m.partnerId) {
      const { data } = await supabase.rpc('partner_garments', { target: m.partnerId })
      // Bara partnerns EGNA plagg (person_id null) – annars kunde deras barns
      // plagg hamna i partnerns outfit.
      pool = full = (data || []).filter((g: any) => !g.archived && !g.for_sale && g.person_id == null)
    } else if (m.kind === 'child') {
      const active = (childGarments[m.person!.id] || []).filter(g => !g.archived && !g.in_laundry)
      full = active
      pool = active.filter(g => childSizeFits(g, m.person?.current_size_cm ?? null, m.person?.current_shoe_size ?? null))
      if (pool.length === 0) pool = active
    }

    const baby = m.kind === 'child' && isBabyChild(m.person?.birthdate, m.person?.current_size_cm ?? null)
    const walks = m.kind !== 'child' || childWalks(m.person?.birthdate, m.person?.current_size_cm ?? null, m.person?.walks)
    // Egen upplevd temperatur per medlem: barn har köldkänslighet på sin
    // people-rad, vuxna kör lagom. Därför byggs kontexten här och inte en gång
    // för hela familjen – annars hade alla delat samma känsla för vädret.
    // Varje medlem får sin EGEN köldkänslighet. Vuxna var hårdkodade till 3,
    // så den som fyllt i "ofta frusen" fick ändå lagom-lager i familjeoutfiten
    // (men rätt lager på hemskärmen – två olika svar för samma person).
    // Graviditet sänker den upplevda temperaturen ett steg men raderar inte
    // uppgiften om att man är lättfrusen; därför skickas båda värdena.
    const stated = m.kind === 'child'
      ? (m.person?.cold_sensitivity ?? 3)
      : m.kind === 'partner' ? (m.partnerCold ?? 3) : myCold.stated
    // Bara min egen graviditet är känd – partnerns exponeras inte med flit.
    const cold = m.kind === 'me' && myCold.pregnant ? Math.max(1, stated - 1) : stated
    const ctx = weather ? buildWeatherContext(weather, cold, stated) : weatherCtx
    const headwear = m.kind === 'child' ? childHeadwearRule(ageMonths(m.person?.birthdate), weather?.temp, stated) : ''
    const scoped = seasonalOrFull(pool, season)
    // Väljaren får hela garderoben, inte genereringens urval.
    setPools(prev => ({ ...prev, [m.key]: full }))
    if (scoped.length === 0) return { error: tr('För få plagg i garderoben.') }

    const groupedList = buildGroupedGarmentList(scoped, ctx.requiresOuterwear)
    let parsed: any = null
    let attempts = 0
    while (attempts < 3) {
      attempts++
      const base = { weatherSummary: ctx.summary, weatherRules: [ctx.rules, headwear].filter(Boolean).join(' '), season, groupedList, retry: attempts > 1, lang }
      // Bara den vuxnes prompt kan ge en låt; barnprompten har inget song-fält.
      // Därför bärs familjens låt av "mig"-genereringen.
      const songFields = m.kind === 'child' || !showDailySong
        ? { wantSong: false }
        : { wantSong: true, musicGenres, avoidSongs: songHist.avoidSongs, previousSong: songHist.previousSong }
      // Färgpaletten gäller bara vuxna: barn har ingen färganalys, och
      // pack-trip nollar den redan för barn – håll vägarna konsekventa.
      // Inställningen Profil → färganalys hedras, annars kringgår familjeflödet
      // ett val användaren gjort.
      const palette = !useColorAnalysis || m.kind === 'child'
        ? ''
        : m.kind === 'partner' ? (m.partnerPalette || '') : myPalette
      const body = m.kind === 'child'
        ? { ...base, audience: 'child', childName: m.name, babyMode: baby, walks, pottyTraining: m.person?.potty_training === true }
        : {
            ...base, ...songFields, colorPalette: palette,
            contextLabel: LEDIG.label, contextLogic: LEDIG.logic, intensity: 'Balanserad (3/5)',
            // Gäller bara mig: partnerns stilregler, undvik-notering och
            // gravidläge ligger i deras egen profil och hämtas inte hit.
            ...(m.kind === 'me' ? {
              styleRules: myProfile.styleRules,
              stylePrefs: myProfile.stylePrefs,
              avoid: myProfile.avoid,
              pregnancy: myProfile.pregnancy,
              nursing: myProfile.nursing,
            } : { stylePrefs: m.partnerStyle || '' }),
          }
      parsed = await apiPost('/api/generate-outfit', body)
      const { valid } = validateOutfit(parsed.items || [], scoped, ctx.requiresOuterwear, { requireShoes: !baby })
      if (valid) break
    }
    if (!parsed?.items?.length) return { error: tr('AI:n gav inget giltigt förslag – försök igen.') }
    return { outfit: { ...parsed, itemsWithImages: dedupOutfitItems(matchItemsToPool(parsed.items, scoped), scoped) }, rawSong: parsed.song }
  }

  async function generateAll() {
    if (running || disabled) return
    if (!familyFeaturesEnabled(tier)) { router.push('/paywall'); return }
    setRunning(true)
    setResults({}); setSaved({}); setSavedId({}); setWorn({}); setSong(null)
    const season = getCurrentSeason()
    const weatherCtx = weather ? buildWeatherContext(weather, 3) : { summary: '', rules: '', requiresOuterwear: false }
    const songHist = showDailySong ? await songHistory() : { avoidSongs: '', previousSong: '' }
    let rawSong: any = null
    try {
      // Alla medlemmar samtidigt. Varje generering är ett eget OpenAI-anrop och
      // de är oberoende av varandra – sekventiellt växte väntan linjärt med
      // familjens storlek. Rate-limiten är 20 anrop/min, så även en stor familj
      // med omförsök ryms. Varje medlem skriver fortfarande sitt eget resultat
      // när det blir klart, så korten fylls i ett i taget precis som förut.
      setPending(p => ({ ...p, ...Object.fromEntries(members.map(m => [m.key, true])) }))
      let quotaHit = false
      const settled = await Promise.all(members.map(async m => {
        try {
          const r = await genForMember(m, season, weatherCtx, songHist)
          setResults(prev => ({ ...prev, [m.key]: r }))
          return r
        } catch (e: any) {
          if (e?.code === 'quota_exceeded') quotaHit = true
          else setResults(prev => ({ ...prev, [m.key]: { error: e?.message || tr('Något gick fel') } }))
          return null
        } finally {
          setPending(p => ({ ...p, [m.key]: false }))
        }
      }))
      // Kvoten slog i taket för minst en medlem – visa paywallen en gång, inte
      // en gång per medlem.
      if (quotaHit) { router.push('/paywall'); return }
      // Låten bärs av den vuxnes generering; medlemsordningen är bevarad.
      rawSong = settled.find(r => r?.rawSong)?.rawSong ?? null
    } finally {
      setRunning(false)
    }
    if (showDailySong && rawSong) {
      const resolved = await resolveSong(rawSong)
      if (resolved) setSong(resolved)
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
        if (ids.length) {
          await supabase.rpc('adjust_garment_wear', { p_ids: ids, p_delta: 1, p_date: day })
          // invalidateGarments() // RPC:n kan ha flyttat plagg till tvätten – cachen måste släppas
          invalidateGarments()
        }
      } else if (m.kind === 'child') {
        // Barnets outfit sparas (person_id) och läggs på dagens datum i barnets
        // egna kalender (person_outfit_calendar). Plaggen räknas som använda.
        let id = savedId[m.key]
        if (!id) {
          const { data, error } = await supabase.from('outfits').insert([{
            user_id: user?.id, person_id: m.person!.id, name: nameFor(m),
            garment_ids: ids, garment_names: names, image_urls: imageUrls,
            mood: LEDIG.label, context: LEDIG.label.toLowerCase(), saved: true,
          }]).select('id').single()
          if (error) throw error
          id = data.id; setSavedId(s => ({ ...s, [m.key]: id }))
        } else {
          await supabase.from('outfits').update({ saved: true }).eq('id', id)
        }
        const { error: calErr } = await supabase.from('person_outfit_calendar')
          .upsert({ user_id: user!.id, person_id: m.person!.id, outfit_id: id!, date: day }, { onConflict: 'person_id,date' })
        if (calErr) throw calErr
        setSaved(s => ({ ...s, [m.key]: true }))
        if (ids.length) {
          await supabase.rpc('adjust_garment_wear', { p_ids: ids, p_delta: 1, p_date: day })
          // invalidateGarments() // RPC:n kan ha flyttat plagg till tvätten – cachen måste släppas
          invalidateGarments()
        }
      }
      setWorn(w => ({ ...w, [m.key]: true }))
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setWearingKey(null)
    }
  }

  const hasResults = Object.keys(results).length > 0

  // Visas bara när familjeläget är påslaget (Familj-nivån). Slås det av
  // försvinner "Generera outfits för familjen"-knappen helt – samma grind som
  // "packa barnen"-toggeln i reseläget.
  if (!familyFeaturesEnabled(tier)) return null

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
          {song && showDailySong && <SongCard song={song} />}
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
