import { Panel } from '@/components/common/Panel'
import { useDashboard } from '@/contexts/DashboardContext'
import { scoreTone } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Read-only. Selecting a segment filtered nothing, so the rows carry no hover
 * or pressed affordance rather than looking clickable and doing nothing.
 */
export function AudienceSegments({ className }: { className?: string }) {
  const { report } = useDashboard()
  const segments = report.segments
  /** Sums to the run's persona_count — the bar below is each group's share of it. */
  const totalListeners = segments.reduce((sum, segment) => sum + segment.n, 0)

  return (
    <Panel
      heading="Audience Segments"
      aside={
        <span className="text-xs text-muted-foreground">{totalListeners} simulated listeners</span>
      }
      className={cn('min-w-0', className)}
      flush
    >
      {segments.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground sm:p-4">No segment scores returned.</p>
      ) : (
        <ul className="divide-y">
          {segments.map((segment) => (
            <li key={segment.group} className="px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {segment.group}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-xl leading-none font-semibold tabular-nums',
                    scoreTone(segment.score),
                  )}
                >
                  {segment.score.toFixed(1)}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <span
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{
                      width: `${totalListeners > 0 ? (segment.n / totalListeners) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {segment.n} listeners
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
