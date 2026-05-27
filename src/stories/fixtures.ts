/**
 * Shared mock data for Storybook stories.
 * All monetary values are in IDR (Indonesian Rupiah).
 */
import type { MortgageSummary, AmortizationRow, InstallmentGroup } from '../domain/models/amortization.types';
import type { AffordabilityResult, StressRow } from '../domain/calculators/affordability';
import type { RefinancingResult } from '../domain/calculators/refinancing';

// ─── Amortization schedule helpers ───────────────────────────────────────────

function makeRow(
  month: number,
  openingBalance: number,
  principal: number,
  interest: number,
  annualRate: number,
  interestType: 'fixed' | 'floating' = 'fixed',
): AmortizationRow {
  return {
    month,
    date: new Date(2024, month - 1, 1),
    openingBalance,
    principal,
    interest,
    installment: principal + interest,
    closingBalance: Math.max(0, openingBalance - principal),
    annualRate,
    interestType,
    extraPayment: 0,
  };
}

// 12-row schedule for KPR 500 jt, 20 thn, 7% fixed
export const MOCK_SCHEDULE_12: AmortizationRow[] = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  const openingBalance = 500_000_000 - i * 1_250_000;
  return makeRow(month, openingBalance, 1_250_000, 2_916_667, 0.07);
});

// ─── Installment groups ───────────────────────────────────────────────────────

const FIXED_GROUP: InstallmentGroup = {
  label: 'Month 1–24 (Fixed 7.00%)',
  fromMonth: 1,
  toMonth: 24,
  installmentAmount: 3_876_452,
  annualRate: 0.07,
  type: 'fixed',
};

const FLOAT_GROUP: InstallmentGroup = {
  label: 'Month 25–240 (Floating 10.50%)',
  fromMonth: 25,
  toMonth: 240,
  installmentAmount: 4_843_027,
  annualRate: 0.105,
  type: 'floating',
};

// ─── MortgageSummary fixtures ─────────────────────────────────────────────────

export const SUMMARY_FIXED_ONLY: MortgageSummary = {
  installmentGroups: [
    { label: 'Month 1–240 (Fixed 7.00%)', fromMonth: 1, toMonth: 240, installmentAmount: 3_876_452, annualRate: 0.07, type: 'fixed' },
  ],
  totalPrincipal: 500_000_000,
  totalInterest: 430_348_480,
  totalPayment: 930_348_480,
  adminFee: 0,
  effectiveAnnualRate: 0.07,
  schedule: MOCK_SCHEDULE_12,
  effectiveTenorMonths: 240,
  originalTenorMonths: 240,
  monthsSaved: 0,
  originalTotalInterest: 430_348_480,
  originalTotalPayment: 930_348_480,
  interestSaved: 0,
  interestSavedPercent: 0,
  downPayment: 200_000_000,
  provisionFee: 0,
  appraisalFee: 0,
  notaryFee: 0,
  bphtb: 0,
  ppnAmount: 0,
  lifeInsurance: 0,
  fireInsurance: 0,
  totalUpfrontCost: 200_000_000,
};

export const SUMMARY_FIXED_FLOATING: MortgageSummary = {
  installmentGroups: [FIXED_GROUP, FLOAT_GROUP],
  totalPrincipal: 500_000_000,
  totalInterest: 589_124_600,
  totalPayment: 1_089_124_600,
  adminFee: 2_500_000,
  effectiveAnnualRate: 0.0967,
  schedule: MOCK_SCHEDULE_12,
  effectiveTenorMonths: 240,
  originalTenorMonths: 240,
  monthsSaved: 0,
  originalTotalInterest: 589_124_600,
  originalTotalPayment: 1_089_124_600,
  interestSaved: 0,
  interestSavedPercent: 0,
  downPayment: 200_000_000,
  provisionFee: 5_000_000,
  appraisalFee: 3_500_000,
  notaryFee: 7_000_000,
  bphtb: 35_000_000,
  ppnAmount: 0,
  lifeInsurance: 4_200_000,
  fireInsurance: 1_500_000,
  totalUpfrontCost: 256_200_000,
};

export const SUMMARY_WITH_SAVINGS: MortgageSummary = {
  ...SUMMARY_FIXED_ONLY,
  effectiveTenorMonths: 196,
  monthsSaved: 44,
  totalInterest: 356_210_000,
  totalPayment: 856_210_000,
  originalTotalInterest: 430_348_480,
  originalTotalPayment: 930_348_480,
  interestSaved: 74_138_480,
  interestSavedPercent: 17.2,
};

// ─── AffordabilityResult fixtures ────────────────────────────────────────────

const STRESS_ROWS_SAFE: StressRow[] = [
  { rateOffsetPct: 0,  annualRate: 0.105, installment: 4_843_027, dsr: 0.242, netSurplus: 10_156_973, band: 'safe' },
  { rateOffsetPct: 1,  annualRate: 0.115, installment: 5_093_158, dsr: 0.255, netSurplus: 9_906_842, band: 'safe' },
  { rateOffsetPct: 2,  annualRate: 0.125, installment: 5_348_627, dsr: 0.267, netSurplus: 9_651_373, band: 'safe' },
  { rateOffsetPct: 3,  annualRate: 0.135, installment: 5_608_941, dsr: 0.280, netSurplus: 9_391_059, band: 'watch' },
];

