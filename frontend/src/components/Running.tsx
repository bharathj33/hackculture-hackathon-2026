import { useEffect } from 'react';
import * as api from '../api';
import type { Run } from '../types';

/** Give up polling after this long and surface a timeout error. */
const POLL_CAP_MS = 10 * 60 * 1000;

interface Props {
  run: Run | null;
  error: string | null;
  onDone: (run: Run) => void;
  onFailed: (message: string) => void;
  onRetry: () => void;
  onBack: () => void;
  onUnauthorized: () => void;
}

export default function Running({
  run,
  error,
  onDone,
  onFailed,
  onRetry,
  onBack,
  onUnauthorized,
}: Props) {
  useEffect(() => {
    if (!run) return;

    // Effect-local lifecycle: each effect run owns its own flag and timer, so
    // an in-flight fetch from a torn-down run can never revive a shared ref.
    let stopped = false;
    let settled = false; // once-guard: onDone/onFailed fire at most once per effect run
    const startedAt = Date.now();
    let timer: number | undefined;

    const tick = async () => {
      if (stopped || settled) return;
      try {
        const r = await api.getRun(run.id);
        if (stopped || settled) return;
        if (r.status === 'done') {
          settled = true;
          onDone(r);
          return;
        }
        if (r.status === 'failed') {
          settled = true;
          onFailed('Simulation run failed on the server.');
          return;
        }
        // Any other status (queued, running, or unexpected values) keeps
        // polling only until the time cap, then stops with a visible error.
        if (Date.now() - startedAt >= POLL_CAP_MS) {
          settled = true;
          onFailed(
            `Simulation timed out after 10 minutes (last status: "${r.status}"). The server may be stuck — retry or go back.`,
          );
          return;
        }
        timer = window.setTimeout(tick, 3000);
      } catch (err) {
        if (!stopped && !settled) {
          settled = true;
          if (err instanceof api.UnauthorizedError) {
            onUnauthorized();
            return;
          }
          onFailed(err instanceof Error ? err.message : String(err));
        }
      }
    };

    timer = window.setTimeout(tick, 1000);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [run, onDone, onFailed, onUnauthorized]);

  if (error) {
    return (
      <section className="card center">
        <h2>Simulation failed</h2>
        <div className="error-box">
          <p>{error}</p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={onBack}>
            ← Back to panels
          </button>
          <button className="btn btn-primary" onClick={onRetry}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const status = run?.status ?? 'queued';

  return (
    <section className="card center running">
      <span className="spinner spinner-lg" />
      <h2>{status === 'queued' ? 'Queued…' : 'Audience is reading…'}</h2>
      <p className="muted">
        {status === 'queued'
          ? 'Waiting for a simulation slot.'
          : 'Personas are reacting beat by beat. This can take a minute.'}
      </p>
      <div className="run-status-track">
        <span className={`run-pill ${status === 'queued' ? 'active' : 'done'}`}>Queued</span>
        <span className="run-arrow">→</span>
        <span className={`run-pill ${status === 'running' ? 'active' : ''}`}>Running</span>
        <span className="run-arrow">→</span>
        <span className="run-pill">Verdict</span>
      </div>
      <div className="actions">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back to panels
        </button>
      </div>
    </section>
  );
}
