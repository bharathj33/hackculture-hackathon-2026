import { useCallback, useEffect, useState } from 'react'
import { getRuns, type ApiRunSummary, UnauthorizedError } from '@/api'

interface UseRunsResult {
  runs: ApiRunSummary[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Loads the run ledger from `GET /api/runs`. */
export function useRuns(): UseRunsResult {
  const [runs, setRuns] = useState<ApiRunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getRuns()
      .then((rows) => {
        if (!cancelled) setRuns(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRuns([])
          if (err instanceof UnauthorizedError) {
            setError('Sign in to view runs.')
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load runs')
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  return { runs, loading, error, refetch }
}
