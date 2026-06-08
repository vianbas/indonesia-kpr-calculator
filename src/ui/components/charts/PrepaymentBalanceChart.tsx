import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { MortgageSummary } from '../../../domain';
import { buildPrepaymentChartData } from '../../utils/chartDataTransform';
import { formatIDR } from '../../../domain/utils/currency';
import { formatChartAmount } from '../../utils/chartDataTransform';

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface PrepayTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
  useYearly: boolean;
}

function PrepayTooltip({ active, payload, label, useYearly }: PrepayTooltipProps) {
  if (!active || !payload?.length || label == null) return null;
  const periodLabel = useYearly ? `Tahun ${label}` : `Bulan ${label}`;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-2">{periodLabel}</p>
      <div className="space-y-1.5">
        {payload.filter((e) => e.value != null).map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
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

function legendFormatter(value: string): React.ReactNode {
  return <span className="text-xs text-gray-600">{value}</span>;
}

interface Props {
  summary: MortgageSummary;
  useYearlyGrouping: boolean;
}

export function PrepaymentBalanceChart({ summary, useYearlyGrouping }: Props) {
  const { t } = useTranslation();

  const data = useMemo(
    () => buildPrepaymentChartData(
      summary.schedule,
      summary.totalPrincipal,
      summary.installmentGroups,
      useYearlyGrouping,
    ),
    [summary, useYearlyGrouping],
  );

  if (data.length === 0) return null;

  return (
    <>
      <div className="border-t border-gray-100" />
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t('chart.prepaymentTitle')}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(v: number) => (useYearlyGrouping ? `Thn ${v}` : `Bln ${v}`)}
              tick={{ fontSize: 11, fill: '#4B5563' }}
              tickMargin={6}
              tickLine={false}
              axisLine={false}
              angle={-90}
              textAnchor="end"
              interval="preserveStartEnd"
              minTickGap={2}
              height={52}
            />
            <YAxis
              tickFormatter={formatChartAmount}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              content={<PrepayTooltip useYearly={useYearlyGrouping} />}
              cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }}
            />
            <Legend iconType="line" iconSize={16} formatter={legendFormatter} />
            <Line
              type="monotone"
              dataKey="actual"
              name={t('chart.prepaymentWithPrepay')}
              stroke="#1D9E75"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name={t('chart.prepaymentBaseline')}
              stroke="#94A3B8"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
