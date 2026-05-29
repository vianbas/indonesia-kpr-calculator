import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScenarioId, ScenarioState } from '../../../application/store/scenarioTypes';

const MAX_LABEL_LENGTH = 30;

interface Props {
  scenarios: ScenarioState[];
  activeTab: ScenarioId;
  onTabChange: (id: ScenarioId) => void;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (id: ScenarioId) => void;
  onRename: (id: ScenarioId, name: string) => void;
}

interface TabLabelProps {
  scenario: ScenarioState;
  isActive: boolean;
  onRename: (id: ScenarioId, name: string) => void;
}

function TabLabel({ scenario, isActive, onRename }: TabLabelProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(scenario.label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when label changes externally (e.g. reset)
  useEffect(() => {
    if (!editing) setDraft(scenario.label);
  }, [scenario.label, editing]);

  function startEditing() {
    setDraft(scenario.label);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    onRename(scenario.id, draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setEditing(false); setDraft(scenario.label); }
  }

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_LABEL_LENGTH))}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-28 px-1 py-0.5 text-sm font-medium border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-blue-700 bg-white"
        aria-label={t('nav.renameScenarioAria', { label: scenario.label })}
      />
    );
  }

  return (
    <span
      className="flex items-center gap-1 group"
      title={isActive ? t('nav.renameScenarioHint') : undefined}
    >
      {scenario.label}
      {scenario.summary && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle" />
      )}
      {isActive && (
        <button
          onClick={(e) => { e.stopPropagation(); startEditing(); }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded text-blue-500"
          aria-label={t('nav.renameScenarioAria', { label: scenario.label })}
          tabIndex={-1}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L4.75 8.774a2.75 2.75 0 0 0-.596 1.107l-.449 1.795a.75.75 0 0 0 .91.91l1.795-.449a2.75 2.75 0 0 0 1.107-.596l6.261-6.263a1.75 1.75 0 0 0 0-2.475ZM5.75 9.831l5.265-5.265 1.419 1.419-5.265 5.265a1.25 1.25 0 0 1-.503.271l-.85.213.213-.85a1.25 1.25 0 0 1 .271-.503Z" />
          </svg>
        </button>
      )}
    </span>
  );
}

export function ScenarioTabs({ scenarios, activeTab, onTabChange, canAdd, onAdd, onRemove, onRename }: Props) {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t('nav.scenariosAria')}
      className="flex items-end border-b border-gray-200"
    >
      {scenarios.map((s) => (
        <div key={s.id} className="flex items-center">
          <div
            role="tab"
            aria-selected={s.id === activeTab}
            tabIndex={s.id === activeTab ? 0 : -1}
            onClick={() => onTabChange(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTabChange(s.id); }}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer',
              s.id === activeTab
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            <TabLabel scenario={s} isActive={s.id === activeTab} onRename={onRename} />
          </div>
          {s.id !== 1 && (
            <button
              onClick={() => onRemove(s.id)}
              className="ml-0.5 mr-1 p-0.5 text-gray-400 hover:text-red-500 transition-colors -mb-px"
              aria-label={t('nav.removeScenarioAria', { label: s.label })}
              title={t('nav.removeScenarioAria', { label: s.label })}
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
          aria-label={t('nav.addScenarioAria')}
        >
          {t('nav.addScenario')}
        </button>
      )}
    </div>
  );
}
