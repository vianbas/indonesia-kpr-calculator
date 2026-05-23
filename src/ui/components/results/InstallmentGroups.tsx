import { Card } from '../common/Card';
import { formatIDR, formatPercent } from '../../../domain/utils/currency';
import type { MortgageSummary } from '../../../domain';

interface Props {
  summary: MortgageSummary;
}

export function InstallmentGroups({ summary }: Props) {
  const { installmentGroups } = summary;

  if (installmentGroups.length === 0) return null;

  return (
    <Card title="Rincian Periode Cicilan" subtitle="Cicilan berubah saat suku bunga berganti">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Periode
              </th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Jenis
              </th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Suku Bunga
              </th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cicilan / Bulan
              </th>
            </tr>
          </thead>
          <tbody>
            {installmentGroups.map((group, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="py-2.5 px-2 font-medium text-gray-800">
                  Bulan {group.fromMonth}–{group.toMonth}
                  <span className="ml-1 text-xs text-gray-400 font-normal">
                    ({group.toMonth - group.fromMonth + 1} bln)
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <span
                    className={[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      group.type === 'fixed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-indigo-100 text-indigo-700',
                    ].join(' ')}
                  >
                    {group.type === 'fixed' ? 'Tetap' : 'Variabel'}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-gray-700">
                  {formatPercent(group.annualRate)} p.a.
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-semibold text-gray-900">
                  {formatIDR(group.installmentAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
