import { useId } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PanelProps {
  heading: string
  /** Right-hand slot in the heading row — a legend, a filter, a count. */
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Body gets no padding when the child manages its own scroll region. */
  flush?: boolean
}

/**
 * The one panel shell. Replaces PanelFrame, PanelShell and four hand-rolled
 * copies. Depth comes from the Card primitive, so it tracks the theme in both
 * light and dark rather than assuming a dark ground.
 */
export function Panel({ heading, aside, children, className, flush }: PanelProps) {
  const id = useId()

  return (
    <Card
      aria-labelledby={id}
      className={cn('flex min-h-0 flex-col gap-0 overflow-hidden py-0', className)}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <h2 id={id} className="label-caps text-muted-foreground">
          {heading}
        </h2>
        {aside}
      </div>
      <div className={cn('flex min-h-0 flex-1 flex-col', !flush && 'p-4')}>{children}</div>
    </Card>
  )
}
