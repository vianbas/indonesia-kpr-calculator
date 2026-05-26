import { formatIDR, formatIDRCompact } from '../../../domain/utils/currency';
import type { RefinancingResult } from '../../../domain/calculators/refinancing';

interface Props {
  result: RefinancingResult;
}

const BADGE = {
  worth_it: {
    label: 'Disarankan',
    className: 'bg-green-100 text-green-800 border border-green-200',
  },
  marginal: {
    label: 'Pertimbangkan',
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },
  not_worth_it: {
    label: 'Tidak Disarankan',
    className: 'bg-red-100 text-red-800 border border-red-200',
  },
} as const;

function MetricRow({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-b-0">
      <div>
        <p className="text-xs font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <p className={['text-sm font-semibold text-right tabular-nums', valueClass ?? 'text-gray-900'].join(' ')}>
        {value}
      </p>
    </div>
  );
}

export function RefinancingResultCard({ result }: Props) {
  const badge = BADGE[result.recommendation];

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header: recommendation badge */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-700">Hasil Analisis Refinancing</p>
        <span className={['text-xs font-bold px-2.5 py-0.5 rounded-full', badge.className].join(' ')}>
          {badge.label}
        </span>
      </div>

      {/* Monthly payment comparison */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Cicilan Saat Ini</p>
          <p className="text-base font-bold text-gray-800 tabular-nums">
            {formatIDRCompact(result.currentMonthlyPayment)}
          </p>
          <p className="text-xs text-gray-400">/bulan</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">Cicilan Baru</p>
          <p
            className={[
              'text-base font-bold tabular-nums',
              result.monthlySavings > 0 ? 'text-green-700' : 'text-red-600',
            ].join(' ')}
          >
            {formatIDRCompact(result.newMonthlyPayment)}
          </p>
          <p className="text-xs text-gray-400">/bulan</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4">
        <MetricRow
          label="Selisih Cicilan"
          value={
            result.monthlySavings === 0
              ? 'Tidak ada perubahan'
              : `${result.monthlySavings > 0 ? 'Hemat' : 'Naik'} ${formatIDRCompact(Math.abs(result.monthlySavings))}/bln`
          }
          valueClass={
            result.monthlySavings > 0
              ? 'text-green-700'
              : result.monthlySavings < 0
                ? 'text-red-600'
                : 'text-gray-500'
          }
        />
        <MetricRow
          label="Total Biaya Pindah"
          value={formatIDR(result.totalSwitchingCost)}
          sub="Provisi + appraisal + admin"
        />
        <MetricRow
          label="Penghematan Bunga"
          value={
            result.totalInterestSavings === 0
              ? 'Rp0'
              : `${result.totalInterestSavings > 0 ? '' : '-'}${formatIDRCompact(Math.abs(result.totalInterestSavings))}`
          }
          sub="Selisih total bunga dua pilihan"
          valueClass={result.totalInterestSavings >= 0 ? 'text-green-700' : 'text-red-600'}
        />
        <MetricRow
          label="Break-Even"
          value={
            result.breakEvenMonths === null
              ? 'Tidak tercapai'
              : result.breakEvenMonths === 0
                ? 'Segera'
                : `${result.breakEvenMonths} bulan`
          }
          sub="Bulan untuk menutup biaya pindah"
          valueClass={
            result.breakEvenMonths === null
              ? 'text-red-600'
              : result.breakEvenMonths === 0
                ? 'text-green-700'
                : 'text-gray-900'
          }
        />
        <MetricRow
          label="Penghematan Bersih"
          value={
            result.netSavings === 0
              ? 'Rp0'
              : `${result.netSavings > 0 ? '' : '-'}${formatIDRCompact(Math.abs(result.netSavings))}`
          }
          sub="Setelah biaya pindah dikurangi"
          valueClass={result.netSavings >= 0 ? 'text-green-700' : 'text-red-600'}
        />
      </div>
    </div>
  );
}
