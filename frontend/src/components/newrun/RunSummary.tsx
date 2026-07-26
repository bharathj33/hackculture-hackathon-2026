import { Loader2, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiRunMode } from '@/api'

interface RunSummaryProps {
  beatCount: number
  busy: boolean
  canRun: boolean
  onRun: (mode: ApiRunMode) => void
}

/**
 * Hierarchy is deliberate: triage is the one mode that returns inside a demo
 * slot, so it gets the filled button. The swarm is real work and reads as such.
 * The audience is described above this row, so it is not restated here.
 */
export function RunSummary({ beatCount, busy, canRun, onRun }: RunSummaryProps) {
  const disabled = !canRun || busy

  return (
    <div className="flex shrink-0 flex-col gap-4 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        {beatCount > 0 ? (
          <>
            <span className="font-mono tabular-nums text-foreground">{beatCount}</span> beats ready
            to run.
          </>
        ) : (
          'Submit a story to see beat count.'
        )}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={disabled} onClick={() => onRun('triage')}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Zap aria-hidden />}
          Quick Triage
          <span className="font-mono text-xs">~30s</span>
        </Button>

        <Button
          size="lg"
          variant="outline"
          disabled={disabled}
          onClick={() => onRun('full')}
          className="hover:bg-muted hover:text-foreground dark:hover:bg-muted"
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Users aria-hidden />}
          Full Swarm
          <span className="font-mono text-xs">15–40 min</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Triage is a single pass and casts no personas — Persona Lab stays empty until a full swarm
        run finishes.
      </p>
    </div>
  )
}
