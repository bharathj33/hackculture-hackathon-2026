import { Check, TriangleAlert } from 'lucide-react'
import { Panel } from '@/components/common/Panel'
import { useDashboard } from '@/contexts/DashboardContext'
import { cn } from '@/lib/utils'
import type { Finding } from '@/mock/types'

interface ColumnProps {
  title: string
  items: Finding[]
  icon: typeof Check
  iconClass: string
  emptyLabel: string
}

/**
 * Every finding carries the persona handles it was drawn from. Those handles
 * are simulated listeners — the traceability is the credibility.
 */
function FindingColumn({ title, items, icon: Icon, iconClass, emptyLabel }: ColumnProps) {
  return (
    <section className="min-w-0 p-4">
      <h3 className="label-caps text-muted-foreground">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3.5">
          {items.map((finding) => (
            <li key={finding.text} className="flex gap-2.5">
              <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-foreground">{finding.text}</p>
                {finding.persona_refs.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {finding.persona_refs.join(' · ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ProsCons({ className }: { className?: string }) {
  const { report } = useDashboard()

  return (
    <Panel heading="Strengths & Risks" className={cn('min-w-0', className)} flush>
      <div className="grid min-h-0 min-w-0 flex-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
        <FindingColumn
          title="Strengths"
          items={report.pros}
          icon={Check}
          iconClass="text-success"
          emptyLabel="No strengths reached the reporting threshold."
        />
        <FindingColumn
          title="Risks"
          items={report.cons}
          icon={TriangleAlert}
          iconClass="text-warning"
          emptyLabel="No risks reached the reporting threshold."
        />
      </div>
    </Panel>
  )
}
