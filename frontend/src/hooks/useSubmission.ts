import { useEffect, useState } from 'react'
import { getSubmission, type ApiSubmission } from '@/api'

interface UseSubmissionResult {
  submission: ApiSubmission | null
  loading: boolean
  error: string | null
}

/** Loads one submission from `GET /api/ingest/{id}`. */
export function useSubmission(submissionId: string | undefined): UseSubmissionResult {
  const [submission, setSubmission] = useState<ApiSubmission | null>(null)
  const [loading, setLoading] = useState(Boolean(submissionId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!submissionId) {
      setSubmission(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getSubmission(submissionId)
      .then((next: ApiSubmission) => {
        if (!cancelled) setSubmission(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSubmission(null)
          setError(err instanceof Error ? err.message : 'Failed to load submission')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [submissionId])

  return { submission, loading, error }
}
