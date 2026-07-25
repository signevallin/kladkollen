import { useCallback, useEffect, useRef, useState } from 'react'
import { cacheGet, cacheSet } from './cache'
import { captureError } from './sentry'

// Lättviktig useQuery-liknande wrapper för konsekvent laddning/fel/cache utan
// externt beroende. Seedar valfritt från process-cachen (så flikbyten är
// omedelbara) och skriver tillbaka dit vid lyckad hämtning.

export type QueryResult<T> = {
  data: T | undefined
  loading: boolean     // första laddningen (utan cachad data att visa)
  refreshing: boolean  // omhämtning medan data redan visas
  error: Error | null
  refetch: () => Promise<void>
}

type Options = {
  cacheKey?: string   // seedar från/skriver till process-cachen
  enabled?: boolean   // hoppa över hämtningen tills true
}

export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
  options: Options = {},
): QueryResult<T> {
  const { cacheKey, enabled = true } = options
  const seeded = cacheKey ? cacheGet<T>(cacheKey) : undefined

  const [data, setData] = useState<T | undefined>(seeded)
  const [loading, setLoading] = useState(seeded === undefined && enabled)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mounted = useRef(true)
  const dataRef = useRef(data)
  dataRef.current = data
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const run = useCallback(async () => {
    if (!enabled) return
    if (dataRef.current !== undefined) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (!mounted.current) return
      setData(result)
      if (cacheKey) cacheSet(cacheKey, result)
    } catch (e: any) {
      if (!mounted.current) return
      const err = e instanceof Error ? e : new Error(String(e?.message || e))
      setError(err)
      captureError(err, { where: 'useQuery', cacheKey })
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false) }
    }
    // fetcher medvetet utanför deps – anroparen styr omkörning via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cacheKey, ...deps])

  useEffect(() => { run() }, [run])

  return { data, loading, refreshing, error, refetch: run }
}
