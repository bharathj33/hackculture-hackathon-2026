import { useEffect, useState } from 'react'
import { getPanels, type ApiPanel, UnauthorizedError } from '@/api'
import { activePanel } from '@/mock/data'

/** Resolves the preset panel id from the backend for cast directory screens. */
export function useActivePanelId(): {
  panelId: string | undefined
  panelName: string
  loading: boolean
  error: string | null
} {
  const [panel, setPanel] = useState<ApiPanel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getPanels()
      .then((panels) => {
        if (cancelled) return
        const preset =
          panels.find((entry) => entry.name.includes('Tier-2 Hindi')) ??
          panels.find((entry) => entry.is_preset) ??
          panels[0]
        setPanel(preset ?? null)
        setError(preset ? null : 'No preset panel found on the server.')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPanel(null)
        if (err instanceof UnauthorizedError) {
          setError('Sign in to load cast profiles.')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load panels')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    panelId: loading ? undefined : panel?.id,
    panelName: panel?.name ?? activePanel.name,
    loading,
    error,
  }
}
