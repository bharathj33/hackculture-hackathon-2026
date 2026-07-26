import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PersonaAvatar } from '@/components/common/PersonaAvatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Persona } from '@/mock/types'
import { cn } from '@/lib/utils'

interface PersonaCardProps {
  persona: Persona
  runId: string
}

export function PersonaCard({ persona, runId }: PersonaCardProps) {
  const navigate = useNavigate()
  const dropped = persona.status === 'dropped'
  const detailPath = `/runs/${runId}/listeners/${persona.id}`

  const open = () => navigate(detailPath)

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
      className={cn(
        'group flex h-full cursor-pointer flex-col gap-0 py-0 transition-shadow',
        'hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
      )}
      aria-label={`Open ${persona.handle} listener record`}
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <PersonaAvatar handle={persona.handle} size={56} className="shrink-0 rounded-lg" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">
              {persona.handle}
            </p>
            <Badge variant={dropped ? 'destructive' : 'success'} className="shrink-0">
              {dropped ? 'Dropped' : 'Finished'}
            </Badge>
          </div>
          <Badge variant="outline" className="mt-2">
            {persona.group_label}
          </Badge>
        </div>
      </div>

      <p className="px-4 text-sm leading-relaxed break-words text-muted-foreground sm:px-5">{persona.profile}</p>

      <div className="mt-3 flex flex-wrap gap-1.5 px-4 pb-4 sm:px-5 sm:pb-5">
        {persona.interests.map((interest) => (
          <Badge key={interest} variant="secondary" className="font-normal">
            {interest}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t px-4 py-3 text-sm sm:px-5">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {persona.progress_pct}% heard
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
          Interrogate
          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Card>
  )
}
