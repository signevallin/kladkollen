import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import {
  configurePurchases, getCustomerInfo, getPackages, identifyPurchases,
  purchasePackage, restorePurchases, purchasesAvailable,
  tierFromInfo, tierFromProductId, TIER_RANK, tierAtLeast,
  type PurchasePackage, type Tier,
} from './purchases'

// Håll i synk med servern (api/_utils.ts FREE_AI_PER_WEEK).
export const FREE_AI_PER_WEEK = 3
const WEEK_SECONDS = 7 * 24 * 60 * 60

// Nivå-funktioner: par ("mig och partner", partnervy), familj ("Familjen idag",
// barn, packa barnen) och gravid-/amningsläget ska ligga bakom sina egna nivåer
// (partnerläget resp. familjeläget) NÄR de nivåindelade produkterna går att köpa.
//
// Nu PÅSLAGET (true): partner- resp. familjefunktionerna kräver rätt nivå.
// Kräver att RevenueCat-nivåerna finns som entitlements 'single'/'partner'/
// 'family' (tierFromInfo läser dem). Sätt tillfälligt false igen om du behöver
// testa utan att köpa.
export const REQUIRE_PARTNER_TIER = true
export const REQUIRE_FAMILY_TIER = true
export function partnerFeaturesEnabled(tier: Tier): boolean {
  return REQUIRE_PARTNER_TIER ? tierAtLeast(tier, 'partner') : tier !== 'none'
}
export function familyFeaturesEnabled(tier: Tier): boolean {
  return REQUIRE_FAMILY_TIER ? tierAtLeast(tier, 'family') : tier !== 'none'
}

type EntitlementsCtx = {
  isPro: boolean          // tier !== 'none' (bakåtkompatibelt: obegränsad AI m.m.)
  tier: Tier              // 'none' | 'single' | 'partner' | 'family'
  loading: boolean
  packages: PurchasePackage[]
  purchasesAvailable: boolean
  creditsLeft: number   // -1 = obegränsat (Premium), annars antal kvar denna vecka
  purchasesDebug: string // dev-diagnostik för varför paket ev. saknas
  refresh: () => Promise<void>
  purchase: (pkg: PurchasePackage) => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>
  restore: () => Promise<boolean>
}

const Ctx = createContext<EntitlementsCtx | null>(null)

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false)
  const [tier, setTier] = useState<Tier>('none')
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<PurchasePackage[]>([])
  // Utgå från -1 (obegränsat/Premium) tills vi läst det riktiga värdet, så
  // gratis-kvoten ("3 av 3") inte blinkar till vid inloggning/appstart innan
  // Premium-statusen hunnit laddas. readCredits sätter sedan rätt värde: -1
  // för Premium (då förblir kvoten dold), annars antal kvar (då visas den).
  const [creditsLeft, setCreditsLeft] = useState<number>(-1)
  const [purchasesDebug, setPurchasesDebug] = useState<string>(purchasesAvailable ? 'laddar…' : 'SDK/nyckel av')

  // Läser nivå ur databasen (entitlements.pro_until + product_id, satt av
  // webhooken) – fungerar även utan native-modulen. Kombineras med RevenueCat.
  const readDbTier = useCallback(async (): Promise<Tier> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 'none'
      const { data } = await supabase.from('entitlements').select('pro_until, product_id').eq('user_id', user.id).maybeSingle()
      const until = data?.pro_until ? new Date(data.pro_until).getTime() : 0
      if (until <= Date.now()) return 'none'
      return tierFromProductId((data as { product_id?: string | null } | null)?.product_id)
    } catch { return 'none' }
  }, [])

  const readCredits = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('ai_credits_left', { max_free: FREE_AI_PER_WEEK, window_seconds: WEEK_SECONDS })
      if (!error && typeof data === 'number') setCreditsLeft(data)
    } catch { /* behåll tidigare värde */ }
  }, [])

  const refresh = useCallback(async () => {
    let t = await readDbTier()
    if (purchasesAvailable) {
      const info = await getCustomerInfo()
      if (info) { const rc = tierFromInfo(info); if (TIER_RANK[rc] > TIER_RANK[t]) t = rc }
    }
    setTier(t)
    setIsPro(t !== 'none')
    // Premium har obegränsat med AI-outfits. Sätt -1 direkt i stället för att
    // fråga servern: RevenueCat vet om köpet omedelbart, medan ai_credits_left
    // läser entitlements-tabellen som webhooken skriver några sekunder senare.
    // Utan det här står "3 av 3 kvar" kvar på skärmen tills appen startas om.
    // Serverns use_ai_credit är fortfarande den bindande kontrollen.
    if (t !== 'none') { setCreditsLeft(-1); return }
    await readCredits()
  }, [readDbTier, readCredits])

  useEffect(() => {
    let alive = true
    ;(async () => {
      configurePurchases()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await identifyPurchases(user.id)
      } catch { /* ignorera */ }
      if (purchasesAvailable) {
        try {
          const { packages: p, debug } = await getPackages()
          if (alive) { setPackages(p); setPurchasesDebug(debug) }
        } catch (e: any) { if (alive) setPurchasesDebug('fel: ' + (e?.message || '?')) }
      }
      await refresh()
      if (alive) setLoading(false)
    })()
    // Uppdatera vid inloggning/utloggning.
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refresh() })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [refresh])

  const purchase = useCallback(async (pkg: PurchasePackage) => {
    const res = await purchasePackage(pkg)
    if (res.ok && res.isPro) setIsPro(true)
    // Webhooken skriver entitlements i databasen några sekunder efter köpet – i
    // ett skarpt sandbox-köp tog det 8 sekunder, alltså långt efter den enda
    // omläsning som gjordes här förut. Läs om flera gånger med växande
    // fördröjning så att nivån hinner dyka upp utan omstart av appen.
    if (res.ok) for (const delay of [1500, 5000, 12000]) setTimeout(() => { refresh() }, delay)
    return { ok: res.ok, cancelled: res.cancelled, error: res.error }
  }, [refresh])

  const restore = useCallback(async () => {
    const res = await restorePurchases()
    if (res.isPro) setIsPro(true)
    await refresh()
    return res.isPro
  }, [refresh])

  return (
    <Ctx.Provider value={{ isPro, tier, loading, packages, purchasesAvailable, creditsLeft, purchasesDebug, refresh, purchase, restore }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEntitlements(): EntitlementsCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useEntitlements måste användas inom EntitlementsProvider')
  return ctx
}
