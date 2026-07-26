import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Deterministic, offline persona avatar. No network, no image files, no
 * external avatar service — the whole face is generated from the handle string,
 * so the same handle always draws the same portrait and the demo is
 * reproducible on a plane.
 *
 * Fills reference the theme's chart tokens directly, which is the one place raw
 * `var(--…)` inside markup is correct: an SVG paint attribute cannot take a
 * Tailwind class. Every fill in the palette is mid-to-light in BOTH themes, so
 * the ink is a single fixed dark violet rather than `--foreground` (which flips
 * to near-white in dark mode and would vanish on the pale fills).
 */

const FILLS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const
/*
  `--primary` is byte-identical to `--chart-1` in both themes, so adding it
  would only weight one hue twice. `--secondary` was tried and dropped: its dark
  value (L 0.46) sits too close to the ink and the face loses its features.
*/

/** Fixed near-black violet. Holds on every fill above in light and dark. */
const INK = 'oklch(0.24 0.032 292)'
/** Eye glint. Decorative only — the pupil carries the read. */
const GLINT = 'oklch(0.99 0.004 300)'

/** Blobby head proportions, so not every listener is a perfect circle. */
const HEADS = [
  [29, 29],
  [29, 27.5],
  [27.5, 29],
  [28.5, 27],
] as const

/**
 * Hair is drawn oversized and clipped to the head silhouette, which is why the
 * paths run outside the 0–64 box. Index 4 also gets a bun.
 */
const HAIR = [
  'M-2 -2H66V22Q32 34 -2 22Z',
  'M-2 -2H66V24H-2Zm0 24h10v30H-2Zm58 0h10v30H56Z',
  'M-2 -2H66V19Q45 30 27 22 15 17 -2 27Z',
  'M-2 -2H66V21c-6 9-10 9-16 0-6 9-10 9-16 0-6 9-10 9-16 0-6 9-10 9-16 0H-2Z',
  'M-2 -2H66V20Q32 29 -2 20Z',
] as const

const EYES = ['round', 'wide', 'closed'] as const

const MOUTHS = [
  { d: 'M23 49Q32 43 41 49' },
  { d: 'M23 48Q32 45 41 48' },
  { d: 'M23 47H41' },
  { d: 'M23 46Q32 51 41 46' },
  { d: 'M23 45Q32 53 41 45' },
  { d: 'M23 45Q32 56 41 45Z', filled: true },
] as const

/** FNV-1a, 32-bit. Pure function of the string — no clock, no randomness. */
function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Salting per feature keeps the four picks independent of each other. */
function pick<T>(list: readonly T[], handle: string, salt: string): T {
  return list[hash(`${handle}|${salt}`) % list.length]
}

/**
 * Listener handles are minted as `<Name>-L<nn>` by the seed generator. Anything
 * else is a labelled critic role, and the backend genuinely treats those as a
 * different kind of participant — so they get a different silhouette.
 */
function isCriticHandle(handle: string): boolean {
  return !/-L\d+$/.test(handle.trim())
}

interface PersonaAvatarProps {
  handle: string
  /** Rendered edge length in px. Legible from 28 up to 72+. */
  size?: number
  className?: string
}

export function PersonaAvatar({ handle, size = 40, className }: PersonaAvatarProps) {
  const clipId = `pa-${useId().replace(/:/g, '')}`

  const critic = isCriticHandle(handle)
  const fill = pick(FILLS, handle, 'fill')
  const [rx, ry] = pick(HEADS, handle, 'head')
  const hair = pick(HAIR, handle, 'hair')
  // The bun sits proud of the silhouette, so it is drawn outside the clip.
  // Critics skip it — it would collide with their ring.
  const bun = !critic && hair === HAIR[4]
  const eyes = pick(EYES, handle, 'eyes')
  const mouth = pick(MOUTHS, handle, 'mouth')

  const head = critic ? (
    <rect x={5} y={5} width={54} height={54} rx={17} />
  ) : (
    <ellipse cx={32} cy={32} rx={rx} ry={ry} />
  )

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <defs>
        <clipPath id={clipId}>{head}</clipPath>
      </defs>

      {/* Critics carry a detached ring: readable at 28px, and it is the only
          cue that survives when the card is scanned rather than read. */}
      {critic && (
        <rect
          x={1.5}
          y={1.5}
          width={61}
          height={61}
          rx={21}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
        />
      )}

      <g fill={fill}>{head}</g>

      {bun && <circle cx={46} cy={9} r={7.5} fill={INK} />}

      <g clipPath={`url(#${clipId})`}>
        <path d={hair} fill={INK} />
      </g>

      {eyes === 'closed' ? (
        <g fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round">
          <path d="M18.6 36.5q4.4-6 8.8 0" />
          <path d="M36.6 36.5q4.4-6 8.8 0" />
        </g>
      ) : (
        <g fill={INK}>
          {eyes === 'round' ? (
            <>
              <circle cx={23} cy={35} r={4.2} />
              <circle cx={41} cy={35} r={4.2} />
            </>
          ) : (
            <>
              <rect x={20.2} y={30} width={5.6} height={10} rx={2.8} />
              <rect x={38.2} y={30} width={5.6} height={10} rx={2.8} />
            </>
          )}
          <g fill={GLINT}>
            <circle cx={24.5} cy={33.3} r={1.3} />
            <circle cx={42.5} cy={33.3} r={1.3} />
          </g>
        </g>
      )}

      <path
        d={mouth.d}
        fill={'filled' in mouth && mouth.filled ? INK : 'none'}
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
