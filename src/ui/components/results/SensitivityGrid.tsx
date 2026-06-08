import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateAnnuityInstallment } from '../../../domain/calculators/annuity';
import { formatIDRCompact } from '../../../domain/utils/currency';

const RATE_OFFSETS = [0, 0.5, 1, 1.5, 2, 2.5, 3];
const TENOR_YEARS = [15, 20, 25, 30];

interface Props {
  principal: number;
  baseAnnualRate: number;
  currentTenorMonths: number;
}

export function SensitivityGrid({ principal, baseAnnualRate, currentTenorMonths }: Props) {
  const { t } = useTranslation();

  const currentTenorYears = currentTenorMonths / 12;

  const grid = useMemo(
    () =>
      RATE_OFFSETS.map((offset) => ({
        offset,
        rate: baseAnnualRate + offset / 100,
        cells: TENOR_YEARS.map((yr) => ({
          yr,
          installment: calculateAnnuityInstallment(principal, baseAnnualRate + offset / 100, yr * 12),
        })),
      })),
    [principal, baseAnnualRate],
  );

  // Closest match for current tenor column highlight
  const activeTenorYr = TENOR_YEARS.reduce((best, yr) =>
    Math.abs(yr - currentTenorYears) < Math.abs(best - currentTenorYears) ? yr : best,
  );

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('results.sensitivityTitle')}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">{t('results.sensitivityNote')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label={t('results.sensitivityTitle')}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">
                Rate
              </th>
              {TENOR_YEARS.map((yr) => (
                <th
                  key={yr}
                  className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${
                    yr === activeTenorYr ? 'text-blue-700 bg-blue-50' : 'text-gray-500'
                  }`}
                >
                  {yr} {t('results.sensitivityYr')}
                  {yr === activeTenorYr && (
                    <span className="ml-1 text-[10px] font-normal text-blue-500">
                      ({t('results.sensitivityCurrent')})
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {grid.map(({ offset, rate, cells }) => {
              const isBaseRow = offset === 0;
              return (
                <tr
                  key={offset}
                  className={isBaseRow ? 'bg-blue-50/60' : 'hover:bg-gray-50'}
                >
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                    {(rate * 100).toFixed(1)}%
                    {offset === 0 && (
                      <span className="ml-1 text-[10px] text-blue-500 font-normal">
                        ({t('results.sensitivityCurrent')})
                      </span>
                    )}
                    {offset > 0 && (
                      <span className="ml-1 text-[10px] text-gray-400 font-normal">
                        +{offset}%
                      </span>
                    )}
                  </td>
                  {cells.map(({ yr, installment }) => {
                    const isActive = isBaseRow && yr === activeTenorYr;
                    return (
                      <td
                        key={yr}
                        className={`px-3 py-2 text-right tabular-nums ${
                          isActive
                            ? 'font-bold text-blue-700 bg-blue-100/60'
                            : yr === activeTenorYr
                              ? 'text-blue-600 bg-blue-50/60'
                              : isBaseRow
                                ? 'text-gray-700'
                                : 'text-gray-600'
                        }`}
                      >
                        {formatIDRCompact(installment)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
