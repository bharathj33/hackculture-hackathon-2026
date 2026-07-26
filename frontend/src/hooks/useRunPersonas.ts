import { useEffect, useState } from 'react'
import { getPersonas } from '@/api'
import { adaptPersonas } from '@/lib/adaptPersona'
import type { Persona } from '@/mock/types'

interface UseRunPersonasResult {
  personas: Persona[]
  loading: boolean
  error: string | null
}

/** Loads simulated listeners for one run from `GET /api/runs/{id}/personas`. */
export function useRunPersonas(runId: string | undefined, beatCount: number): UseRunPersonasResult {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(Boolean(runId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setPersonas([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getPersonas(runId)
      .then((raw) => {
        if (!cancelled) setPersonas(adaptPersonas(raw, beatCount))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPersonas([])
          setError(err instanceof Error ? err.message : 'Failed to load listeners')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [runId, beatCount])

  return { personas, loading, error }
}
