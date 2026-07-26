import { useId } from 'react'
import { CastProfileCard } from '@/components/personas/CastProfileCard'
import type { CastProfile } from '@/mock/types'

interface CastProfileGridProps {
  cast: CastProfile[]
  panelName: string | null
  loading?: boolean
  error?: string | null
}

export function CastProfileGrid({
  cast,
  panelName,
  loading = false,
  error = null,
}: CastProfileGridProps) {
  const gridHeadingId = useId()

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
      <section aria-labelledby={gridHeadingId}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={gridHeadingId} className="label-caps text-muted-foreground">
            Cast roster
          </h2>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {cast.length} agents{panelName ? ` · ${panelName}` : ''}
          </p>
        </div>

        <p className="mt-2 max-w-[52ch] text-sm text-muted-foreground">
          Tap a profile for the full ID card — age, city, tastes, and listening habits.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading cast from panel…</p>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center">
            <p className="text-sm font-medium text-destructive">Could not load cast</p>
            <p className="mx-auto mt-1.5 max-w-[52ch] text-sm text-muted-foreground">{error}</p>
          </div>
        ) : cast.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed px-6 py-14 text-center">
            <p className="text-sm font-medium">No cast profiles for this panel</p>
          </div>
        ) : (
          <ul className="mt-5 grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {cast.map((profile) => (
              <li key={profile.id} className="min-w-0">
                <CastProfileCard profile={profile} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
