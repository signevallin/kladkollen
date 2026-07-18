// Enkel process-global cache för hämtad data. Låter en skärm rita senast kända
// data direkt vid (om)montering och uppdatera i bakgrunden – så flikbyten känns
// omedelbara i stället för att visa en tom/laddande vy varje gång.
const store = new Map<string, unknown>()

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

export function cacheSet<T>(key: string, value: T): void {
  store.set(key, value)
}

// Töms vid utloggning så nästa användare aldrig ser föregående datas.
export function cacheClear(): void {
  store.clear()
}
