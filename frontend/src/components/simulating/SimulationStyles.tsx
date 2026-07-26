/*
  Keyframes are scoped to this screen rather than added to the shared index.css.
  The reduced-motion opt-out is declared here too: these rules ship after the
  Tailwind sheet, so a `motion-reduce:` utility could not reliably override them.
*/
const CSS = `
@keyframes sc-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -24px, 0) scale(1.08); }
}
.sc-drift { animation: sc-drift 18s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

@keyframes sc-line-in {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: none; }
}
.sc-line-in { animation: sc-line-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* A counter rolling over. Replayed by remounting the numeral on value change. */
@keyframes sc-tick {
  from { opacity: 0; transform: translateY(0.2em); }
  to { opacity: 1; transform: none; }
}
.sc-tick { display: inline-block; animation: sc-tick 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }

/* Indeterminate: a segment sweeping the track, never a position along it. */
@keyframes sc-sweep {
  from { transform: translateX(-110%); }
  to { transform: translateX(360%); }
}
.sc-sweep { animation: sc-sweep 1.9s cubic-bezier(0.65, 0, 0.35, 1) infinite; }

/* Cumulative ellipsis: dot 1 is always on, 2 and 3 join on a 450ms beat. */
@keyframes sc-dot-2 { 0%, 32.9% { opacity: 0; } 33%, 100% { opacity: 1; } }
@keyframes sc-dot-3 { 0%, 65.9% { opacity: 0; } 66%, 100% { opacity: 1; } }
.sc-dot-2 { animation: sc-dot-2 1.35s linear infinite; }
.sc-dot-3 { animation: sc-dot-3 1.35s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .sc-drift, .sc-line-in, .sc-tick, .sc-sweep, .sc-dot-2, .sc-dot-3 {
    animation: none;
    opacity: 1;
    transform: none;
  }
  /* The sweep parks at the left of the track — a resting segment, not a full bar. */
  .sc-sweep { transform: none; }
}
`

export function SimulationStyles() {
  return <style>{CSS}</style>
}
