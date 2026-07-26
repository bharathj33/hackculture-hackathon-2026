import { CircleSlash, Hash, MessageCircle, MessageSquare, Radio, ThumbsUp } from 'lucide-react'
import { Panel } from '@/components/common/Panel'
import { StatPlate } from '@/components/simulating/StatPlate'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDashboard } from '@/contexts/DashboardContext'
import { engagementByBeat } from '@/lib/beatEngagement'
import { beatExcerpt, pad2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Beat, BeatEngagement } from '@/mock/types'

function BeatStatsRow({ stats }: { stats: BeatEngagement }) {
  const cells = [
    { label: 'Posts', value: stats.posts, icon: MessageSquare },
    { label: 'Comments', value: stats.comments, icon: MessageCircle },
    { label: 'Reactions', value: stats.reactions, icon: ThumbsUp },
    ...(stats.tweets > 0 ? [{ label: 'Tweets', value: stats.tweets, icon: Hash }] : []),
    { label: 'Agents', value: stats.agents_engaged, icon: Radio },
  ]

  return (
    <dl className="mt-3 ml-4 grid grid-cols-2 gap-2 sm:ml-7 sm:grid-cols-3 lg:grid-cols-5">
      {cells.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-lg border bg-muted/30 px-3 py-2">
          <dt className="flex items-center gap-1 label-caps text-muted-foreground">
            <Icon className="size-3" aria-hidden />
            {label}
          </dt>
          <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function BeatRow({
  beat,
  excerpt,
  stats,
}: {
  beat: Beat
  excerpt: string
  stats?: BeatEngagement
}) {
  const failed = beat.failure_cause !== null

  return (
    <li className={cn('px-3 py-3 sm:px-4 sm:py-4', failed && 'border-l-2 border-l-destructive')}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {pad2(beat.idx)}
        </span>
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{beat.summary}</p>
        <span className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
          {beat.retained_pct}%
        </span>
      </div>

      <blockquote className="mt-2 ml-4 border-l-2 pl-3 font-sans text-sm leading-relaxed text-muted-foreground sm:ml-7">
        {excerpt}
      </blockquote>

      {(beat.is_hook || beat.is_cliffhanger || failed) && (
        <div className="mt-2.5 ml-4 flex flex-wrap items-center gap-2 sm:ml-7">
          {beat.is_hook && <Badge variant="secondary">Hook</Badge>}
          {beat.is_cliffhanger && <Badge variant="outline">Cliffhanger</Badge>}
          {failed && <Badge variant="destructive">Cliff failure</Badge>}
        </div>
      )}

      {failed && (
        <p className="mt-2 ml-4 text-sm leading-relaxed sm:ml-7">
          <span className="font-medium text-destructive">Cause:</span>{' '}
          <span className="text-foreground">{beat.failure_cause}</span>
        </p>
      )}

      {stats ? <BeatStatsRow stats={stats} /> : null}
    </li>
  )
}

/** Beat-by-beat retention + swarm discourse stats for the dashboard timeline tab. */
export function BeatTimeline({ className }: { className?: string }) {
  const { beats, submission, report, engagementTotals, personaCeiling } = useDashboard()
  const language = submission.story_rep?.language
  const byBeat = engagementByBeat(report.beat_engagement)

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-4', className)}>
      <section aria-labelledby="beat-swarm-totals" className="min-w-0 shrink-0">
        <h2 id="beat-swarm-totals" className="sr-only">
          Swarm activity across all beats
        </h2>
        <StatPlate
          className="md:grid-cols-3 lg:grid-cols-[repeat(6,minmax(0,1fr))]"
          cells={[
            { label: 'Beats', value: engagementTotals.beats },
            { label: 'Posts', value: engagementTotals.posts },
            { label: 'Comments', value: engagementTotals.comments },
            { label: 'Reactions', value: engagementTotals.reactions },
            { label: 'Tweets', value: engagementTotals.tweets },
            {
              label: 'Agents engaged',
              value: engagementTotals.agents_engaged,
              suffix: personaCeiling > 0 ? `/ ${personaCeiling}` : undefined,
            },
          ]}
        />
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-warning">
          <CircleSlash className="size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-mono font-semibold tabular-nums">{engagementTotals.silences}</span>{' '}
            silent passes across the run — agents declining to engage become drop-off.
          </span>
        </p>
      </section>

      <Panel
        heading="Beat Timeline"
        aside={<span className="text-xs text-muted-foreground">{beats.length} beats</span>}
        className="min-h-0 min-w-0 flex-1"
        flush
      >
        {beats.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No beat breakdown yet — the transcript is still being parsed.
          </p>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <ol className="divide-y">
              {beats.map((beat) => (
                <BeatRow
                  key={beat.idx}
                  beat={beat}
                  excerpt={beatExcerpt(beat, language)}
                  stats={byBeat.get(beat.idx)}
                />
              ))}
            </ol>
          </ScrollArea>
        )}
      </Panel>
    </div>
  )
}
