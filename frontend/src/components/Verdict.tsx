import { useState } from 'react';
import * as api from '../api';
import type { Report } from '../types';
import DropoffChart from './DropoffChart';

interface Props {
  report: Report;
  runId: string;
  personaCount: number;
  onOpenChat: () => void;
  onRestart: () => void;
  onUnauthorized: () => void;
}

function verdictClass(score: number): string {
  if (score < 5) return 'verdict-red';
  if (score <= 7) return 'verdict-amber';
  return 'verdict-green';
}

function verdictWord(score: number): string {
  if (score < 5) return 'Pass on this one';
  if (score <= 7) return 'Promising, needs work';
  return 'Greenlight material';
}

export default function Verdict({
  report,
  runId,
  personaCount,
  onOpenChat,
  onRestart,
  onUnauthorized,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const md = await api.exportReport(runId);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'storycritic-report.md';
      a.click();
      // Defer revoke: a synchronous revoke can cancel the download in Firefox.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      if (err instanceof api.UnauthorizedError) {
        onUnauthorized();
        return;
      }
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const maxSegScore = Math.max(10, ...report.segments.map((s) => s.score));

  return (
    <section className="verdict">
      <div className={`card hero ${verdictClass(report.score)}`}>
        <div className="hero-score">
          <span className="hero-number">{report.score.toFixed(1)}</span>
          <span className="hero-denom">/10</span>
        </div>
        <div className="hero-text">
          <h2>{verdictWord(report.score)}</h2>
          <p>{report.rationale}</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={onOpenChat}>
            Ask the audience
          </button>
          <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export report'}
          </button>
          <button className="btn btn-ghost" onClick={onRestart}>
            New story
          </button>
        </div>
        {exportError && <p className="error-inline">{exportError}</p>}
      </div>

      <div className="card">
        <h3>Where readers drop off</h3>
        <DropoffChart data={report.dropoff} />
      </div>

      {report.segments.length > 0 && (
        <div className="card">
          <h3>Segment scores</h3>
          <div className="segments">
            {report.segments.map((s) => (
              <div key={s.group} className="segment-row">
                <span className="segment-label">
                  {s.group} <span className="muted">(n={s.n})</span>
                </span>
                <div className="segment-bar-track">
                  <div
                    className="segment-bar"
                    style={{ width: `${(s.score / maxSegScore) * 100}%` }}
                  />
                </div>
                <span className="segment-score">{s.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pros-cons">
        <div className="card">
          <h3 className="pros-title">What worked</h3>
          <ul className="pc-list">
            {report.pros.map((p, i) => (
              <li key={i}>
                <span className="pc-mark pro">+</span> {p.text}
              </li>
            ))}
            {report.pros.length === 0 && <li className="muted">Nothing stood out.</li>}
          </ul>
        </div>
        <div className="card">
          <h3 className="cons-title">What didn&rsquo;t</h3>
          <ul className="pc-list">
            {report.cons.map((c, i) => (
              <li key={i}>
                <span className="pc-mark con">−</span> {c.text}
              </li>
            ))}
            {report.cons.length === 0 && <li className="muted">No major complaints.</li>}
          </ul>
        </div>
      </div>

      {report.fixes.length > 0 && (
        <div className="card">
          <h3>Prioritized fixes</h3>
          <ol className="fix-list">
            {report.fixes.map((f, i) => (
              <li key={i} className="fix-item">
                <span className="badge badge-priority">P{String(f.priority)}</span>
                <span className="fix-text">{f.text}</span>
                {f.est_delta != null && f.est_delta !== '' && (
                  <span className="fix-delta">est. {String(f.est_delta)}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="confidence-note">
        {report.confidence_note}
        {personaCount > 0 ? ` · ${personaCount} simulated listeners` : ''}
      </p>
    </section>
  );
}
