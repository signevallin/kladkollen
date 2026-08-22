// Signerade URL:er för den PRIVATA garments-bucketen – med disk-cache.
//
// Varför inte bara signera vid varje render? Det var precis därför bucketen en
// gång gjordes publik (20260718_public_garments_bucket.sql): en ny signatur vid
// varje appstart ger en ny URL, vilket är en ny cache-nyckel för både
// Supabase-CDN:n och expo-image → cache-miss → hela bildmängden laddas ner på
// nytt. Hög egress och segt.
//
// Lösningen: signera med LÅNG livslängd (30 dygn) och spara URL:en i den
// write-through-cache som ändå hydreras vid appstart (utils/cache). URL:en blir
// då stabil mellan appstarter – samma cache-nyckel, samma återanvändning som
// med publika URL:er – men åtkomsten är tidsbegränsad och återkallningsbar, och
// kräver ett konto som får läsa objektet (se 20260824_storage_private_signed.sql).
import { supabase } from '../supabase'
import { cacheGet, cacheSet } from './cache'
import { storagePathFrom, type ImageTransform } from './storage'

const BUCKET = 'garments'
const CACHE_KEY = 'signedUrls'

// 30 dygn. Långt nog att URL:en överlever normal användning; kort nog att en
// läckt länk inte lever för evigt.
const TTL_SECONDS = 30 * 24 * 60 * 60
// Förnya i god tid så en bild aldrig hinner gå ut mitt i en session.
const REFRESH_BEFORE_MS = 7 * 24 * 60 * 60 * 1000

type Entry = { url: string; exp: number }
type Store = Record<string, Entry>

let store: Store | null = null

function all(): Store {
  if (!store) store = cacheGet<Store>(CACHE_KEY) ?? {}
  return store
}

// Cache-nyckel: sökväg + ev. transform (en transformerad bild är en egen URL).
function keyFor(path: string, transform?: ImageTransform): string {
  if (!transform) return path
  const t = [transform.width, transform.height, transform.resize, transform.quality, transform.format]
  return `${path}|${t.join(',')}`
}

// cacheSet skriver igenom till AsyncStorage vid varje anrop. Ett rutnät kan
// signera 50+ bilder på en gång – skriv därför samlat i stället för per bild.
let flushTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    cacheSet(CACHE_KEY, all())
  }, 1500)
}

function remember(key: string, url: string) {
  all()[key] = { url, exp: Date.now() + TTL_SECONDS * 1000 }
  schedulePersist()
}

// Supabase returnerar normalt en absolut URL. Var defensiv om den skulle vara
// relativ, annars blir source-uri ogiltig på native.
function absolute(signed: string): string {
  if (/^https?:/i.test(signed)) return signed
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  return `${base}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`
}

/**
 * Cachad URL utan nätverksanrop. Returnerar:
 *  - värdet självt för lokala/externa URI:er (file:, data:, blob:, annan domän)
 *  - en giltig cachad signatur
 *  - annars null (anroparen får hämta en via signedUrl)
 */
export function cachedSignedUrl(value: string, transform?: ImageTransform): string | null {
  const path = storagePathFrom(value)
  if (!path) return value
  const hit = all()[keyFor(path, transform)]
  if (hit && hit.exp - Date.now() > REFRESH_BEFORE_MS) return hit.url
  return null
}

// ── Batchning ─────────────────────────────────────────────────────────────
// När en garderobsvy monteras vill 50 bilder ha en URL samtidigt. Samla dem
// under en kort tick och signera i ETT anrop (createSignedUrls) i stället för
// 50. Transformerade bilder (avatarer) stöds inte av batch-API:t och signeras
// var för sig – de är få.
const pending = new Map<string, ((url: string | null) => void)[]>()
let batchTimer: ReturnType<typeof setTimeout> | null = null

async function runBatch() {
  batchTimer = null
  const paths = [...pending.keys()]
  const waiters = new Map(pending)
  pending.clear()

  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100)
    const done = new Set<string>()
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(chunk, TTL_SECONDS)
      if (error) throw error
      for (const row of data || []) {
        // path kan saknas på felrader – då finns ingen väntare att matcha mot.
        if (!row.path) continue
        done.add(row.path)
        const cbs = waiters.get(row.path) || []
        if (row.error || !row.signedUrl) {
          for (const cb of cbs) cb(null)
          continue
        }
        const url = absolute(row.signedUrl)
        remember(row.path, url)
        for (const cb of cbs) cb(url)
      }
    } catch {
      // faller igenom till upprensningen nedan
    }
    // Varje väntare MÅSTE lösas, annars fastnar bilden i laddningsläge för
    // alltid (svaret kan sakna rader, eller sakna path på en felrad).
    for (const path of chunk) {
      if (done.has(path)) continue
      for (const cb of waiters.get(path) || []) cb(null)
    }
  }
}

function queue(path: string): Promise<string | null> {
  return new Promise(resolve => {
    const list = pending.get(path)
    if (list) list.push(resolve)
    else pending.set(path, [resolve])
    if (!batchTimer) batchTimer = setTimeout(runBatch, 20)
  })
}

// Pågående enskilda signeringar (transform) – undvik dubbelanrop för samma bild.
const inflight = new Map<string, Promise<string | null>>()

/**
 * Hämtar (och cachar) en signerad URL. Returnerar värdet oförändrat för
 * lokala/externa URI:er, och null om signeringen misslyckades.
 */
export async function signedUrl(value: string, transform?: ImageTransform): Promise<string | null> {
  const path = storagePathFrom(value)
  if (!path) return value

  const cached = cachedSignedUrl(value, transform)
  if (cached) return cached

  const key = keyFor(path, transform)
  const running = inflight.get(key)
  if (running) return running

  const task = (async () => {
    try {
      if (!transform) return await queue(path)
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, TTL_SECONDS, { transform })
      if (error || !data?.signedUrl) return null
      const url = absolute(data.signedUrl)
      remember(key, url)
      return url
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, task)
  return task
}

// Töms vid utloggning (cacheClear tar disk-kopian; det här tar minnet) så nästa
// användare aldrig återanvänder föregående användares signaturer.
export function clearSignedUrls(): void {
  store = null
  pending.clear()
  inflight.clear()
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
}

/**
 * Som signedUrl(), men garanterar en användbar URL eller kastar. Används där
 * bilden ska hämtas direkt (beskärning, bakgrundsborttagning) och ett null
 * bara skulle ge ett obegripligt fel längre ner.
 */
export async function resolveImageUrl(value: string, transform?: ImageTransform): Promise<string> {
  const url = await signedUrl(value, transform)
  if (!url) throw new Error('Kunde inte hämta bilden')
  return url
}
