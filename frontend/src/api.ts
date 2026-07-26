/** API client — personas and chat load from the backend, not fixtures. */

const BASE = '/api'
const TOKEN_KEY = 'storycritic_jwt'

export function getToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export class UnauthorizedError extends Error {
  constructor() {
    super('authentication required')
    this.name = 'UnauthorizedError'
  }
}

export class AuthDisabledError extends Error {
  constructor() {
    super('auth disabled')
    this.name = 'AuthDisabledError'
  }
}

function withAuth(init?: RequestInit): RequestInit {
  const token = getToken()
  if (!token) return init ?? {}
  return {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  }
}

async function rawRequest(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, withAuth(init))
  if (res.status === 401) {
    clearToken()
    throw new UnauthorizedError()
  }
  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    throw new Error(
      `API ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ''}`,
    )
  }
  return res
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await rawRequest(path, init)
  return res.json() as Promise<T>
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/** Matches backend `PersonaOut`. */
export interface ApiPersona {
  id: string
  group_label: string
  profile: {
    name?: string
    agent_id?: number | null
    summary?: string
    persona_prompt?: string
  }
  dropped_at_beat: number | null
  event_log: Array<{
    beat_idx: number
    action: string
    note: string
  }>
}

export interface ApiChatMessage {
  role: string
  content: string
  persona_id: string | null
  created_at: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/login`, jsonInit('POST', { username, password }))
  if (res.status === 503) throw new AuthDisabledError()
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${res.statusText}`)
  const data = (await res.json()) as LoginResponse
  setToken(data.access_token)
}

export function getPersonas(runId: string): Promise<ApiPersona[]> {
  return request<ApiPersona[]>(`/runs/${runId}/personas`)
}

export interface ApiPanel {
  id: string
  name: string
  is_preset: boolean
  config: {
    persona_count: number
    market: string
    language: string
    genre_affinities: string[]
    habits: string[]
    critic_archetypes?: string[]
  }
}

export interface ApiCastProfile {
  id: string
  handle: string
  group_label: string
  profile: string
  persona_prompt: string
  interests: string[]
}

export function getPanels(): Promise<ApiPanel[]> {
  return request<ApiPanel[]>('/panels')
}

export function getPanelCast(panelId: string): Promise<ApiCastProfile[]> {
  return request<ApiCastProfile[]>(`/panels/${panelId}/cast`)
}

export function getChatHistory(runId: string): Promise<ApiChatMessage[]> {
  return request<ApiChatMessage[]>(`/runs/${runId}/chat`)
}

export function sendChat(
  runId: string,
  message: string,
  personaId: string | null,
): Promise<ApiChatMessage> {
  return request<ApiChatMessage>(
    `/runs/${runId}/chat`,
    jsonInit('POST', { message, persona_id: personaId }),
  )
}

// ---- ingest ----

/** Matches backend `Beat`. */
export interface ApiBeat {
  idx: number
  text_span: string
  summary: string
  episode: number
  is_hook: boolean
  is_cliffhanger: boolean
}

/** Matches backend `StoryRep`. */
export interface ApiStoryRep {
  beats: ApiBeat[]
  characters: string[]
  language: string
}

/** Matches backend `SubmissionOut`. */
export interface ApiSubmission {
  id: string
  content_hash: string
  media_type: 'text' | 'audio' | 'video'
  status: string
  story_rep: ApiStoryRep | null
  error: string | null
}

export type ApiRunMode = 'full' | 'triage'

/** Matches backend `RunOut`. */
export interface ApiRun {
  id: string
  submission_id: string
  panel_id: string
  mode: ApiRunMode
  backtest: boolean
  status: string
  cost_tokens: number
  error: string | null
  started_at: string | null
  finished_at: string | null
}

/** Matches backend `RunSummaryOut`. */
export interface ApiRunSummary {
  id: string
  submission_id: string
  panel_id: string
  mode: ApiRunMode
  status: string
  cost_tokens: number
  error: string | null
  started_at: string | null
  finished_at: string | null
  score: number | null
  persona_count: number
  language: string
  beat_count: number
  story_label: string
  panel_name: string
}

/** Matches backend `ReportOut`. */
export interface ApiReportFinding {
  text: string
  persona_refs: string[]
}

export interface ApiDropoffPoint {
  beat_idx: number
  retained_pct: number
  cliff: boolean
  cause: string | null
  paywall_risk: boolean
}

export interface ApiSegmentScore {
  group: string
  score: number
  n: number
}

export interface ApiFix {
  priority: number
  text: string
  est_delta: string
}

export interface ApiBeatEngagement {
  beat_idx: number
  posts: number
  comments: number
  reactions: number
  tweets: number
  agents_engaged: number
  silences: number
}

export interface ApiReport {
  run_id: string
  score: number
  rationale: string
  pros: ApiReportFinding[]
  cons: ApiReportFinding[]
  dropoff: ApiDropoffPoint[]
  segments: ApiSegmentScore[]
  fixes: ApiFix[]
  confidence_note: string
  beat_engagement?: ApiBeatEngagement[]
}

export function ingestText(text: string): Promise<ApiSubmission> {
  return request<ApiSubmission>('/ingest/text', jsonInit('POST', { text }))
}

export function ingestFile(file: File): Promise<ApiSubmission> {
  const form = new FormData()
  form.append('file', file)
  return request<ApiSubmission>('/ingest/file', { method: 'POST', body: form })
}

export function getSubmission(id: string): Promise<ApiSubmission> {
  return request<ApiSubmission>(`/ingest/${id}`)
}

export function createRun(
  submissionId: string,
  panelId: string,
  mode: ApiRunMode,
  backtest = false,
): Promise<ApiRun> {
  return request<ApiRun>(
    '/runs',
    jsonInit('POST', {
      submission_id: submissionId,
      panel_id: panelId,
      mode,
      backtest,
    }),
  )
}

export function getRuns(): Promise<ApiRunSummary[]> {
  return request<ApiRunSummary[]>('/runs')
}

export function getRun(id: string): Promise<ApiRun> {
  return request<ApiRun>(`/runs/${id}`)
}

export function getReport(runId: string): Promise<ApiReport> {
  return request<ApiReport>(`/runs/${runId}/report`)
}

/** Writer-facing markdown feedback packet as a blob download. */
export async function exportReport(runId: string): Promise<Blob> {
  const res = await rawRequest(`/runs/${runId}/report/export`)
  return res.blob()
}
