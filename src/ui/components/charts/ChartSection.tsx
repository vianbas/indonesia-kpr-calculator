import { useState } from 'react';
import { Card } from '../common/Card';
import { AmortizationBarChart } from './AmortizationBarChart';
import { BalanceLineChart } from './BalanceLineChart';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  calculated: CalculatedScenario[];
}

export function ChartSection({ calculated }: Props) {
  const [barIdx, setBarIdx] = useState(0);

  const isMulti = calculated.length >= 2;
  const barSchedule = (calculated[barIdx] ?? calculated[0]).summary.schedule;

  return (
    <Card title="Visualisasi">
      <div className="space-y-6">
        {/* ── Bar chart ──────────────────────────────────────────────────── */}
        <div>
          {isMulti && (
            <div className="flex gap-1.5 mb-4" role="group" aria-label="Pilih skenario">
              {calculated.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setBarIdx(i)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    barIdx === i
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <AmortizationBarChart schedule={barSchedule} />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Balance line chart ──────────────────────────────────────────── */}
        <BalanceLineChart calculated={calculated} />
      </div>
    </Card>
  );
}
