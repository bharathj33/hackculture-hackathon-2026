import { CircleSlash } from 'lucide-react'

import { StatPlate } from '@/components/simulating/StatPlate'
import type { SwarmCounts } from '@/components/simulating/useSimulationClock'
import { SWARM_ROUNDS } from '@/mock/data'

interface SwarmCountersProps {
  counts: SwarmCounts
  /** The panel this run was cast from — the ceiling for "agents engaged". */
  personaCount: number
}

/**
 * The centrepiece. Every figure is a fold over the action records revealed so
 * far, so the row ticks upward as rounds land instead of asserting a total the
 * screen cannot see.
 */
export function SwarmCounters({ counts, personaCount }: SwarmCountersProps) {
  return (
    <section aria-labelledby="swarm-counters-heading" className="mt-8">
      <h2 id="swarm-counters-heading" className="sr-only">
        Swarm activity so far
      </h2>

      <StatPlate
        className="lg:grid-cols-[1.35fr_1fr_1fr_1fr_1.35fr]"
        cells={[
          { label: 'Round', value: counts.round, suffix: `/ ${SWARM_ROUNDS}` },
          { label: 'Posts', value: counts.posts },
          { label: 'Comments', value: counts.comments },
          { label: 'Reactions', value: counts.reactions },
          { label: 'Agents engaged', value: counts.agentsEngaged, suffix: `/ ${personaCount}` },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        {/*
          Silence is a finding, not a hole in the log — so it reads as a warning
          about listeners, never as an error in the run.
        */}
        <p className="flex items-center gap-2 text-xs text-warning">
          <CircleSlash className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-mono font-semibold tabular-nums">{counts.silences}</span> silent
            passes — an agent declining to engage is the disengagement that becomes drop-off, not a
            gap in the log.
          </span>
        </p>
        <p className="text-xs text-muted-foreground">Counted from the records revealed so far.</p>
      </div>
    </section>
  )
}
