import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translate, LANGS, type Lang } from './i18n'
import { setApiLang } from './api'

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
const TEMP_KEY = 'kladkollen_tempunit'
const LANG_KEY = 'kladkollen_lang'
const SONG_KEY = 'kladkollen_show_daily_song'
const RATES_KEY = 'kladkollen_rates'
const RATES_TTL = 12 * 60 * 60 * 1000 // 12 h

function formatWithCurrency(n: number, currency: CurrencyCode): string {
  const grouped = Math.round(n).toLocaleString('sv-SE')
  switch (currency) {
    case 'EUR': return `€${grouped}`
    case 'USD': return `$${grouped}`
    case 'GBP': return `£${grouped}`
    default: return `${grouped} kr` // SEK / NOK / DKK
  }
}

type SettingsCtx = {
  currency: CurrencyCode
  tempUnit: TempUnit
  lang: Lang
  /** Om "Dagens låt" ska visas på hemskärmen (kan döljas under Profil → Musik). */
  showDailySong: boolean
  setCurrency: (c: CurrencyCode) => void
  setTempUnit: (u: TempUnit) => void
  setLang: (l: Lang) => void
  setShowDailySong: (v: boolean) => void
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
  tempValue: (celsius: number) => number
  tempLabel: (celsius: number) => string
}

// Läser telefonens språk (via Hermes Intl, inget extra beroende). Returnerar en
// språkkod vi stödjer, annars 'sv' (default för hemmamarknaden).
function detectDeviceLang(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || ''
    const code = loc.slice(0, 2).toLowerCase()
    if (LANGS.some(x => x.code === code)) return code as Lang
  } catch { /* ignorera – faller tillbaka på svenska */ }
  return 'sv'
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('SEK')
  const [tempUnit, setTempUnitState] = useState<TempUnit>('C')
  const [lang, setLangState] = useState<Lang>('sv')
  const [showDailySong, setShowDailySongState] = useState<boolean>(true)
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES)

  useEffect(() => {
    (async () => {
      try {
        const c = await AsyncStorage.getItem(CUR_KEY)
        if (c) setCurrencyState(c as CurrencyCode)
        const u = await AsyncStorage.getItem(TEMP_KEY)
        if (u === 'F' || u === 'C') setTempUnitState(u)
        // Språk: uttryckligt val (sparat) vinner. Annars följer vi telefonens
        // språk om vi stödjer det – så en engelsktalande som just installerat
        // appen möts av engelska (och får bekräftelsemejlet på engelska).
        const l = await AsyncStorage.getItem(LANG_KEY)
        if (l && LANGS.some(x => x.code === l)) {
          setLangState(l as Lang); setApiLang(l)
        } else {
          const d = detectDeviceLang()
          if (d !== 'sv') { setLangState(d); setApiLang(d) }
        }
        const s = await AsyncStorage.getItem(SONG_KEY)
        if (s === '0') setShowDailySongState(false)
      } catch { /* behåll standard */ }
      loadRates()
    })()
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
  }
  function setShowDailySong(v: boolean) {
    setShowDailySongState(v)
    AsyncStorage.setItem(SONG_KEY, v ? '1' : '0').catch(() => {})
  }

  const rate = rates[currency] ?? 1
  const toUnit = (celsius: number) => tempUnit === 'F' ? Math.round(celsius * 9 / 5 + 32) : Math.round(celsius)

  const value: SettingsCtx = {
    currency,
    tempUnit,
    lang,
    showDailySong,
    setCurrency,
    setTempUnit,
    setLang,
    setShowDailySong,
    t: (key: string) => translate(lang, key),
    rate,
    formatPrice: (sek) => formatWithCurrency((Number(sek) || 0) * rate, currency),
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
