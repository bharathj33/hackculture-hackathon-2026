import {
  CircleSlash,
  CornerDownRight,
  MessageSquareText,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Panel } from '@/components/common/Panel'
import type { RevealedAction } from '@/components/simulating/useSimulationClock'
import { cn } from '@/lib/utils'
import type { SwarmActionType } from '@/mock/types'

/** The log's verbs, read out loud. Reactions carry no text, so they say it all. */
const VERB: Record<SwarmActionType, string> = {
  CREATE_POST: 'posted',
  CREATE_COMMENT: 'replied',
  LIKE_POST: 'liked a post',
  LIKE_COMMENT: 'liked a reply',
  DISLIKE_POST: 'disliked a post',
  FOLLOW: 'followed the thread',
  DO_NOTHING: 'stayed silent',
}

const ICON: Record<SwarmActionType, LucideIcon> = {
  CREATE_POST: MessageSquareText,
  CREATE_COMMENT: CornerDownRight,
  LIKE_POST: ThumbsUp,
  LIKE_COMMENT: ThumbsUp,
  DISLIKE_POST: ThumbsDown,
  FOLLOW: UserPlus,
  DO_NOTHING: CircleSlash,
}

export function DiscourseFeed({ visible }: { visible: RevealedAction[] }) {
  return (
    <Panel
      heading="Discourse"
      flush
      aside={<span className="label-caps text-muted-foreground">Illustrative</span>}
    >
      {/*
        Deliberately no aria-live. A new record every 800ms would mean a screen
        reader never stops talking and the user can never leave the region; the
        badge above carries the one announcement worth making.
        `flex-col-reverse` rather than `justify-end`: it pins a short list to the
        bottom AND parks the scroll at the newest record, without the flex bug
        that puts overflow out of scroll reach. DOM order stays chronological.
      */}
      <div
        tabIndex={0}
        aria-label="Discourse feed, illustrative"
        className="flex h-72 flex-col-reverse overflow-y-auto focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none"
      >
        {visible.length === 0 ? (
          <div className="m-auto max-w-[38ch] px-6 text-center">
            <p className="text-sm text-foreground">No records yet.</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              The first round lands once the swarm has read the opening beats.
            </p>
          </div>
        ) : (
          <ol className="w-full divide-y">
            {visible.map(({ seq, action }) => {
              const Icon = ICON[action.action_type]
              const silent = action.action_type === 'DO_NOTHING'

              return (
                <li
                  key={seq}
                  className="sc-line-in grid grid-cols-[2.25rem_1fr] items-start gap-x-3 px-4 py-3"
                >
                  <span className="label-caps mt-0.5 text-muted-foreground tabular-nums">
                    R{action.round}
                  </span>

                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-mono font-medium text-foreground">
                        {action.agent_name}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          silent ? 'text-warning' : 'text-muted-foreground',
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                        {VERB[action.action_type]}
                      </span>
                    </p>

                    {action.content ? (
                      <p className="mt-1.5 text-sm leading-relaxed break-words text-foreground">
                        {action.content}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Records use the live action schema — <span className="font-mono">CREATE_POST</span>,{' '}
        <span className="font-mono">CREATE_COMMENT</span>, reactions,{' '}
        <span className="font-mono">FOLLOW</span>, <span className="font-mono">DO_NOTHING</span> — but
        a run streams nothing while it works. It reports only its{' '}
        <span className="font-mono">status</span>, so this feed is a replay at an illustrative pace.
      </p>
    </Panel>
  )
}
