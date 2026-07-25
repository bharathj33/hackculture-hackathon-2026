import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { Submission } from '../types';

type Tab = 'file' | 'paste';
type Phase = 'idle' | 'submitting' | 'processing' | 'ready' | 'error';

interface Props {
  onReady: (submission: Submission) => void;
}

export default function Upload({ onReady }: Props) {
  const [tab, setTab] = useState<Tab>('file');
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (pollRef.current !== null) window.clearTimeout(pollRef.current);
    };
  }, []);

  const poll = useCallback((id: string) => {
    const tick = async () => {
      try {
        const sub = await api.getSubmission(id);
        if (unmountedRef.current) return; // in-flight response after unmount
        if (sub.status === 'ready') {
          setSubmission(sub);
          setPhase('ready');
          return;
        }
        if (sub.status === 'failed' || sub.status === 'error') {
          setError('Story processing failed on the server.');
          setPhase('error');
          return;
        }
        setSubmission(sub);
        pollRef.current = window.setTimeout(tick, 2000);
      } catch (err) {
        if (unmountedRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase('error');
      }
    };
    void tick();
  }, []);

  const submit = useCallback(
    async (promise: Promise<Submission>) => {
      setPhase('submitting');
      setError(null);
      setSubmission(null);
      try {
        const sub = await promise;
        setSubmission(sub);
        if (sub.status === 'ready') {
          setPhase('ready');
        } else {
          setPhase('processing');
          poll(sub.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase('error');
      }
    },
    [poll],
  );

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      void submit(api.ingestFile(file));
    },
    [submit],
  );

  const busy = phase === 'submitting' || phase === 'processing';
  const beats = submission?.story_rep?.beats ?? [];

  if (phase === 'ready' && submission) {
    return (
      <section className="card">
        <h2>Story ingested</h2>
        <p className="muted">
          {beats.length} beats extracted
          {submission.story_rep?.language ? ` · language: ${submission.story_rep.language}` : ''}
        </p>
        <ul className="beat-list">
          {beats.map((b) => (
            <li key={b.idx} className="beat-item">
              <span className="beat-idx">
                #{b.idx}
                {b.episode != null ? ` · Ep ${b.episode}` : ''}
              </span>
              <span className="beat-summary">{b.summary}</span>
              <span className="beat-badges">
                {b.is_hook && <span className="badge badge-hook">Hook</span>}
                {b.is_cliffhanger && <span className="badge badge-cliff">Cliffhanger</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setPhase('idle')}>
            Start over
          </button>
          <button className="btn btn-primary" onClick={() => onReady(submission)}>
            Choose audience panel →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Upload your story</h2>
      <div className="tabs">
        <button
          className={`tab ${tab === 'file' ? 'active' : ''}`}
          onClick={() => setTab('file')}
          disabled={busy}
        >
          Upload file
        </button>
        <button
          className={`tab ${tab === 'paste' ? 'active' : ''}`}
          onClick={() => setTab('paste')}
          disabled={busy}
        >
          Paste text
        </button>
      </div>

      {tab === 'file' ? (
        <div
          className={`dropzone ${dragging ? 'dragging' : ''} ${busy ? 'disabled' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => {
            if (!busy) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (!busy && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="dropzone-icon">⇪</div>
          <p>Drag &amp; drop your script here</p>
          <p className="muted">or click to browse (.txt, .docx, .pdf)</p>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <div className="paste-area">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your story text here…"
            rows={12}
            disabled={busy}
          />
          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={busy || text.trim().length === 0}
              onClick={() => void submit(api.ingestText(text))}
            >
              Analyze story
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="status-row">
          <span className="spinner" />
          <span>
            {phase === 'submitting'
              ? 'Uploading…'
              : 'Extracting beats, hooks and cliffhangers…'}
          </span>
        </div>
      )}

      {phase === 'error' && (
        <div className="error-box">
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={() => setPhase('idle')}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
