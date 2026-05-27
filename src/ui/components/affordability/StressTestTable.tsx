import { useTranslation } from 'react-i18next';
import { formatIDR, formatPercent } from '../../../domain/utils/currency';
import type { StressRow, RiskBand } from '../../../domain/calculators/affordability';

const bandStyle: Record<RiskBand, string> = {
  safe: 'bg-green-100 text-green-800',
  watch: 'bg-yellow-100 text-yellow-800',
  risky: 'bg-red-100 text-red-800',
};

interface Props {
  rows: StressRow[];
  maxDSR: number;
}

export function StressTestTable({ rows, maxDSR }: Props) {
  const { t } = useTranslation();

  const bandLabel: Record<RiskBand, string> = {
    safe:  t('affordability.bandSafe'),
    watch: t('affordability.bandWatch'),
    risky: t('affordability.bandRisky'),
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-200">
            <th className="text-left pb-2 font-medium">{t('affordability.stressColScenario')}</th>
            <th className="text-right pb-2 font-medium">{t('affordability.stressColInstallment')}</th>
            <th className="text-right pb-2 font-medium">{t('affordability.stressColDsr')}</th>
            <th className="text-right pb-2 font-medium">{t('affordability.stressColSurplus')}</th>
            <th className="text-right pb-2 font-medium">{t('affordability.stressColStatus')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.rateOffsetPct} className={row.rateOffsetPct === 0 ? 'bg-gray-50' : ''}>
              <td className="py-2 pr-2 font-medium text-gray-700">
                {row.rateOffsetPct === 0
                  ? t('affordability.stressCurrentRate', { rate: formatPercent(row.annualRate, 0) })
                  : t('affordability.stressRateOffset', { pct: row.rateOffsetPct })}
              </td>
              <td className="py-2 text-right tabular-nums text-gray-800">
                {formatIDR(row.installment)}
              </td>
              <td
                className={[
                  'py-2 text-right tabular-nums font-medium',
                  row.dsr > maxDSR ? 'text-red-600' : 'text-gray-700',
                ].join(' ')}
              >
                {formatPercent(row.dsr, 1)}
              </td>
              <td
                className={[
                  'py-2 text-right tabular-nums',
                  row.netSurplus < 0 ? 'text-red-600' : 'text-gray-700',
                ].join(' ')}
              >
                {formatIDR(row.netSurplus)}
              </td>
              <td className="py-2 text-right">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded-full font-semibold ${bandStyle[row.band]}`}
                >
                  {bandLabel[row.band]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
