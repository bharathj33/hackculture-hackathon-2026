import { useEffect, useRef, useState } from 'react'
import { Panel } from '@/components/common/Panel'
import { Badge } from '@/components/ui/badge'
import type { ApiBeat } from '@/api'
import { getChatHistory, sendChat } from '@/api'
import type { ChatMessage, Persona } from '@/mock/types'
import { ChatThread } from './ChatThread'
import { Composer } from './Composer'
import { EventLog } from './EventLog'
import { InterrogationHeader } from './InterrogationHeader'

interface InterrogationPaneProps {
  runId: string
  persona: Persona
  beats: ApiBeat[]
  beatCount: number
}

function toUiMessage(
  entry: { role: string; content: string; created_at: string },
  id: string,
): ChatMessage {
  return {
    id,
    role: entry.role === 'editor' ? 'editor' : 'agent',
    content: entry.content,
  }
}

export function InterrogationPane({ runId, persona, beats, beatCount }: InterrogationPaneProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const seq = useRef(0)

  useEffect(() => {
    let cancelled = false
    setLoadingHistory(true)

    getChatHistory(runId)
      .then((history) => {
        if (cancelled) return
        const thread = history
          .filter((entry) => entry.persona_id === persona.id)
          .map((entry, index) => toUiMessage(entry, `${persona.id}-hist-${index}`))
        setMessages(thread)
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false)
      })

    return () => {
      cancelled = true
    }
  }, [runId, persona.id])

  async function handleSubmit() {
    const question = draft.trim()
    if (!question || pending) return

    seq.current += 1
    const turn = seq.current
    const editorId = `${persona.id}-editor-${turn}`

    setMessages((prev) => [...prev, { id: editorId, role: 'editor', content: question }])
    setDraft('')
    setPending(true)

    try {
      const reply = await sendChat(runId, question, persona.id)
      setMessages((prev) => [
        ...prev,
        toUiMessage(reply, `${persona.id}-agent-${turn}`),
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${persona.id}-error-${turn}`,
          role: 'agent',
          content: 'Could not reach the interrogation service. Check that the backend is running.',
        },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      heading="Interrogation"
      flush
      className="min-w-0"
      aside={<Badge variant="muted">Simulated listener</Badge>}
    >
      <InterrogationHeader persona={persona} beats={beats} beatCount={beatCount} />
      <EventLog events={persona.event_log} />
      {loadingHistory ? (
        <p className="border-t px-4 py-6 text-sm text-muted-foreground">Loading chat history…</p>
      ) : (
        <ChatThread messages={messages} handle={persona.handle} pending={pending} />
      )}
      <Composer
        handle={persona.handle}
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        pending={pending}
      />
    </Panel>
  )
}
