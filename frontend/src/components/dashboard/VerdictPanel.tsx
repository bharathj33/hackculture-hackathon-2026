import { Panel } from '@/components/common/Panel'
import { Badge } from '@/components/ui/badge'
import { useDashboard } from '@/contexts/DashboardContext'
import { scoreTone, verdictLabel, verdictTone } from '@/lib/format'
import { cn } from '@/lib/utils'

/** The scale the score is reported on. Banding thresholds live in `format.ts`. */
const SCORE_MAX = 10

/**
 * The answer. Everything else on the screen explains this number, so it gets the
 * one display-size type on the page and the rationale sits in full-strength
 * foreground — it is the sentence an editor would paste into a review.
 */
export function VerdictPanel({ className }: { className?: string }) {
  const { report } = useDashboard()

  return (
    <Panel heading="Verdict" className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-5">
        <p className="flex items-baseline gap-2">
          <span
            className={cn(
              'font-mono text-5xl leading-none font-semibold tracking-tight tabular-nums sm:text-6xl',
              scoreTone(report.score),
            )}
          >
            {report.score.toFixed(1)}
          </span>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            / {SCORE_MAX}
          </span>
        </p>
        <Badge variant={verdictTone(report.verdict)}>{verdictLabel(report.verdict)}</Badge>
      </div>

      {/* Sits at the foot of the panel so the score and the sentence bracket the card. */}
      <p className="mt-auto pt-6 text-base leading-relaxed text-foreground">{report.rationale}</p>
    </Panel>
  )
}
