import type { PaymentMethod } from '../../domain/models/mortgage.types';

export interface TierFormRow {
  id: string;
  /** User-editable end month (except for the last tier which is locked to tenor) */
  toMonth: string;
  /** Annual rate as a percent string, e.g. "7.5" for 7.5% p.a. */
  rate: string;
}

export type DownPaymentMode = 'amount' | 'percent';
export type FloatingMode = 'base' | 'tiered';

export interface MortgageFormState {
  // ── Loan basics ────────────────────────────────────────────────────────────
  propertyPrice: string;
  downPaymentMode: DownPaymentMode;
  /** IDR string when mode='amount'; percent string when mode='percent' */
  downPaymentValue: string;
  tenorYears: string;
  tenorAdditionalMonths: string;
  paymentMethod: PaymentMethod;
  startDate: string; // YYYY-MM-DD

  // ── Fixed rate ─────────────────────────────────────────────────────────────
  hasFixedPeriod: boolean;
  fixedRate: string; // e.g. "7.5"
  fixedDurationMonths: string;

  // ── Floating rate ──────────────────────────────────────────────────────────
  floatingMode: FloatingMode;
  floatingBaseRate: string;
  tiers: TierFormRow[];

  // ── Fees ───────────────────────────────────────────────────────────────────
  includeAdminFee: boolean;
  adminFeeAmount: string;
}

// ─── Action types ─────────────────────────────────────────────────────────────

export type FormAction =
  | { type: 'SET_PROPERTY_PRICE'; value: string }
  | { type: 'SET_DOWN_PAYMENT_MODE'; mode: DownPaymentMode }
  | { type: 'SET_DOWN_PAYMENT_VALUE'; value: string }
  | { type: 'SET_TENOR_YEARS'; value: string }
  | { type: 'SET_TENOR_ADDITIONAL_MONTHS'; value: string }
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentMethod }
  | { type: 'SET_START_DATE'; value: string }
  | { type: 'SET_HAS_FIXED_PERIOD'; value: boolean }
  | { type: 'SET_FIXED_RATE'; value: string }
  | { type: 'SET_FIXED_DURATION_MONTHS'; value: string }
  | { type: 'SET_FLOATING_MODE'; mode: FloatingMode }
  | { type: 'SET_FLOATING_BASE_RATE'; value: string }
  | { type: 'ADD_TIER' }
  | { type: 'UPDATE_TIER'; id: string; field: 'toMonth' | 'rate'; value: string }
  | { type: 'REMOVE_TIER'; id: string }
  | { type: 'SET_INCLUDE_ADMIN_FEE'; value: boolean }
  | { type: 'SET_ADMIN_FEE_AMOUNT'; value: string };
