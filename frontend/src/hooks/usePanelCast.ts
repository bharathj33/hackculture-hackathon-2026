import { useEffect, useState } from 'react'
import { getPanelCast, getPanels, type ApiCastProfile } from '@/api'
import type { CastProfile } from '@/mock/types'

interface UsePanelCastResult {
  cast: CastProfile[]
  panelName: string | null
  loading: boolean
  error: string | null
}

function adaptCast(raw: ApiCastProfile[]): CastProfile[] {
  return raw.map((entry) => ({
    id: entry.id,
    handle: entry.handle,
    group_label: entry.group_label,
    profile: entry.profile,
    persona_prompt: entry.persona_prompt,
    interests: entry.interests,
  }))
}

/** Generic cast roster for a panel — who participates in simulations, not run outcomes. */
export function usePanelCast(panelId: string | undefined): UsePanelCastResult {
  const [cast, setCast] = useState<CastProfile[]>([])
  const [panelName, setPanelName] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(panelId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!panelId) {
      setCast([])
      setPanelName(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getPanelCast(panelId), getPanels()])
      .then(([profiles, panels]) => {
        if (cancelled) return
        setCast(adaptCast(profiles))
        setPanelName(panels.find((panel) => panel.id === panelId)?.name ?? null)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCast([])
          setError(err instanceof Error ? err.message : 'Failed to load cast')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [panelId])

  return { cast, panelName, loading, error }
}
