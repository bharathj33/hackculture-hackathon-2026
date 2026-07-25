import type {
  ChatMessage,
  Panel,
  Persona,
  Report,
  Run,
  RunMode,
  Submission,
} from './types';

const BASE = '/api';

// Public-hosting auth: JWT from /api/auth/login, stored per-session.
const TOKEN_KEY = 'storycritic_jwt';

export function getToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) ?? '';
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class UnauthorizedError extends Error {
  constructor() {
    super('authentication required');
    this.name = 'UnauthorizedError';
  }
}

function withAuth(init?: RequestInit): RequestInit {
  const token = getToken();
  if (!token) return init ?? {};
  return {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
  };
}

/** Shared fetch + auth/error handling; returns the raw Response on success. */
async function rawRequest(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, withAuth(init));
  if (res.status === 401) {
    clearToken();
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`API ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ''}`);
  }
  return res;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await rawRequest(path, init);
  return res.json() as Promise<T>;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function ingestText(text: string): Promise<Submission> {
  return request<Submission>('/ingest/text', jsonInit('POST', { text }));
}

export function ingestFile(file: File): Promise<Submission> {
  const form = new FormData();
  form.append('file', file);
  return request<Submission>('/ingest/file', { method: 'POST', body: form });
}

export function getSubmission(id: string): Promise<Submission> {
  return request<Submission>(`/ingest/${id}`);
}

export function getPanels(): Promise<Panel[]> {
  return request<Panel[]>('/panels');
}

export function createRun(
  submissionId: string,
  panelId: string,
  mode: RunMode,
  backtest: boolean,
): Promise<Run> {
  return request<Run>(
    '/runs',
    jsonInit('POST', {
      submission_id: submissionId,
      panel_id: panelId,
      mode,
      backtest,
    }),
  );
}

export function getRun(id: string): Promise<Run> {
  return request<Run>(`/runs/${id}`);
}

export function getReport(runId: string): Promise<Report> {
  return request<Report>(`/runs/${runId}/report`);
}

export function getPersonas(runId: string): Promise<Persona[]> {
  return request<Persona[]>(`/runs/${runId}/personas`);
}

export function sendChat(
  runId: string,
  message: string,
  personaId: string | null,
): Promise<ChatMessage> {
  return request<ChatMessage>(
    `/runs/${runId}/chat`,
    jsonInit('POST', { message, persona_id: personaId }),
  );
}

export async function exportReport(runId: string): Promise<string> {
  const res = await rawRequest(`/runs/${runId}/report/export`);
  return res.text();
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/** Exchange credentials for a JWT and store it. Throws UnauthorizedError on 401. */
export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/login`, jsonInit('POST', { username, password }));
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as LoginResponse;
  setToken(data.access_token);
}
