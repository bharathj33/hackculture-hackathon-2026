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
    <li className="group relative">
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
          'border-l-2 px-4 py-3 transition-colors',
          'peer-focus-visible:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-inset',
          selected ? 'border-l-primary bg-muted' : 'border-l-transparent group-hover:bg-muted',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-foreground">
            {persona.handle}
          </span>
          <Badge variant={dropped ? 'destructive' : 'success'}>
            {dropped ? 'Dropped' : 'Finished'}
          </Badge>
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">{persona.group_label}</p>
        <p className="mt-2 truncate text-xs text-foreground">{exit}</p>

        <Progress value={persona.progress_pct} className="mt-2 h-1.5" />
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
      className="min-w-0"
      aside={
        <Badge variant="muted" className="font-mono tabular-nums">
          {personas.length}
        </Badge>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* min-w-0 defeats the UA `min-inline-size: min-content` on fieldset,
            which would otherwise stretch the rail to fit untruncated handles. */}
        <fieldset className="min-w-0">
          <legend className="sr-only">Select a simulated listener to interrogate</legend>
          <ul className="divide-y">
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
