/**
 * Static fixtures for the UI mock. No network, no clock, no randomness — every
 * screen renders identically on every load so the demo is reproducible.
 *
 * Numbers here are constrained to what the backend can actually produce:
 * `persona_count` stays inside the API's 5..50 validation, `segments[].n` sums
 * to the run's persona count, and every `dropped_at_beat` lands inside the
 * 8-beat story. If a number cannot be traced to a real field, it is not here.
 *
 * Hard product principle: this tool validates the CONTENT, never the CREATOR.
 * No author name, byline, or writer identity anywhere. Keep it that way.
 */

import type {
  Panel,
  Report,
  SwarmAction,
  Submission,
} from './types'

export const PRINCIPLE_LINE = 'Validates content, never the creator.'

/** Hackathon provenance — shown on the login screen and in the sidebar footer. */
export const TEAM = {
  name: 'AI Players',
  event: 'Zero to One',
  hosts: 'OpenAI × Lightspeed',
  venue: 'IIM Bangalore',
  product: 'StoryCritic',
  tagline: 'Editorial intelligence for Pocket FM',
}

export const submission: Submission = {
  id: 'sub_64650cc0a63f',
  title: 'Ep 02 — The Silent Witness',
  status: 'ready',
  media_type: 'audio/mpeg',
  story_rep: {
    language: 'en',
    beats: [
      {
        idx: 1,
        episode: 1,
        summary: 'Ira finds the journal in her late mentor’s desk. Cold-open hook.',
        text_span:
          'The first page of the diary was blank. The second page began with her own name.',
        is_hook: true,
        is_cliffhanger: false,
        retained_pct: 96,
        failure_cause: null,
      },
      {
        idx: 2,
        episode: 1,
        summary: 'First confrontation. Pacing holds for a 12-minute listening block.',
        text_span: '"You don\'t know what you\'re opening," Devansh said.',
        is_hook: false,
        is_cliffhanger: false,
        retained_pct: 91,
        failure_cause: null,
      },
      {
        idx: 3,
        episode: 2,
        summary: 'The mentor is revealed as the antagonist. Strongest reversal in the arc.',
        text_span: 'The man who had taught her to read was the one erasing her name.',
        is_hook: false,
        is_cliffhanger: true,
        retained_pct: 88,
        failure_cause: null,
      },
      {
        idx: 4,
        episode: 2,
        summary: 'Ira flees instead of confronting — contradicts her Ep 1 freeze response.',
        text_span: 'She ran. Without thinking, without stopping, without looking back.',
        is_hook: false,
        is_cliffhanger: true,
        retained_pct: 54,
        failure_cause: 'Character motivation mismatch',
      },
      {
        idx: 5,
        episode: 3,
        summary: 'Quieter regrouping beat. Listeners who survived Ep 2 settle back in.',
        text_span: 'For three days she did not pick up the phone.',
        is_hook: false,
        is_cliffhanger: false,
        retained_pct: 51,
        failure_cause: null,
      },
      {
        idx: 6,
        episode: 3,
        summary: 'The Betrayal. Speed-listeners flag the dialogue as exposition-heavy.',
        text_span:
          '"I saved you," he said, and then spent fifteen minutes explaining why.',
        is_hook: false,
        is_cliffhanger: true,
        retained_pct: 44,
        failure_cause: null,
      },
      {
        idx: 7,
        episode: 4,
        summary: 'Monetisation gate. Conversion holds above the Tier-2 romance baseline.',
        text_span: 'The door was open. Someone was waiting inside.',
        is_hook: false,
        is_cliffhanger: true,
        retained_pct: 41,
        failure_cause: null,
      },
      {
        idx: 8,
        episode: 4,
        summary: 'The journal is a forgery. Mystery cohort re-engages sharply.',
        text_span: 'The ink was four months old. The diary should have been forty years old.',
        is_hook: true,
        is_cliffhanger: false,
        retained_pct: 39,
        failure_cause: null,
      },
    ],
  },
}

