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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`API ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ''}`);
  }
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
  const res = await fetch(`${BASE}/runs/${runId}/report/export`);
  if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`);
  return res.text();
}
