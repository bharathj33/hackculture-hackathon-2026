import { ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PersonaAvatar } from '@/components/common/PersonaAvatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { GROUP_ACCENT, parseCastProfile } from '@/lib/parseCastProfile'
import type { CastProfile } from '@/mock/types'
import { cn } from '@/lib/utils'

interface CastProfileCardProps {
  profile: CastProfile
}

/** Compact roster tile — detail lives on the profile page. */
export function CastProfileCard({ profile }: CastProfileCardProps) {
  const navigate = useNavigate()
  const parsed = parseCastProfile(profile)
  const accent = GROUP_ACCENT[parsed.group_label] ?? 'bg-muted'
  const detailPath = `/personas/${encodeURIComponent(profile.handle)}`

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
        'group relative flex h-full cursor-pointer flex-col overflow-hidden py-0 transition-all',
        'hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
      )}
      aria-label={`View ${parsed.displayName} cast profile`}
    >
      <div className={cn('h-1.5 w-full', accent)} aria-hidden />

      <div className="flex flex-1 flex-col items-center px-4 pt-5 pb-4 text-center">
        <div className="relative">
          <PersonaAvatar handle={parsed.handle} size={72} className="rounded-xl" />
          <span
            className={cn(
              'absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border bg-background',
              'text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100',
            )}
            aria-hidden
          >
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>

        <p className="mt-3 text-base font-semibold tracking-tight">{parsed.displayName}</p>
        <p className="font-mono text-xs text-muted-foreground">{parsed.handle}</p>

        <Badge variant="outline" className="mt-2">
          {parsed.group_label}
        </Badge>

        {parsed.cardMeta.length > 0 ? (
          <p className="mt-3 font-mono text-xs tracking-tight text-muted-foreground tabular-nums">
            {parsed.cardMeta.join(' · ')}
          </p>
        ) : null}

        {!parsed.isCritic && (parsed.genre || parsed.habit) ? (
          <div className="mt-2.5 flex flex-wrap justify-center gap-1">
            {parsed.genre ? (
              <Badge variant="secondary" className="px-2 py-0 text-xs font-normal">
                {parsed.genre}
              </Badge>
            ) : null}
            {parsed.habit ? (
              <Badge variant="secondary" className="px-2 py-0 text-xs font-normal">
                {parsed.habit}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {profile.persona_prompt ? (
          <p className="mt-3 line-clamp-2 text-left text-xs leading-relaxed text-muted-foreground">
            {profile.persona_prompt}
          </p>
        ) : null}
      </div>
    </Card>
  )
}
