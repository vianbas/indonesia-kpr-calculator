import { formatIDR, formatPercent } from '../../../domain/utils/currency';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  scenarios: CalculatedScenario[];
}

interface RowDef {
  label: string;
  getValue: (s: CalculatedScenario) => string;
  getNumeric?: (s: CalculatedScenario) => number;
  isSection?: boolean; // if true, renders as a section header row
}

const ROWS: RowDef[] = [
  { label: 'Info Kredit', isSection: true, getValue: () => '' },
  {
    label: 'Nilai Kredit',
    getValue: (s) => formatIDR(s.summary.totalPrincipal),
  },
  {
    label: 'Tenor',
    getValue: (s) => `${s.summary.schedule.length} Bulan`,
  },
  {
    label: 'Metode Bayar',
    getValue: (s) => (s.form.paymentMethod === 'annuity' ? 'Anuitas' : 'Flat Rate'),
  },
  { label: 'Hasil Simulasi', isSection: true, getValue: () => '' },
  {
    label: 'Cicilan Pertama',
    getValue: (s) => formatIDR(s.summary.installmentGroups[0]?.installmentAmount ?? 0),
    getNumeric: (s) => s.summary.installmentGroups[0]?.installmentAmount ?? 0,
  },
  {
    label: 'Total Bunga',
    getValue: (s) => formatIDR(s.summary.totalInterest),
    getNumeric: (s) => s.summary.totalInterest,
  },
  {
    label: 'Total Pembayaran',
    getValue: (s) => formatIDR(s.summary.totalPayment),
    getNumeric: (s) => s.summary.totalPayment,
  },
  {
    label: 'Suku Bunga Efektif',
    getValue: (s) => formatPercent(s.summary.effectiveAnnualRate, 2, true),
    getNumeric: (s) => s.summary.effectiveAnnualRate,
  },
];

function getCellClass(values: number[], idx: number): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return '';
  if (values[idx] === min) return 'bg-green-50 text-green-800 font-semibold';
  if (values[idx] === max) return 'bg-red-50 text-red-700';
  return '';
}

export function ScenarioComparisonTable({ scenarios }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 bg-gray-50 text-gray-600 font-semibold text-xs w-40">
              Metrik
            </th>
            {scenarios.map((s) => (
              <th
                key={s.id}
                className="text-right py-2 px-3 bg-gray-50 text-blue-800 font-semibold text-xs"
              >
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, ri) => {
            if (row.isSection) {
              return (
                <tr key={ri}>
                  <td
                    colSpan={scenarios.length + 1}
                    className="py-1.5 px-3 bg-blue-600 text-white text-xs font-semibold uppercase tracking-wide"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const numericValues = row.getNumeric
              ? scenarios.map((s) => row.getNumeric!(s))
              : null;

            return (
              <tr key={ri} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 px-3 text-gray-700 font-medium bg-gray-50 text-xs">
                  {row.label}
                </td>
                {scenarios.map((s, si) => {
                  const cellClass = numericValues
                    ? getCellClass(numericValues, si)
                    : '';
                  return (
                    <td
                      key={s.id}
                      className={[
                        'py-2.5 px-3 text-right tabular-nums text-gray-800',
                        cellClass,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {row.getValue(s)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
          Terbaik (terendah)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200" />
          Tertinggi
        </span>
      </div>
    </div>
  );
}
