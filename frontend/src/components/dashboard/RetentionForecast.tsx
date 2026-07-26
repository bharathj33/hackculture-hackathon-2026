import { Area, AreaChart, CartesianGrid, ReferenceDot, XAxis, YAxis } from 'recharts'
import { Panel } from '@/components/common/Panel'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useDashboard } from '@/contexts/DashboardContext'
import { pad2 } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DropoffPoint } from '@/mock/types'

const chartConfig = {
  retained_pct: { label: 'Retained', color: 'var(--chart-1)' },
} satisfies ChartConfig

/**
 * X is plotted per beat so the cliff and paywall markers land on the right
 * point, but it is labelled per episode — the tick prints only on the first
 * beat of each episode instead of repeating EP 1, EP 1.
 */
function episodeTick(dropoff: DropoffPoint[], index: number) {
  const point = dropoff[index]
  if (!point) return ''
  const previous = dropoff[index - 1]
  return previous && previous.episode === point.episode ? '' : `EP ${point.episode}`
}

function Marker({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

export function RetentionForecast({ className }: { className?: string }) {
  const { report } = useDashboard()
  const dropoff = report.dropoff
  const cliff = dropoff.find((point) => point.cliff && point.cause !== null)
  const paywall = dropoff.find((point) => point.paywall_risk)

  return (
    <Panel
      heading="Retention Forecast"
      aside={<span className="text-xs text-muted-foreground">% of panel still listening</span>}
      /*
        Panel clips its body by default, which cut the tooltip in half on the
        last beats. The chart is the one panel that has to let a child escape
        its bounds, so it opts out of the clip here rather than in the shell.
      */
      className={cn('min-w-0 overflow-visible', className)}
    >
      {dropoff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No retention curve returned for this run.</p>
      ) : (
        <>
          {/* Fixed plot height: the panel sizes itself so a taller neighbour cannot clip it. */}
          <div className="h-[200px] min-w-0 w-full overflow-hidden sm:h-[220px] sm:overflow-visible">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-full min-w-0 w-full overflow-hidden sm:overflow-visible [&_.recharts-wrapper]:!w-full [&_.recharts-wrapper]:overflow-visible"
            >
              {/* Left/right margin keeps the first and last EP tick from clipping. */}
              <AreaChart data={dropoff} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
                <defs>
                  <linearGradient id="retention-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="beat_idx"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  interval={0}
                  tickFormatter={(_value, index) => episodeTick(dropoff, index)}
                />
                <YAxis hide domain={[0, 100]} />

                <ChartTooltip
                  cursor={{ strokeDasharray: '4 4' }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) => {
                        const point = payload?.[0]?.payload as DropoffPoint | undefined
                        return point ? `EP ${point.episode} · Beat ${pad2(point.beat_idx)}` : ''
                      }}
                      formatter={(value) => (
                        <span className="flex flex-1 items-center justify-between gap-4">
                          <span className="text-muted-foreground">Retained</span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {String(value)}%
                          </span>
                        </span>
                      )}
                    />
                  }
                />

                <Area
                  dataKey="retained_pct"
                  type="monotone"
                  stroke="var(--color-retained_pct)"
                  strokeWidth={2}
                  fill="url(#retention-fill)"
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />

                {cliff && (
                  <ReferenceDot
                    x={cliff.beat_idx}
                    y={cliff.retained_pct}
                    r={5}
                    fill="var(--destructive)"
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )}
                {paywall && (
                  <ReferenceDot
                    x={paywall.beat_idx}
                    y={paywall.retained_pct}
                    r={5}
                    fill="var(--chart-2)"
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Doubles as the legend — the only two marked points on the curve. */}
          <div className="mt-3 flex shrink-0 flex-wrap gap-x-6 gap-y-1.5">
            {cliff && (
              <Marker color="var(--destructive)">
                Beat {pad2(cliff.beat_idx)} — {cliff.cause}
              </Marker>
            )}
            {paywall && (
              <Marker color="var(--chart-2)">Beat {pad2(paywall.beat_idx)} — paywall risk</Marker>
            )}
          </div>
        </>
      )}
    </Panel>
  )
}
