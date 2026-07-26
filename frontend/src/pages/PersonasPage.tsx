import { FooterStrip } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { CastProfileGrid } from '@/components/personas/CastProfileGrid'
import { useActivePanelId } from '@/hooks/useActivePanelId'
import { usePanelCast } from '@/hooks/usePanelCast'

/** Generic cast directory — who gets simulated, not run-specific outcomes. */
export default function PersonasPage() {
  const { panelId, panelName, loading: panelLoading, error: panelError } = useActivePanelId()
  const { cast, panelName: castPanelName, loading, error } = usePanelCast(panelId)

  return (
    <>
      <TopBar
        title={
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">Personas</h1>
            <p className="truncate text-xs text-muted-foreground">
              Simulated listener profiles cast into full swarm runs
            </p>
          </div>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        <CastProfileGrid
          cast={cast}
          panelName={castPanelName ?? panelName}
          loading={panelLoading || loading}
          error={panelError ?? error}
        />
      </main>

      <FooterStrip />
    </>
  )
}
