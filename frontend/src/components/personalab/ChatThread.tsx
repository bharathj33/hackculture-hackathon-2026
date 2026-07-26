import { useEffect, useRef } from 'react'
import { MessagesSquare } from 'lucide-react'
import type { ChatMessage } from '@/mock/types'

function AgentBubble({ handle, content }: { handle: string; content: string }) {
  return (
    <li className="flex flex-col items-start gap-1.5">
      <span className="label-caps text-muted-foreground">{handle}</span>
      <p className="max-w-[92%] rounded-lg rounded-tl-sm border bg-muted px-3 py-2.5 text-sm leading-relaxed break-words text-foreground sm:px-4 sm:py-3">
        {content}
      </p>
    </li>
  )
}

function EditorBubble({ content }: { content: string }) {
  return (
    <li className="flex flex-col items-end gap-1.5">
      <span className="label-caps text-muted-foreground">You</span>
      <p className="max-w-[92%] rounded-lg rounded-tr-sm bg-primary px-3 py-2.5 text-sm leading-relaxed break-words text-primary-foreground sm:px-4 sm:py-3">
        {content}
      </p>
    </li>
  )
}

function TypingBubble({ handle }: { handle: string }) {
  return (
    <li className="flex flex-col items-start gap-1.5">
      <span className="label-caps text-muted-foreground">{handle}</span>
      <span aria-hidden className="flex gap-1.5 rounded-lg border bg-muted px-4 py-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
    </li>
  )
}

function EmptyThread({ handle }: { handle: string }) {
  return (
    <li className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <MessagesSquare className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <p className="max-w-[45ch] text-sm text-muted-foreground">
        Nothing recorded from {handle} yet. Ask why they stopped and the answer is drawn from
        their event log.
      </p>
    </li>
  )
}

interface ChatThreadProps {
  messages: ChatMessage[]
  handle: string
  pending: boolean
}

export function ChatThread({ messages, handle, pending }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, pending])

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
      <ol className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4 sm:gap-5">
        {messages.length === 0 && !pending && <EmptyThread handle={handle} />}

        {messages.map((message) =>
          message.role === 'agent' ? (
            <AgentBubble key={message.id} handle={handle} content={message.content} />
          ) : (
            <EditorBubble key={message.id} content={message.content} />
          ),
        )}

        {pending && <TypingBubble handle={handle} />}
      </ol>
    </div>
  )
}
