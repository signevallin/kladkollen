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

// Visningsnamn per nivå. Medvetet samma strängar som livssituations-pillren i
// profilen, så de redan finns i i18n och inte behöver översättas på nytt.
export const TIER_LABEL: Record<Tier, string> = {
  none: '', single: 'Singel', partner: 'Partner', family: 'Familj',
}

// Entitlement-namn i RevenueCat per nivå.
const ENT_SINGLE = 'single', ENT_PARTNER = 'partner', ENT_FAMILY = 'family'

// Slår upp ett aktivt entitlement skiftlägesokänsligt. RevenueCats id:n är
// skiftlägeskänsliga i API:t, men det är lätt att råka skapa "Premium" i
// dashboarden i stället för "premium" – och id:t går inte att döpa om i
// efterhand. Ett sådant felstavat id skulle annars tyst ge gratis-läge trots
// ett giltigt köp, vilket är det dyraste tänkbara felet i den här koden.
function activeEntitlement(info: any, id: string): any {
  const active = info?.entitlements?.active
  if (!active) return null
  const want = id.toLowerCase()
  for (const key of Object.keys(active)) {
    if (key.toLowerCase() === want) return active[key]
  }
  return null
}

// Högsta aktiva nivån ur RevenueCats customerInfo.
export function tierFromInfo(info: any): Tier {
  try {
    if (activeEntitlement(info, ENT_FAMILY)) return 'family'
    if (activeEntitlement(info, ENT_PARTNER)) return 'partner'
    if (activeEntitlement(info, ENT_SINGLE)) return 'single'
    if (activeEntitlement(info, PREMIUM_ENTITLEMENT)) return 'single' // ev. äldre enkel-entitlement
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

// Diagnostik till paywall-skärmen: visar vilken del som saknas när inga paket
// kan hämtas. Nyckelns prefix avslöjar typen: appl_ = App Store, goog_ = Google
// Play, test_ = RevenueCats testbutik (inga riktiga produkter, inga skarpa köp).
export const purchasesEnv =
  `SDK: ${Purchases ? 'på' : 'AV'} · nyckel: ${API_KEY ? API_KEY.slice(0, 5) + '…' : 'saknas'}`

// Vilken App Store-storefront StoreKit faktiskt hämtar produktpriser för.
// Paywallens priceString gäller DENNA storefront, medan köpdialogen följer
// sandbox-kontot. Står de på olika länder visas ett pris och debiteras ett
// annat – vilket bara händer i test, eftersom skarpa köp använder samma konto.
export async function storefrontCountry(): Promise<string> {
  if (!Purchases?.getStorefront) return 'okänd (SDK saknar getStorefront)'
  try {
    const sf = await Purchases.getStorefront()
    return sf?.countryCode || 'okänd'
  } catch (e: any) {
    return 'fel: ' + (e?.message || '?')
  }
}

export type BillingPeriod = 'month' | 'year'

// Perioden härleds ur produkt-id:t och INTE ur RevenueCats packageType: bara
// $rc_monthly/$rc_annual rapporteras som MONTHLY/ANNUAL, medan egna paket-
// identifierare (partner_annual, family_monthly …) kommer tillbaka som CUSTOM.
export function periodFromProductId(pid: string | null | undefined): BillingPeriod | null {
  const s = (pid || '').toLowerCase()
  if (s.includes('year') || s.includes('annual')) return 'year'
  if (s.includes('month')) return 'month'
  return null
}

export type PurchasePackage = {
  id: string; productId: string; title: string; priceString: string; price: number; period?: string; raw: any
}

let configured = false
export function configurePurchases() {
  if (!purchasesAvailable || configured) return
  try {
    Purchases.configure({ apiKey: API_KEY })
    configured = true
  } catch { /* lämna okonfigurerad – gratis-läge */ }
}

export function isProFromInfo(info: any): boolean {
  try { return !!activeEntitlement(info, PREMIUM_ENTITLEMENT) } catch { return false }
}

// pro_until ur customerInfo (ISO-sträng) om det finns – används för att
// spegla status lokalt tills webhooken hunnit skriva i databasen.
export function proUntilFromInfo(info: any): string | null {
  try { return activeEntitlement(info, PREMIUM_ENTITLEMENT)?.expirationDate ?? null } catch { return null }
}

export async function getCustomerInfo(): Promise<any | null> {
  if (!purchasesAvailable) return null
  try { return await Purchases.getCustomerInfo() } catch { return null }
}

// Loggar in RevenueCat med Supabase-user-id så entitlements följer kontot över
// enheter och kan kopplas till rätt användare i webhooken.
//
// Cachen töms i samma veva. RevenueCat sparar customerInfo på disk och svarar ur
// den, så en status som hunnit bli inaktuell på servern (t.ex. efter att
// sandbox-köphistoriken rensats) överlever både kontobyte och appomstart. Utan
// det här kunde ett nyskapat konto visa en Familj-nivå som någon annan köpt.
export async function identifyPurchases(userId: string) {
  if (!purchasesAvailable || !userId) return
  try {
    await Purchases.logIn(userId)
    await Purchases.invalidateCustomerInfoCache()
  } catch { /* ignorera */ }
}

// Kopplar loss RevenueCat från kontot vid utloggning, annars ärver nästa
// inloggade användare föregående användares entitlements på samma enhet.
export async function logOutPurchases() {
  if (!purchasesAvailable) return
  try { await Purchases.logOut() } catch { /* redan anonym – strunt samma */ }
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
      productId: p.product?.identifier || '',
      title: p.product?.title || p.identifier,
      priceString: p.product?.priceString || '',
      price: typeof p.product?.price === 'number' ? p.product.price : 0,
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

// Apples inlösenark för offer codes (App Store Connect → Offer Codes). Koden
// löses in hos Apple och går sedan samma väg som ett riktigt köp: StoreKit →
// RevenueCat → webhooken → entitlements. Ingen egen inlösenlogik behövs.
//
// Bara iOS – offer codes är en Apple-funktion. Löftet infrias när arket stängs,
// inte när en kod faktiskt lösts in, så anroparen får läsa om nivån efteråt.
export const codeRedemptionAvailable = purchasesAvailable && Platform.OS === 'ios'

export async function presentCodeRedemption(): Promise<void> {
  if (!codeRedemptionAvailable) return
  try { await Purchases.presentCodeRedemptionSheet() } catch { /* användaren avbröt */ }
}

export async function restorePurchases(): Promise<{ isPro: boolean; proUntil: string | null }> {
  if (!purchasesAvailable) return { isPro: false, proUntil: null }
  try {
    const info = await Purchases.restorePurchases()
    return { isPro: isProFromInfo(info), proUntil: proUntilFromInfo(info) }
  } catch { return { isPro: false, proUntil: null } }
}
