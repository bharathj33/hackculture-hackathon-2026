import { useId } from 'react'
import { Panel } from '@/components/common/Panel'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { Persona } from '@/mock/types'
import { exitLabel } from './personaExit'

interface PersonaOptionProps {
  persona: Persona
  selected: boolean
  beatCount: number
  onSelect: () => void
}

function PersonaOption({ persona, selected, beatCount, onSelect }: PersonaOptionProps) {
  const inputId = useId()
  const dropped = persona.status === 'dropped'
  const exit = exitLabel(persona, beatCount)

  return (
    <li className="group relative shrink-0 lg:shrink">
      <input
        id={inputId}
        type="radio"
        name="persona-roster"
        value={persona.id}
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <label htmlFor={inputId} className="absolute inset-0 z-10 cursor-pointer">
        <span className="sr-only">
          {persona.handle}. {persona.group_label}. {exit}. {persona.progress_pct}% of the story
          heard.
        </span>
      </label>

      {/* Duplicates the label text above, so it is decorative to a screen reader. */}
      <div
        aria-hidden
        className={cn(
          'transition-colors',
          'w-[148px] rounded-lg border px-3 py-2.5',
          'lg:w-auto lg:rounded-none lg:border-0 lg:border-l-2 lg:px-4 lg:py-3',
          'peer-focus-visible:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-inset',
          selected
            ? 'border-primary bg-muted lg:border-l-primary'
            : 'border-border group-hover:bg-muted lg:border-l-transparent',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-foreground">
            {persona.handle}
          </span>
          <Badge variant={dropped ? 'destructive' : 'success'} className="shrink-0 text-[10px] lg:text-xs">
            {dropped ? 'Dropped' : 'Finished'}
          </Badge>
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">{persona.group_label}</p>
        <p className="mt-2 hidden truncate text-xs text-foreground lg:block">{exit}</p>

        <Progress value={persona.progress_pct} className="mt-2 h-1 lg:h-1.5" />
      </div>
    </li>
  )
}

interface PersonaRailProps {
  personas: Persona[]
  selectedId: string
  beatCount: number
  onSelect: (id: string) => void
}

export function PersonaRail({ personas, selectedId, beatCount, onSelect }: PersonaRailProps) {
  return (
    <Panel
      heading="Listener roster"
      flush
      className="min-w-0 shrink-0 lg:min-h-0 lg:shrink"
      aside={
        <Badge variant="muted" className="font-mono tabular-nums">
          {personas.length}
        </Badge>
      }
    >
      <div className="overflow-x-auto lg:min-h-0 lg:flex-1 lg:overflow-x-hidden lg:overflow-y-auto">
        {/* min-w-0 defeats the UA `min-inline-size: min-content` on fieldset,
            which would otherwise stretch the rail to fit untruncated handles. */}
        <fieldset className="min-w-0">
          <legend className="sr-only">Select a simulated listener to interrogate</legend>
          <ul className="flex flex-row gap-2 p-2 lg:flex-col lg:divide-y lg:gap-0 lg:p-0">
            {personas.map((persona) => (
              <PersonaOption
                key={persona.id}
                persona={persona}
                selected={persona.id === selectedId}
                beatCount={beatCount}
                onSelect={() => onSelect(persona.id)}
              />
            ))}
          </ul>
        </fieldset>
      </div>
    </Panel>
  )
}
