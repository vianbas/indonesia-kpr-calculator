import { useTranslation } from 'react-i18next';
import { formatIDR, formatTenor } from '../../../domain/utils/currency';
import type { MortgageSummary } from '../../../domain';

interface Props {
  summary: MortgageSummary;
}

export function EarlyRepaymentSummary({ summary }: Props) {
  const { t } = useTranslation();
  const { monthsSaved, interestSaved, interestSavedPercent, effectiveTenorMonths, originalTenorMonths } = summary;

  if (monthsSaved === 0 && interestSaved === 0) return null;

  return (
    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-teal-600 text-lg">✓</span>
        <p className="text-sm font-bold text-teal-800">{t('results.earlyRepaymentTitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {monthsSaved > 0 && (
          <div className="rounded-lg bg-white/70 border border-teal-100 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('results.tenorSaved')}
            </p>
            <p className="text-base font-bold text-teal-700">
              {t('results.tenorSavedValue', { count: monthsSaved })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('results.tenorSavedDetail', {
                effective: formatTenor(effectiveTenorMonths),
                original: formatTenor(originalTenorMonths),
              })}
            </p>
          </div>
        )}

        {interestSaved > 0 && (
          <div className="rounded-lg bg-white/70 border border-teal-100 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {t('results.interestSaved')}
            </p>
            <p className="text-base font-bold text-teal-700">
              {formatIDR(interestSaved)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('results.interestSavedPct', { pct: interestSavedPercent.toFixed(1) })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
