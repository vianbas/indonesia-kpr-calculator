import { useState, useMemo } from 'react';
import { useScenarios } from '../../application/hooks/useScenarios';
import { useUrlSync } from '../../hooks/useUrlSync';
import { parseUrlInit } from '../../utils/urlState';
import { LoanInputForm } from '../components/form/LoanInputForm';
import { SummaryCard } from '../components/results/SummaryCard';
import { InstallmentGroups } from '../components/results/InstallmentGroups';
import { AmortizationTable } from '../components/results/AmortizationTable';
import { ExportButton } from '../components/export/ExportButton';
import { ShareReportModal } from '../components/export/ShareReportModal';
import { ScenarioTabs } from '../components/scenarios/ScenarioTabs';
import { ScenarioComparisonPanel } from '../components/scenarios/ScenarioComparisonPanel';
import { ChartSection } from '../components/charts/ChartSection';
import { EarlyRepaymentSummary } from '../components/results/EarlyRepaymentSummary';
import { KprFeesSummary } from '../components/results/KprFeesSummary';
import { AffordabilityPanel } from '../components/affordability/AffordabilityPanel';
import { RefinancingPanel } from '../components/refinancing/RefinancingPanel';
import {
  FormIncompleteState,
  ValidationErrorState,
  CalculationErrorState,
} from '../components/results/EmptyState';
import { calculateAffordability } from '../../domain/calculators/affordability';
import { calculateRefinancing } from '../../domain/calculators/refinancing';
import { DEFAULT_AFFORDABILITY } from '../../application/store/affordabilityTypes';
import { DEFAULT_REFINANCING } from '../../application/store/refinancingTypes';
import type { AffordabilityFormState } from '../../application/store/affordabilityTypes';
import type { AffordabilityInput } from '../../domain/calculators/affordability';
import type { RefinancingFormState } from '../../application/store/refinancingTypes';
import type { ScenarioState, CalculatedScenario } from '../../application/store/scenarioTypes';

// ─── Affordability helpers ────────────────────────────────────────────────────

