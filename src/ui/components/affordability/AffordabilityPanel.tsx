import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AffordabilityInputs } from './AffordabilityInputs';
import { AffordabilityScenarioCard } from './AffordabilityScenarioCard';
import { ChevronIcon } from '../common/ChevronIcon';
import type { AffordabilityFormState } from '../../../application/store/affordabilityTypes';
import type { AffordabilityResult } from '../../../domain/calculators/affordability';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  calculated: CalculatedScenario[];
  form: AffordabilityFormState;
  onChange: (key: keyof AffordabilityFormState, value: string) => void;
  results: Array<{ scenario: CalculatedScenario; result: AffordabilityResult }>;
}

export function AffordabilityPanel({ calculated, form, onChange, results }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const totalIncome =
    (parseFloat(form.monthlyIncome) || 0) + (parseFloat(form.spouseIncome) || 0);
  const maxDSR = Math.max(0.01, (parseFloat(form.maxDSRPercent) || 35) / 100);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        data-jump-toggle
        aria-expanded={open}
      >
        <span>{t('affordability.title')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white">
          <div className="p-4 border-b border-gray-100">
            <AffordabilityInputs form={form} onChange={onChange} />
          </div>

          <div className="p-4">
            {totalIncome > 0 ? (
              <div
                className={
                  results.length > 1
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                    : undefined
                }
              >
                {results.map(({ scenario, result }, i) => (
                  <AffordabilityScenarioCard
                    key={scenario.id}
                    label={
                      calculated.length > 1
                        ? t('affordability.scenarioLabel', { n: i + 1 })
                        : t('affordability.analysisLabel')
                    }
                    result={result}
                    maxDSR={maxDSR}
                    isMurabahah={scenario.summary.syariahAkadType === 'murabahah'}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">
                {t('affordability.promptIncome')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
