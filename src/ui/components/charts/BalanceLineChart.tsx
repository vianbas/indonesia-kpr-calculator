import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';
import {
  buildBalanceData,
  buildRateChangeMarks,
  formatChartAmount,
} from '../../utils/chartDataTransform';
import { formatIDR } from '../../../domain/utils/currency';

// ─── Colors per scenario slot ─────────────────────────────────────────────────

const SCENARIO_COLORS: Record<number, string> = {
  1: '#378ADD',
  2: '#1D9E75',
  3: '#BA7517',
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface PayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface BalanceTooltipProps {
  active?: boolean;
  payload?: PayloadEntry[];
  label?: number;
  useYearly: boolean;
}

function BalanceTooltip({ active, payload, label, useYearly }: BalanceTooltipProps) {
  if (!active || !payload?.length || label == null) return null;

  const periodLabel = useYearly ? `Tahun ${label}` : `Bulan ${label}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2">{periodLabel}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums" style={{ color: entry.color }}>
              {formatIDR(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Legend formatter ─────────────────────────────────────────────────────────

function legendFormatter(value: string): React.ReactNode {
  return <span className="text-xs text-gray-600">{value}</span>;
}

// ─── Merged data builder ──────────────────────────────────────────────────────

/** Merges balance series from all scenarios onto a shared period axis. */
function buildMergedData(
  calculated: CalculatedScenario[],
  useYearly: boolean,
): Record<string, unknown>[] {
  const allPeriods = new Set<number>();
  const seriesMap = new Map<number, Record<string, number>>();

  for (const s of calculated) {
    const pts = buildBalanceData(s.summary.schedule, useYearly);
    for (const pt of pts) {
      allPeriods.add(pt.period);
      const existing = seriesMap.get(pt.period) ?? {};
      existing[`s${s.id}`] = pt.balance;
      seriesMap.set(pt.period, existing);
    }
  }

  return Array.from(allPeriods)
    .sort((a, b) => a - b)
    .map((period) => ({
      period,
      periodLabel: useYearly ? `Thn ${period}` : `Bln ${period}`,
      ...(seriesMap.get(period) ?? {}),
    }));
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  calculated: CalculatedScenario[];
  /** Determined once by ChartSection so bar and line charts share the same axis. */
  useYearlyGrouping: boolean;
}

export function BalanceLineChart({ calculated, useYearlyGrouping }: Props) {
  const primarySchedule = calculated[0].summary.schedule;

  const mergedData = useMemo(
    () => buildMergedData(calculated, useYearlyGrouping),
    [calculated, useYearlyGrouping],
  );

  // Reference lines only for single-scenario view — too cluttered with multiple lines
  const rateMarks = useMemo(
    () =>
      calculated.length === 1
        ? buildRateChangeMarks(primarySchedule, useYearlyGrouping)
        : [],
    [calculated.length, primarySchedule, useYearlyGrouping],
  );

  const xInterval = mergedData.length > 24 ? Math.floor(mergedData.length / 10) - 1 : 0;
  const showLegend = calculated.length > 1;

  return (
    <>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Saldo Sisa per {useYearlyGrouping ? 'Tahun' : 'Bulan'}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={mergedData}
          margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={(v: number) => (useYearlyGrouping ? `Thn ${v}` : `Bln ${v}`)}
            tick={{ fontSize: 11, fill: '#4B5563' }}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
            interval={xInterval}
          />
          <YAxis
            tickFormatter={formatChartAmount}
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            content={<BalanceTooltip useYearly={useYearlyGrouping} />}
            cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }}
          />
          {showLegend && (
            <Legend iconType="line" iconSize={16} formatter={legendFormatter} />
          )}

          {/* Rate-change reference lines — single-scenario view only */}
          {rateMarks.map((mark, i) => (
            <ReferenceLine
              key={i}
              x={mark.period}
              stroke={mark.type === 'fixed' ? '#93C5FD' : '#A5B4FC'}
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
          ))}

          {/* One line per scenario, each ending at its own effectiveTenorMonths */}
          {calculated.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={`s${s.id}`}
              name={s.label}
              stroke={SCENARIO_COLORS[s.id] ?? '#378ADD'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
