import type { ApiBeat, ApiDropoffPoint, ApiReport, ApiRun, ApiSubmission } from '@/api'
import type { Beat, DropoffPoint, Report } from '@/mock/types'
import { storyDisplayLabel } from '@/lib/format'

/** Same thresholds as the legacy wizard `Verdict` component. */
export function verdictOf(score: number): Report['verdict'] {
  if (score > 7) return 'greenlight'
  if (score >= 5) return 'revise'
  return 'hold'
}

function adaptDropoff(dropoff: ApiDropoffPoint[], beats?: ApiBeat[]): DropoffPoint[] {
  const episodeByBeat = new Map((beats ?? []).map((beat) => [beat.idx, beat.episode]))
  return dropoff.map((point) => ({
    ...point,
    episode: episodeByBeat.get(point.beat_idx) ?? 1,
  }))
}

/** Joins dropoff retention onto story beats for the timeline panel. */
export function adaptBeats(beats: ApiBeat[], dropoff: ApiDropoffPoint[]): Beat[] {
  const byIdx = new Map(dropoff.map((point) => [point.beat_idx, point]))
  return beats.map((beat) => {
    const point = byIdx.get(beat.idx)
    return {
      ...beat,
      retained_pct: point?.retained_pct ?? 100,
      failure_cause: point?.cliff ? (point.cause ?? null) : null,
    }
  })
}

/** Converts API report JSON into the UI `Report` shape. */
export function adaptReport(api: ApiReport, beats?: ApiBeat[]): Report {
  return {
    score: api.score,
    rationale: api.rationale,
    pros: api.pros.map((finding) => ({
      text: finding.text,
      persona_refs: finding.persona_refs ?? [],
    })),
    cons: api.cons.map((finding) => ({
      text: finding.text,
      persona_refs: finding.persona_refs ?? [],
    })),
    dropoff: adaptDropoff(api.dropoff, beats),
    segments: api.segments,
    fixes: api.fixes,
    confidence_note: api.confidence_note,
    verdict: verdictOf(api.score),
    beat_engagement: (api.beat_engagement ?? []).map((row) => ({ ...row })),
  }
}

/** No title column on `Submission` — derive a short Latin label from beat summaries. */
export function submissionLabel(submission: ApiSubmission): string {
  const beats = submission.story_rep?.beats ?? []
  const language = submission.story_rep?.language
  return storyDisplayLabel(beats[0]?.summary, {
    language,
    beatCount: beats.length,
    beats,
    fallback: `${submission.media_type} · ${submission.id.slice(0, 12)}`,
  })
}

/** Provenance line for the dashboard footer. */
export function runProvenance(run: ApiRun): string {
  if (run.mode === 'triage') {
    return `Triage critique — ${run.cost_tokens.toLocaleString()} tokens.`
  }
  return `Full swarm run — ${run.cost_tokens.toLocaleString()} tokens.`
}
