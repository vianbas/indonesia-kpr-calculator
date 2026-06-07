import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { OnboardingOverlay } from '../components/onboarding/OnboardingOverlay';
import { useScenarios } from '../../application/hooks/useScenarios';
import { parseUrlInit } from '../../utils/urlState';
import { LoanInputForm } from '../components/form/LoanInputForm';
import { SummaryCard } from '../components/results/SummaryCard';
import { LtvIndicator } from '../components/results/LtvIndicator';
import { InstallmentGroups } from '../components/results/InstallmentGroups';
import { AmortizationTable } from '../components/results/AmortizationTable';
import { NextStepActions } from '../components/results/NextStepActions';
import { ChevronIcon } from '../components/common/ChevronIcon';
import { ExportButton } from '../components/export/ExportButton';
import { CsvExportButton } from '../components/export/CsvExportButton';
import { ShareReportModal } from '../components/export/ShareReportModal';
import { MobileSeeResultsShortcut } from '../components/common/MobileSeeResultsShortcut';
import { DecisionToolsNav } from '../components/common/DecisionToolsNav';
import { ScenarioTabs } from '../components/scenarios/ScenarioTabs';
import { ScenarioComparisonPanel } from '../components/scenarios/ScenarioComparisonPanel';
import { ChartSection } from '../components/charts/ChartSection';
import { EarlyRepaymentSummary } from '../components/results/EarlyRepaymentSummary';
import { KprFeesSummary } from '../components/results/KprFeesSummary';
import { DecisionSummary } from '../components/decision/DecisionSummary';
import { AffordabilityPanel } from '../components/affordability/AffordabilityPanel';
import { MaxPropertyPanel } from '../components/affordability/MaxPropertyPanel';
import { RefinancingPanel } from '../components/refinancing/RefinancingPanel';
import { BuyVsRentPanel } from '../components/buyvsrent/BuyVsRentPanel';
import { FlppPanel } from '../components/flpp/FlppPanel';
import { FaqSection } from '../components/help/FaqSection';
import {
  FormIncompleteState,
  ValidationErrorState,
  CalculationErrorState,
} from '../components/results/EmptyState';
import { calculateAffordability } from '../../domain/calculators/affordability';
import { calculateRefinancing } from '../../domain/calculators/refinancing';
import { calculateBuyVsRent } from '../../domain/calculators/buyVsRent';
import { assessFlpp } from '../../domain/calculators/flpp';
import { assessLtv } from '../../domain/calculators/ltv';
import { computeDecisionSummary } from '../../domain/calculators/decisionSummary';
import { deriveLoanValuation } from '../../application/converters/formToInput';
import { DEFAULT_AFFORDABILITY } from '../../application/store/affordabilityTypes';
import { DEFAULT_REFINANCING } from '../../application/store/refinancingTypes';
import { DEFAULT_BUY_VS_RENT, type BuyVsRentFormState } from '../../application/store/buyVsRentTypes';
import { DEFAULT_MAX_PROPERTY, type MaxPropertyFormState } from '../../application/store/maxPropertyTypes';
import { DEFAULT_FLPP, type FlppFormState } from '../../application/store/flppTypes';
import type { AffordabilityFormState } from '../../application/store/affordabilityTypes';
import type { AffordabilityInput, AffordabilityResult } from '../../domain/calculators/affordability';
import type { RefinancingFormState } from '../../application/store/refinancingTypes';
import type { ScenarioState, CalculatedScenario, ScenarioId } from '../../application/store/scenarioTypes';
import type { DecisionSummaryResult, ScenarioDecisionInput, DecisionVerdict } from '../../domain/calculators/decisionSummary';
import type { UrlState } from '../../utils/urlState';

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

interface CalculatorPageProps {
  initialUrlState?: UrlState | null;
}

