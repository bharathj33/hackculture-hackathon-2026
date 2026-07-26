import { useNavigate } from 'react-router-dom'
import { FooterStrip } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

      <main className="min-h-0 flex-1 overflow-auto p-6">
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="label-caps text-muted-foreground">Story</TableHead>
                <TableHead className="label-caps text-muted-foreground">Mode</TableHead>
                <TableHead className="label-caps text-muted-foreground">Status</TableHead>
                <TableHead className="label-caps text-right text-muted-foreground">Score</TableHead>
                <TableHead className="label-caps text-right text-muted-foreground">Agents</TableHead>
                <TableHead className="label-caps text-right text-muted-foreground">Tokens</TableHead>
                <TableHead className="label-caps text-right text-muted-foreground">Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const openable = run.status === 'done'
                const statusVariant =
                  STATUS_VARIANT[run.status as keyof typeof STATUS_VARIANT] ?? 'muted'

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
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant={run.mode === 'full' ? 'secondary' : 'outline'}>
                        {run.mode === 'full' ? 'Full swarm' : 'Triage'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant}>{run.status}</Badge>
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
        )}
      </main>

      <FooterStrip right={<span className="font-mono">Times in UTC</span>} />
    </>
  )
}
