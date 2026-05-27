import { useTranslation } from 'react-i18next';
import { formatIDR, formatIDRCompact } from '../../../domain/utils/currency';
import type { RefinancingResult } from '../../../domain/calculators/refinancing';

interface Props {
  result: RefinancingResult;
}

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
  const { t } = useTranslation();

  const BADGE = {
    worth_it: {
      label: t('refinancing.badgeWorthIt'),
      className: 'bg-green-100 text-green-800 border border-green-200',
    },
    marginal: {
      label: t('refinancing.badgeMarginal'),
      className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    },
    not_worth_it: {
      label: t('refinancing.badgeNotWorthIt'),
      className: 'bg-red-100 text-red-800 border border-red-200',
    },
  } as const;

  const badge = BADGE[result.recommendation];

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-700">{t('refinancing.resultTitle')}</p>
        <span className={['text-xs font-bold px-2.5 py-0.5 rounded-full', badge.className].join(' ')}>
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">{t('refinancing.currentInstallment')}</p>
          <p className="text-base font-bold text-gray-800 tabular-nums">
            {formatIDRCompact(result.currentMonthlyPayment)}
          </p>
          <p className="text-xs text-gray-400">{t('refinancing.perMonth')}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-0.5">{t('refinancing.newInstallment')}</p>
          <p
            className={[
              'text-base font-bold tabular-nums',
              result.monthlySavings > 0 ? 'text-green-700' : 'text-red-600',
            ].join(' ')}
          >
            {formatIDRCompact(result.newMonthlyPayment)}
          </p>
          <p className="text-xs text-gray-400">{t('refinancing.perMonth')}</p>
        </div>
      </div>

      <div className="px-4">
        <MetricRow
          label={t('refinancing.installmentDiff')}
          value={
            result.monthlySavings === 0
              ? t('refinancing.installmentNoChange')
              : result.monthlySavings > 0
                ? t('refinancing.installmentSavings', { amount: formatIDRCompact(Math.abs(result.monthlySavings)) })
                : t('refinancing.installmentIncrease', { amount: formatIDRCompact(Math.abs(result.monthlySavings)) })
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
          label={t('refinancing.totalSwitchCost')}
          value={formatIDR(result.totalSwitchingCost)}
          sub={t('refinancing.totalSwitchCostSub')}
        />
        <MetricRow
          label={t('refinancing.interestSavings')}
          value={
            result.totalInterestSavings === 0
              ? 'Rp0'
              : `${result.totalInterestSavings > 0 ? '' : '-'}${formatIDRCompact(Math.abs(result.totalInterestSavings))}`
          }
          sub={t('refinancing.interestSavingsSub')}
          valueClass={result.totalInterestSavings >= 0 ? 'text-green-700' : 'text-red-600'}
        />
        <MetricRow
          label={t('refinancing.breakEven')}
          value={
            result.breakEvenMonths === null
              ? t('refinancing.breakEvenNotReached')
              : result.breakEvenMonths === 0
                ? t('refinancing.breakEvenImmediate')
                : t('refinancing.breakEvenMonths', { count: result.breakEvenMonths })
          }
          sub={t('refinancing.breakEvenSub')}
          valueClass={
            result.breakEvenMonths === null
              ? 'text-red-600'
              : result.breakEvenMonths === 0
                ? 'text-green-700'
                : 'text-gray-900'
          }
        />
        <MetricRow
          label={t('refinancing.netSavings')}
          value={
            result.netSavings === 0
              ? 'Rp0'
              : `${result.netSavings > 0 ? '' : '-'}${formatIDRCompact(Math.abs(result.netSavings))}`
          }
          sub={t('refinancing.netSavingsSub')}
          valueClass={result.netSavings >= 0 ? 'text-green-700' : 'text-red-600'}
        />
      </div>
    </div>
  );
}
