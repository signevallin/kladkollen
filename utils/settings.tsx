import AsyncStorage from '@react-native-async-storage/async-storage'
import { childSizeLabel, shoeSizeLabel, type SizeSystem } from './childSize'
import { localeFor } from './i18n'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translate, LANGS, type Lang } from './i18n'
import { setApiLang } from './api'
import { supabase } from '../supabase'

// Speglar valt språk till profiles.lang så server-notiserna (Vercel Cron) kan
// skickas på användarens språk. Best-effort; hoppar över om ej inloggad.
async function syncLangToProfile(l: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ lang: l }).eq('id', user.id)
  } catch { /* best-effort */ }
}

// App-övergripande inställningar som påverkar hur siffror visas i hela appen:
// valuta (priser) och temperaturenhet (väder). Sparas lokalt och läses via
// useSettings() i skärmarna – ändras de slår de igenom direkt överallt.
//
// Priser lagras alltid i SEK (basvaluta). Vid visning räknas de om till vald
// valuta med aktuell växelkurs, och när användaren skriver in ett pris i en
// annan valuta räknas det tillbaka till SEK innan det sparas.

export type CurrencyCode = 'SEK' | 'NOK' | 'DKK' | 'EUR' | 'USD' | 'GBP'
export type TempUnit = 'C' | 'F'

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'SEK', label: 'SEK · kr' },
  { code: 'NOK', label: 'NOK · kr' },
  { code: 'DKK', label: 'DKK · kr' },
  { code: 'EUR', label: 'EUR · €' },
  { code: 'USD', label: 'USD · $' },
  { code: 'GBP', label: 'GBP · £' },
]

// Ungefärliga reservkurser (SEK → valuta) om nätet inte svarar. Ersätts av
// färska kurser från frankfurter.app (ECB) så fort de hämtats.
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  SEK: 1, NOK: 1.02, DKK: 0.66, EUR: 0.088, USD: 0.095, GBP: 0.075,
}

const CUR_KEY = 'kladkollen_currency'
const SIZESYS_KEY = 'kladkollen_size_system'
const TEMP_KEY = 'kladkollen_tempunit'
const LANG_KEY = 'kladkollen_lang'
const SONG_KEY = 'kladkollen_show_daily_song'
const COLORAI_KEY = 'kladkollen_use_color_analysis'
const RATES_KEY = 'kladkollen_rates'
const RATES_TTL = 12 * 60 * 60 * 1000 // 12 h

// Tusentalsavgränsaren skiljer sig mellan språken: svenska använder mellanslag
// (1 234), tyska punkt (1.234) och engelska komma (1,234). Hårdkodat 'sv-SE'
// gav därför svensk formatering i fyra av fem språk.
function formatWithCurrency(n: number, currency: CurrencyCode, locale: string): string {
  const grouped = Math.round(n).toLocaleString(locale)
  switch (currency) {
    case 'EUR': return `€${grouped}`
    case 'USD': return `$${grouped}`
    case 'GBP': return `£${grouped}`
    default: return `${grouped} kr` // SEK / NOK / DKK
  }
}

type SettingsCtx = {
  currency: CurrencyCode
  /** Vilket storlekssystem barnstorlekar VISAS i. Lagringen är alltid cm/EU. */
  sizeSystem: SizeSystem
  tempUnit: TempUnit
  lang: Lang
  /** Om "Dagens låt" ska visas på hemskärmen (kan döljas under Profil → Musik). */
  showDailySong: boolean
  /** Om AI:n ska väga in användarens färganalys när outfits genereras. */
  useColorAnalysis: boolean
  setCurrency: (c: CurrencyCode) => void
  setSizeSystem: (s: SizeSystem) => void
  setTempUnit: (u: TempUnit) => void
  setLang: (l: Lang) => void
  setShowDailySong: (v: boolean) => void
  setUseColorAnalysis: (v: boolean) => void
  /** Översätter en nyckel till valt språk (faller tillbaka på svenska). */
  t: (key: string) => string
  /** Formaterar ett SEK-belopp i vald valuta (med omräkning). */
  formatPrice: (sek: number | null | undefined) => string
  /** Räknar om ett inmatat belopp (i vald valuta) till SEK för lagring. */
  toBaseSEK: (amount: number | null | undefined) => number | null
  /** Räknar om ett lagrat SEK-belopp till vald valuta (för att förifylla fält). */
  fromBaseSEK: (sek: number | null | undefined) => number | null
  /** Aktuell kurs SEK → vald valuta. */
  rate: number
  /** Visar en lagrad klädstorlek (cm) i valt system, t.ex. 104 → "3-4 yrs". */
  childSize: (cm: number | null | undefined) => string
  /** Visar en lagrad skostorlek (EU) i valt system, t.ex. 28 → "10". */
  shoeSize: (eu: number | null | undefined) => string
  tempValue: (celsius: number) => number
  tempLabel: (celsius: number) => string
}

