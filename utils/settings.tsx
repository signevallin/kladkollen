import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// App-övergripande inställningar som påverkar hur siffror visas i hela appen:
// valuta (priser) och temperaturenhet (väder). Sparas lokalt och läses via
// useSettings() i skärmarna – ändras de slår de igenom direkt överallt.

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

const CUR_KEY = 'kladkollen_currency'
const TEMP_KEY = 'kladkollen_tempunit'

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
  setCurrency: (c: CurrencyCode) => void
  setTempUnit: (u: TempUnit) => void
  /** Formaterar ett belopp med rätt valutasymbol (ingen växelkursomräkning). */
  formatPrice: (n: number | null | undefined) => string
  /** Konverterar ett Celsius-värde till valt enhetsvärde (avrundat heltal). */
  tempValue: (celsius: number) => number
  /** Som tempValue men med gradtecken + enhet, t.ex. "10°C" / "50°F". */
  tempLabel: (celsius: number) => string
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('SEK')
  const [tempUnit, setTempUnitState] = useState<TempUnit>('C')

  useEffect(() => {
    (async () => {
      try {
        const c = await AsyncStorage.getItem(CUR_KEY)
        if (c) setCurrencyState(c as CurrencyCode)
        const u = await AsyncStorage.getItem(TEMP_KEY)
        if (u === 'F' || u === 'C') setTempUnitState(u)
      } catch { /* behåll standard */ }
    })()
  }, [])

  function setCurrency(c: CurrencyCode) {
    setCurrencyState(c)
    AsyncStorage.setItem(CUR_KEY, c).catch(() => {})
  }
  function setTempUnit(u: TempUnit) {
    setTempUnitState(u)
    AsyncStorage.setItem(TEMP_KEY, u).catch(() => {})
  }

  const toUnit = (celsius: number) => tempUnit === 'F' ? Math.round(celsius * 9 / 5 + 32) : Math.round(celsius)

  const value: SettingsCtx = {
    currency,
    tempUnit,
    setCurrency,
    setTempUnit,
    formatPrice: (n) => formatWithCurrency(Number(n) || 0, currency),
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
