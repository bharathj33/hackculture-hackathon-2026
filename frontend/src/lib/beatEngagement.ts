import type { BeatEngagement, BeatEngagementTotals } from '@/mock/types'

type TotalKey = 'posts' | 'comments' | 'reactions' | 'tweets' | 'agents_engaged' | 'silences'

const TOTAL_KEYS: TotalKey[] = [
  'posts',
  'comments',
  'reactions',
  'tweets',
  'agents_engaged',
  'silences',
]

/** Fold per-beat rows into run-level headline counters. */
export function sumEngagementTotals(rows: BeatEngagement[]): BeatEngagementTotals {
  const totals: BeatEngagementTotals = {
    posts: 0,
    comments: 0,
    reactions: 0,
    tweets: 0,
    agents_engaged: 0,
    silences: 0,
    beats: rows.length,
  }
  for (const row of rows) {
    for (const key of TOTAL_KEYS) {
      totals[key] += row[key]
    }
  }
  return totals
}

/** Lookup engagement stats by beat index. */
export function engagementByBeat(rows: BeatEngagement[]): Map<number, BeatEngagement> {
  return new Map(rows.map((row) => [row.beat_idx, row]))
}
