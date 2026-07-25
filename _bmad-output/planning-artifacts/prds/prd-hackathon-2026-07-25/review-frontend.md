# Frontend Review — StoryCritic wizard (`frontend/src/`)

**Reviewer:** typescript-react-reviewer skill (senior React 19 pass)
**Date:** 2026-07-25
**Scope:** All files in `/Users/jsphdnl/jsstech/hackathon/frontend/src/` (App.tsx, main.tsx, api.ts, types.ts, components/Upload.tsx, PanelSelect.tsx, Running.tsx, Verdict.tsx, ChatDrawer.tsx, DropoffChart.tsx) + tsconfig.json, package.json.

**Verdict: REQUEST CHANGES (2 fixes are demo-breaking).** The code is clean, typed, and well-structured for a 36-hour build — error states exist on every step, cleanup functions exist, no `any`, no state mutation, no `useEffect`-for-derived-state abuse. But the run-polling layer has two real races that will visibly break the on-stage flow the first time a run fails and someone hits Retry, plus a missing error boundary that turns any render throw into a white screen.

---

## Critical (fix before demo)

### C1. Stale-run race: Retry / Back-and-rerun polls the OLD failed run — Retry is effectively broken
`App.tsx:37-54` (`startRun`) + `Running.tsx:18-48`

`startRun` sets `step='running'` but **never clears the previous `run`**. On Retry (or Back-to-panels → Simulate again) the sequence is:

