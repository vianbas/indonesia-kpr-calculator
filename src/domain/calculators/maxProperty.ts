import { maxLoanForInstallment } from './affordability';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MaxPropertyInput {
  monthlyIncome: number;
  spouseIncome: number;
  existingMonthlyDebt: number;
  /** Maximum acceptable debt-service ratio, as a percent (e.g. 30). */
  maxDsrPercent: number;
  /** Estimated annual rate (conventional) or margin/ujrah (Syariah), percent. */
  annualRatePercent: number;
  tenorMonths: number;
  /** Down payment as a percent of property price (e.g. 20). */
  downPaymentPercent: number;
  paymentMethod: 'annuity' | 'flat';
  financingMode?: 'conventional' | 'syariah';
}

export interface MaxPropertyResult {
  totalIncome: number;
  /** totalIncome × maxDSR — the gross monthly amount allotted to debt. */
  maxDebtCapacity: number;
  /** Capacity left for the new installment after existing debt. */
  maxInstallment: number;
  maxLoanAmount: number;
  maxPropertyPrice: number;
  downPaymentAmount: number;
  /** Installment actually implied by maxLoanAmount (≈ maxInstallment). */
  impliedInstallment: number;
  /** Effective DSR of the implied installment + existing debt, as a percent. */
  dsrPercent: number;
  notes: string[];
  isAffordable: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A safe, all-zero result carrying an explanatory note key. */
function zeroResult(totalIncome: number, maxDebtCapacity: number, noteKey: string): MaxPropertyResult {
  return {
    totalIncome,
    maxDebtCapacity: Math.max(0, Math.round(maxDebtCapacity)),
    maxInstallment: 0,
    maxLoanAmount: 0,
    maxPropertyPrice: 0,
    downPaymentAmount: 0,
    impliedInstallment: 0,
    dsrPercent: 0,
    notes: [noteKey],
    isAffordable: false,
  };
}

function impliedInstallmentFor(
  loan: number,
  annualRate: number,
  tenorMonths: number,
  paymentMethod: 'annuity' | 'flat',
): number {
  if (!(loan > 0) || !(tenorMonths > 0)) return 0;
  const r = annualRate / 12;
  if (paymentMethod === 'flat') {
    return Math.round(loan / tenorMonths + loan * r);
  }
  if (r === 0) return Math.round(loan / tenorMonths);
  const inst = (loan * r) / (1 - Math.pow(1 + r, -tenorMonths));
  return Number.isFinite(inst) ? Math.round(inst) : 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Reverse affordability: from income and assumptions, estimate the maximum loan
 * and property price a borrower can sustain within a DSR limit. Pure; never
 * returns NaN/Infinity. Note strings are i18n keys for the UI to translate.
 */
export function calculateMaxProperty(input: MaxPropertyInput): MaxPropertyResult {
  const totalIncome = Math.max(0, input.monthlyIncome) + Math.max(0, input.spouseIncome);
  const maxDsr = Math.max(0, input.maxDsrPercent) / 100;
  const existingDebt = Math.max(0, input.existingMonthlyDebt);
  const dpPercent = input.downPaymentPercent;
  const annualRate = Math.max(0, input.annualRatePercent) / 100;

  const maxDebtCapacity = totalIncome * maxDsr;

  if (!(totalIncome > 0)) {
    return zeroResult(totalIncome, maxDebtCapacity, 'maxProperty.noteNoIncome');
  }

  const maxInstallment = maxDebtCapacity - existingDebt;
  if (!(maxInstallment > 0)) {
    return zeroResult(totalIncome, maxDebtCapacity, 'maxProperty.noteDebtTooHigh');
  }

  // Down payment must leave a positive financed fraction (0 ≤ dp < 100).
  if (!(dpPercent >= 0) || dpPercent >= 100) {
    return zeroResult(totalIncome, maxDebtCapacity, 'maxProperty.noteDownPaymentInvalid');
  }

  const maxLoanAmount = maxLoanForInstallment({
    maxInstallment,
    annualRate,
    tenorMonths: input.tenorMonths,
    paymentMethod: input.paymentMethod,
  });

  const financedFraction = 1 - dpPercent / 100; // (0, 1]
  const maxPropertyPrice = financedFraction > 0 ? Math.round(maxLoanAmount / financedFraction) : 0;
  const downPaymentAmount = Math.round(maxPropertyPrice * (dpPercent / 100));
  const impliedInstallment = impliedInstallmentFor(
    maxLoanAmount,
    annualRate,
    input.tenorMonths,
    input.paymentMethod,
  );
  const dsrPercent =
    totalIncome > 0 ? Math.round(((impliedInstallment + existingDebt) / totalIncome) * 1000) / 10 : 0;

  const notes: string[] = [];
  if (existingDebt > 0) notes.push('maxProperty.noteExistingDebt');
  if (input.financingMode === 'syariah') notes.push('maxProperty.noteSyariah');
  notes.push('maxProperty.noteEstimateOnly');

  return {
    totalIncome,
    maxDebtCapacity: Math.round(maxDebtCapacity),
    maxInstallment: Math.round(maxInstallment),
    maxLoanAmount,
    maxPropertyPrice,
    downPaymentAmount,
    impliedInstallment,
    dsrPercent,
    notes,
    isAffordable: maxPropertyPrice > 0,
  };
}