export const report: Report = {
  score: 7.8,
  verdict: 'greenlight',
  rationale: 'Strong hook and a well-earned reversal. Episode 2 loses half the room.',
  confidence_note:
    'Forecast, not ground truth. Persona fidelity is uncalibrated — treat deltas as directional.',
  pros: [
    {
      text: 'Cold-open hook clears the genre benchmark. No listener dropped before beat 2.',
      persona_refs: ['Neha-L08', 'Pooja-L06'],
    },
    {
      text: 'Mentor-as-antagonist reversal reads as earned by every archetype, critics included.',
      persona_refs: ['Pacing analyst', 'Neha-L08'],
    },
    {
      text: 'Hindi–English code-switching never breaks comprehension for Tier-2 listeners.',
      persona_refs: ['Pooja-L06', 'Rohan-L11'],
    },
  ],
  cons: [
    {
      text: 'Beat 4 flight response contradicts the freeze behaviour established in beat 1.',
      persona_refs: ['Pacing analyst', 'Meena-L02'],
    },
    {
      text: 'Beat 6 betrayal dialogue is exposition-heavy for speed-listeners.',
      persona_refs: ['Neha-L08'],
    },
    {
      text: 'Genre purists reject the tonal drift — the romance subplot takes the A-slot by beat 2.',
      persona_refs: ['Meena-L02'],
    },
  ],
  dropoff: [
    { beat_idx: 1, episode: 1, retained_pct: 96, cliff: false, cause: null, paywall_risk: false },
    { beat_idx: 2, episode: 1, retained_pct: 91, cliff: false, cause: null, paywall_risk: false },
    { beat_idx: 3, episode: 2, retained_pct: 88, cliff: false, cause: null, paywall_risk: false },
    {
      beat_idx: 4,
      episode: 2,
      retained_pct: 54,
      cliff: true,
      cause: 'Character motivation mismatch',
      paywall_risk: false,
    },
    { beat_idx: 5, episode: 3, retained_pct: 51, cliff: false, cause: null, paywall_risk: false },
    { beat_idx: 6, episode: 3, retained_pct: 44, cliff: false, cause: null, paywall_risk: false },
    { beat_idx: 7, episode: 4, retained_pct: 41, cliff: false, cause: null, paywall_risk: true },
    { beat_idx: 8, episode: 4, retained_pct: 39, cliff: false, cause: null, paywall_risk: false },
  ],
  /*
    Segments are ARCHETYPES, not genres — the swarm is cast as fans, casual
    listeners, purists and critics, and the interesting result is them
    disagreeing. n sums to 18, the persona_count of the panel this run used,
    and the weighted mean lands on the headline score.
  */
  segments: [
    { group: 'Fans', score: 8.8, n: 7 },
    { group: 'Casual listeners', score: 7.9, n: 6 },
    { group: 'Critics', score: 6.6, n: 2 },
    { group: 'Genre purists', score: 5.8, n: 3 },
  ],
  fixes: [
    {
      priority: 1,
      text: 'Reseat the beat 4 flight: give Ira one line reconciling fleeing with her beat 1 freeze.',
      est_delta: '+1.0 to +1.5 overall, concentrated among purists and critics',
    },
    {
      priority: 2,
      text: 'Cut the beat 6 monologue to two exchanges; move the backstory into narration.',
      est_delta: '+0.4 to +0.8 with speed-listeners',
    },
    {
      priority: 3,
      text: 'Move the paywall gate one beat later, after the forgery reveal lands.',
      est_delta: 'Conversion only, no score change',
    },
  ],
  beat_engagement: [
    { beat_idx: 1, posts: 14, comments: 18, reactions: 36, tweets: 6, agents_engaged: 16, silences: 2 },
    { beat_idx: 2, posts: 12, comments: 15, reactions: 31, tweets: 5, agents_engaged: 15, silences: 3 },
    { beat_idx: 3, posts: 11, comments: 14, reactions: 28, tweets: 5, agents_engaged: 14, silences: 4 },
    { beat_idx: 4, posts: 22, comments: 31, reactions: 58, tweets: 8, agents_engaged: 10, silences: 8 },
    { beat_idx: 5, posts: 9, comments: 12, reactions: 24, tweets: 4, agents_engaged: 9, silences: 9 },
    { beat_idx: 6, posts: 8, comments: 11, reactions: 21, tweets: 3, agents_engaged: 8, silences: 10 },
    { beat_idx: 7, posts: 7, comments: 10, reactions: 19, tweets: 3, agents_engaged: 7, silences: 11 },
    { beat_idx: 8, posts: 7, comments: 9, reactions: 18, tweets: 3, agents_engaged: 7, silences: 11 },
  ],
}

