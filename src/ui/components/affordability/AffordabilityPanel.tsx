import { useState } from 'react';
import { AffordabilityInputs } from './AffordabilityInputs';
import { AffordabilityScenarioCard } from './AffordabilityScenarioCard';
import type { AffordabilityFormState } from '../../../application/store/affordabilityTypes';
import type { AffordabilityResult } from '../../../domain/calculators/affordability';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  calculated: CalculatedScenario[];
  form: AffordabilityFormState;
  onChange: (key: keyof AffordabilityFormState, value: string) => void;
  results: Array<{ scenario: CalculatedScenario; result: AffordabilityResult }>;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={['w-4 h-4 text-gray-500 transition-transform', open ? 'rotate-180' : ''].join(' ')}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

export function AffordabilityPanel({ calculated, form, onChange, results }: Props) {
  const [open, setOpen] = useState(true);

  const totalIncome =
    (parseFloat(form.monthlyIncome) || 0) + (parseFloat(form.spouseIncome) || 0);
  const maxDSR = Math.max(0.01, (parseFloat(form.maxDSRPercent) || 35) / 100);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header — matches ScenarioComparisonPanel exactly */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        aria-expanded={open}
      >
        <span>Analisis Kemampuan Bayar</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white">
          {/* Input section */}
          <div className="p-4 border-b border-gray-100">
            <AffordabilityInputs form={form} onChange={onChange} />
          </div>

          {/* Results section */}
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
                    label={calculated.length > 1 ? `Skenario ${i + 1}` : 'Hasil Analisis'}
                    result={result}
                    maxDSR={maxDSR}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">
                Masukkan penghasilan bulanan untuk melihat analisis kemampuan bayar.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
