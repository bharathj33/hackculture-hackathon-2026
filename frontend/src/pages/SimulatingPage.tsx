import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'

import { FooterStrip } from '@/components/layout/AppShell'
import { AmbientField } from '@/components/simulating/AmbientField'
import { DiscourseFeed } from '@/components/simulating/DiscourseFeed'
import { RunProgressBar } from '@/components/simulating/RunProgressBar'
import { SimulationStyles } from '@/components/simulating/SimulationStyles'
import { SwarmCounters } from '@/components/simulating/SwarmCounters'
import { TriagePanel } from '@/components/simulating/TriagePanel'
import { useSimulationClock } from '@/components/simulating/useSimulationClock'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRun } from '@/hooks/useRun'
import { useSubmission } from '@/hooks/useSubmission'
import { duration } from '@/lib/format'
import { SWARM_ROUNDS } from '@/mock/data'
import type { RunMode } from '@/mock/types'

/** Mono numerals inside prose, so the copy and the counters read as one system. */
function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums">{children}</span>
}

export default function SimulatingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const runId = params.get('runId') ?? undefined
  const mode: RunMode = params.get('mode') === 'triage' ? 'triage' : 'full'
  const triage = mode === 'triage'

  const { run, loading, error } = useRun(runId)
  const { submission } = useSubmission(run?.submission_id)
  const apiDone = run?.status === 'done'
  const apiFailed = run?.status === 'failed'

  const { status, elapsedSeconds, counts, visible } = useSimulationClock(mode)
  const replayRunning = status === 'running'
  const running = !apiDone && !apiFailed && (loading || replayRunning)

  const beatCount = submission?.story_rep?.beats.length ?? 0
  const personaCount = triage ? 0 : 18
  const modeLabel = triage ? 'Quick triage' : 'Full swarm'

  useEffect(() => {
    if (apiDone && runId) {
      navigate(`/runs/${runId}`, { replace: true })
    }
  }, [apiDone, navigate, runId])

  if (!runId) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6">
        <Alert>
          <AlertDescription>No run id in the URL. Start a new analysis first.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-background">
      <SimulationStyles />
      <AmbientField />

      <main className="relative flex flex-1 flex-col px-4 py-12 sm:px-8">
        <div className="mx-auto my-auto w-full max-w-[960px]">
          {error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Badge variant="secondary" role="status" className="gap-2 px-3 py-1">
              <span
                className={`size-1.5 rounded-full bg-primary ${running ? 'animate-pulse motion-reduce:animate-none' : ''}`}
                aria-hidden="true"
              />
              {modeLabel} replay {running ? 'in progress' : 'complete'}
              {run ? (
                <span className="font-mono text-xs text-muted-foreground">· {run.status}</span>
              ) : loading ? (
                <span className="font-mono text-xs text-muted-foreground">· polling</span>
              ) : null}
            </Badge>
            <span className="label-caps text-muted-foreground">
              {triage ? 'Single pass · no personas' : `${SWARM_ROUNDS} rounds of discourse`}
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {triage ? (
              <>
                Quick triage — one pass over <Num>{beatCount}</Num> beats
              </>
            ) : (
              <>
                <Num>{personaCount}</Num> cast listeners are arguing over <Num>{beatCount}</Num>{' '}
                beats
              </>
            )}
            {running ? (
              <span aria-hidden="true">
                .<span className="sc-dot-2">.</span>
                <span className="sc-dot-3">.</span>
              </span>
            ) : null}
          </h1>

          <p className="mt-3 max-w-[68ch] text-sm text-muted-foreground">
            {triage ? (
              <>
                Triage is a single model call. It casts no personas, runs no rounds and produces no
                discourse. A run reports its <span className="font-mono">status</span> when it starts
                and again when it ends and nothing in between, so the timing below is illustrative
                rather than observed.
              </>
            ) : (
              <>
                A run reports its <span className="font-mono">status</span> when it starts and again
                when it ends and nothing in between — there is no progress to read. The counters,
                clock and discourse below replay a recorded swarm log at an illustrative pace. The
                job keeps working whether or not you stay here.
              </>
            )}
          </p>

          {loading && !run ? (
            <div className="mt-8 space-y-3">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : triage ? (
            <TriagePanel beatCount={beatCount} />
          ) : (
            <SwarmCounters counts={counts} personaCount={personaCount} />
          )}

          <section aria-labelledby="run-timing-heading" className="mt-10 border-t pt-6">
            <h2 id="run-timing-heading" className="sr-only">
              Run timing
            </h2>

            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  On this screen{' '}
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {duration(elapsedSeconds)}
                  </span>{' '}
                  — illustrative pace, not a measure of what is left.
                </span>
              </p>
              <p className="label-caps text-muted-foreground">
                {apiDone ? 'Run complete' : running ? 'No completion estimate exists' : 'Replay ended'}
              </p>
            </div>

            <div className="mt-4">
              <RunProgressBar status={apiDone ? 'done' : status} />
            </div>
          </section>

          {triage ? null : (
            <div className="mt-8">
              <DiscourseFeed visible={visible} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => navigate(`/runs/${runId}`)}
              disabled={!apiDone}
              className="gap-2"
            >
              View Verdict
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/new')}
              className="text-muted-foreground"
            >
              Leave this run
            </Button>
            <p className="w-full text-xs text-muted-foreground sm:w-auto">
              {apiDone
                ? 'Redirecting to the verdict…'
                : 'Leaving does not stop the job — nothing here can.'}
            </p>
          </div>
        </div>
      </main>

      <FooterStrip
        right={
          <div className="hidden items-center justify-end gap-x-5 sm:flex">
            <span className="label-caps font-mono text-muted-foreground">{runId}</span>
            <span className="label-caps text-muted-foreground">Mode: {modeLabel}</span>
            <span className="label-caps text-muted-foreground">
              Replay: {apiDone ? 'done' : status}
            </span>
          </div>
        }
      />
    </div>
  )
}
