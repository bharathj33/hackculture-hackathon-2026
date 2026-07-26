import { useId } from 'react'
import { cn } from '@/lib/utils'
import { pad2 } from '@/lib/format'
import type { PersonaEvent } from '@/mock/types'

/** One tone per recorded action. Dot and text share the same semantic token. */
const ACTION: Record<PersonaEvent['action'], { label: string; dot: string; text: string }> = {
  listening: { label: 'Listening', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  're-listened': { label: 'Re-listened', dot: 'bg-primary', text: 'text-primary' },
  skipped: { label: 'Skipped', dot: 'bg-warning', text: 'text-warning' },
  dropped: { label: 'Dropped', dot: 'bg-destructive', text: 'text-destructive' },
  completed: { label: 'Completed', dot: 'bg-success', text: 'text-success' },
}

/**
 * The persisted per-beat trace. Every answer in the transcript is grounded in
 * these rows, so they are shown before the conversation rather than under it.
 */
export function EventLog({ events }: { events: PersonaEvent[] }) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="shrink-0 border-b bg-muted px-3 py-3 text-foreground sm:px-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 id={headingId} className="label-caps text-muted-foreground">
          Event log
        </h4>
        <p className="text-xs text-muted-foreground">
          {events.length} recorded beats — the evidence behind every answer
        </p>
      </div>

      {events.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No per-beat trace was persisted for this listener.
        </p>
      ) : (
        <ol className="mt-1 max-h-32 divide-y overflow-y-auto overscroll-contain sm:max-h-40">
          {events.map((event) => {
            const tone = ACTION[event.action]
            return (
              <li
                key={`${event.beat_idx}-${event.action}`}
                className="flex flex-col gap-1 py-2 sm:grid sm:grid-cols-[3.75rem_7rem_minmax(0,1fr)] sm:items-baseline sm:gap-3"
              >
                <div className="flex items-center gap-3 sm:contents">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    Beat {pad2(event.beat_idx)}
                  </span>
                  <span className={cn('flex items-center gap-1.5 text-xs font-medium', tone.text)}>
                    <span className={cn('size-1.5 shrink-0 rounded-full', tone.dot)} aria-hidden />
                    {tone.label}
                  </span>
                </div>
                <span className="min-w-0 text-sm break-words">{event.note}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