function parseNum(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function deriveAffordabilityInput(
  scenario: CalculatedScenario,
  form: AffordabilityFormState,
): AffordabilityInput {
  const { summary } = scenario;
  const firstGroup = summary.installmentGroups[0];
  const highestInstallment = Math.max(
    ...summary.installmentGroups.map((g) => g.installmentAmount),
  );

  const firstFloating = summary.schedule.find((r) => r.interestType === 'floating');
  const stressBaseRate = firstFloating?.annualRate ?? firstGroup?.annualRate ?? 0;
  const stressBalance = firstFloating?.openingBalance ?? summary.totalPrincipal;
  const stressRemainingMonths = firstFloating
    ? Math.max(1, summary.effectiveTenorMonths - firstFloating.month + 1)
    : summary.originalTenorMonths;

  return {
    totalIncome: parseNum(form.monthlyIncome) + parseNum(form.spouseIncome),
    existingMonthlyDebt: parseNum(form.existingMonthlyDebt),
    monthlyLivingExpense: parseNum(form.monthlyLivingExpense),
    minMonthlySurplus: parseNum(form.minMonthlySurplus),
    maxDSR: Math.max(0.01, parseNum(form.maxDSRPercent) / 100),
    firstInstallment: firstGroup?.installmentAmount ?? 0,
    highestInstallment,
    paymentMethod: scenario.form.paymentMethod,
    stressBaseRate,
    stressBalance,
    stressRemainingMonths,
    principalAmount: summary.totalPrincipal,
    tenorMonths: summary.originalTenorMonths,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // ── Affordability state (global — shared across all scenarios) ─────────────
  const [affordabilityForm, setAffordabilityForm] =
    useState<AffordabilityFormState>(DEFAULT_AFFORDABILITY);

  function handleAffordabilityChange(key: keyof AffordabilityFormState, value: string) {
    setAffordabilityForm((prev) => ({ ...prev, [key]: value }));
  }

  const affordabilityTotalIncome =
    parseNum(affordabilityForm.monthlyIncome) + parseNum(affordabilityForm.spouseIncome);

  const affordabilityResults = useMemo(
    () =>
      calculated.map((scenario) => ({
        scenario,
        result: calculateAffordability(deriveAffordabilityInput(scenario, affordabilityForm)),
      })),
    [calculated, affordabilityForm],
  );

  // Only pass affordability to the PDF when the user has entered income
  const affordabilityExportData =
    affordabilityTotalIncome > 0
      ? {
          form: affordabilityForm,
          results: affordabilityResults.map((r) => r.result),
        }
      : undefined;

  // ── Refinancing state (global — applies to a specific loan situation) ──────
  const [refinancingForm, setRefinancingForm] =
    useState<RefinancingFormState>(DEFAULT_REFINANCING);

  function handleRefinancingChange(key: keyof RefinancingFormState, value: string) {
    setRefinancingForm((prev) => ({ ...prev, [key]: value }));
  }

  const activeCalculated = calculated.find((s) => s.id === activeTab) ?? calculated[0] ?? null;

  function handleRefinancingPrefill() {
    if (!activeCalculated) return;
    const { summary } = activeCalculated;
    const firstFloating = summary.schedule.find((r) => r.interestType === 'floating');
    const remainingBalance = firstFloating?.openingBalance ?? summary.totalPrincipal;
    const currentRate = firstFloating?.annualRate ?? summary.installmentGroups[0]?.annualRate ?? 0;
    const remainingMonths = firstFloating
      ? Math.max(1, summary.effectiveTenorMonths - firstFloating.month + 1)
      : summary.effectiveTenorMonths;
    setRefinancingForm((prev) => ({
      ...prev,
      remainingBalance: String(Math.round(remainingBalance)),
      currentAnnualRatePercent: String((currentRate * 100).toFixed(2)),
      remainingMonths: String(remainingMonths),
    }));
  }

  const refinancingResult = useMemo(() => {
    const balance = parseFloat(refinancingForm.remainingBalance);
    const currentRate = parseFloat(refinancingForm.currentAnnualRatePercent) / 100;
    const remaining = parseInt(refinancingForm.remainingMonths);
    const newRate = parseFloat(refinancingForm.newAnnualRatePercent) / 100;
    const newTenor = parseInt(refinancingForm.newTenorMonths);
    if (balance > 0 && currentRate > 0 && remaining > 0 && newRate > 0 && newTenor > 0) {
      return calculateRefinancing({
        remainingBalance: balance,
        currentAnnualRate: currentRate,
        remainingMonths: remaining,
        newAnnualRate: newRate,
        newTenorMonths: newTenor,
        provisionFeePercent: (parseFloat(refinancingForm.provisionFeePercent) || 0) / 100,
        appraisalFeeIDR: parseFloat(refinancingForm.appraisalFeeIDR) || 0,
        adminFeeIDR: parseFloat(refinancingForm.adminFeeIDR) || 0,
      });
    }
    return null;
  }, [refinancingForm]);

  const refinancingExportData =
    refinancingResult !== null
      ? { form: refinancingForm, result: refinancingResult }
      : undefined;

  // ──────────────────────────────────────────────────────────────────────────

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
            affordability={affordabilityExportData}
            refinancing={refinancingExportData}
          />
        </div>
      </div>

      {/* Comparison panel — shown when ≥ 2 scenarios have results */}
      {activeCount > 1 && calculated.length >= 2 && (
        <ScenarioComparisonPanel scenarios={calculated} />
      )}

      {/* Affordability + stress test — shown whenever ≥ 1 scenario has results */}
      {calculated.length >= 1 && (
        <AffordabilityPanel
          calculated={calculated}
          form={affordabilityForm}
          onChange={handleAffordabilityChange}
          results={affordabilityResults}
        />
      )}

      {/* Refinancing calculator — shown whenever ≥ 1 scenario has results */}
      {calculated.length >= 1 && (
        <RefinancingPanel
          form={refinancingForm}
          onChange={handleRefinancingChange}
          result={refinancingResult}
          activeScenario={activeCalculated}
          onPrefill={handleRefinancingPrefill}
        />
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
  affordability: import('../../infrastructure/pdf/exportService').AffordabilityExportData | undefined;
  refinancing: import('../../infrastructure/pdf/exportService').RefinancingExportData | undefined;
}

function ResultsPanel({
  scenario,
  calculated,
  scenarios,
  activeCount,
  activeTab,
  onReset,
  affordability,
  refinancing,
}: ResultsPanelProps) {
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
          <ShareReportModal
            calculated={calculated}
            allScenarios={scenarios}
            activeCount={activeCount}
            activeTab={activeTab}
            disabled={calculated.length === 0}
          />
          <ExportButton
            form={form}
            summary={summary}
            scenarios={calculated}
            affordability={affordability}
            refinancing={refinancing}
          />
        </div>
        <SummaryCard summary={summary} />
        <EarlyRepaymentSummary summary={summary} />
        {summary.totalUpfrontCost > 0 && <KprFeesSummary summary={summary} />}
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
