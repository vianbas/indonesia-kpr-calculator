import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import { AmortizationBarChart } from './AmortizationBarChart';
import { BalanceLineChart } from './BalanceLineChart';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  calculated: CalculatedScenario[];
}

export function ChartSection({ calculated }: Props) {
  const { t } = useTranslation();
  const [barIdx, setBarIdx] = useState(0);

  // Grouping decision made ONCE here — both charts receive the same value so
  // their period axes are always consistent (never mixed monthly/yearly).
  const useYearlyGrouping = useMemo(
    () => calculated.some((s) => s.summary.effectiveTenorMonths > 24),
    [calculated],
  );

  const isMulti = calculated.length >= 2;
  // Clamp so the active button and schedule remain correct after a scenario is removed
  const safeBarIdx = Math.min(barIdx, calculated.length - 1);
  const barSchedule = calculated[safeBarIdx].summary.schedule;

  return (
    <Card title={t('chart.title')}>
      <div className="space-y-6">
        {/* ── Bar chart ──────────────────────────────────────────────────── */}
        <div>
          {isMulti && (
            <div className="flex gap-1.5 mb-4" role="group" aria-label={t('chart.scenarioAria')}>
              {calculated.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setBarIdx(i)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    safeBarIdx === i
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <AmortizationBarChart schedule={barSchedule} useYearlyGrouping={useYearlyGrouping} />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Balance line chart ──────────────────────────────────────────── */}
        <BalanceLineChart calculated={calculated} useYearlyGrouping={useYearlyGrouping} />
      </div>
    </Card>
  );
}
