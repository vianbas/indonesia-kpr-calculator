import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { RefinancingInputs } from './RefinancingInputs';
import { RefinancingResultCard } from './RefinancingResultCard';
import { ChevronIcon } from '../common/ChevronIcon';
import type { RefinancingFormState } from '../../../application/store/refinancingTypes';
import type { RefinancingResult } from '../../../domain/calculators/refinancing';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  form: RefinancingFormState;
  onChange: (key: keyof RefinancingFormState, value: string) => void;
  result: RefinancingResult | null;
  activeScenario: CalculatedScenario | null;
  onPrefill: () => void;
}

export function RefinancingPanel({ form, onChange, result, activeScenario, onPrefill }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        id={`${panelId}-btn`}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        data-jump-toggle
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>{t('refinancing.title')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white" id={panelId} role="region" aria-labelledby={`${panelId}-btn`}>
          <div className="p-4 border-b border-gray-100">
            <RefinancingInputs
              form={form}
              onChange={onChange}
              activeScenario={activeScenario}
              onPrefill={onPrefill}
            />
          </div>

          <div className="p-4">
            {result ? (
              <RefinancingResultCard result={result} />
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">
                {t('refinancing.promptFill')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
