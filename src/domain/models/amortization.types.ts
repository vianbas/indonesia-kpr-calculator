/**
 * Types for amortization schedule output and mortgage summary.
 */

/** Internal rate lookup entry — one per month in the schedule */
export interface RateEntry {
  /** Annual rate as decimal */
  annualRate: number;
  type: 'fixed' | 'floating';
  /** Human-readable label for the tier, e.g. "9.00%" */
  tierLabel?: string;
}

/** month → RateEntry; 1-based month index */
export type RateSchedule = Map<number, RateEntry>;

/** One row in the amortization table — one per payment period */
export interface AmortizationRow {
  /** 1-based sequential month number */
  month: number;
  /** Expected payment date for this installment */
  date: Date;
  /** Loan balance at the START of the period */
  openingBalance: number;
  /** Principal repaid this period */
  principal: number;
  /** Interest charged this period */
  interest: number;
  /** Total payment (principal + interest) */
  installment: number;
  /** Loan balance at the END of the period */
  closingBalance: number;
  /** Annual rate in effect for this period (decimal) */
  annualRate: number;
  interestType: 'fixed' | 'floating';
  tierLabel?: string;
}

/**
 * A contiguous block of months sharing the same rate.
 * Used to display a concise installment summary above the full schedule.
 */
export interface InstallmentGroup {
  /** e.g. "Month 1–24 (Fixed 7.00%)" */
  label: string;
  fromMonth: number;
  toMonth: number;
  /** Installment amount at the START of this group */
  installmentAmount: number;
  annualRate: number;
  type: 'fixed' | 'floating';
}

export interface MortgageSummary {
  /** Grouped installment periods — drives the summary card in the UI */
  installmentGroups: InstallmentGroup[];
  totalPrincipal: number;
  totalInterest: number;
  /** totalPrincipal + totalInterest + adminFee */
  totalPayment: number;
  adminFee: number;
  /** Simple weighted-average rate across all months (informational) */
  effectiveAnnualRate: number;
  schedule: AmortizationRow[];
}
