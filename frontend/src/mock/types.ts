/**
 * Mirrors the live backend contract in `backend/app/schemas.py`. Fields marked
 * UI-only are computed client-side and have no backend counterpart — keep that
 * list short, because every entry is something the demo cannot actually prove.
 */

export interface Beat {
  idx: number
  summary: string
  episode: number
  is_hook: boolean
  is_cliffhanger: boolean
  /** Verbatim source excerpt. Real: `Beat.text_span`. */
  text_span: string
  /** UI-only: joined from `report.dropoff[].retained_pct` on `beat_idx`. */
  retained_pct: number
  /** UI-only: joined from `report.dropoff[].cause` where `cliff` is true. */
  failure_cause: string | null
}

export interface StoryRep {
  beats: Beat[]
  language: string
}

export interface Submission {
  id: string
  status: 'processing' | 'ready' | 'failed' | 'error'
  media_type: string
  story_rep: StoryRep | null
  /**
   * UI-only. There is no title column on `Submission` — byline and filename are
   * stripped at ingest by design. An editor would type this at submit time.
   */
  title: string
}

export interface PanelConfig {
  /** Backend validates 5..50. Never render a number outside that range. */
  persona_count: number
  market: string
  language: string
  genre_affinities: string[]
  habits: string[]
  /**
   * Labelled critic roles seeded into the swarm. Real and threaded end-to-end
   * into the MiroFish seed — it is what makes the panel a discourse rather than
   * a poll. Optional because only the active preset fills it today.
   */
  critic_archetypes?: string[]
}

export interface Panel {
  id: string
  name: string
  is_preset: boolean
  config: PanelConfig
  /** UI-only: lucide icon key. */
  icon: 'globe' | 'heart' | 'flask' | 'alert'
}

export type RunMode = 'full' | 'triage'

export interface DropoffPoint {
  beat_idx: number
  retained_pct: number
  cliff: boolean
  cause: string | null
  paywall_risk: boolean
  /** UI-only: joined from `story_rep.beats[].episode` on `beat_idx`. */
  episode: number
}

export interface Segment {
  group: string
  score: number
  /** Number of simulated listeners in this group. Sums to `persona_count`. */
  n: number
}

export interface Fix {
  priority: number
  text: string
  /** Backend returns a STRING, not a number. Render it verbatim. */
  est_delta: string
}

/** Per-beat swarm discourse — derived from retention + persona traces. */
export interface BeatEngagement {
  beat_idx: number
  posts: number
  comments: number
  reactions: number
  tweets: number
  agents_engaged: number
  silences: number
}

export interface BeatEngagementTotals {
  posts: number
  comments: number
  reactions: number
  tweets: number
  agents_engaged: number
  silences: number
  beats: number
}

export interface Finding {
  text: string
  /** Persona handles this finding is grounded in. Real: `pros[].persona_refs`. */
  persona_refs: string[]
}

export interface Report {
  score: number
  rationale: string
  pros: Finding[]
  cons: Finding[]
  dropoff: DropoffPoint[]
  segments: Segment[]
  fixes: Fix[]
  /** A fixed backend constant. It says the model is uncalibrated — quote it as-is. */
  confidence_note: string
  /** UI-only: pure score banding, same thresholds as the working frontend. */
  verdict: 'greenlight' | 'revise' | 'hold'
  beat_engagement: BeatEngagement[]
}

export interface PersonaEvent {
  beat_idx: number
  action: 'listening' | 're-listened' | 'skipped' | 'dropped' | 'completed'
  note: string
}

export interface Persona {
  id: string
  /** From `profile.name`, minted as `<Name>-L<nn>` by the seed generator. */
  handle: string
  group_label: string
  /** From `profile.summary`. */
  profile: string
  dropped_at_beat: number | null
  /** Real per-beat trace. Grounds every interrogation answer. */
  event_log: PersonaEvent[]
  /** UI-only: `dropped_at_beat === null ? 'finished' : 'dropped'`. */
  status: 'dropped' | 'finished'
  /** UI-only: progress through the story, 0-100. */
  progress_pct: number
  /** UI-only: taste tags shown as pills on the listener card. */
  interests: string[]
  /** Behavioral instructions — from cast seed or run profile. */
  persona_prompt?: string
}

/** Generic cast profile from `GET /api/panels/{id}/cast` — not run-scoped. */
export interface CastProfile {
  id: string
  handle: string
  group_label: string
  profile: string
  persona_prompt: string
  interests: string[]
}

export interface ChatMessage {
  id: string
  role: 'agent' | 'editor'
  content: string
}

/**
 * One record from the simulation log. Mirrors the real MiroFish/OASIS action
 * schema exactly — see `crowd-sim/reddit_actions.jsonl` in the WC2026 run:
 * `{round, agent_id, agent_name, action_type, action_args:{content}}`.
 *
 * DO_NOTHING is not filler: an agent declining to engage is the disengagement
 * signal that becomes drop-off.
 */
export type SwarmActionType =
  | 'CREATE_POST'
  | 'CREATE_COMMENT'
  | 'LIKE_POST'
  | 'LIKE_COMMENT'
  | 'DISLIKE_POST'
  | 'FOLLOW'
  | 'DO_NOTHING'

export interface SwarmAction {
  round: number
  agent_name: string
  action_type: SwarmActionType
  /** `action_args.content`. Null for reactions, which carry no text. */
  content: string | null
}
