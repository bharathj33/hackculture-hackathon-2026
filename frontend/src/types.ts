export interface Beat {
  idx: number;
  summary: string;
  episode: number;
  is_hook: boolean;
  is_cliffhanger: boolean;
}

export interface StoryRep {
  beats: Beat[];
  characters: unknown;
  language: string;
}

export interface Submission {
  id: string;
  status: 'processing' | 'ready' | 'failed' | 'error';
  story_rep: StoryRep | null;
}

export interface PanelConfig {
  persona_count: number;
  market: string;
  language: string;
  genre_affinities: unknown; // string[] or {genre: weight}
  habits: unknown;
}

export interface Panel {
  id: string;
  name: string;
  is_preset: boolean;
  config: PanelConfig;
}

export type RunMode = 'full' | 'triage';

export interface Run {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
}

export interface DropoffPoint {
  beat_idx: number;
  retained_pct: number;
  cliff: boolean;
  cause: string | null;
  paywall_risk: boolean;
}

export interface Segment {
  group: string;
  score: number;
  n: number;
}

export interface Fix {
  priority: number | string;
  text: string;
  est_delta: number | string | null;
}

export interface Report {
  score: number;
  rationale: string;
  pros: { text: string }[];
  cons: { text: string }[];
  dropoff: DropoffPoint[];
  segments: Segment[];
  fixes: Fix[];
  confidence_note: string;
}

export interface Persona {
  id: string;
  group_label: string;
  profile: string;
  dropped_at_beat: number | null;
}

export interface ChatMessage {
  role: string;
  content: string;
}
