import { calculateAnnuityInstallment } from './annuity';
import { calculateFlatMonthlyPrincipal, calculateFlatMonthlyInterest } from './flat';
import { roundMoney } from '../utils/math';
import { Decimal } from '../utils/math';

export type RiskBand = 'safe' | 'watch' | 'risky';

export interface AffordabilityInput {
  // Income & obligations
  totalIncome: number;
  existingMonthlyDebt: number;
  monthlyLivingExpense: number;
  minMonthlySurplus: number;
  maxDSR: number; // decimal, e.g. 0.35

  // From scenario summary
  firstInstallment: number;
  highestInstallment: number;
  paymentMethod: 'annuity' | 'flat';

  // Stress test params — derived from the floating period start
  stressBaseRate: number;
  stressBalance: number;         // openingBalance of the first floating row (annuity)
  stressRemainingMonths: number; // months from floating start to loan end
  principalAmount: number;       // needed for flat stress test
  tenorMonths: number;           // needed for flat & max-loan calculation
}

export interface StressRow {
  rateOffsetPct: number;  // 0, 1, 2, 3
  annualRate: number;
  installment: number;
  dsr: number;
  netSurplus: number;
  band: RiskBand;
}

export interface AffordabilityResult {
  totalIncome: number;
  firstInstallment: number;
  highestInstallment: number;
  installmentJump: number;
  dsrNow: number;
  dsrAtHighest: number;
  netSurplusNow: number;
  netSurplusAtHighest: number;
  stressTest: StressRow[];
  maxAffordableLoan: number;
  minRecommendedIncome: number;
  riskBand: RiskBand;
}

// ─── Band helper ──────────────────────────────────────────────────────────────

function getBand(
  dsr: number,
  netSurplus: number,
  maxDSR: number,
  minSurplus: number,
): RiskBand {
  if (dsr > maxDSR || netSurplus < 0) return 'risky';
  if (dsr > maxDSR * 0.85 || netSurplus < minSurplus) return 'watch';
  return 'safe';
}

// ─── Stress installment ───────────────────────────────────────────────────────

function stressInstallment(input: AffordabilityInput, rateOffset: number): number {
  const rate = input.stressBaseRate + rateOffset / 100;
  if (input.paymentMethod === 'flat') {
    const principal = roundMoney(
      new Decimal(calculateFlatMonthlyPrincipal(input.principalAmount, input.tenorMonths)),
    );
    return principal + calculateFlatMonthlyInterest(input.principalAmount, rate);
  }
  return calculateAnnuityInstallment(input.stressBalance, rate, input.stressRemainingMonths);
}

// ─── Max affordable loan ──────────────────────────────────────────────────────

function maxAffordableLoan(input: AffordabilityInput): number {
  const maxInstallment = input.totalIncome * input.maxDSR - input.existingMonthlyDebt;
  if (maxInstallment <= 0) return 0;

  const r = input.stressBaseRate / 12;
  const n = input.tenorMonths;

  if (input.paymentMethod === 'flat') {
    // installment = L/n + L*r/12 → L = installment / (1/n + r/12)
    const divisor = 1 / n + r / 12;
    return divisor > 0 ? Math.round(maxInstallment / divisor) : 0;
  }

  // Annuity inverse: L = M × [(1 − (1+r)^−n) / r]
  if (r === 0) return Math.round(maxInstallment * n);
  const factor =
    (1 - Math.pow(1 + r, -n)) / r;
  return Math.round(maxInstallment * factor);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateAffordability(input: AffordabilityInput): AffordabilityResult {
  const { totalIncome, existingMonthlyDebt, monthlyLivingExpense, minMonthlySurplus, maxDSR } =
    input;

  const safe = totalIncome > 0;

  const dsrNow = safe
    ? (input.firstInstallment + existingMonthlyDebt) / totalIncome
    : 0;
  const dsrAtHighest = safe
    ? (input.highestInstallment + existingMonthlyDebt) / totalIncome
    : 0;

  const netSurplusNow = totalIncome - input.firstInstallment - existingMonthlyDebt - monthlyLivingExpense;
  const netSurplusAtHighest = totalIncome - input.highestInstallment - existingMonthlyDebt - monthlyLivingExpense;

  const riskBand = safe
    ? getBand(dsrAtHighest, netSurplusAtHighest, maxDSR, minMonthlySurplus)
    : 'safe';

  const minRecommendedIncome =
    maxDSR > 0
      ? roundMoney((input.highestInstallment + existingMonthlyDebt) / maxDSR)
      : 0;

  const stressTest: StressRow[] = [0, 1, 2, 3].map((offset) => {
    const inst = stressInstallment(input, offset);
    const dsr = safe ? (inst + existingMonthlyDebt) / totalIncome : 0;
    const surplus = totalIncome - inst - existingMonthlyDebt - monthlyLivingExpense;
    return {
      rateOffsetPct: offset,
      annualRate: input.stressBaseRate + offset / 100,
      installment: inst,
      dsr,
      netSurplus: surplus,
      band: safe ? getBand(dsr, surplus, maxDSR, minMonthlySurplus) : 'safe',
    };
  });

  return {
    totalIncome,
    firstInstallment: input.firstInstallment,
    highestInstallment: input.highestInstallment,
    installmentJump: Math.max(0, input.highestInstallment - input.firstInstallment),
    dsrNow,
    dsrAtHighest,
    netSurplusNow,
    netSurplusAtHighest,
    stressTest,
    maxAffordableLoan: safe ? maxAffordableLoan(input) : 0,
    minRecommendedIncome,
    riskBand,
  };
}
