import { useState, useRef, useMemo } from 'react';
import { useScenarios } from '../../application/hooks/useScenarios';
import { useUrlSync } from '../../hooks/useUrlSync';
import { parseUrlInit } from '../../utils/urlState';
import { LoanInputForm } from '../components/form/LoanInputForm';
import { SummaryCard } from '../components/results/SummaryCard';
import { InstallmentGroups } from '../components/results/InstallmentGroups';
import { AmortizationTable } from '../components/results/AmortizationTable';
import { NextStepActions } from '../components/results/NextStepActions';
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

// ─── Chevron icon (shared by collapsible sections) ───────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CalculatorPage() {
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

  const { suppressNext } = useUrlSync({ scenarios, activeCount, activeTab });

  const active = scenarios.find((s) => s.id === activeTab) ?? scenarios[0];

  const calculated = useMemo(
    () => scenarios.filter((s): s is CalculatedScenario => s.summary !== null),
    [scenarios],
  );

  // ── Affordability state ───────────────────────────────────────────────────
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

  const affordabilityExportData =
    affordabilityTotalIncome > 0
      ? {
          form: affordabilityForm,
          results: affordabilityResults.map((r) => r.result),
        }
      : undefined;

  // ── Refinancing state ─────────────────────────────────────────────────────
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

  // ── Section refs + scroll helpers ─────────────────────────────────────────
  const affordabilityRef = useRef<HTMLDivElement>(null);
  const refinancingRef = useRef<HTMLDivElement>(null);

  function scrollToAffordability() {
    affordabilityRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function scrollToRefinancing() {
    handleRefinancingPrefill();
    refinancingRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  // ──────────────────────────────────────────────────────────────────────────

  function handleReset() {
    suppressNext();
    resetAll();
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    history.replaceState(null, '', url.toString());
  }

  return (
    <div className="space-y-5">
      <ScenarioTabs
        scenarios={scenarios}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        canAdd={canAdd}
        onAdd={addScenario}
        onRemove={removeScenario}
      />

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
            onScrollToAffordability={scrollToAffordability}
            onScrollToRefinancing={scrollToRefinancing}
          />
        </div>
      </div>

      {/* ── Decision tools — immediately below results grid ─────────────────── */}

      {/* Affordability — first tool after the main result */}
      {calculated.length >= 1 && (
        <div ref={affordabilityRef}>
          <AffordabilityPanel
            calculated={calculated}
            form={affordabilityForm}
            onChange={handleAffordabilityChange}
            results={affordabilityResults}
          />
        </div>
      )}

      {/* Refinancing — right after affordability */}
      {calculated.length >= 1 && (
        <div ref={refinancingRef}>
          <RefinancingPanel
            form={refinancingForm}
            onChange={handleRefinancingChange}
            result={refinancingResult}
            activeScenario={activeCalculated}
            onPrefill={handleRefinancingPrefill}
          />
        </div>
      )}

      {/* Scenario comparison — advanced feature, at the bottom */}
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
  affordability: import('../../infrastructure/pdf/exportService').AffordabilityExportData | undefined;
  refinancing: import('../../infrastructure/pdf/exportService').RefinancingExportData | undefined;
  onScrollToAffordability: () => void;
  onScrollToRefinancing: () => void;
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
  onScrollToAffordability,
  onScrollToRefinancing,
}: ResultsPanelProps) {
  const { form, summary, errors, isCalcError } = scenario;

  // Amortization table collapse state — collapsed by default so decision tools aren't buried
  const [amortizationOpen, setAmortizationOpen] = useState(false);
  const amortizationRef = useRef<HTMLDivElement>(null);

  function scrollToAmortization() {
    setAmortizationOpen(true);
    amortizationRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  if (summary) {
    return (
      <>
        {/* Action row */}
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

        {/* Next-step CTAs — immediately after the hero summary */}
        <NextStepActions
          onScrollToAffordability={onScrollToAffordability}
          onScrollToRefinancing={onScrollToRefinancing}
          onScrollToAmortization={scrollToAmortization}
        />

        <EarlyRepaymentSummary summary={summary} />
        {summary.totalUpfrontCost > 0 && <KprFeesSummary summary={summary} />}
        {summary.installmentGroups.length > 1 && (
          <InstallmentGroups summary={summary} />
        )}
        <ChartSection calculated={calculated} />

        {/* Amortization table — collapsed by default to keep decision tools visible */}
        <div ref={amortizationRef} className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setAmortizationOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            aria-expanded={amortizationOpen}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-700">Tabel Amortisasi</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Lihat rincian pembayaran bulanan sepanjang tenor.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs text-blue-600 font-medium">
                {amortizationOpen ? 'Sembunyikan' : 'Tampilkan'}
              </span>
              <ChevronIcon open={amortizationOpen} />
            </div>
          </button>
          {amortizationOpen && <AmortizationTable schedule={summary.schedule} />}
        </div>
      </>
    );
  }

  if (isCalcError) return <CalculationErrorState />;
  if (errors.length > 0) return <ValidationErrorState errors={errors} />;
  return <FormIncompleteState />;
}
