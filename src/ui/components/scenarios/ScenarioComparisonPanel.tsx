import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScenarioComparisonTable } from './ScenarioComparisonTable';
import { ChevronIcon } from '../common/ChevronIcon';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  scenarios: CalculatedScenario[];
}

export function ScenarioComparisonPanel({ scenarios }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        aria-expanded={open}
      >
        <span>{t('scenarios.comparisonTitle')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="p-4 bg-white">
          <ScenarioComparisonTable scenarios={scenarios} />
        </div>
      )}
    </div>
  );
}
