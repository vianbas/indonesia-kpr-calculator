/**
 * Core domain types for the KPR / Mortgage Calculator.
 * All rates are stored as decimals: 0.07 = 7% per annum.
 */

export type PaymentMethod = 'annuity' | 'flat';

/**
 * annuity – equal total installment each period; interest share falls over time
 * flat    – equal principal each period; interest calculated on INITIAL principal (constant)
 */

export interface FixedPeriod {
  /** Annual interest rate as decimal: 0.07 = 7% */
  annualRate: number;
  /** Number of months this rate applies, starting from month 1 */
  durationMonths: number;
}

export interface FloatingTier {
  /** Stable client-side ID for React key/list management */
  id: string;
  /** 1-based inclusive month this tier begins */
  fromMonth: number;
  /** 1-based inclusive month this tier ends */
  toMonth: number;
  /** Annual interest rate as decimal: 0.09 = 9% */
  annualRate: number;
}

export interface MortgageInput {
  /** Loan principal in IDR (positive integer) */
  principalAmount: number;
  /** Total loan term: 1–360 months */
  tenorMonths: number;
  paymentMethod: PaymentMethod;
  /** Null when the entire loan uses floating/tiered rates */
  fixedPeriod: FixedPeriod | null;
  /**
   * Simple single floating rate applied after fixedPeriod ends.
   * Ignored when floatingTiers is non-empty.
   */
  floatingBaseRate: number | null;
  /**
   * Tiered floating rates applied after fixedPeriod ends.
   * When provided, floatingBaseRate is ignored.
   */
  floatingTiers: FloatingTier[];
  /** Disbursement date — used to compute per-row payment dates */
  startDate: Date;
  includeAdminFee: boolean;
  /** One-time admin/processing fee in IDR */
  adminFeeAmount: number;
}

export interface ValidationError {
  /** Dot-notation field path, e.g. "fixedPeriod.durationMonths" */
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
