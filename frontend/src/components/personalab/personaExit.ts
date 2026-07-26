/** Derive exit copy from persona drop-off and story beats — no mock fixtures. */

import type { ApiBeat } from '@/api'
import type { Persona } from '@/mock/types'

/** Beat summary for a 1-based beat index. Null when the run has no such beat. */
export function beatSummary(beats: ApiBeat[], idx: number): string | null {
  return beats.find((beat) => beat.idx === idx)?.summary ?? null
}

export function exitLabel(persona: Persona, beatCount: number): string {
  return persona.dropped_at_beat === null
    ? `Completed all ${beatCount} beats`
    : `Dropped at beat ${persona.dropped_at_beat}`
}

export function exitDetail(persona: Persona, beats: ApiBeat[]): string | null {
  return persona.dropped_at_beat === null
    ? null
    : beatSummary(beats, persona.dropped_at_beat)
}
