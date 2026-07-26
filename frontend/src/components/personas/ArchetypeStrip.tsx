import { useId } from 'react'
import type { Persona } from '@/mock/types'

interface ArchetypeStripProps {
  personas: Persona[]
}

/**
 * How the swarm was cast — counts are derived from the personas returned by the
 * backend for this run, not from static fixtures.
 */
export function ArchetypeStrip({ personas }: ArchetypeStripProps) {
  const headingId = useId()

  const groups = [...personas.reduce((map, persona) => {
    map.set(persona.group_label, (map.get(persona.group_label) ?? 0) + 1)
    return map
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1])

  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="label-caps text-muted-foreground">
          Panel composition
        </h2>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {personas.length} agents cast
        </p>
      </div>

      {groups.length === 0 ? null : (
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-5 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map(([label, count]) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-baseline gap-2">
                <span className="font-mono text-lg leading-none font-semibold tabular-nums">
                  {count}
                </span>
                <span className="truncate text-sm font-medium">{label}</span>
              </dt>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
