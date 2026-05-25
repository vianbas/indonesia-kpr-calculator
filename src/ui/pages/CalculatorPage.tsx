import { useMemo } from 'react';
import { useScenarios } from '../../application/hooks/useScenarios';
import { useUrlSync } from '../../hooks/useUrlSync';
import { parseUrlInit } from '../../utils/urlState';
import { LoanInputForm } from '../components/form/LoanInputForm';
import { SummaryCard } from '../components/results/SummaryCard';
import { InstallmentGroups } from '../components/results/InstallmentGroups';
import { AmortizationTable } from '../components/results/AmortizationTable';
import { ExportButton } from '../components/export/ExportButton';
import { ShareButton } from '../components/export/ShareButton';
import { ScenarioTabs } from '../components/scenarios/ScenarioTabs';
import { ScenarioComparisonPanel } from '../components/scenarios/ScenarioComparisonPanel';
import { ChartSection } from '../components/charts/ChartSection';
import { EarlyRepaymentSummary } from '../components/results/EarlyRepaymentSummary';
import {
  FormIncompleteState,
  ValidationErrorState,
  CalculationErrorState,
} from '../components/results/EmptyState';
import type { ScenarioState, CalculatedScenario } from '../../application/store/scenarioTypes';

export function CalculatorPage() {
  // Parse URL once at mount — returns null if no ?s= param or if data is invalid
  const urlInit = useMemo(() => parseUrlInit(), []);

  const { scenarios, activeCount, activeTab, setActiveTab, canAdd, addScenario, removeScenario, resetAll } =
    useScenarios(
      urlInit
        ? {
            initialForms: urlInit.forms,
            initialActiveCount: urlInit.activeCount,
            initialActiveTab: urlInit.activeTab,
          }
        : {},
    );

  // Sync state to URL after 500ms debounce whenever inputs change
  const { suppressNext } = useUrlSync({ scenarios, activeCount, activeTab });

  const active = scenarios.find((s) => s.id === activeTab) ?? scenarios[0];

  // Memoized so chart useMemo deps are stable between renders that don't change scenario data
  const calculated = useMemo(
    () => scenarios.filter((s): s is CalculatedScenario => s.summary !== null),
    [scenarios],
  );

  function handleReset() {
    // Suppress the URL sync that would otherwise fire 500ms after the state reset
    suppressNext();
    resetAll();
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    history.replaceState(null, '', url.toString());
  }

  return (
    <div className="space-y-5">
      {/* Scenario tab bar — always visible (shows "+ Tambah Skenario" even with 1 tab) */}
      <ScenarioTabs
        scenarios={scenarios}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        canAdd={canAdd}
        onAdd={addScenario}
        onRemove={removeScenario}
      />

      {/* Form + Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(400px,480px)_1fr] gap-6 items-start">
        {/* ── Left: active scenario form ─────────────────────────────────── */}
        <div>
          <LoanInputForm
            form={active.form}
            dispatch={active.dispatch}
            errors={active.errors}
            fieldErrors={active.fieldErrors}
          />
        </div>

        {/* ── Right: results for active scenario ─────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <ResultsPanel
            scenario={active}
            calculated={calculated}
            scenarios={scenarios}
            activeCount={activeCount}
            activeTab={activeTab}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* Comparison panel — shown when ≥ 2 scenarios have results */}
      {activeCount > 1 && calculated.length >= 2 && (
        <ScenarioComparisonPanel scenarios={calculated} />
      )}
    </div>
  );
}

// ─── Results panel ────────────────────────────────────────────────────────────

interface ResultsPanelProps {
  scenario: ScenarioState;
  calculated: CalculatedScenario[];
  scenarios: ScenarioState[];
  activeCount: 1 | 2 | 3;
  activeTab: import('../../application/store/scenarioTypes').ScenarioId;
  onReset: () => void;
}

function ResultsPanel({ scenario, calculated, scenarios, activeCount, activeTab, onReset }: ResultsPanelProps) {
  const { form, summary, errors, isCalcError } = scenario;

  if (summary) {
    return (
      <>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            aria-label="Reset semua input ke nilai awal"
          >
            Reset
          </button>
          <ShareButton
            scenarios={scenarios}
            activeCount={activeCount}
            activeTab={activeTab}
          />
          <ExportButton form={form} summary={summary} scenarios={calculated} />
        </div>
        <SummaryCard summary={summary} />
        <EarlyRepaymentSummary summary={summary} />
        {summary.installmentGroups.length > 1 && (
          <InstallmentGroups summary={summary} />
        )}
        <ChartSection calculated={calculated} />
        <AmortizationTable schedule={summary.schedule} />
      </>
    );
  }

  if (isCalcError) return <CalculationErrorState />;
  if (errors.length > 0) return <ValidationErrorState errors={errors} />;
  return <FormIncompleteState />;
}
