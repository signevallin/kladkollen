import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'

// Hjärtslag: skriver profiles.last_active_at när appen öppnas.
//
// Varför det behövs: auth.users.last_sign_in_at uppdateras BARA vid faktisk
// inloggning, inte när mobilsessionen förnyas med token-refresh. En användare
// som öppnar appen varje dag kan därför se ut att ha varit borta i månader – i
// vår egen data hade ett aktivt, betalande konto 37 dagar sedan "inloggning"
// men 8 dagar sedan senaste plagg. Gallring av inaktiva konton byggd på den
// signalen hade raderat användare som fortfarande använder appen.
//
// Att härleda aktivitet ur garments/outfits räcker inte heller: den som varje
// morgon läser sin outfit utan att ändra något skriver ingenting.

const KEY = 'kladkollen_last_active_ping'
// En skrivning per dygn räcker för att mäta inaktivitet i månader. 20 h i
// stället för 24 så att en användare som öppnar appen samma tid varje morgon
// inte hamnar precis under gränsen och hoppar över en dag.
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000

/**
 * Registrerar att appen används. Säker att anropa ofta – den gör som mest en
 * nätverksskrivning per dygn och är helt tyst vid fel.
 *
 * Tidsstämpeln för senaste lyckade skrivning ligger lokalt, så vanliga
 * appstarter inte kostar ens en läsning mot servern.
 */
export async function pingActivity(): Promise<void> {
  try {
    const last = Number(await AsyncStorage.getItem(KEY)) || 0
    if (Date.now() - last < MIN_INTERVAL_MS) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) return

    // Skriv den lokala stämpeln FÖRST efter en lyckad serverskrivning, annars
    // kan ett misslyckat anrop tysta hjärtslaget i ett dygn.
    await AsyncStorage.setItem(KEY, String(Date.now()))
  } catch {
    // Hjärtslaget får aldrig påverka appstarten.
  }
}

/** Nollställer strypningen vid utloggning, så nästa användare pingar direkt. */
export async function resetActivityPing(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY) } catch { /* ignorera */ }
}
