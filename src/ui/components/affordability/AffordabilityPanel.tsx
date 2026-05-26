import { useState, useMemo } from 'react';
import { AffordabilityInputs } from './AffordabilityInputs';
import { AffordabilityScenarioCard } from './AffordabilityScenarioCard';
import { calculateAffordability } from '../../../domain/calculators/affordability';
import { DEFAULT_AFFORDABILITY } from '../../../application/store/affordabilityTypes';
import type { AffordabilityFormState } from '../../../application/store/affordabilityTypes';
import type { AffordabilityInput } from '../../../domain/calculators/affordability';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  calculated: CalculatedScenario[];
}

function parseNum(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function deriveInput(scenario: CalculatedScenario, form: AffordabilityFormState): AffordabilityInput {
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

export function AffordabilityPanel({ calculated }: Props) {
  const [form, setForm] = useState<AffordabilityFormState>(DEFAULT_AFFORDABILITY);

  function handleChange(key: keyof AffordabilityFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const totalIncome = parseNum(form.monthlyIncome) + parseNum(form.spouseIncome);
  const maxDSR = Math.max(0.01, parseNum(form.maxDSRPercent) / 100);

  const results = useMemo(
    () =>
      calculated.map((scenario) => ({
        scenario,
        result: calculateAffordability(deriveInput(scenario, form)),
      })),
    [calculated, form],
  );

  return (
    <div className="space-y-4">
      <AffordabilityInputs form={form} onChange={handleChange} />

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
        <div className="text-center text-sm text-gray-400 py-8 bg-white rounded-xl shadow-sm border border-gray-200">
          Masukkan penghasilan bulanan untuk melihat analisis kemampuan bayar.
        </div>
      )}
    </div>
  );
}
