import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createRun,
  getSubmission,
  ingestFile,
  ingestText,
  type ApiRunMode,
  type ApiSubmission,
  UnauthorizedError,
} from '@/api'
import { FooterStrip } from '@/components/layout/AppShell'
import { TopBar } from '@/components/layout/TopBar'
import { Panel } from '@/components/common/Panel'
import { AudienceComposition } from '@/components/newrun/AudienceComposition'
import { RunSummary } from '@/components/newrun/RunSummary'
import { StoryInput, type StoryDraft } from '@/components/newrun/StoryInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useActivePanelId } from '@/hooks/useActivePanelId'
import { archetypeMix } from '@/mock/data'

const totalAgents = archetypeMix.reduce((sum, a) => sum + a.n, 0)
const POLL_MS = 2000

export default function NewRunPage() {
  const navigate = useNavigate()
  const { panelId, panelName, loading: panelLoading, error: panelError } = useActivePanelId()

  const [draft, setDraft] = useState<StoryDraft>({ text: '', file: null })
  const [submission, setSubmission] = useState<ApiSubmission | null>(null)
  const [busy, setBusy] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)

  const pollRef = useRef<number | null>(null)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      if (pollRef.current !== null) window.clearTimeout(pollRef.current)
    }
  }, [])

  const pollSubmission = useCallback((id: string): Promise<ApiSubmission> => {
    return new Promise((resolve, reject) => {
      const tick = async () => {
        try {
          const sub = await getSubmission(id)
          if (unmountedRef.current) return
          if (sub.status === 'ready') {
            setSubmission(sub)
            resolve(sub)
            return
          }
          if (sub.status === 'failed' || sub.status === 'error') {
            const message = sub.error ?? 'Story processing failed on the server.'
            setIngestError(message)
            reject(new Error(message))
            return
          }
          setSubmission(sub)
          pollRef.current = window.setTimeout(tick, POLL_MS)
        } catch (err) {
          if (unmountedRef.current) return
          reject(err)
        }
      }
      void tick()
    })
  }, [])

  const ensureSubmission = useCallback(async (): Promise<ApiSubmission> => {
    if (submission?.status === 'ready') return submission

    const hasText = draft.text.trim().length > 0
    const hasFile = draft.file !== null
    if (!hasText && !hasFile) {
      throw new Error('Paste a transcript or choose a file first.')
    }

    setIngestError(null)
    const initial = hasFile ? await ingestFile(draft.file!) : await ingestText(draft.text.trim())
    setSubmission(initial)

    if (initial.status === 'ready') return initial
    return pollSubmission(initial.id)
  }, [draft, pollSubmission, submission])

  const handleRun = useCallback(
    async (mode: ApiRunMode) => {
      if (!panelId) {
        toast.error(panelError ?? 'Panel is still loading.')
        return
      }

      setBusy(true)
      setIngestError(null)

      try {
        const ready = await ensureSubmission()
        const created = await createRun(ready.id, panelId, mode)
        const modeParam = mode === 'triage' ? 'triage' : 'full'
        navigate(`/simulating?runId=${created.id}&mode=${modeParam}`)
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          toast.error('Sign in to start a run.')
        } else {
          const message = err instanceof Error ? err.message : 'Failed to start run'
          setIngestError(message)
          toast.error(message)
        }
      } finally {
        setBusy(false)
      }
    },
    [ensureSubmission, navigate, panelError, panelId],
  )

  const beatCount = submission?.story_rep?.beats.length ?? 0
  const language = submission?.story_rep?.language?.toUpperCase()
  const canRun = Boolean(panelId) && (draft.text.trim().length > 0 || draft.file !== null)
  const inputDisabled = busy || panelLoading

  return (
    <>
      <TopBar
        title={
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">New Analysis</h1>
            <p className="truncate text-xs text-muted-foreground">
              Submit a story. The audience is cast for you.
            </p>
          </div>
        }
      />

      {(panelError || ingestError) && (
        <div className="px-4 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{ingestError ?? panelError}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
        <Panel heading="Step 01 — Submit Story">
          <StoryInput value={draft} onChange={setDraft} disabled={inputDisabled} />
        </Panel>

        <Panel
          heading="Step 02 — The Audience"
          aside={
            <span className="text-xs text-muted-foreground">
              {totalAgents} agents · {archetypeMix.length} roles · {panelName}
            </span>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <AudienceComposition />
            <RunSummary
              beatCount={beatCount}
              busy={busy || panelLoading}
              canRun={canRun}
              onRun={handleRun}
            />
          </div>
        </Panel>
      </div>

      <FooterStrip
        right={
          <span className="font-mono">
            {language ? `${language} · ` : ''}
            {beatCount > 0 ? `${beatCount} beats` : 'No story ingested'}
          </span>
        }
      />
    </>
  )
}