// Läser telefonens språk (via Hermes Intl, inget extra beroende). Ett språk vi
// stödjer används rakt av; alla andra språk blir engelska (universellt för
// utländska användare). Kan vi inte avgöra alls → svenska (hemmamarknaden).
function detectDeviceLang(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || ''
    const code = loc.slice(0, 2).toLowerCase()
    if (LANGS.some(x => x.code === code)) return code as Lang
    return 'en'
  } catch {
    return 'sv'
  }
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('SEK')
  const [sizeSystem, setSizeSystemState] = useState<SizeSystem>('eu')
  const [tempUnit, setTempUnitState] = useState<TempUnit>('C')
  const [lang, setLangState] = useState<Lang>('sv')
  const [showDailySong, setShowDailySongState] = useState<boolean>(true)
  const [useColorAnalysis, setUseColorAnalysisState] = useState<boolean>(true)
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES)

  useEffect(() => {
    (async () => {
      try {
        const c = await AsyncStorage.getItem(CUR_KEY)
        if (c) setCurrencyState(c as CurrencyCode)
        const ss = await AsyncStorage.getItem(SIZESYS_KEY)
        if (ss) setSizeSystemState(ss as SizeSystem)
        const u = await AsyncStorage.getItem(TEMP_KEY)
        if (u === 'F' || u === 'C') setTempUnitState(u)
        // Språk: uttryckligt val (sparat) vinner. Annars följer vi telefonens
        // språk om vi stödjer det – så en engelsktalande som just installerat
        // appen möts av engelska (och får bekräftelsemejlet på engelska).
        const l = await AsyncStorage.getItem(LANG_KEY)
        let resolved: string = 'sv'
        if (l && LANGS.some(x => x.code === l)) {
          resolved = l; setLangState(l as Lang); setApiLang(l)
        } else {
          const d = detectDeviceLang()
          resolved = d
          if (d !== 'sv') { setLangState(d); setApiLang(d) }
        }
        // Spegla till profilen om man redan är inloggad vid start.
        syncLangToProfile(resolved)
        const s = await AsyncStorage.getItem(SONG_KEY)
        if (s === '0') setShowDailySongState(false)
        const ca = await AsyncStorage.getItem(COLORAI_KEY)
        if (ca === '0') setUseColorAnalysisState(false)
      } catch { /* behåll standard */ }
      loadRates()
    })()
  }, [])

  // Vid inloggning: spegla språket till profilen (nya konton får ingen lang via
  // profil-triggern, och start-effekten kan ha körts innan sessionen fanns).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== 'SIGNED_IN') return
      const stored = await AsyncStorage.getItem(LANG_KEY)
      syncLangToProfile(stored && LANGS.some(x => x.code === stored) ? stored : detectDeviceLang())
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function loadRates() {
    // Använd cachade kurser först (om färska), hämta annars nya.
    try {
      const raw = await AsyncStorage.getItem(RATES_KEY)
      if (raw) {
        const cached = JSON.parse(raw)
        if (cached?.rates) setRates({ ...FALLBACK_RATES, ...cached.rates, SEK: 1 })
        if (cached?.ts && Date.now() - cached.ts < RATES_TTL) return
      }
    } catch { /* ignorera */ }
    try {
      const res = await fetch('https://api.frankfurter.app/latest?base=SEK&symbols=NOK,DKK,EUR,USD,GBP')
      const data = await res.json()
      if (data?.rates) {
        const next = { ...FALLBACK_RATES, ...data.rates, SEK: 1 }
        setRates(next)
        AsyncStorage.setItem(RATES_KEY, JSON.stringify({ ts: Date.now(), rates: next })).catch(() => {})
      }
    } catch { /* behåll reserv/cache */ }
  }

  function setSizeSystem(v: SizeSystem) {
    setSizeSystemState(v)
    AsyncStorage.setItem(SIZESYS_KEY, v).catch(() => {})
  }

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c)
    AsyncStorage.setItem(CUR_KEY, c).catch(() => {})
  }
  function setTempUnit(u: TempUnit) {
    setTempUnitState(u)
    AsyncStorage.setItem(TEMP_KEY, u).catch(() => {})
  }
  function setLang(l: Lang) {
    setLangState(l)
    setApiLang(l)
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {})
    syncLangToProfile(l)
  }
  function setShowDailySong(v: boolean) {
    setShowDailySongState(v)
    AsyncStorage.setItem(SONG_KEY, v ? '1' : '0').catch(() => {})
  }
  function setUseColorAnalysis(v: boolean) {
    setUseColorAnalysisState(v)
    AsyncStorage.setItem(COLORAI_KEY, v ? '1' : '0').catch(() => {})
  }

  const rate = rates[currency] ?? 1
  const toUnit = (celsius: number) => tempUnit === 'F' ? Math.round(celsius * 9 / 5 + 32) : Math.round(celsius)

  const value: SettingsCtx = {
    currency,
    sizeSystem,
    tempUnit,
    lang,
    showDailySong,
    useColorAnalysis,
    setCurrency,
    setSizeSystem,
    setTempUnit,
    setLang,
    setShowDailySong,
    setUseColorAnalysis,
    t: (key: string) => translate(lang, key),
    rate,
    formatPrice: (sek) => formatWithCurrency((Number(sek) || 0) * rate, currency, localeFor(lang)),
    childSize: (cm) => childSizeLabel(cm, sizeSystem),
    shoeSize: (eu) => shoeSizeLabel(eu, sizeSystem),
    toBaseSEK: (amount) => (amount == null || amount === ('' as any)) ? null : Math.round((Number(amount) || 0) / rate),
    fromBaseSEK: (sek) => sek == null ? null : Math.round((Number(sek) || 0) * rate),
    tempValue: toUnit,
    tempLabel: (celsius) => `${toUnit(celsius)}°${tempUnit}`,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings måste användas inom en SettingsProvider')
  return ctx
}
