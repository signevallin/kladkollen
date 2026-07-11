import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import { darkTheme, lightTheme, type Theme } from './theme'

// 'system' = följ enhetens läge, annars tvingat ljust/mörkt.
export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'kladkollen_theme_pref'

type ThemeContextValue = {
  theme: Theme
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() // 'light' | 'dark' | null
  const [preference, setPref] = useState<ThemePreference>('system')

  // Läs sparad preferens en gång vid start.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') setPref(v)
    })
  }, [])

  function setPreference(p: ThemePreference) {
    setPref(p)
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {})
  }

  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark'
  const theme = isDark ? darkTheme : lightTheme

  const value = useMemo(
    () => ({ theme, preference, setPreference, isDark }),
    [theme, preference, isDark]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Hämtar aktuellt tema. Använd i skärmar: const t = useTheme(). */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  return ctx ? ctx.theme : lightTheme
}

/** För temaväxlaren i profilen. */
export function useThemeControl(): Omit<ThemeContextValue, 'theme'> {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeControl måste användas inom ThemeProvider')
  const { theme, ...rest } = ctx
  return rest
}
