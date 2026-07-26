import { useId } from 'react'
import { ArchetypeStrip } from '@/components/personas/ArchetypeStrip'
import { PersonaCard } from '@/components/personas/PersonaCard'
import type { Persona } from '@/mock/types'

interface RunListenerGridProps {
  runId: string
  personas: Persona[]
  panelName?: string | null
  loading?: boolean
  error?: string | null
}

export function RunListenerGrid({
  runId,
  personas,
  panelName = null,
  loading = false,
  error = null,
}: RunListenerGridProps) {
  const gridHeadingId = useId()

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
      <ArchetypeStrip personas={personas} />

      <section aria-labelledby={gridHeadingId}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={gridHeadingId} className="label-caps text-muted-foreground">
            Simulated listeners
          </h2>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {personas.length} agents{panelName ? ` · ${panelName}` : ''}
          </p>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading listeners from run…</p>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center">
            <p className="text-sm font-medium text-destructive">Could not load listeners</p>
            <p className="mx-auto mt-1.5 max-w-[52ch] text-sm text-muted-foreground">{error}</p>
          </div>
        ) : personas.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed px-6 py-14 text-center">
            <p className="text-sm font-medium">No listeners for this run</p>
            <p className="mx-auto mt-1.5 max-w-[46ch] text-sm text-muted-foreground">
              Full swarm runs persist simulated listeners in the database. Triage runs cast none,
              and a full run that failed before persona persistence will also show empty.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {personas.map((persona) => (
              <li key={persona.id} className="min-w-0">
                <PersonaCard persona={persona} runId={runId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
