import { useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { exportReport } from '@/api'
import { AudienceSegments } from '@/components/dashboard/AudienceSegments'
import { BeatTimeline } from '@/components/dashboard/BeatTimeline'
import { PrioritizedFixes } from '@/components/dashboard/PrioritizedFixes'
import { ProsCons } from '@/components/dashboard/ProsCons'
import { RetentionForecast } from '@/components/dashboard/RetentionForecast'
import { RunListenerGrid } from '@/components/dashboard/RunListenerGrid'
import { VerdictPanel } from '@/components/dashboard/VerdictPanel'
import { FooterStrip } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { useRun } from '@/hooks/useRun'
import { useRunPersonas } from '@/hooks/useRunPersonas'
import { useRunReport } from '@/hooks/useRunReport'
import { useSubmission } from '@/hooks/useSubmission'
import { usePanelName } from '@/hooks/usePanelName'
import { adaptBeats, runProvenance, submissionLabel } from '@/lib/adaptReport'
import { sumEngagementTotals } from '@/lib/beatEngagement'
import { cn } from '@/lib/utils'

/** Resolves the BCP-47 code on the submission rather than shipping a lookup table. */
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

/** Tabs, not a fake tab row: each one owns a real panel of content. */
const TRIGGER_CLASS =
  'px-3 text-muted-foreground hover:text-foreground data-[state=active]:text-foreground focus-visible:ring-ring group-data-[variant=line]/tabs-list:data-[state=active]:after:bg-primary'

function StoryTitle({
  runId,
  title,
  language,
  mediaType,
}: {
  runId: string
  title: string
  language?: string
  mediaType?: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to="/runs"
        aria-label="Back to runs"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-lg leading-tight font-semibold tracking-tight">{title}</h1>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {language ? `${languageNames.of(language) ?? language} · ` : null}
          {mediaType ? <span className="font-mono">{mediaType}</span> : null}
          {mediaType ? ' · ' : null}
          <span className="font-mono">{runId}</span>
        </p>
      </div>
    </div>
  )
}

function Provenance({ text, isLive }: { text: string; isLive: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span
        className={cn('size-1.5 rounded-full', isLive ? 'bg-success' : 'bg-warning')}
        aria-hidden
      />
      {text}
    </span>
  )
}

function DashboardLoading({ runId }: { runId: string }) {
  return (
    <>
      <TopBar
        title={
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-8 rounded-md" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        }
        action={
          <Button variant="outline" disabled>
            <Download aria-hidden />
            Export Report
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <Skeleton className="h-48 md:col-span-2 xl:col-span-5" />
          <Skeleton className="h-48 md:col-span-2 xl:col-span-7" />
          <Skeleton className="h-64 md:col-span-1 xl:col-span-7" />
          <Skeleton className="h-64 md:col-span-1 xl:col-span-5" />
        </div>
        <p className="text-sm text-muted-foreground">Loading run {runId}…</p>
      </main>
    </>
  )
}

function DashboardError({ message, runId }: { message: string; runId: string }) {
  return (
    <>
      <TopBar title={<StoryTitle runId={runId} title="Run dashboard" />} />
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="max-w-md rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-8 text-center">
          <p className="text-sm font-medium text-destructive">Could not load run dashboard</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
        </div>
      </main>
    </>
  )
}

export default function DashboardPage() {
  const { runId } = useParams<{ runId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const resolvedRunId = runId ?? ''
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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
  const panelName = usePanelName(run?.panel_id)

  const activeTab =
    searchParams.get('tab') === 'listeners'
      ? 'listeners'
      : searchParams.get('tab') === 'timeline'
        ? 'timeline'
        : 'verdict'

  if (!resolvedRunId) {
    return <DashboardError message="Missing run id in the URL." runId="unknown" />
  }

  const loading = runLoading || submissionLoading || (run?.status === 'done' && reportLoading)
  const error = runError ?? submissionError ?? reportError

  if (loading) {
    return <DashboardLoading runId={resolvedRunId} />
  }

  if (error) {
    return <DashboardError message={error} runId={resolvedRunId} />
  }

  if (!run || !submission) {
    return <DashboardError message="Run or submission not found." runId={resolvedRunId} />
  }

  if (run.status === 'failed') {
    return (
      <DashboardError
        message={run.error ?? 'Simulation failed before a report was produced.'}
        runId={resolvedRunId}
      />
    )
  }

  if (run.status !== 'done' || !report) {
    return (
      <>
        <TopBar
          title={
            <StoryTitle
              runId={resolvedRunId}
              title={submissionLabel(submission)}
              language={submission.story_rep?.language}
              mediaType={submission.media_type}
            />
          }
        />
        <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium text-foreground">Report not ready</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Run status is <span className="font-mono">{run.status}</span>. Open this page again
              once the simulation finishes.
            </p>
          </div>
        </main>
      </>
    )
  }

  const beats = adaptBeats(apiBeats ?? [], report.dropoff)
  const engagementTotals = sumEngagementTotals(report.beat_engagement)
  const personaCeiling =
    report.segments.reduce((sum, segment) => sum + segment.n, 0) ||
    listeners.length ||
    (run.mode === 'full' ? 18 : 0)
  const provenance = runProvenance(run)
  const title = submissionLabel(submission)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const blob = await exportReport(resolvedRunId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `storycritic-${resolvedRunId}.md`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DashboardProvider
      value={{
        run,
        submission,
        submissionTitle: title,
        report,
        beats,
        provenance,
        engagementTotals,
        personaCeiling,
      }}
    >
      <TopBar
        title={
          <StoryTitle
            runId={resolvedRunId}
            title={title}
            language={submission.story_rep?.language}
            mediaType={submission.media_type}
          />
        }
        action={
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              disabled={exporting}
              aria-label={exporting ? 'Exporting report' : 'Export report'}
              className="sm:size-auto sm:px-4"
            >
              <Download aria-hidden />
              <span className="hidden sm:inline">
                {exporting ? 'Exporting…' : 'Export Report'}
              </span>
            </Button>
            {exportError && (
              <p className="hidden max-w-xs text-right text-xs text-destructive sm:block">
                {exportError}
              </p>
            )}
          </div>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              if (value === 'verdict') next.delete('tab')
              else next.set('tab', value)
              return next
            })
          }}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 overflow-x-auto border-b px-4 pt-2 pb-[5px] sm:px-6">
            <TabsList variant="line" className="w-max min-w-full sm:w-fit">
              <TabsTrigger value="verdict" className={TRIGGER_CLASS}>
                Verdict
              </TabsTrigger>
              <TabsTrigger value="listeners" className={TRIGGER_CLASS}>
                Listeners
                <span className="ml-1.5 font-mono text-xs tabular-nums">{listeners.length}</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className={TRIGGER_CLASS}>
                Beat Timeline
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="verdict" className="min-h-0 overflow-y-auto">
            <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-12">
              <VerdictPanel className="min-w-0 md:col-span-2 xl:col-span-5" />
              <PrioritizedFixes className="min-w-0 md:col-span-2 xl:col-span-7" />
              <RetentionForecast className="min-w-0 md:col-span-1 xl:col-span-7" />
              <AudienceSegments className="min-w-0 md:col-span-1 xl:col-span-5" />
              <ProsCons className="min-w-0 md:col-span-2 xl:col-span-12" />
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
              <BeatTimeline />
            </div>
          </TabsContent>

          <TabsContent value="listeners" className="min-h-0 overflow-y-auto">
            <div className="p-4 sm:p-6">
              <RunListenerGrid
                runId={resolvedRunId}
                personas={listeners}
                panelName={panelName}
                loading={personasLoading}
                error={personasError}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <FooterStrip
        right={
          <>
            <Provenance text={provenance} isLive={run.status === 'done'} />
            <span className="text-right">{report.confidence_note}</span>
          </>
        }
      />
    </DashboardProvider>
  )
}
