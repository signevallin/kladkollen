// Central temadefinition. All färg och alla form-tokens (radie, knappstil) bor här.
// Ändra utseendet på ett ställe – skärmarna läser tokens via useTheme().

export type ThemeColors = {
  mode: 'light' | 'dark'
  // Ytor
  bg: string            // appbakgrund
  surface: string       // kort/paneler
  surfaceMuted: string  // svag ifylld yta (t.ex. input, pill)
  card: string          // upphöjt kort
  // Text
  textPrimary: string
  textSecondary: string
  textFaint: string
  onPrimary: string     // text/ikon ovanpå primärfärgen (knappar)
  // Brand
  primary: string       // primär knapp/accent
  tan: string
  accent: string        // ljusblå accent
  // Linjer
  border: string
  borderSoft: string
  // Semantiskt
  danger: string
  // Placeholder i textfält
  placeholder: string
}

export type Theme = ThemeColors & {
  radius: { sm: number; md: number; lg: number; xl: number; pill: number }
}

const radius = { sm: 10, md: 12, lg: 16, xl: 22, pill: 999 }

export const lightColors: ThemeColors = {
  mode: 'light',
  bg: '#FEFAF8',
  surface: '#F8EADE',
  surfaceMuted: 'rgba(207,181,158,0.30)',
  card: '#FFFFFF',
  textPrimary: '#402D21',
  textSecondary: '#6C4D38',
  textFaint: 'rgba(108,77,56,0.6)',
  onPrimary: '#FEFAF8',
  primary: '#402D21',
  tan: '#CFB59E',
  accent: '#DDE6ED',
  border: 'rgba(108,77,56,0.20)',
  borderSoft: 'rgba(108,77,56,0.14)',
  danger: '#9E2035',
  placeholder: 'rgba(108,77,56,0.45)',
}

export const darkColors: ThemeColors = {
  mode: 'dark',
  bg: '#181009',
  surface: '#241811',
  surfaceMuted: 'rgba(207,181,158,0.14)',
  card: '#2A1C13',
  textPrimary: '#F5E9DF',
  textSecondary: '#C9AE94',
  textFaint: 'rgba(201,174,148,0.6)',
  onPrimary: '#181009',
  primary: '#DBB48D',
  tan: '#6E5844',
  accent: '#33454F',
  border: 'rgba(245,233,223,0.16)',
  borderSoft: 'rgba(245,233,223,0.10)',
  danger: '#E0817C',
  placeholder: 'rgba(201,174,148,0.45)',
}

export const lightTheme: Theme = { ...lightColors, radius }
export const darkTheme: Theme = { ...darkColors, radius }