export const panels: Panel[] = [
  {
    id: 'panel_tier2_romance',
    name: 'Tier-2 Hindi Romance',
    is_preset: true,
    icon: 'heart',
    config: {
      persona_count: 16,
      market: 'India Tier-2',
      language: 'hi',
      genre_affinities: ['Emotional beats', 'Slow burn'],
      habits: ['Binge listener', 'Commute sessions'],
      critic_archetypes: ['Story editor', 'Pacing analyst'],
    },
  },
  {
    id: 'panel_us_thriller',
    name: 'US Thriller Enthusiasts',
    is_preset: true,
    icon: 'globe',
    config: {
      persona_count: 20,
      market: 'North America',
      language: 'en',
      genre_affinities: ['High stakes', 'Mystery'],
      habits: ['Pacing priority'],
    },
  },
  {
    id: 'panel_uk_true_crime',
    name: 'UK True Crime',
    is_preset: true,
    icon: 'alert',
    config: {
      persona_count: 15,
      market: 'United Kingdom',
      language: 'en',
      genre_affinities: ['Realism'],
      habits: ['Weekly episodic'],
    },
  },
  {
    id: 'panel_hard_scifi',
    name: 'Global Hard Sci-Fi',
    is_preset: true,
    icon: 'flask',
    config: {
      persona_count: 12,
      market: 'Global',
      language: 'en',
      genre_affinities: ['World building'],
      habits: ['Long-form sessions'],
    },
  },
]

/** The run on screen was cast from this panel. The editor never picks it. */
export const activePanel = panels[0]

/**
 * How the swarm was cast. Counts mirror `report.segments[].n`, so the audience
 * shown before the run and the scores shown after it describe the same 18
 * agents. This is the read-only composition that replaced the panel picker.
 */
export const archetypeMix = [
  { archetype: 'Fans', n: 7, blurb: 'Follow the show. Forgive pacing, punish broken characters.' },
  { archetype: 'Casual listeners', n: 6, blurb: 'Listen at 1.5x on a commute. Drop on exposition.' },
  { archetype: 'Genre purists', n: 3, blurb: 'Came for the genre. Punish tonal drift.' },
  { archetype: 'Critics', n: 2, blurb: 'Check plausibility. Exit when motivation is unearned.' },
]

/**
 * Provenance for the verdict on screen. `full` runs an OASIS swarm across
 * rounds; `triage` is a single model call that runs live but produces no
 * personas.
 *
 * The swarm wedges on macOS (asyncio kevent, ~64K of subprocess output), so
 * locally a demo has to show a pre-computed run. On Railway the container is
 * Linux and that failure mode should not apply — once a full run is confirmed
 * live there, flip `is_live` to true and the provenance line follows.
 */
export const run = {
  id: 'run_63bc0518',
  mode: 'full' as const,
  is_live: false,
  rounds: 6,
  get provenance() {
    return this.is_live
      ? `Live full swarm — ${this.rounds} rounds.`
      : `Pre-computed full swarm run — ${this.rounds} rounds.`
  },
}

/**
 * The run ledger. NOTE: there is no `GET /api/runs` in the backend yet — the
 * only run routes are by id. Exposing this needs one query joining `Run` to
 * `Report.score`, plus `started_at` added to `RunOut` (the column already
 * exists on the model, it just is not serialised).
 *
 * `cost_tokens` is real and already on `RunOut`.
 */
