import { useEffect, useState } from 'react'

import { swarmActions } from '@/mock/data'
import type { RunMode, SwarmAction, SwarmActionType } from '@/mock/types'

/** One heartbeat drives the clock and the reveal so they stay in lockstep. */
const TICK_MS = 800

/** Records already on screen at t=0, so the feed never opens empty. */
const SEEDED_ACTIONS = 2

/** Rows kept in the feed viewport. Older records scroll out of reach. */
const VISIBLE_ACTIONS = 8

/** Ticks the full run idles after the last record before it settles. */
const SETTLE_TICKS = 3

/** Triage is one model pass: nothing to reveal, so it only has a duration. */
const TRIAGE_TICKS = 12

export interface RevealedAction {
  /**
   * Monotonic emission index — the nth record this screen has revealed. Used as
   * the React key so a row's identity never depends on a fixture id.
   */
  seq: number
  action: SwarmAction
}

export interface SwarmCounts {
  /** Highest round reached by the records revealed so far. */
  round: number
  posts: number
  comments: number
  /** LIKE_POST + LIKE_COMMENT + DISLIKE_POST. */
  reactions: number
  /** Distinct agents that did anything other than DO_NOTHING. */
  agentsEngaged: number
  /**
   * DO_NOTHING is not filler. An agent declining to engage is the
   * disengagement signal that later becomes drop-off, so it is counted.
   */
  silences: number
}

export interface SimulationClock {
  status: 'running' | 'done'
  /** Seconds this screen has been open. Never a claim about the run itself. */
  elapsedSeconds: number
  counts: SwarmCounts
  visible: RevealedAction[]
}

const REACTIONS: ReadonlySet<SwarmActionType> = new Set<SwarmActionType>([
  'LIKE_POST',
  'LIKE_COMMENT',
  'DISLIKE_POST',
])

const EMPTY_COUNTS: SwarmCounts = {
  round: 0,
  posts: 0,
  comments: 0,
  reactions: 0,
  agentsEngaged: 0,
  silences: 0,
}

/** Pure fold over the records revealed so far. No state, no accumulation. */
function deriveCounts(revealed: readonly SwarmAction[]): SwarmCounts {
  const engaged = new Set<string>()
  let counts = { ...EMPTY_COUNTS }

  for (const action of revealed) {
    counts.round = Math.max(counts.round, action.round)
    if (action.action_type === 'CREATE_POST') counts.posts += 1
    else if (action.action_type === 'CREATE_COMMENT') counts.comments += 1
    else if (REACTIONS.has(action.action_type)) counts.reactions += 1

    if (action.action_type === 'DO_NOTHING') counts.silences += 1
    else engaged.add(action.agent_name)
  }

  counts = { ...counts, agentsEngaged: engaged.size }
  return counts
}

/**
 * Scripted playback of a recorded action log. There is no progress endpoint
 * behind this screen — the backend writes `status` at the start of a run and at
 * the end, nothing in between — so the clock models exactly one transition
 * (running → done) and the UI it feeds says so in words.
 */
export function useSimulationClock(mode: RunMode): SimulationClock {
  const maxTicks =
    mode === 'triage' ? TRIAGE_TICKS : swarmActions.length - SEEDED_ACTIONS + SETTLE_TICKS

  const [tick, setTick] = useState(0)
  const done = tick >= maxTicks

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setTick((t) => Math.min(maxTicks, t + 1)), TICK_MS)
    return () => clearInterval(id)
  }, [done, maxTicks])

  /*
    Everything below is a pure function of `tick`. Nothing accumulates in state
    and nothing is appended from inside the interval, so a double-invoked effect
    (StrictMode) can only recreate the timer — never double the clock or
    duplicate a record. When `done` flips, the effect re-runs, tears the interval
    down and starts no replacement, so it stops firing for good.
  */
  const revealedCount =
    mode === 'triage' ? 0 : Math.min(swarmActions.length, tick + SEEDED_ACTIONS)
  const revealed = swarmActions.slice(0, revealedCount)
  const firstVisible = Math.max(0, revealedCount - VISIBLE_ACTIONS)

  return {
    status: done ? 'done' : 'running',
    elapsedSeconds: Math.round((tick * TICK_MS) / 1000),
    counts: mode === 'triage' ? EMPTY_COUNTS : deriveCounts(revealed),
    visible: revealed.slice(firstVisible).map((action, i) => ({ seq: firstVisible + i, action })),
  }
}