1. Old run A is in state with `status: 'failed'` (or `'done'`).
2. `startRun` sets `runError=null`, `step='running'`, then **awaits** `api.createRun(...)`.
3. `<Running run={runA}>` mounts and its effect starts polling **run A** after 1s.
4. `getRun(A)` returns `failed` → `onFailed('Simulation run failed on the server.')` fires.
5. The user is back on the error screen even though run B is being created fine. If `createRun` takes >1s (it will, it's an LLM backend), **Retry always re-shows the failure**.

The same race after a successful run: "run A is done" → new run polls A → `onDone(A)` → jumps straight to the *old* verdict.

**Fix (one line):** clear the stale run before creating the new one.

```ts
const startRun = useCallback(async (selPanel, selMode, selBacktest) => {
  if (!submission) return;
  setPanel(selPanel); setMode(selMode); setBacktest(selBacktest);
  setRun(null);            // <-- add this
  setRunError(null);
  setStep('running');
  ...
```

`Running` already handles `run === null` correctly (renders "Queued…", no poll), so this is safe.

### C2. Duplicate poll chains: shared `stoppedRef` is revived by effect re-runs (unstable `onFailed` prop)
`Running.tsx:15-48` + `App.tsx:128` (`onFailed={(msg) => setRunError(msg)}`)

`onFailed` is an inline arrow, so it's a **new function on every App render**, and it's in the effect deps → the effect tears down and re-runs on every parent render while `step==='running'`. That alone is just churn, but combined with the shared ref it leaks chains:

1. Effect run #1: `stoppedRef.current = false`, `tick()` awaits `getRun` (in flight).
2. App re-renders (e.g. `setRun` after `createRun` resolves) → cleanup sets `stoppedRef.current = true`, clears `timerRef` — but the **in-flight fetch can't be cancelled**.
3. Effect run #2 immediately sets `stoppedRef.current = false` again.
4. Old tick's `await` resolves, checks `stoppedRef.current` → **false** → schedules another timeout, overwriting `timerRef` that run #2 also uses.
5. Now two chains poll the same run; only one timeout id is tracked, so the orphan chain can never be cleared and both eventually call `onDone` → `handleRunDone` runs multiple times → duplicate `/report` + `/personas` fetches.

**Fix:** use an effect-local flag + local timer (each effect run owns its own lifecycle), and stabilize the callbacks in App.

```ts
useEffect(() => {
  if (!run) return;
  let stopped = false;
  let timer: number | undefined;
  const tick = async () => {
    if (stopped) return;
    try {
      const r = await api.getRun(run.id);
      if (stopped) return;
      if (r.status === 'done') { onDone(r); return; }
      if (r.status === 'failed') { onFailed('Simulation run failed on the server.'); return; }
      timer = window.setTimeout(tick, 3000);
    } catch (err) {
      if (!stopped) onFailed(err instanceof Error ? err.message : String(err));
    }
  };
  timer = window.setTimeout(tick, 1000);
  return () => { stopped = true; if (timer !== undefined) window.clearTimeout(timer); };
}, [run, onDone, onFailed]);
```

And in `App.tsx`, wrap the inline props:

```ts
const handleRunFailed = useCallback((msg: string) => setRunError(msg), []);
// <Running ... onFailed={handleRunFailed} onBack={backToPanel} />
```

---

## High

### H1. `onDone` → `setRun(finished)` re-arms the poll while the report is loading — repeated `onDone` + duplicate report fetches
`App.tsx:60-75` + `Running.tsx` effect deps

`handleRunDone` calls `setRun(finished)` (a **new object identity** every poll) but only flips `step` after `getReport` + `getPersonas` resolve. Meanwhile `Running` is still mounted; the `run` prop change re-runs the effect, which polls again after 1s, gets `done` again, calls `onDone` again → another `Promise.all([getReport, getPersonas])`, another `setRun(new object)`… a ~1s loop of duplicate report fetches for as long as the report endpoint is slow. If the report endpoint is doing LLM synthesis, this can pile up several concurrent requests mid-demo.

**Fix options (either):**
- In `Running`, guard with a `doneRef` so `onDone` fires at most once per mount; or
- In `handleRunDone`, don't `setRun(finished)` (the id is unchanged — you only need it for `runId`), or compare by status: `setRun(prev => prev?.status === finished.status ? prev : finished)`.

Simplest: drop `setRun(finished)` entirely; `run.id` is all Verdict/ChatDrawer use.

### H2. No Error Boundary — any render throw is a white screen on stage
`main.tsx` / `App.tsx`

If the backend returns anything off-contract — e.g. `report.score` as a string (`"7.5".toFixed` → TypeError at `Verdict.tsx:55`), `retained_pct: null` (`DropoffChart.tsx:71`), or `segments`/`pros` missing (`.map` on undefined) — React unmounts the whole tree. `Report`'s numeric fields are trusted blindly. For a demo, wrap `<App/>` (or at least the verdict step) in a tiny error boundary with a "Restart" button, and/or coerce in one place: `score: Number(raw.score)`.

### H3. Wizard dead-ends: no escape from `Running` (non-error) or Upload `processing`, and polls have no time cap
`Running.tsx:71-88`, `Upload.tsx:193-202`

- `Running`'s happy-path screen has **no Back/Cancel button** — Back only appears after an error. If the backend sits in `queued` forever (worker died), the only recovery is a page refresh, which loses the uploaded submission.
- Same for Upload's `processing` phase: tabs and buttons are disabled while `busy`; if the submission never leaves `processing`, the user is stuck.
- Neither poll has a max duration/attempt count.

**Fix (cheap):** add a ghost "← Back to panels" button on the Running happy path (cleanup already stops the poll on unmount), a "Cancel" on Upload's processing row (`clearTimeout(pollRef.current); setPhase('idle')`), and optionally a ~3-minute give-up that flips to the error UI.

---

## Medium

### M1. `Run.status` / `Submission.status` typed as `string` — unknown statuses poll forever, silently
`types.ts:16,40`

The comments admit the real unions. If the backend ever says `'completed'`, `'succeeded'`, or `'error'` for a run, `Running` matches neither `'done'` nor `'failed'` and spins forever with no feedback. Make them unions (`'queued' | 'running' | 'done' | 'failed'`) so exhaustiveness is checkable, and treat *unknown* statuses after N polls as failure.

### M2. Effect churn root cause: inline callback props into `Running`
`App.tsx:128-130`

`onFailed` and `onBack` are recreated every render (see C2). Even after the C2 fix, memoize them — it makes the effect's lifecycle deterministic and removes restart-the-1s-delay churn on unrelated App state changes (`chatOpen`, etc.).

### M3. `PanelSelect` fetch has no cancellation/latest-wins guard
`PanelSelect.tsx:24-33`

`useEffect(load, [])` + Retry: a slow first request can resolve **after** a Retry's request and clobber it (out-of-order responses), and a resolve after unmount is a harmless-but-untidy setState on an unmounted component (no-op in React 19, no warning — not demo-breaking). A `let cancelled = true` guard or `AbortController` fixes both. Low likelihood, listed for completeness. Same pattern applies to Upload's in-flight `getSubmission` at unmount.

### M4. Chat Enter key ignores IME composition and `sending` relies on disabled input
`ChatDrawer.tsx:126-128`

`if (e.key === 'Enter') void send();` fires on IME confirm for CJK input — add `if (e.nativeEvent.isComposing) return;`. Also consider allowing typing while `sending` (only disable Send); disabling the input mid-conversation feels laggy in a live demo. Trivial.

### M5. `URL.revokeObjectURL` immediately after `a.click()`
`Verdict.tsx:36-41`

Synchronous revoke right after click intermittently cancels the download in Firefox. Wrap in `setTimeout(() => URL.revokeObjectURL(url), 1000)`. One-line fix.

---

## Low / nits (only trivially fixable ones)

- `ChatDrawer.tsx:113`, `Verdict.tsx:107,118,132` — `key={i}` on lists. Append-only / static per render, so fine here; noting only because the skill checklist flags it. No action needed for the demo.
- `Upload.tsx:141-158` — dropzone has `role="button"` and `tabIndex={0}` but no `onKeyDown` (Enter/Space). Two-line a11y fix.
- `api.ts:24` — `res.json()` will throw an unhelpful `SyntaxError` on an empty 200/204 body; the `request` wrapper otherwise produces good error messages.
- `tsconfig.json` — consider `noUncheckedIndexedAccess: true`; today's code survives it (e.g. `payload[0].payload` in `DropoffChart.tsx:67` is guarded by `payload.length === 0`), so it's cheap to turn on now.
- `PanelSelect.tsx:33` — `useEffect(load, [])` passes a function whose body ends in an expression statement; fine (arrow with braces returns undefined), but `useEffect(() => { load(); }, [])` reads clearer and is immune to a future refactor making `load` return the promise.

## What's already good (no action)

- Every wizard step has an error UI with a retry path; `getPersonas` failure is gracefully degraded to `[]` (`App.tsx:65`).
- `Upload`'s poll uses chained `setTimeout` (not `setInterval`), stores the id in a ref, and clears it on unmount — the right shape; no interval leak on unmount.
- `ChatDrawer` calls all hooks before its `if (!open) return null` — Rules of Hooks respected; per-thread message storage is immutable and race-safe (keyed by `key` captured at send time, so switching personas mid-request lands the reply in the right thread).
- No `any`, no `React.FC`, `strict: true`, no derived-state-in-effect, no state mutation, `restart()` fully resets the machine, `Verdict`/`ChatDrawer` render guards (`report && run`) prevent null-deref dead-ends.
- `DropoffChart` sorts a copy (`[...data].sort`), disables animation, typed custom dot/tooltip.

---

## Priority fix order for the demo

1. **C1** — `setRun(null)` in `startRun` (1 line). Without it, Retry is broken.
2. **C2** — effect-local `stopped`/`timer` in `Running` + `useCallback` the `onFailed`/`onBack` props (~10 lines).
3. **H1** — drop `setRun(finished)` in `handleRunDone` or add a once-guard (1 line).
4. **H2** — minimal error boundary around `<App/>` (~20 lines).
5. **H3** — Cancel/Back buttons on Running + Upload processing states (~10 lines).

Everything below that is safe to defer past the demo.
