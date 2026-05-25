import type { ScenarioId, ScenarioState } from '../../../application/store/scenarioTypes';

interface Props {
  scenarios: ScenarioState[];
  activeTab: ScenarioId;
  onTabChange: (id: ScenarioId) => void;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (id: ScenarioId) => void;
}

export function ScenarioTabs({ scenarios, activeTab, onTabChange, canAdd, onAdd, onRemove }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Skenario perbandingan"
      className="flex items-end border-b border-gray-200"
    >
      {scenarios.map((s) => (
        <div key={s.id} className="flex items-center">
          <button
            role="tab"
            aria-selected={s.id === activeTab}
            onClick={() => onTabChange(s.id)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              s.id === activeTab
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            {s.label}
            {s.summary && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle" />
            )}
          </button>
          {s.id !== 1 && (
            <button
              onClick={() => onRemove(s.id)}
              className="ml-0.5 mr-1 p-0.5 text-gray-400 hover:text-red-500 transition-colors -mb-px"
              aria-label={`Hapus ${s.label}`}
              title={`Hapus ${s.label}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {canAdd && (
        <button
          onClick={onAdd}
          className="ml-1 px-3 py-2.5 text-sm text-blue-600 hover:text-blue-800 font-medium border-b-2 border-transparent -mb-px transition-colors whitespace-nowrap"
          aria-label="Tambah skenario baru"
        >
          + Tambah Skenario
        </button>
      )}
    </div>
  );
}
