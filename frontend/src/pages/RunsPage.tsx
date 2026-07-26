import { useNavigate } from 'react-router-dom'
import { FooterStrip } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRuns } from '@/hooks/useRuns'
import type { ApiRunSummary } from '@/api'
import { scoreTone, storyDisplayLabel } from '@/lib/format'
import { cn } from '@/lib/utils'

/** UTC and explicit, so the ledger reads identically wherever it is demoed. */
const stamp = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  hour12: false,
})

/**
 * Remaining-time hints per pipeline stage, from measured 16-listener runs
 * (graph ~4m, casting ~6m, rounds+agent-gen ~7m, verdict ~4m). Estimates, not
 * promises — they drift with panel size, so they render with a tilde.
 */
const STAGE_ETA: Record<string, string> = {
  'knowledge graph': '~18 min left',
  'casting personas': '~14 min left',
  'swarm rounds': '~9 min left',
  'compiling verdict': '~3 min left',
  'panel critique': '~1 min left',
  'panel critique (fallback)': '~1 min left',
}

/** "MP3 · 16.8 MB" from submission metadata; parts render only when known. */
function mediaChip(run: ApiRunSummary): string {
  const parts: string[] = []
  if (run.media_ext) parts.push(run.media_ext.toUpperCase())
  if (run.media_bytes != null && run.media_bytes > 0) {
    const mb = run.media_bytes / (1024 * 1024)
    parts.push(mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(run.media_bytes / 1024)} KB`)
  }
  return parts.join(' · ')
}

/** "18m 04s" / "1h 02m" / "42s" from the run's own timestamps. */
function runDuration(startedAt?: string | null, finishedAt?: string | null): string | null {
  if (!startedAt || !finishedAt) return null
  const ms = Date.parse(finishedAt) - Date.parse(startedAt)
  if (!Number.isFinite(ms) || ms <= 0) return null
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

/** In-flight badge: soft pulse + live dot, so "running" reads as activity, not a label. */
function StatusBadge({
  status,
  stage,
  startedAt,
  finishedAt,
}: {
  status: string
  stage?: string | null
  startedAt?: string | null
  finishedAt?: string | null
}) {
  const took = runDuration(startedAt, finishedAt)
  const variant = STATUS_VARIANT[status as keyof typeof STATUS_VARIANT] ?? 'muted'
  const live = status === 'running' || status === 'queued'
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Badge variant={variant} className={cn(live && 'animate-pulse')}>
        {live && (
          <span className="relative mr-1 flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-current" />
          </span>
        )}
        {status}
      </Badge>
      {live && stage ? (
        <span className="label-caps text-[10px] text-muted-foreground">
          {stage}
          {STAGE_ETA[stage] ? ` · ${STAGE_ETA[stage]}` : ''}
        </span>
      ) : null}
      {!live && took ? (
        <span className="label-caps text-[10px] text-muted-foreground">took {took}</span>
      ) : null}
    </span>
  )
}

const STATUS_VARIANT = {
  done: 'success',
  running: 'default',
  failed: 'destructive',
  queued: 'muted',
} as const

function runLabel(run: ApiRunSummary): string {
  return storyDisplayLabel(run.story_label, {
    language: run.language,
    beatCount: run.beat_count,
  })
}

function formatStartedAt(value: string | null): string {
  if (!value) return '—'
  return stamp.format(new Date(value))
}

function RunCard({
  run,
  onOpen,
}: {
  run: ApiRunSummary
  onOpen: (runId: string) => void
}) {
  const openable = run.status === 'done'
  const label = runLabel(run)

  return (
    <Card
      role={openable ? 'button' : undefined}
      tabIndex={openable ? 0 : undefined}
      onClick={openable ? () => onOpen(run.id) : undefined}
      onKeyDown={
        openable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen(run.id)
              }
            }
          : undefined
      }
      className={cn(
        'gap-0 py-0 shadow-none transition-colors',
        openable
          ? 'cursor-pointer hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none'
          : 'opacity-60',
      )}
    >
      <div className="space-y-3 p-4">
        <div className="min-w-0">
          {openable ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpen(run.id)
              }}
              className="w-full truncate text-left text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
            >
              {label}
            </button>
          ) : (
            <p className="truncate text-sm font-medium">{label}</p>
          )}
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {run.id} · {run.language.toUpperCase()}
            {mediaChip(run) ? ` · ${mediaChip(run)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={run.mode === 'full' ? 'secondary' : 'outline'}>
            {run.mode === 'full' ? 'Full swarm' : 'Triage'}
          </Badge>
          <StatusBadge status={run.status} stage={run.stage} startedAt={run.started_at} finishedAt={run.finished_at} />
        </div>

        <dl className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <dt className="label-caps text-muted-foreground">Score</dt>
            <dd className="mt-0.5">
              {run.score === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span
                  className={cn(
                    'font-mono text-base font-semibold tabular-nums',
                    scoreTone(run.score),
                  )}
                >
                  {run.score.toFixed(1)}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="label-caps text-muted-foreground">Agents</dt>
            <dd className="mt-0.5 font-mono tabular-nums">{run.persona_count}</dd>
          </div>
          <div>
            <dt className="label-caps text-muted-foreground">Started</dt>
            <dd className="mt-0.5 font-mono text-muted-foreground">
              {formatStartedAt(run.started_at)}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

export default function RunsPage() {
  const navigate = useNavigate()
  const { runs, loading, error } = useRuns()
  const open = (runId: string) => navigate(`/runs/${runId}`)

  return (
    <>
      <TopBar
        title={
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">Runs</h1>
            <p className="truncate text-xs text-muted-foreground">
              Every panel run, newest first. Open one to read its verdict.
            </p>
          </div>
        }
        action={
          <Button onClick={() => navigate('/new')} size="sm">
            New Analysis
          </Button>
        }
      />

      <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">No runs yet.</p>
            <Button onClick={() => navigate('/new')} size="sm">
              Start your first analysis
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {runs.map((run) => (
                <RunCard key={run.id} run={run} onOpen={open} />
              ))}
            </div>

            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="label-caps text-muted-foreground">Story</TableHead>
                    <TableHead className="label-caps text-muted-foreground">Mode</TableHead>
                    <TableHead className="label-caps text-muted-foreground">Status</TableHead>
                    <TableHead className="label-caps text-right text-muted-foreground">
                      Score
                    </TableHead>
                    <TableHead className="label-caps text-right text-muted-foreground">
                      Agents
                    </TableHead>
                    <TableHead className="label-caps text-right text-muted-foreground">
                      Tokens
                    </TableHead>
                    <TableHead className="label-caps text-right text-muted-foreground">
                      Started
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const openable = run.status === 'done'

                    return (
                      <TableRow
                        key={run.id}
                        onClick={openable ? () => open(run.id) : undefined}
                        className={cn(
                          'hover:bg-muted',
                          openable ? 'cursor-pointer' : 'opacity-60',
                        )}
                      >
                        <TableCell className="py-3">
                          {openable ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                open(run.id)
                              }}
                              className="rounded-sm text-left font-medium underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                            >
                              {runLabel(run)}
                            </button>
                          ) : (
                            <span className="font-medium">{runLabel(run)}</span>
                          )}
                          <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                            {run.id} · {run.language.toUpperCase()}
            {mediaChip(run) ? ` · ${mediaChip(run)}` : ''}
                          </span>
                        </TableCell>

                        <TableCell>
                          <Badge variant={run.mode === 'full' ? 'secondary' : 'outline'}>
                            {run.mode === 'full' ? 'Full swarm' : 'Triage'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={run.status} stage={run.stage} startedAt={run.started_at} finishedAt={run.finished_at} />
                        </TableCell>

                        <TableCell className="text-right">
                          {run.score === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span
                              className={cn(
                                'font-mono text-lg font-semibold tabular-nums',
                                scoreTone(run.score),
                              )}
                            >
                              {run.score.toFixed(1)}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {run.persona_count}
                        </TableCell>

                        <TableCell className="text-right font-mono text-sm text-muted-foreground tabular-nums">
                          {(run.cost_tokens / 1000).toFixed(0)}k
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatStartedAt(run.started_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>

      <FooterStrip right={<span className="font-mono">Times in UTC</span>} />
    </>
  )
}
