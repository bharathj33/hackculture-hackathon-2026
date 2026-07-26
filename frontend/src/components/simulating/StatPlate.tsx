import { cn } from '@/lib/utils'

export interface StatCell {
  label: string
  value: number
  /** Trailing context, e.g. `/ 6`. Rendered smaller and muted. */
  suffix?: string
}

interface StatPlateProps {
  cells: StatCell[]
  /** Column template applied from `lg` up. Below that the plate wraps. */
  className?: string
}

/**
 * The instrument plate. One raised surface split by hairlines rather than a row
 * of separate cards — the numbers are the thing that moves on this screen, so
 * they get the elevation and the headline gets none.
 */
export function StatPlate({ cells, className }: StatPlateProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3',
        className,
      )}
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="flex flex-col justify-between gap-3 bg-card px-4 py-5 sm:px-5"
        >
          <dt className="label-caps text-muted-foreground">{cell.label}</dt>
          <dd className="flex items-baseline gap-1.5 font-mono font-semibold tracking-tight tabular-nums">
            {/*
              Keyed on the value so a changed number remounts and replays the
              tick-in. The animation is the only thing that "accumulates" — and
              it lives in CSS, not in React state.
            */}
            <span key={cell.value} className="sc-tick text-4xl sm:text-5xl">
              {cell.value}
            </span>
            {cell.suffix ? (
              <span className="text-lg font-medium text-muted-foreground">{cell.suffix}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
