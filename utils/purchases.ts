import { Platform } from 'react-native'

// Byggsäker wrapper runt RevenueCat (react-native-purchases). Modulen är native
// och laddas skyddat, precis som Apple-inloggningen – så appen fungerar även
// INNAN `npm install react-native-purchases` + native-ombygge är gjort. Då körs
// appen i "gratis-läge" (isPro = false, inga köp). När modulen finns och en
// RevenueCat-API-nyckel är satt aktiveras köpen automatiskt.
//
// Aktivera skarpt läge:
//   1. npm install react-native-purchases
//   2. sätt EXPO_PUBLIC_REVENUECAT_IOS_KEY (och _ANDROID_KEY) i eas.json/env
//   3. expo prebuild --clean + native-ombygge
let Purchases: any = null
try { Purchases = require('react-native-purchases').default } catch { Purchases = null }

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || ''
const API_KEY = Platform.OS === 'android' ? ANDROID_KEY : IOS_KEY

// Namnet på entitlementet i RevenueCat som ger Premium (äldre, enkel-nivå).
export const PREMIUM_ENTITLEMENT = 'premium'

// Prenumerationsnivåer. Högre nivå inkluderar lägre (i RevenueCat attacheras
// lägre entitlements på högre produkter, så en Familj-köpare har alla tre).
export type Tier = 'none' | 'single' | 'partner' | 'family'
export const TIER_RANK: Record<Tier, number> = { none: 0, single: 1, partner: 2, family: 3 }
export function tierAtLeast(tier: Tier, min: Tier): boolean { return TIER_RANK[tier] >= TIER_RANK[min] }

// Entitlement-namn i RevenueCat per nivå.
const ENT_SINGLE = 'single', ENT_PARTNER = 'partner', ENT_FAMILY = 'family'

// Högsta aktiva nivån ur RevenueCats customerInfo.
export function tierFromInfo(info: any): Tier {
  try {
    const active = info?.entitlements?.active || {}
    if (active[ENT_FAMILY]) return 'family'
    if (active[ENT_PARTNER]) return 'partner'
    if (active[ENT_SINGLE]) return 'single'
    if (active[PREMIUM_ENTITLEMENT]) return 'single' // ev. äldre enkel-entitlement
  } catch { /* none */ }
  return 'none'
}

// Reserv/serverkälla: härled nivå ur produkt-id (t.ex. "family_annual" → family).
export function tierFromProductId(pid: string | null | undefined): Tier {
  const s = (pid || '').toLowerCase()
  if (!s) return 'none'
  if (s.includes('family') || s.includes('familj')) return 'family'
  if (s.includes('partner')) return 'partner'
  return 'single' // känd betald produkt utan nivå-nyckel → minsta betalda nivå
}

export const purchasesAvailable = !!Purchases && !!API_KEY

export type PurchasePackage = { id: string; title: string; priceString: string; period?: string; raw: any }

let configured = false
export function configurePurchases() {
  if (!purchasesAvailable || configured) return
  try {
    Purchases.configure({ apiKey: API_KEY })
    configured = true
  } catch { /* lämna okonfigurerad – gratis-läge */ }
}

export function isProFromInfo(info: any): boolean {
  try { return !!info?.entitlements?.active?.[PREMIUM_ENTITLEMENT] } catch { return false }
}

// pro_until ur customerInfo (ISO-sträng) om det finns – används för att
// spegla status lokalt tills webhooken hunnit skriva i databasen.
export function proUntilFromInfo(info: any): string | null {
  try { return info?.entitlements?.active?.[PREMIUM_ENTITLEMENT]?.expirationDate ?? null } catch { return null }
}

export async function getCustomerInfo(): Promise<any | null> {
  if (!purchasesAvailable) return null
  try { return await Purchases.getCustomerInfo() } catch { return null }
}

// Loggar in RevenueCat med Supabase-user-id så entitlements följer kontot över
// enheter och kan kopplas till rätt användare i webhooken.
export async function identifyPurchases(userId: string) {
  if (!purchasesAvailable || !userId) return
  try { await Purchases.logIn(userId) } catch { /* ignorera */ }
}

export async function getPackages(): Promise<{ packages: PurchasePackage[]; debug: string }> {
  if (!Purchases) return { packages: [], debug: 'SDK saknas' }
  if (!API_KEY) return { packages: [], debug: 'nyckel saknas' }
  try {
    const offerings = await Purchases.getOfferings()
    const allCount = offerings?.all ? Object.keys(offerings.all).length : 0
    const current = offerings?.current
    if (!current) return { packages: [], debug: `ingen current offering (all: ${allCount})` }
    const packages: PurchasePackage[] = (current.availablePackages || []).map((p: any) => ({
      id: p.identifier,
      title: p.product?.title || p.identifier,
      priceString: p.product?.priceString || '',
      period: p.packageType,
      raw: p,
    }))
    return { packages, debug: `current "${current.identifier}", paket: ${packages.length}` }
  } catch (e: any) {
    return { packages: [], debug: 'fel: ' + (e?.message || '?') }
  }
}

export async function purchasePackage(pkg: PurchasePackage): Promise<{ ok: boolean; isPro: boolean; proUntil: string | null; cancelled?: boolean; error?: string }> {
  if (!purchasesAvailable) return { ok: false, isPro: false, proUntil: null, error: 'Köp är inte tillgängligt' }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.raw)
    return { ok: true, isPro: isProFromInfo(customerInfo), proUntil: proUntilFromInfo(customerInfo) }
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, isPro: false, proUntil: null, cancelled: true }
    return { ok: false, isPro: false, proUntil: null, error: e?.message || 'Köpet gick inte igenom' }
  }
}

export async function restorePurchases(): Promise<{ isPro: boolean; proUntil: string | null }> {
  if (!purchasesAvailable) return { isPro: false, proUntil: null }
  try {
    const info = await Purchases.restorePurchases()
    return { isPro: isProFromInfo(info), proUntil: proUntilFromInfo(info) }
  } catch { return { isPro: false, proUntil: null } }
}
