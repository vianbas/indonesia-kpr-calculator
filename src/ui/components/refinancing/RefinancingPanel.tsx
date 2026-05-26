import { useState } from 'react';
import { RefinancingInputs } from './RefinancingInputs';
import { RefinancingResultCard } from './RefinancingResultCard';
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

export function RefinancingPanel({ form, onChange, result, activeScenario, onPrefill }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        aria-expanded={open}
      >
        <span>Kalkulator Refinancing</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white">
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
                Isi sisa pokok, suku bunga saat ini, dan penawaran baru untuk melihat analisis.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
