import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import {
  configurePurchases, getCustomerInfo, getPackages, identifyPurchases,
  isProFromInfo, purchasePackage, restorePurchases, purchasesAvailable,
  type PurchasePackage,
} from './purchases'

// Håll i synk med servern (api/_utils.ts FREE_AI_PER_WEEK).
export const FREE_AI_PER_WEEK = 3
const WEEK_SECONDS = 7 * 24 * 60 * 60

type EntitlementsCtx = {
  isPro: boolean
  loading: boolean
  packages: PurchasePackage[]
  purchasesAvailable: boolean
  creditsLeft: number   // -1 = obegränsat (Premium), annars antal kvar denna vecka
  refresh: () => Promise<void>
  purchase: (pkg: PurchasePackage) => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>
  restore: () => Promise<boolean>
}

const Ctx = createContext<EntitlementsCtx | null>(null)

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<PurchasePackage[]>([])
  const [creditsLeft, setCreditsLeft] = useState<number>(FREE_AI_PER_WEEK)

  // Läser pro-status ur databasen (entitlements.pro_until, satt av webhooken) –
  // fungerar även utan native-modulen. Kombineras med RevenueCat om tillgängligt.
  const readDbEntitlement = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      const { data } = await supabase.from('entitlements').select('pro_until').eq('user_id', user.id).maybeSingle()
      const until = data?.pro_until ? new Date(data.pro_until).getTime() : 0
      return until > Date.now()
    } catch { return false }
  }, [])

  const readCredits = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('ai_credits_left', { max_free: FREE_AI_PER_WEEK, window_seconds: WEEK_SECONDS })
      if (!error && typeof data === 'number') setCreditsLeft(data)
    } catch { /* behåll tidigare värde */ }
  }, [])

  const refresh = useCallback(async () => {
    let pro = await readDbEntitlement()
    if (purchasesAvailable) {
      const info = await getCustomerInfo()
      if (info) pro = pro || isProFromInfo(info)
    }
    setIsPro(pro)
    await readCredits()
  }, [readDbEntitlement, readCredits])

  useEffect(() => {
    let alive = true
    ;(async () => {
      configurePurchases()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await identifyPurchases(user.id)
      } catch { /* ignorera */ }
      if (purchasesAvailable) {
        try { const p = await getPackages(); if (alive) setPackages(p) } catch { /* inga paket */ }
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
    // Webhooken skriver entitlements i databasen strax efter – läs om för säkerhets skull.
    setTimeout(() => { refresh() }, 1500)
    return { ok: res.ok, cancelled: res.cancelled, error: res.error }
  }, [refresh])

  const restore = useCallback(async () => {
    const res = await restorePurchases()
    if (res.isPro) setIsPro(true)
    await refresh()
    return res.isPro
  }, [refresh])

  return (
    <Ctx.Provider value={{ isPro, loading, packages, purchasesAvailable, creditsLeft, refresh, purchase, restore }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEntitlements(): EntitlementsCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useEntitlements måste användas inom EntitlementsProvider')
  return ctx
}
