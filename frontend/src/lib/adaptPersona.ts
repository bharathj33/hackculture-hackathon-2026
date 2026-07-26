import type { ApiPersona } from '@/api'
import type { Persona, PersonaEvent } from '@/mock/types'

const GROUP_INTERESTS: Record<string, string[]> = {
  Fan: ['Slow burn', 'Emotional beats', 'Binge listener'],
  fan: ['Slow burn', 'Emotional beats', 'Binge listener'],
  'Casual listener': ['Commute', '1.5× speed', 'Cliffhangers'],
  casual: ['Commute', '1.5× speed', 'Cliffhangers'],
  'Genre purist': ['Thriller', 'Genre fidelity', 'No tonal drift'],
  purist: ['Thriller', 'Genre fidelity', 'No tonal drift'],
  Critic: ['Pacing', 'Motivation', 'Plausibility'],
  critic: ['Pacing', 'Motivation', 'Plausibility'],
}

const VALID_ACTIONS = new Set<PersonaEvent['action']>([
  'listening',
  're-listened',
  'skipped',
  'dropped',
  'completed',
])

function normalizeAction(action: string): PersonaEvent['action'] {
  if (VALID_ACTIONS.has(action as PersonaEvent['action'])) {
    return action as PersonaEvent['action']
  }
  if (action === 'continued' || action === 'reacted') return 'listening'
  return 'listening'
}

function interestsFor(groupLabel: string): string[] {
  return (
    GROUP_INTERESTS[groupLabel] ??
    GROUP_INTERESTS[groupLabel.toLowerCase()] ??
    GROUP_INTERESTS[groupLabel.replace(/_/g, ' ')] ??
    []
  )
}

export function adaptPersona(api: ApiPersona, beatCount: number): Persona {
  const profile = api.profile ?? {}
  const handle = profile.name ?? api.id
  const dropped = api.dropped_at_beat

  return {
    id: api.id,
    handle,
    group_label: api.group_label,
    profile: profile.summary ?? '',
    persona_prompt: profile.persona_prompt,
    dropped_at_beat: dropped,
    event_log: (api.event_log ?? []).map((entry) => ({
      beat_idx: entry.beat_idx,
      action: normalizeAction(entry.action),
      note: entry.note,
    })),
    status: dropped === null ? 'finished' : 'dropped',
    progress_pct:
      dropped === null ? 100 : Math.round(((dropped - 1) / Math.max(beatCount, 1)) * 100),
    interests: interestsFor(api.group_label),
  }
}

export function adaptPersonas(apiPersonas: ApiPersona[], beatCount: number): Persona[] {
  return apiPersonas.map((persona) => adaptPersona(persona, beatCount))
}
