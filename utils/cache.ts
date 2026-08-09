// Process-global cache för hämtad data. Låter en skärm rita senast kända data
// direkt vid (om)montering och uppdatera i bakgrunden – så flikbyten känns
// omedelbara i stället för att visa en tom/laddande vy varje gång.
//
// Cachen skrivs dessutom IGENOM till disk (AsyncStorage) och hydreras tillbaka
// till minnet en gång vid appstart. Då kan även en KALLSTART visa senast kända
// data direkt i varje flik, i stället för att varje skärm laddar från Supabase
// på nytt medan användaren tittar på en tom vy.
import AsyncStorage from '@react-native-async-storage/async-storage'

const store = new Map<string, unknown>()
const PREFIX = 'kladkollen_cache:'

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

export function cacheSet<T>(key: string, value: T): void {
  store.set(key, value)
  if (value === undefined) return
  // Skriv igenom till disk (fire-and-forget) så nästa kallstart kan hydrera.
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {})
}

// Töms vid utloggning så nästa användare aldrig ser föregående datas – både i
// minnet och på disk.
export function cacheClear(): void {
  store.clear()
  AsyncStorage.getAllKeys()
    .then(keys => AsyncStorage.multiRemove(keys.filter(k => k.startsWith(PREFIX))))
    .catch(() => {})
}

// Laddar disk-cachen till minnet en gång vid appstart. Anropas i _layout innan
// flikarna monteras, så första render kan visa senast kända data.
let hydrated = false
export async function hydrateCache(): Promise<void> {
  if (hydrated) return
  hydrated = true
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX))
    if (!keys.length) return
    const pairs = await AsyncStorage.multiGet(keys)
    for (const [k, v] of pairs) {
      if (v == null) continue
      try { store.set(k.slice(PREFIX.length), JSON.parse(v)) } catch { /* hoppa trasig post */ }
    }
  } catch { /* kör vidare utan disk-cache */ }
}
