import type { ApiBeat } from '@/api'
import { Badge } from '@/components/ui/badge'
import type { Persona } from '@/mock/types'
import { exitDetail, exitLabel } from './personaExit'

export function InterrogationHeader({
  persona,
  beats,
  beatCount,
}: {
  persona: Persona
  beats: ApiBeat[]
  beatCount: number
}) {
  const dropped = persona.status === 'dropped'
  const detail = exitDetail(persona, beats)

  return (
    <header className="shrink-0 border-b px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-xl font-semibold tracking-tight text-foreground">
              {persona.handle}
            </h3>
            <Badge variant="secondary">{persona.group_label}</Badge>
            <Badge variant={dropped ? 'destructive' : 'success'}>
              {dropped ? 'Dropped' : 'Finished'}
            </Badge>
          </div>

          <p className="mt-2 max-w-[65ch] text-sm text-foreground">
            {exitLabel(persona, beatCount)}
            {detail && <span className="text-muted-foreground"> — {detail}</span>}
          </p>
          <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{persona.profile}</p>
          {persona.persona_prompt ? (
            <p className="mt-2 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
              {persona.persona_prompt}
            </p>
          ) : null}
        </div>

        <p className="shrink-0 text-right">
          <span className="block font-mono text-3xl leading-none font-semibold tabular-nums text-foreground">
            {persona.progress_pct}%
          </span>
          <span className="label-caps mt-1 block text-muted-foreground">Story heard</span>
        </p>
      </div>
    </header>
  )
}
