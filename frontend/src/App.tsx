import { useCallback, useEffect, useState } from 'react';
import * as api from './api';
import Login from './components/Login';
import ChatDrawer from './components/ChatDrawer';
import PanelSelect from './components/PanelSelect';
import Running from './components/Running';
import Upload from './components/Upload';
import Verdict from './components/Verdict';
import type { Panel, Persona, Report, Run, RunMode, Submission } from './types';

type Step = 'upload' | 'panel' | 'running' | 'verdict';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'panel', label: 'Panel' },
  { key: 'running', label: 'Simulate' },
  { key: 'verdict', label: 'Verdict' },
];

export default function App() {
  // null = probing whether the API is gated; true = unlocked; false = show gate
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [mode, setMode] = useState<RunMode>('full');
  const [backtest, setBacktest] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPersona, setChatPersona] = useState<string | null>(null);

  const handleReady = useCallback((sub: Submission) => {
    setSubmission(sub);
    setStep('panel');
  }, []);

  // M-2: a mid-session 401 (expired/cleared token) routes back to the login
  // screen instead of dead-ending in a generic error box.
  const handleUnauthorized = useCallback(() => {
    setUnlocked(false);
  }, []);

  const startRun = useCallback(
    async (selPanel: Panel, selMode: RunMode, selBacktest: boolean) => {
      if (!submission) return;
      setPanel(selPanel);
      setMode(selMode);
      setBacktest(selBacktest);
      setRun(null);
      setRunError(null);
      setStep('running');
      try {
        const r = await api.createRun(submission.id, selPanel.id, selMode, selBacktest);
        setRun(r);
      } catch (err) {
        if (err instanceof api.UnauthorizedError) {
          setUnlocked(false);
          return;
        }
        setRun(null);
        setRunError(err instanceof Error ? err.message : String(err));
      }
    },
    [submission],
  );

  const retryRun = useCallback(() => {
    if (panel) void startRun(panel, mode, backtest);
  }, [panel, mode, backtest, startRun]);

  const handleRunDone = useCallback(async (finished: Run) => {
    // Deliberately no setRun(finished): a new run object identity would re-arm
    // Running's polling effect while the report loads (H1). run.id is unchanged.
    try {
      const [rep, pers] = await Promise.all([
        api.getReport(finished.id),
        api.getPersonas(finished.id).catch(() => [] as Persona[]),
      ]);
      setReport(rep);
      setPersonas(pers);
      setStep('verdict');
    } catch (err) {
      if (err instanceof api.UnauthorizedError) {
        setUnlocked(false);
        return;
      }
      setRunError(
        `Report fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, []);

  const handleRunFailed = useCallback((msg: string) => {
    setRunError(msg);
  }, []);

  const backToPanel = useCallback(() => {
    setStep('panel');
  }, []);

  const restart = useCallback(() => {
    setStep('upload');
    setSubmission(null);
    setPanel(null);
    setRun(null);
    setRunError(null);
    setReport(null);
    setPersonas([]);
    setChatOpen(false);
    setChatPersona(null);
  }, []);

  const openChat = useCallback((personaId: string | null) => {
    setChatPersona(personaId);
    setChatOpen(true);
  }, []);

  const signOut = useCallback(() => {
    api.clearToken();
    setUnlocked(false);
  }, []);

  useEffect(() => {
    // Probe: if API answers without a token (auth off) or stored token works → unlocked.
    let cancelled = false;
    api
      .getPanels()
      .then(() => !cancelled && setUnlocked(true))
      .catch((err) => {
        if (cancelled) return;
        setUnlocked(err instanceof api.UnauthorizedError ? false : true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  if (unlocked === false) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="brand">
            <h1>StoryCritic</h1>
            <p className="tagline">The market&rsquo;s opinion, not a critic&rsquo;s.</p>
          </div>
        </header>
        <main className="app-main">
          <Login onSuccess={() => setUnlocked(true)} />
        </main>
        <footer className="app-footer">
          Validates content, never the creator. · Zero to One Generative Media Hackathon · Team
          AIPlayers
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>StoryCritic</h1>
          <p className="tagline">The market&rsquo;s opinion, not a critic&rsquo;s.</p>
        </div>
        <nav className="stepper" aria-label="Progress">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`stepper-item ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}
            >
              <span className="stepper-num">{i + 1}</span>
              <span className="stepper-label">{s.label}</span>
            </div>
          ))}
        </nav>
        {unlocked === true && api.getToken() && (
          <button className="btn btn-ghost signout" onClick={signOut}>
            Sign out
          </button>
        )}
      </header>

      <main className="app-main">
        {step === 'upload' && (
          <Upload onReady={handleReady} onUnauthorized={handleUnauthorized} />
        )}

        {step === 'panel' && submission && (
          <PanelSelect
            submission={submission}
            onSimulate={startRun}
            onBack={restart}
            onUnauthorized={handleUnauthorized}
          />
        )}

        {step === 'running' && (
          <Running
            run={run}
            error={runError}
            onDone={handleRunDone}
            onFailed={handleRunFailed}
            onRetry={retryRun}
            onBack={backToPanel}
            onUnauthorized={handleUnauthorized}
          />
        )}

        {step === 'verdict' && report && run && (
          <Verdict
            report={report}
            runId={run.id}
            personaCount={personas.length}
            onOpenChat={() => openChat(null)}
            onRestart={restart}
            onUnauthorized={handleUnauthorized}
          />
        )}
      </main>

      {run && report && (
        <ChatDrawer
          runId={run.id}
          personas={personas}
          open={chatOpen}
          initialPersonaId={chatPersona}
          onClose={() => setChatOpen(false)}
          onUnauthorized={handleUnauthorized}
        />
      )}

      <footer className="app-footer">
        Validates content, never the creator. · Zero to One Generative Media Hackathon · Team
        AIPlayers
      </footer>
    </div>
  );
}
