import { Sparkles } from 'lucide-react'
import { PersonaAvatar } from '@/components/common/PersonaAvatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { GROUP_ACCENT, parseCastProfile, type ParsedCastProfile } from '@/lib/parseCastProfile'
import type { CastProfile } from '@/mock/types'
import { cn } from '@/lib/utils'

interface CastProfileDetailsProps {
  profile: CastProfile
  panelName?: string | null
  compact?: boolean
}

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="min-w-[7.5rem] flex-1 rounded-lg border bg-card px-4 py-3.5">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 truncate text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export function CastProfileDetails({ profile, panelName, compact = false }: CastProfileDetailsProps) {
  const parsed: ParsedCastProfile = parseCastProfile(profile)
  const accent = GROUP_ACCENT[parsed.group_label] ?? 'bg-muted'

  if (compact) {
    return (
      <article className="flex min-w-0 flex-col items-center text-center">
        <div className={cn('h-1.5 w-full rounded-t-xl', accent)} aria-hidden />
        <PersonaAvatar handle={parsed.handle} size={96} className="mt-5 rounded-xl" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{parsed.displayName}</h2>
        <p className="font-mono text-xs text-muted-foreground">{parsed.handle}</p>
        <Badge variant="outline" className="mt-2">
          {parsed.group_label}
        </Badge>
      </article>
    )
  }

  const statCells = (
    parsed.isCritic
      ? [{ label: 'Role', value: parsed.group_label }]
      : [
          { label: 'Age', value: parsed.age },
          { label: 'Gender', value: parsed.gender },
          { label: 'City', value: parsed.city },
          { label: 'Genre', value: parsed.genre },
          { label: 'Habit', value: parsed.habit },
          { label: 'Market', value: parsed.market },
          { label: 'Language', value: parsed.languageLabel ?? parsed.language },
        ]
  ).filter((cell) => cell.value !== null && cell.value !== undefined && cell.value !== '')

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden py-0">
      <article className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col items-center border-b bg-muted/20 px-6 pt-6 pb-6 lg:border-r lg:border-b-0">
          <div className={cn('h-1.5 w-full rounded-full', accent)} aria-hidden />

          <div className="mt-6 rounded-2xl border bg-background p-2 shadow-sm">
            <PersonaAvatar handle={parsed.handle} size={112} className="rounded-xl" />
          </div>

          <h2 className="mt-4 text-center text-xl font-semibold tracking-tight">{parsed.displayName}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{parsed.handle}</p>
          <Badge variant="outline" className="mt-2">
            {parsed.group_label}
          </Badge>

          {panelName ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">{panelName}</p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-5 p-6">
          <dl className="flex flex-wrap gap-2">
            {statCells.map((cell) => (
              <Stat key={cell.label} label={cell.label} value={cell.value} />
            ))}
          </dl>

          {parsed.isCritic && parsed.bio ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{parsed.bio}</p>
          ) : null}

          {parsed.interests.length > 0 ? (
            <section>
              <h3 className="flex items-center gap-1.5 label-caps text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden />
                Interests
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {parsed.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-xs font-normal">
                    {interest}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {profile.persona_prompt ? (
            <section>
              <h3 className="label-caps text-muted-foreground">Persona prompt</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-foreground">{profile.persona_prompt}</p>
            </section>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Panel cast template — simulated on every full swarm run. Open a completed run&apos;s
            Listeners tab for reactions and interrogation.
          </p>
        </div>
      </article>
    </Card>
  )
}
