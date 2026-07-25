import { useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { Panel, RunMode, Submission } from '../types';

interface Props {
  submission: Submission;
  onSimulate: (panel: Panel, mode: RunMode, backtest: boolean) => void;
  onBack: () => void;
}

function genreList(g: unknown): string[] {
  if (Array.isArray(g)) return g.map(String);
  if (g && typeof g === 'object') return Object.keys(g as Record<string, unknown>);
  return [];
}

export default function PanelSelect({ submission, onSimulate, onBack }: Props) {
  const [panels, setPanels] = useState<Panel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Panel | null>(null);
  const [mode, setMode] = useState<RunMode>('full');
  const [backtest, setBacktest] = useState(false);

  const loadSeq = useRef(0); // latest-wins guard: stale responses are dropped

  const load = () => {
    const seq = ++loadSeq.current;
    setError(null);
    setPanels(null);
    api
      .getPanels()
      .then((p) => {
        if (seq === loadSeq.current) setPanels(p);
      })
      .catch((err) => {
        if (seq === loadSeq.current)
          setError(err instanceof Error ? err.message : String(err));
      });
  };

  useEffect(() => {
    load();
    return () => {
      loadSeq.current++; // invalidate in-flight request on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beatCount = submission.story_rep?.beats?.length ?? 0;

  return (
    <section className="card">
      <h2>Pick an audience panel</h2>
      <p className="muted">
        Your story ({beatCount} beats) will be read by a simulated audience.
      </p>

      {error && (
        <div className="error-box">
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!panels && !error && (
        <div className="status-row">
          <span className="spinner" />
          <span>Loading panels…</span>
        </div>
      )}

      {panels && (
        <div className="panel-grid">
          {panels.map((p) => (
            <button
              key={p.id}
              className={`panel-card ${selected?.id === p.id ? 'selected' : ''}`}
              onClick={() => setSelected(p)}
            >
              <div className="panel-card-head">
                <span className="panel-name">{p.name}</span>
                {p.is_preset && <span className="badge badge-preset">Preset</span>}
              </div>
              <div className="panel-meta">
                <span>{p.config.persona_count} personas</span>
                <span>{p.config.market}</span>
                <span>{p.config.language}</span>
              </div>
              <div className="panel-genres">
                {genreList(p.config.genre_affinities).slice(0, 5).map((g) => (
                  <span key={g} className="chip">
                    {g}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="sim-controls">
        <div className="mode-toggle" role="radiogroup" aria-label="Simulation mode">
          <button
            className={`toggle-opt ${mode === 'full' ? 'active' : ''}`}
            onClick={() => setMode('full')}
          >
            Full
          </button>
          <button
            className={`toggle-opt ${mode === 'triage' ? 'active' : ''}`}
            onClick={() => setMode('triage')}
          >
            Triage
          </button>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={backtest}
            onChange={(e) => setBacktest(e.target.checked)}
          />
          Backtest
        </label>
      </div>

      <div className="actions">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => selected && onSimulate(selected, mode, backtest)}
        >
          Simulate
        </button>
      </div>
    </section>
  );
}
