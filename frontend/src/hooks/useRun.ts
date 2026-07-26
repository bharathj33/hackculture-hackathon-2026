import { useEffect, useState } from 'react'
import { getRun, type ApiRun, UnauthorizedError } from '@/api'

const POLL_MS = 3000
const POLL_CAP_MS = 10 * 60 * 1000

interface UseRunResult {
  run: ApiRun | null
  loading: boolean
  error: string | null
}

/**
 * Polls `GET /api/runs/{id}` until the run reaches a terminal status.
 * StrictMode-safe: each effect owns its lifecycle flag and timer.
 */
export function useRun(runId: string | undefined): UseRunResult {
  const [run, setRun] = useState<ApiRun | null>(null)
  const [loading, setLoading] = useState(Boolean(runId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setRun(null)
      setLoading(false)
      setError(null)
      return
    }

    let stopped = false
    let settled = false
    let timer: number | undefined
    const startedAt = Date.now()

    const finish = (nextRun: ApiRun | null, nextError: string | null) => {
      if (stopped || settled) return
      settled = true
      setRun(nextRun)
      setError(nextError)
      setLoading(false)
    }

    const tick = async () => {
      if (stopped || settled) return
      try {
        const next = await getRun(runId)
        if (stopped || settled) return
        setRun(next)

        if (next.status === 'done' || next.status === 'failed') {
          if (next.status === 'failed') {
            finish(next, next.error ?? 'Simulation run failed on the server.')
          } else {
            finish(next, null)
          }
          return
        }

        if (Date.now() - startedAt >= POLL_CAP_MS) {
          finish(
            next,
            `Simulation timed out after 10 minutes (last status: "${next.status}").`,
          )
          return
        }

        timer = window.setTimeout(tick, POLL_MS)
      } catch (err) {
        if (stopped || settled) return
        if (err instanceof UnauthorizedError) {
          finish(null, 'Sign in to view this run.')
        } else {
          finish(null, err instanceof Error ? err.message : 'Failed to load run')
        }
      }
    }

    setLoading(true)
    setError(null)
    timer = window.setTimeout(tick, 1000)

    return () => {
      stopped = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [runId])

  return { run, loading, error }
}
