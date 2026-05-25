import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { AmortizationRow } from '../../../domain/models/amortization.types';
import {
  buildBarData,
  shouldUseYearlyGrouping,
  formatChartAmount,
} from '../../utils/chartDataTransform';
import { formatIDR } from '../../../domain/utils/currency';

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface BarTooltipPayloadEntry {
  name: string;
  value: number;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: BarTooltipPayloadEntry[];
  label?: string;
}

function BarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null;

  const principal = payload.find((p) => p.name === 'Pokok')?.value ?? 0;
  const interest = payload.find((p) => p.name === 'Bunga')?.value ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block shrink-0" />
            Pokok
          </span>
          <span className="font-medium tabular-nums text-blue-700">{formatIDR(principal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block shrink-0" />
            Bunga
          </span>
          <span className="font-medium tabular-nums text-orange-600">{formatIDR(interest)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1.5">
          <span className="text-gray-500">Total Cicilan</span>
          <span className="font-semibold tabular-nums text-gray-900">
            {formatIDR(principal + interest)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Legend formatter ─────────────────────────────────────────────────────────

function legendFormatter(value: string): React.ReactNode {
  return <span className="text-xs text-gray-600">{value}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  schedule: AmortizationRow[];
}

export function AmortizationBarChart({ schedule }: Props) {
  const useYearly = shouldUseYearlyGrouping(schedule);
  const data = useMemo(() => buildBarData(schedule), [schedule]);

  const xInterval = data.length > 24 ? Math.floor(data.length / 10) - 1 : 0;

  return (
    <>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Pokok vs Bunga per {useYearly ? 'Tahun' : 'Bulan'}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="periodLabel"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
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
          <Tooltip content={<BarTooltip />} cursor={{ fill: '#F9FAFB' }} />
          <Legend iconType="square" iconSize={9} formatter={legendFormatter} />
          <Bar dataKey="principal" name="Pokok" stackId="stack" fill="#2563EB" />
          <Bar
            dataKey="interest"
            name="Bunga"
            stackId="stack"
            fill="#F97316"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
