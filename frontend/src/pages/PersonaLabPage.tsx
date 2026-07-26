import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FooterStrip } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { InterrogationPane } from '@/components/personalab/InterrogationPane'
import { PersonaRail } from '@/components/personalab/PersonaRail'
import { useRun } from '@/hooks/useRun'
import { useRunPersonas } from '@/hooks/useRunPersonas'
import { useRunReport } from '@/hooks/useRunReport'
import { useSubmission } from '@/hooks/useSubmission'
import { submissionLabel } from '@/lib/adaptReport'

export default function PersonaLabPage() {
  const navigate = useNavigate()
  const { runId, personaId } = useParams<{ runId: string; personaId?: string }>()
  const resolvedRunId = runId ?? ''

  const { run, loading: runLoading, error: runError } = useRun(resolvedRunId || undefined)
  const { submission, loading: submissionLoading, error: submissionError } = useSubmission(
    run?.submission_id,
  )
  const apiBeats = submission?.story_rep?.beats
  const beatCount = apiBeats?.length ?? 8
  const { report, loading: reportLoading, error: reportError } = useRunReport(
    resolvedRunId || undefined,
    run?.status,
    apiBeats,
  )
  const { personas: listeners, loading: personasLoading, error: personasError } = useRunPersonas(
    resolvedRunId || undefined,
    beatCount,
  )

  const loading =
    runLoading || submissionLoading || personasLoading || (run?.status === 'done' && reportLoading)
  const error = runError ?? submissionError ?? personasError ?? reportError
  const selected = listeners.find((persona) => persona.id === personaId) ?? listeners[0]
  const storyTitle = submission ? submissionLabel(submission) : resolvedRunId

  if (!resolvedRunId) {
    return (
      <>
        <TopBar title={<h1 className="text-lg font-semibold tracking-tight">Listener</h1>} />
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Missing run id in the URL.</p>
        </main>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <TopBar title={<h1 className="text-lg font-semibold tracking-tight">Listener</h1>} />
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading listeners…</p>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <TopBar title={<h1 className="text-lg font-semibold tracking-tight">Listener</h1>} />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center">
            <p className="text-sm font-medium text-destructive">Could not load listeners</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
          </div>
        </main>
      </>
    )
  }

  if (!selected) {
    return (
      <>
        <TopBar title={<h1 className="text-lg font-semibold tracking-tight">Listener</h1>} />
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            This run has no simulated listeners to interrogate.
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar
        title={
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to={`/runs/${resolvedRunId}?tab=listeners`}
              aria-label="Back to listeners"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg leading-tight font-semibold tracking-tight">
                {selected.handle}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {storyTitle} · {resolvedRunId}
              </p>
            </div>
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:grid lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:grid-rows-1">
        <PersonaRail
          personas={listeners}
          selectedId={selected.id}
          beatCount={beatCount}
          onSelect={(id) =>
            navigate(`/runs/${resolvedRunId}/listeners/${id}`, { replace: true })
          }
        />
        <InterrogationPane
          key={selected.id}
          runId={resolvedRunId}
          persona={selected}
          beats={apiBeats ?? []}
          beatCount={beatCount}
        />
      </main>

      <FooterStrip
        right={
          <span className="min-w-0 truncate">
            {report?.confidence_note ?? 'Forecast, not ground truth.'}
          </span>
        }
      />
    </>
  )
}
