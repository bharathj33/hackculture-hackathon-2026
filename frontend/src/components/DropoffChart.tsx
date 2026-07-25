import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DropoffPoint } from '../types';

const LINE = '#7285f2';
const CLIFF = '#e4574f';
const PAYWALL = '#d99a2b';
const GRID = 'rgba(255,255,255,0.07)';
const INK_MUTED = '#8b93a7';

interface Props {
  data: DropoffPoint[];
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: DropoffPoint;
}

function renderDot(props: DotProps) {
  const { cx, cy, payload, index } = props;
  const key = `dot-${index ?? 0}`;
  if (cx == null || cy == null || !payload) return <g key={key} />;
  if (payload.cliff) {
    return (
      <g key={key}>
        <circle cx={cx} cy={cy} r={6} fill={CLIFF} stroke="#14161d" strokeWidth={2} />
        {payload.paywall_risk && (
          <text x={cx} y={cy - 12} textAnchor="middle" fill={PAYWALL} fontSize={11} fontWeight={700}>
            PW
          </text>
        )}
      </g>
    );
  }
  if (payload.paywall_risk) {
    return (
      <g key={key}>
        <circle cx={cx} cy={cy} r={5} fill="none" stroke={PAYWALL} strokeWidth={2} />
        <text x={cx} y={cy - 10} textAnchor="middle" fill={PAYWALL} fontSize={11} fontWeight={700}>
          PW
        </text>
      </g>
    );
  }
  return (
    <circle key={key} cx={cx} cy={cy} r={2.5} fill={LINE} stroke="#14161d" strokeWidth={1} />
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: DropoffPoint }[];
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">Beat {p.beat_idx}</div>
      <div>Retained: {p.retained_pct.toFixed(1)}%</div>
      {p.cliff && (
        <div className="tooltip-cliff">Cliff{p.cause ? ` — ${p.cause}` : ''}</div>
      )}
      {p.paywall_risk && <div className="tooltip-paywall">Paywall risk</div>}
    </div>
  );
}

export default function DropoffChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => a.beat_idx - b.beat_idx);
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={sorted} margin={{ top: 20, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="beat_idx"
            stroke={INK_MUTED}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            fontSize={12}
            label={{ value: 'Beat', position: 'insideBottomRight', offset: -4, fill: INK_MUTED, fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke={INK_MUTED}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={40}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID }} />
          <Line
            type="monotone"
            dataKey="retained_pct"
            stroke={LINE}
            strokeWidth={2}
            dot={renderDot}
            activeDot={{ r: 6, fill: LINE, stroke: '#14161d', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: LINE }} /> Retained %
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-dot" style={{ background: CLIFF }} /> Cliff (drop-off)
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-ring" style={{ borderColor: PAYWALL }} /> Paywall risk
        </span>
      </div>
    </div>
  );
}
