import { useEffect, useState } from 'react'
import { getReport, type ApiBeat } from '@/api'
import { adaptReport } from '@/lib/adaptReport'
import type { Report } from '@/mock/types'

interface UseRunReportResult {
  report: Report | null
  loading: boolean
  error: string | null
}

/** Fetches `GET /api/runs/{id}/report` when the run has finished. */
export function useRunReport(
  runId: string | undefined,
  runStatus: string | undefined,
  beats?: ApiBeat[],
): UseRunReportResult {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId || runStatus !== 'done') {
      setReport(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getReport(runId)
      .then((raw) => {
        if (!cancelled) setReport(adaptReport(raw, beats))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReport(null)
          setError(err instanceof Error ? err.message : 'Failed to load report')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [runId, runStatus, beats])

  return { report, loading, error }
}
