/** Shared formatters. Four near-identical copies of these existed before. */

/** Score → semantic color class. Same thresholds as the working frontend. */
export function scoreTone(score: number): string {
  if (score >= 7) return 'text-success'
  if (score >= 5) return 'text-warning'
  return 'text-destructive'
}

export function verdictLabel(verdict: 'greenlight' | 'revise' | 'hold'): string {
  return { greenlight: 'Greenlight', revise: 'Revise', hold: 'Hold' }[verdict]
}

export function verdictTone(
  verdict: 'greenlight' | 'revise' | 'hold',
): 'success' | 'warning' | 'destructive' {
  return { greenlight: 'success', revise: 'warning', hold: 'destructive' }[verdict] as
    | 'success'
    | 'warning'
    | 'destructive'
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

const DEVANAGARI = /[\u0900-\u097F]/

/** True when safe to render in Geist Sans without triggering Hindi system fonts. */
export function isLatinDisplay(text: string | null | undefined): boolean {
  const value = text?.trim()
  if (!value) return false
  return !DEVANAGARI.test(value)
}

export function truncateLabel(text: string, maxLen = 72): string {
  const value = text.trim()
  if (value.length <= maxLen) return value
  return `${value.slice(0, maxLen - 1)}…`
}

/** Editorial chrome label — never Devanagari; scans beat summaries when needed. */
export function storyDisplayLabel(
  primary: string | null | undefined,
  opts: {
    language?: string
    beatCount?: number
    beats?: Array<{ summary?: string }>
    fallback?: string
  },
): string {
  const candidates = [
    primary?.trim(),
    ...(opts.beats?.map((beat) => beat.summary?.trim()) ?? []),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    if (isLatinDisplay(candidate)) return truncateLabel(candidate)
  }

  if (opts.fallback) return opts.fallback
  const lang = opts.language?.toUpperCase() ?? 'STORY'
  if (opts.beatCount) return `${lang} · ${opts.beatCount} beats`
  return lang
}

/** Story excerpt for UI — Latin font only; non-English sources show the English summary. */
export function beatExcerpt(
  beat: { summary: string; text_span: string },
  language?: string | null,
): string {
  if (language && language !== 'en') return beat.summary
  return beat.text_span || beat.summary
}

/** Seconds → "4m 12s". */
export function duration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}m ${pad2(s % 60)}s`
}
