import { Panel } from '@/components/common/Panel'
import { useDashboard } from '@/contexts/DashboardContext'
import { cn } from '@/lib/utils'

/**
 * The editor's actual deliverable: three changes and what each one is worth.
 * `est_delta` is a backend string, not a number — rendered verbatim so nobody
 * mistakes a range for a computed figure.
 */
export function PrioritizedFixes({ className }: { className?: string }) {
  const { report } = useDashboard()
  /** Backend order is not guaranteed; priority is. */
  const fixes = [...report.fixes].sort((a, b) => a.priority - b.priority)

  return (
    <Panel
      heading="Prioritized Fixes"
      aside={
        <span className="text-xs text-muted-foreground">
          {fixes.length} {fixes.length === 1 ? 'change' : 'changes'}
        </span>
      }
      className={className}
      flush
    >
      {fixes.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No fixes returned — the panel found nothing worth changing.
        </p>
      ) : (
        <ol className="divide-y">
          {fixes.map((fix, index) => {
            const lead = index === 0

            return (
              <li key={fix.priority} className="flex items-start gap-4 px-4 py-4">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-sm font-semibold tabular-nums',
                    lead ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {fix.priority}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'leading-relaxed text-foreground',
                      lead ? 'text-base font-medium' : 'text-sm',
                    )}
                  >
                    {fix.text}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <span className="label-caps mr-2">Est. delta</span>
                    {fix.est_delta}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
