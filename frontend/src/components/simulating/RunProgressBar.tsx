/**
 * Indeterminate by construction. Nothing behind this screen reports how far a
 * run has got, so the bar reports *that* work is happening, never how much is
 * left — no `aria-valuenow`, which is exactly how ARIA spells "indeterminate".
 */
export function RunProgressBar({ status }: { status: 'running' | 'done' }) {
  if (status === 'done') {
    return (
      <div
        role="progressbar"
        aria-label="Run status"
        aria-valuetext="Complete"
        className="h-1.5 w-full overflow-hidden rounded-full bg-primary"
      />
    )
  }

  return (
    <div
      role="progressbar"
      aria-label="Run status"
      aria-valuetext="Running"
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="sc-sweep h-full w-[30%] rounded-full bg-primary" />
    </div>
  )
}
