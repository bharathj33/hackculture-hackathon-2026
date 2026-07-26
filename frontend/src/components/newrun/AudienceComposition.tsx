import { archetypeMix, activePanel } from '@/mock/data'

const total = archetypeMix.reduce((sum, a) => sum + a.n, 0)

/**
 * Read-only. The editor does not pick a panel — the backend takes a single
 * `panel_id`, so there was never a real choice to offer, and the interesting
 * thing is not which panel but how the swarm is cast: fans, casual listeners,
 * purists and critics, who then argue with each other across rounds.
 */
export function AudienceComposition() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div>
        <p className="text-sm text-foreground">
          <span className="font-mono font-semibold">{total}</span> agents cast from{' '}
          <span className="font-medium">{activePanel.name}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {activePanel.config.market} · {activePanel.config.language.toUpperCase()} — they read the
          story, then post and reply to each other across rounds. The verdict is what that
          discussion settles on.
        </p>
      </div>

      {/* Stacked share bar — the mix at a glance before the per-role rows. */}
      <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
        {archetypeMix.map((a, i) => (
          <span
            key={a.archetype}
            className={
              ['bg-primary', 'bg-chart-5', 'bg-chart-2', 'bg-chart-4'][i] ?? 'bg-muted'
            }
            style={{ width: `${(a.n / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
        {archetypeMix.map((a, i) => (
          <li key={a.archetype} className="flex items-start gap-3 py-3">
            <span
              className={
                'mt-1.5 size-2 shrink-0 rounded-full ' +
                (['bg-primary', 'bg-chart-5', 'bg-chart-2', 'bg-chart-4'][i] ?? 'bg-muted')
              }
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{a.archetype}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {a.n}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{a.blurb}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
