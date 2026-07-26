/*
  Decorative depth behind the console. Positions are hand-fixed rather than
  random so every render — and every screenshot — is identical. The old field
  used `bg-primary/4`, which was invisible on the near-white light ground; these
  carry a per-theme opacity so the wash reads in both.
  x/y are viewport percentages, size is px, delay/duration are seconds.
*/
const BLOBS = [
  { x: 8, y: 16, size: 320, delay: 0, duration: 19 },
  { x: 30, y: 74, size: 260, delay: 3.4, duration: 22 },
  { x: 54, y: 10, size: 220, delay: 6.1, duration: 17 },
  { x: 72, y: 58, size: 360, delay: 1.8, duration: 24 },
  { x: 92, y: 22, size: 240, delay: 4.7, duration: 20 },
]

export function AmbientField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {BLOBS.map((blob) => (
        <span
          key={`${blob.x}-${blob.y}`}
          className="sc-drift absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl dark:bg-primary/10"
          style={{
            left: `${blob.x}%`,
            top: `${blob.y}%`,
            width: blob.size,
            height: blob.size,
            animationDelay: `${blob.delay}s`,
            animationDuration: `${blob.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
