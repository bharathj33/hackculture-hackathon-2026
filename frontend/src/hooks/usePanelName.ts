import { useEffect, useState } from 'react'
import { getPanels } from '@/api'

/** Resolves a panel display name from the backend roster. */
export function usePanelName(panelId: string | undefined): string | null {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    if (!panelId) {
      setName(null)
      return
    }

    let cancelled = false
    getPanels()
      .then((panels) => {
        if (!cancelled) {
          setName(panels.find((panel) => panel.id === panelId)?.name ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) setName(null)
      })

    return () => {
      cancelled = true
    }
  }, [panelId])

  return name
}
