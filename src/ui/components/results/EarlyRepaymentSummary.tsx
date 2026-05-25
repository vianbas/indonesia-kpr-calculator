import { formatIDR, formatTenor } from '../../../domain/utils/currency';
import type { MortgageSummary } from '../../../domain';

interface Props {
  summary: MortgageSummary;
}

export function EarlyRepaymentSummary({ summary }: Props) {
  const { monthsSaved, interestSaved, interestSavedPercent, effectiveTenorMonths, originalTenorMonths } = summary;

  if (monthsSaved === 0 && interestSaved === 0) return null;

  return (
    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-teal-600 text-lg">✓</span>
        <p className="text-sm font-bold text-teal-800">Hasil Pelunasan Dipercepat</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {monthsSaved > 0 && (
          <div className="rounded-lg bg-white/70 border border-teal-100 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Tenor Dihemat
            </p>
            <p className="text-base font-bold text-teal-700">
              {monthsSaved} Bulan
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatTenor(effectiveTenorMonths)} dari {formatTenor(originalTenorMonths)}
            </p>
          </div>
        )}

        {interestSaved > 0 && (
          <div className="rounded-lg bg-white/70 border border-teal-100 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Bunga Dihemat
            </p>
            <p className="text-base font-bold text-teal-700">
              {formatIDR(interestSaved)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {interestSavedPercent.toFixed(1)}% dari total bunga
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