const STRESS_ROWS_RISKY: StressRow[] = [
  { rateOffsetPct: 0,  annualRate: 0.105, installment: 4_843_027, dsr: 0.388, netSurplus: 1_156_973, band: 'watch' },
  { rateOffsetPct: 1,  annualRate: 0.115, installment: 5_093_158, dsr: 0.408, netSurplus: 906_842, band: 'risky' },
  { rateOffsetPct: 2,  annualRate: 0.125, installment: 5_348_627, dsr: 0.428, netSurplus: 651_373, band: 'risky' },
  { rateOffsetPct: 3,  annualRate: 0.135, installment: 5_608_941, dsr: 0.449, netSurplus: -391_059, band: 'risky' },
];

export const AFFORDABILITY_SAFE: AffordabilityResult = {
  totalIncome: 20_000_000,
  firstInstallment: 3_876_452,
  highestInstallment: 4_843_027,
  installmentJump: 966_575,
  dsrNow: 0.194,
  dsrAtHighest: 0.242,
  netSurplusNow: 12_123_548,
  netSurplusAtHighest: 10_156_973,
  stressTest: STRESS_ROWS_SAFE,
  maxAffordableLoan: 724_000_000,
  minRecommendedIncome: 13_840_077,
  riskBand: 'safe',
};

export const AFFORDABILITY_WATCH: AffordabilityResult = {
  ...AFFORDABILITY_SAFE,
  totalIncome: 12_500_000,
  dsrNow: 0.310,
  dsrAtHighest: 0.388,
  netSurplusNow: 3_623_548,
  netSurplusAtHighest: 1_156_973,
  stressTest: STRESS_ROWS_RISKY,
  maxAffordableLoan: 453_000_000,
  minRecommendedIncome: 13_840_077,
  riskBand: 'watch',
};

export const AFFORDABILITY_RISKY: AffordabilityResult = {
  ...AFFORDABILITY_SAFE,
  totalIncome: 10_000_000,
  dsrNow: 0.388,
  dsrAtHighest: 0.484,
  netSurplusNow: 1_123_548,
  netSurplusAtHighest: -843_027,
  stressTest: STRESS_ROWS_RISKY,
  maxAffordableLoan: 362_000_000,
  minRecommendedIncome: 13_840_077,
  riskBand: 'risky',
};

// ─── RefinancingResult fixtures ───────────────────────────────────────────────

export const REFI_WORTH_IT: RefinancingResult = {
  currentMonthlyPayment: 4_843_027,
  currentTotalInterest: 380_724_480,
  currentTotalPayment: 880_724_480,
  newMonthlyPayment: 4_191_565,
  newTotalInterest: 305_375_600,
  newTotalPayment: 805_375_600,
  monthlySavings: 651_462,
  totalInterestSavings: 75_348_880,
  totalSwitchingCost: 12_500_000,
  breakEvenMonths: 19,
  netSavings: 62_848_880,
  recommendation: 'worth_it',
};

export const REFI_MARGINAL: RefinancingResult = {
  currentMonthlyPayment: 4_843_027,
  currentTotalInterest: 380_724_480,
  currentTotalPayment: 880_724_480,
  newMonthlyPayment: 4_630_000,
  newTotalInterest: 360_400_000,
  newTotalPayment: 860_400_000,
  monthlySavings: 213_027,
  totalInterestSavings: 20_324_480,
  totalSwitchingCost: 12_500_000,
  breakEvenMonths: 59,
  netSavings: 7_824_480,
  recommendation: 'marginal',
};

export const REFI_NOT_WORTH_IT: RefinancingResult = {
  currentMonthlyPayment: 4_843_027,
  currentTotalInterest: 380_724_480,
  currentTotalPayment: 880_724_480,
  newMonthlyPayment: 4_950_000,
  newTotalInterest: 395_000_000,
  newTotalPayment: 895_000_000,
  monthlySavings: -106_973,
  totalInterestSavings: -14_275_520,
  totalSwitchingCost: 12_500_000,
  breakEvenMonths: null,
  netSavings: -26_775_520,
  recommendation: 'not_worth_it',
};

// ─── Scenario tabs mock ───────────────────────────────────────────────────────

export const MOCK_SCENARIOS_1 = [
  { id: 1 as const, label: 'Skenario 1', summary: SUMMARY_FIXED_ONLY, form: {} as never, errors: [], fieldErrors: {}, dispatch: () => {}, isCalcError: false },
];

export const MOCK_SCENARIOS_2 = [
  ...MOCK_SCENARIOS_1,
  { id: 2 as const, label: 'Skenario 2', summary: SUMMARY_FIXED_FLOATING, form: {} as never, errors: [], fieldErrors: {}, dispatch: () => {}, isCalcError: false },
];

export const MOCK_SCENARIOS_3 = [
  ...MOCK_SCENARIOS_2,
  { id: 3 as const, label: 'Skenario 3', summary: null, form: {} as never, errors: [], fieldErrors: {}, dispatch: () => {}, isCalcError: false },
];
