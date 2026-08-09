// Delad hämtning av plagg. Tidigare hämtade varje flik (hem, garderob, outfits)
// sina egna plagg via en egen Supabase-query, och useFocusEffect gjorde att
// SAMMA plagg laddades om varje gång man bytte flik. Här samlas läsningen på ETT
// ställe:
//   • samtidiga anrop slås ihop (in-flight dedup),
//   • upprepade anrop inom en kort TTL återanvänder senaste hämtning,
//   • resultatet cachas (utils/cache) så det även överlever kallstart.
// Varje skärm hämtar hela raderna och filtrerar själv (egna plagg, arkiverade,
// till salu osv). Efter en skrivning mot garments anropas invalidateGarments()
// så nästa läsning hämtar färskt och alla flikar ser ändringen.
import { supabase } from '../supabase'
import { cacheGet, cacheSet } from './cache'

const CACHE_KEY = 'garments.all'
const TTL_MS = 20_000

let lastLoad = 0
let inflight: Promise<any[]> | null = null

/** Senast kända plagg (från minnes-/disk-cachen) utan att hämta på nytt. */
export function getAllGarments(): any[] {
  return cacheGet<any[]>(CACHE_KEY) ?? []
}

/**
 * Hämtar alla plagg (delas mellan flikarna). Återanvänder senaste hämtning inom
 * TTL:en och slår ihop samtidiga anrop, så flikbyten inte laddar om samma data.
 * force:true kringgår TTL:en (t.ex. vid pull-to-refresh).
 */
export async function loadGarments(opts?: { force?: boolean }): Promise<any[]> {
  if (inflight) return inflight
  if (!opts?.force && Date.now() - lastLoad < TTL_MS) {
    const cached = cacheGet<any[]>(CACHE_KEY)
    if (cached) return cached
  }
  inflight = (async () => {
    const { data, error } = await supabase.from('garments').select('*').order('created_at', { ascending: false })
    // Vid fel: behåll senast kända data i stället för att nolla cachen, och låt
    // lastLoad vara så nästa anrop försöker igen.
    if (error || !data) return cacheGet<any[]>(CACHE_KEY) ?? []
    lastLoad = Date.now()
    cacheSet(CACHE_KEY, data)
    return data
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/**
 * Markerar den delade plagg-datan som inaktuell så nästa loadGarments() hämtar
 * färskt. Anropas efter varje skrivning mot garments (tvätt, sälj, arkiv,
 * redigering, nytt plagg …) så alla flikar ser ändringen vid nästa fokus.
 */
export function invalidateGarments(): void {
  lastLoad = 0
}