export function CalculatorPage({ initialUrlState }: CalculatorPageProps = {}) {
  const { t } = useTranslation();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return localStorage.getItem('kpr_onboarding_seen') !== '1'; } catch { return false; }
  });

  // Capture URL init once at mount; initialUrlState takes precedence over ?s= param.
  const [urlInit] = useState<UrlState | null>(
    () => (initialUrlState !== undefined ? initialUrlState : parseUrlInit()),
  );

  const { scenarios, activeCount, activeTab, setActiveTab, canAdd, addScenario, removeScenario, resetAll, renameScenario } =
    useScenarios(
      urlInit
        ? {
            initialForms: urlInit.forms,
            initialActiveCount: urlInit.activeCount,
            initialActiveTab: urlInit.activeTab,
          }
        : {},
    );

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

  // ── Decision Summary ──────────────────────────────────────────────────────
  const decisionResult = useMemo((): DecisionSummaryResult | null => {
    if (!activeCalculated) return null;
    const valuation = deriveLoanValuation(activeCalculated.form);
    const ltvAssessment = valuation
      ? assessLtv({
          propertyValue: valuation.propertyPrice,
          downPayment: valuation.downPayment,
          financingMode: activeCalculated.form.financingMode,
        })
      : null;
    const maxDSR = Math.max(0.01, parseNum(affordabilityForm.maxDSRPercent) / 100);
    const decisionScenarios: ScenarioDecisionInput[] =
      affordabilityTotalIncome > 0
        ? affordabilityResults.map(({ scenario, result }) => ({
            id: scenario.id,
            label: scenario.label,
            totalInterest: scenario.summary.totalInterest,
            totalPrincipal: scenario.summary.totalPrincipal,
            affordability: result,
            maxDSR,
          }))
        : [];
    return computeDecisionSummary({
      activeScenarioId: activeTab,
      scenarios: decisionScenarios,
      ltvAssessment,
    });
  }, [activeCalculated, activeTab, affordabilityResults, affordabilityTotalIncome, affordabilityForm.maxDSRPercent]);

  // Per-scenario independent decision results — used for PDF and comparison table
  const allDecisionResults = useMemo((): DecisionSummaryResult[] => {
    if (affordabilityTotalIncome <= 0) return [];
    const maxDSR = Math.max(0.01, parseNum(affordabilityForm.maxDSRPercent) / 100);
    return calculated.map((scenario) => {
      const valuation = deriveLoanValuation(scenario.form);
      const ltvAssessment = valuation
        ? assessLtv({
            propertyValue: valuation.propertyPrice,
            downPayment: valuation.downPayment,
            financingMode: scenario.form.financingMode,
          })
        : null;
      const affordEntry = affordabilityResults.find((r) => r.scenario.id === scenario.id);
      const decisionScenarios: ScenarioDecisionInput[] = affordEntry
        ? [{
            id: scenario.id,
            label: scenario.label,
            totalInterest: scenario.summary.totalInterest,
            totalPrincipal: scenario.summary.totalPrincipal,
            affordability: affordEntry.result,
            maxDSR,
          }]
        : [];
      return computeDecisionSummary({
        activeScenarioId: scenario.id,
        scenarios: decisionScenarios,
        ltvAssessment,
      });
    });
  }, [calculated, affordabilityResults, affordabilityTotalIncome, affordabilityForm.maxDSRPercent]);

  const scenarioVerdicts = useMemo((): Partial<Record<ScenarioId, DecisionVerdict>> => {
    const entries = calculated.map((s, i) => [s.id, allDecisionResults[i]?.verdict ?? 'incomplete'] as const);
    return Object.fromEntries(entries) as Partial<Record<ScenarioId, DecisionVerdict>>;
  }, [calculated, allDecisionResults]);

  // What-if sandbox: re-run affordability + decision with extra income, no form changes.
  const computeSandbox = useCallback((extraIncome: number, extraDP: number): DecisionSummaryResult | null => {
    if (!activeCalculated || affordabilityTotalIncome <= 0) return null;
    const input = deriveAffordabilityInput(activeCalculated, affordabilityForm);
    const originalPrincipal = activeCalculated.summary.totalPrincipal;
    // Scale installments linearly — both annuity and flat are linear in principal
    const dpRatio = extraDP > 0 && originalPrincipal > extraDP
      ? (originalPrincipal - extraDP) / originalPrincipal
      : 1;
    const sandboxInput: AffordabilityInput = {
      ...input,
      totalIncome: input.totalIncome + extraIncome,
      firstInstallment: input.firstInstallment * dpRatio,
      highestInstallment: input.highestInstallment * dpRatio,
      principalAmount: input.principalAmount * dpRatio,
      stressBalance: input.stressBalance * dpRatio,
    };
    const newAffordability = calculateAffordability(sandboxInput);
    const maxDSR = Math.max(0.01, parseNum(affordabilityForm.maxDSRPercent) / 100);
    const valuation = deriveLoanValuation(activeCalculated.form);
    const ltvAssessment = valuation
      ? assessLtv({
          propertyValue: valuation.propertyPrice,
          downPayment: valuation.downPayment + extraDP,
          financingMode: activeCalculated.form.financingMode,
        })
      : null;
    return computeDecisionSummary({
      activeScenarioId: activeTab,
      scenarios: [{
        id: activeTab,
        label: active.label,
        totalInterest: activeCalculated.summary.totalInterest,
        totalPrincipal: originalPrincipal - extraDP,
        affordability: newAffordability,
        maxDSR,
      }],
      ltvAssessment,
    });
  }, [activeCalculated, active.label, activeTab, affordabilityForm, affordabilityTotalIncome]);

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

  // ── Buy vs Rent state ─────────────────────────────────────────────────────
  const [buyVsRentForm, setBuyVsRentForm] = useState<BuyVsRentFormState>(DEFAULT_BUY_VS_RENT);

  function handleBuyVsRentChange(key: keyof BuyVsRentFormState, value: string) {
    setBuyVsRentForm((prev) => ({ ...prev, [key]: value }));
  }

  const buyVsRentResult = useMemo(() => {
    if (!activeCalculated) return null;
    const valuation = deriveLoanValuation(activeCalculated.form);
    if (!valuation) return null;
    const monthlyRent = parseFloat(buyVsRentForm.monthlyRent);
    const horizonMonths = (parseInt(buyVsRentForm.horizonYears) || 0) * 12;
    if (!(monthlyRent > 0) || horizonMonths <= 0) return null;
    const { summary } = activeCalculated;
    return calculateBuyVsRent({
      propertyPrice: valuation.propertyPrice,
      upfrontCost: valuation.downPayment + summary.adminFee,
      schedule: summary.schedule.map((r) => ({ installment: r.installment, closingBalance: r.closingBalance })),
      monthlyRent,
      rentGrowthAnnual: (parseFloat(buyVsRentForm.rentGrowthPercent) || 0) / 100,
      appreciationAnnual: (parseFloat(buyVsRentForm.appreciationPercent) || 0) / 100,
      investmentReturnAnnual: (parseFloat(buyVsRentForm.investmentReturnPercent) || 0) / 100,
      horizonMonths,
    });
  }, [buyVsRentForm, activeCalculated]);

  // ── Max property (reverse affordability) state — standalone, not in URL ────
  const [maxPropertyForm, setMaxPropertyForm] = useState<MaxPropertyFormState>(DEFAULT_MAX_PROPERTY);

  function handleMaxPropertyChange<K extends keyof MaxPropertyFormState>(
    key: K,
    value: MaxPropertyFormState[K],
  ) {
    setMaxPropertyForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── FLPP (subsidized mortgage) state ──────────────────────────────────────
  const [flppForm, setFlppForm] = useState<FlppFormState>(DEFAULT_FLPP);

  function handleFlppChange<K extends keyof FlppFormState>(key: K, value: FlppFormState[K]) {
    setFlppForm((prev) => ({ ...prev, [key]: value }));
  }

  const flppResult = useMemo(() => {
    if (!activeCalculated) return null;
    const valuation = deriveLoanValuation(activeCalculated.form);
    if (!valuation) return null;
    const monthlyIncome = parseFloat(flppForm.monthlyIncome);
    if (!(monthlyIncome > 0)) return null;
    return assessFlpp({
      propertyPrice: valuation.propertyPrice,
      monthlyIncome,
      loanPrincipal: valuation.principal,
      tenorMonths: activeCalculated.summary.originalTenorMonths,
      isFirstHome: flppForm.isFirstHome,
      priceCap: parseFloat(flppForm.priceCapIDR) || 0,
      incomeCap: parseFloat(flppForm.incomeCapIDR) || 0,
    });
  }, [flppForm, activeCalculated]);

  const flppCurrentInstallment =
    activeCalculated?.summary.installmentGroups[0]?.installmentAmount ?? null;

  const refinancingExportData =
    refinancingResult !== null
      ? { form: refinancingForm, result: refinancingResult }
      : undefined;

  // ── Section refs + scroll helpers ─────────────────────────────────────────
  const affordabilityRef = useRef<HTMLDivElement>(null);
  const refinancingRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  function scrollToAffordability() {
    affordabilityRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function scrollToRefinancing() {
    handleRefinancingPrefill();
    refinancingRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  // Hide the "Lihat Hasil" button when the results section is on screen.
  const [resultsVisible, setResultsVisible] = useState(false);
  useEffect(() => {
    const el = resultsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setResultsVisible(entry.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mobile "See Results" shortcut: jump to the first error when the active
  // scenario is invalid, otherwise to the computed results.
  const activeHasSummary = active.summary !== null;
  const activeHasErrors = !activeHasSummary && active.errors.length > 0;

  function handleSeeResults() {
    const target = activeHasErrors ? formRef.current : resultsRef.current;
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  // ──────────────────────────────────────────────────────────────────────────

  function handleReset() {
    resetAll();
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    history.replaceState(null, '', url.toString());
  }

  // Contextual jump-bar sections — only the tools currently on the page, in
  // page order. Gated identically to the panels below so there are no dead links.
  const navSections = [
    { id: 'section-results', label: t('toolsNav.results') },
    { id: 'section-max-property', label: t('toolsNav.maxProperty') },
    { id: 'section-affordability', label: t('toolsNav.affordability') },
    { id: 'section-refinancing', label: t('toolsNav.refinancing') },
    { id: 'section-buy-vs-rent', label: t('toolsNav.buyVsRent') },
    { id: 'section-flpp', label: t('toolsNav.flpp') },
    ...(activeCount > 1 && calculated.length >= 2
      ? [{ id: 'section-comparison', label: t('toolsNav.comparison') }]
      : []),
  ];

  return (
    <>
      {showOnboarding && <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} />}
      <div className="space-y-5">
      <ScenarioTabs
        scenarios={scenarios}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        canAdd={canAdd}
        onAdd={addScenario}
        onRemove={removeScenario}
        onRename={renameScenario}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(400px,480px)_1fr] gap-6 items-start">
        {/* ── Left: active scenario form ─────────────────────────────────── */}
        <div ref={formRef}>
          <LoanInputForm
            form={active.form}
            dispatch={active.dispatch}
            errors={active.errors}
            fieldErrors={active.fieldErrors}
          />
        </div>

        {/* ── Right: results for active scenario ─────────────────────────── */}
        <div ref={resultsRef} id="section-results" className="space-y-4 lg:sticky lg:top-6 scroll-mt-16">
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
            decisionResult={decisionResult}
            allDecisionResults={allDecisionResults}
            onComputeSandbox={computeSandbox}
            activeAffordability={affordabilityResults.find((r) => r.scenario.id === activeTab)?.result}
            maxDSR={Math.max(0.01, parseNum(affordabilityForm.maxDSRPercent) / 100)}
          />
        </div>
      </div>

      {/* ── Decision tools — immediately below results grid ─────────────────── */}

      {/* Contextual jump bar — appears once a calculation exists */}
      {calculated.length >= 1 && <DecisionToolsNav sections={navSections} />}

      {/* Max property (reverse affordability) — standalone; works with no scenario */}
      <div id="section-max-property" className="scroll-mt-16">
        <MaxPropertyPanel form={maxPropertyForm} onChange={handleMaxPropertyChange} />
      </div>

      {/* Affordability — first tool after the main result */}
      {calculated.length >= 1 && (
        <div ref={affordabilityRef} id="section-affordability" className="scroll-mt-16">
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
        <div ref={refinancingRef} id="section-refinancing" className="scroll-mt-16">
          <RefinancingPanel
            form={refinancingForm}
            onChange={handleRefinancingChange}
            result={refinancingResult}
            activeScenario={activeCalculated}
            onPrefill={handleRefinancingPrefill}
          />
        </div>
      )}

      {/* Buy vs Rent — after refinancing */}
      {calculated.length >= 1 && (
        <div id="section-buy-vs-rent" className="scroll-mt-16">
          <BuyVsRentPanel
            form={buyVsRentForm}
            onChange={handleBuyVsRentChange}
            result={buyVsRentResult}
          />
        </div>
      )}

      {/* FLPP subsidized mortgage — after buy vs rent */}
      {calculated.length >= 1 && (
        <div id="section-flpp" className="scroll-mt-16">
          <FlppPanel
            form={flppForm}
            onChange={handleFlppChange}
            result={flppResult}
            currentInstallment={flppCurrentInstallment}
          />
        </div>
      )}

      {/* Scenario comparison — advanced feature, at the bottom */}
      {activeCount > 1 && calculated.length >= 2 && (
        <div id="section-comparison" className="scroll-mt-16">
          <ScenarioComparisonPanel
            scenarios={calculated}
            affordability={affordabilityExportData}
            refinancing={refinancingExportData}
            verdicts={scenarioVerdicts}
            decisions={allDecisionResults}
          />
        </div>
      )}

      {/* FAQ — always visible at the very bottom */}
      <div id="faq">
        <FaqSection />
      </div>
    </div>

      <MobileSeeResultsShortcut
        hasSummary={activeHasSummary}
        hasErrors={activeHasErrors}
        resultsVisible={resultsVisible}
        onClick={handleSeeResults}
        label={t('results.seeResults')}
        ariaLabel={activeHasErrors ? t('results.seeResultsErrorsAria') : t('results.seeResultsAria')}
      />
    </>
  );
}

// ─── Results panel ────────────────────────────────────────────────────────────

interface ResultsPanelProps {
  scenario: ScenarioState;
  calculated: CalculatedScenario[];
  scenarios: ScenarioState[];
  activeCount: 1 | 2 | 3;
  activeTab: ScenarioId;
  onReset: () => void;
  affordability: import('../../infrastructure/pdf/exportService').AffordabilityExportData | undefined;
  refinancing: import('../../infrastructure/pdf/exportService').RefinancingExportData | undefined;
  onScrollToAffordability: () => void;
  onScrollToRefinancing: () => void;
  decisionResult?: DecisionSummaryResult | null;
  allDecisionResults?: DecisionSummaryResult[];
  onComputeSandbox?: (extraIncome: number) => DecisionSummaryResult | null;
  activeAffordability?: AffordabilityResult;
  maxDSR?: number;
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
  decisionResult,
  allDecisionResults,
  onComputeSandbox,
  activeAffordability,
  maxDSR,
}: ResultsPanelProps) {
  const { t } = useTranslation();
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
        <div className="flex flex-wrap justify-end gap-x-2 gap-y-2">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            aria-label={t('results.resetAria')}
          >
            {t('results.resetAll')}
          </button>
          <ShareReportModal
            calculated={calculated}
            allScenarios={scenarios}
            activeCount={activeCount}
            activeTab={activeTab}
            disabled={calculated.length === 0}
            decisions={allDecisionResults?.length ? allDecisionResults : undefined}
          />
          <CsvExportButton scenarios={calculated} affordability={affordability} />
          <ExportButton
            form={form}
            summary={summary}
            scenarios={calculated}
            affordability={affordability}
            refinancing={refinancing}
            decision={decisionResult ?? undefined}
            decisions={allDecisionResults}
          />
        </div>

        {decisionResult && (
          <DecisionSummary
            result={decisionResult}
            activeAffordability={activeAffordability}
            maxDSR={maxDSR}
            onScrollToAffordability={onScrollToAffordability}
            onComputeSandbox={onComputeSandbox}
          />
        )}

        <SummaryCard summary={summary} onScrollToAmortization={scrollToAmortization} />

        <LtvIndicator form={form} />

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
              <p className="text-sm font-semibold text-gray-700">{t('results.amortizationTitle')}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('results.amortizationDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs text-blue-600 font-medium">
                {amortizationOpen ? t('results.amortizationHide') : t('results.amortizationShow')}
              </span>
              <ChevronIcon open={amortizationOpen} />
            </div>
          </button>
          {amortizationOpen && (
            <AmortizationTable
              schedule={summary.schedule}
              financingMode={summary.financingMode}
              syariahAkadType={summary.syariahAkadType}
            />
          )}
        </div>
      </>
    );
  }

  if (isCalcError) return <CalculationErrorState />;
  if (errors.length > 0) return <ValidationErrorState errors={errors} />;
  return <FormIncompleteState />;
}