export const runs = [
  {
    id: 'run_63bc0518',
    title: 'Ep 02 — The Silent Witness',
    language: 'hi',
    mode: 'full' as const,
    status: 'done' as const,
    score: 7.8,
    persona_count: 18,
    cost_tokens: 214_000,
    started_at: '2026-07-26T02:14:00Z',
  },
  {
    id: 'run_10bbe0cd',
    title: 'Ep 01 — The Silent Witness',
    language: 'hi',
    mode: 'triage' as const,
    status: 'done' as const,
    score: 8.7,
    persona_count: 18,
    cost_tokens: 9_400,
    started_at: '2026-07-25T19:40:00Z',
  },
  {
    id: 'run_44d9e7a2',
    title: 'Monsoon Frequency — pilot',
    language: 'hi',
    mode: 'full' as const,
    status: 'done' as const,
    score: 6.2,
    persona_count: 15,
    cost_tokens: 188_000,
    started_at: '2026-07-25T14:05:00Z',
  },
  {
    id: 'run_7ce1d0f5',
    title: 'Half-Light Hotel — Ep 03',
    language: 'en',
    mode: 'full' as const,
    status: 'running' as const,
    score: null,
    persona_count: 20,
    cost_tokens: 61_200,
    started_at: '2026-07-26T03:02:00Z',
  },
  {
    id: 'run_02fa5b93',
    title: 'The Lagrange Debt — Ep 01',
    language: 'en',
    mode: 'triage' as const,
    status: 'failed' as const,
    score: null,
    persona_count: 12,
    cost_tokens: 1_800,
    started_at: '2026-07-24T22:31:00Z',
  },
]

/** Canned follow-ups. Clicking beats typing on a projector under pressure. */
export const chatSuggestions = [
  'Why did you stop listening?',
  'What would have kept you?',
  'Which beat was strongest?',
]

/**
 * Simulation log records, in the real MiroFish/OASIS action schema.
 * Shape and action vocabulary taken from an actual run
 * (`wc2026-prediction-engine/crowd-sim/reddit_actions.jsonl`): agents post,
 * comment, react and follow across rounds, and DO_NOTHING is a real choice —
 * an agent staying silent is the disengagement that becomes drop-off.
 */
export const swarmActions: SwarmAction[] = [
  { round: 1, agent_name: 'Pooja-L06', action_type: 'CREATE_POST', content: 'That first page — I listened twice. Best cold open in weeks.' },
  { round: 1, agent_name: 'Neha-L08', action_type: 'LIKE_POST', content: null },
  { round: 1, agent_name: 'Rohan-L11', action_type: 'CREATE_COMMENT', content: 'Same. The journal reveal earns the whole episode.' },
  { round: 2, agent_name: 'Meena-L02', action_type: 'CREATE_POST', content: 'This stopped being a thriller by beat 2. The romance took the A-plot.' },
  { round: 2, agent_name: 'Pacing analyst', action_type: 'CREATE_COMMENT', content: 'Disagree on genre, agree on the pacing. Beat 2 runs long.' },
  { round: 2, agent_name: 'Meena-L02', action_type: 'DO_NOTHING', content: null },
  { round: 3, agent_name: 'Pooja-L06', action_type: 'CREATE_POST', content: 'The mentor turn. I rewound it — it holds up twice.' },
  { round: 3, agent_name: 'Neha-L08', action_type: 'LIKE_POST', content: null },
  { round: 3, agent_name: 'Pacing analyst', action_type: 'FOLLOW', content: null },
  { round: 4, agent_name: 'Pacing analyst', action_type: 'CREATE_POST', content: 'Beat 4 breaks her. She freezes in beat 1, then flees here. Nothing earns it.' },
  { round: 4, agent_name: 'Sanjay-L05', action_type: 'CREATE_COMMENT', content: 'That is exactly where I stopped. Felt like the plot needed her out of the room.' },
  { round: 4, agent_name: 'Meena-L02', action_type: 'LIKE_COMMENT', content: null },
  { round: 4, agent_name: 'Rohan-L11', action_type: 'DISLIKE_POST', content: null },
  { round: 5, agent_name: 'Neha-L08', action_type: 'CREATE_COMMENT', content: 'Beat 6 is a lecture. He explains his motive for a full minute.' },
  { round: 5, agent_name: 'Neha-L08', action_type: 'DO_NOTHING', content: null },
  { round: 5, agent_name: 'Pooja-L06', action_type: 'CREATE_COMMENT', content: 'I stayed. I wanted the answer more than I minded the speech.' },
  { round: 6, agent_name: 'Rohan-L11', action_type: 'CREATE_POST', content: 'Paid at the gate without thinking. Beat 6 had just resolved.' },
  { round: 6, agent_name: 'Pooja-L06', action_type: 'LIKE_POST', content: null },
]

export const SWARM_ROUNDS = 6

export const simulationStats = {
  persona_count:
    activePanel.config.persona_count + (activePanel.config.critic_archetypes?.length ?? 0),
  beat_count: submission.story_rep?.beats.length ?? 0,
}
