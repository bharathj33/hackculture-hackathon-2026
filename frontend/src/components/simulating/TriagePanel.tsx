import { StatPlate } from '@/components/simulating/StatPlate'

interface TriagePanelProps {
  beatCount: number
}

/**
 * Quick Triage is a single model pass. It casts no personas, runs no rounds and
 * produces no discourse — so this screen must not borrow the swarm's counters or
 * its feed. The zeros are the point: they are what the mode actually returns.
 */
export function TriagePanel({ beatCount }: TriagePanelProps) {
  return (
    <section aria-labelledby="triage-counters-heading" className="mt-8">
      <h2 id="triage-counters-heading" className="sr-only">
        What triage produces
      </h2>

      <StatPlate
        className="lg:grid-cols-3"
        cells={[
          { label: 'Beats in the pass', value: beatCount },
          { label: 'Personas cast', value: 0 },
          { label: 'Discourse rounds', value: 0 },
        ]}
      />

      <p className="mt-3 max-w-[65ch] text-xs text-muted-foreground">
        One pass, one model call, one score. Persona Lab stays empty and there is no discourse to
        show until a full swarm run finishes.
      </p>
    </section>
  )
}
