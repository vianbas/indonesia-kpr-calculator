import { useState } from 'react';
import { ScenarioComparisonTable } from './ScenarioComparisonTable';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  scenarios: CalculatedScenario[];
}

export function ScenarioComparisonPanel({ scenarios }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        aria-expanded={open}
      >
        <span>Perbandingan Skenario</span>
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
      </button>

      {open && (
        <div className="p-4 bg-white">
          <ScenarioComparisonTable scenarios={scenarios} />
        </div>
      )}
    </div>
  );
}
