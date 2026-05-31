import type { PaymentMethod, FinancingMode, SyariahAkadType } from '../../domain/models/mortgage.types';

export type EarlyRepaymentMode = 'none' | 'extra_monthly' | 'lump_sum' | 'both';

export interface TierFormRow {
  id: string;
  /** User-editable end month (except for the last tier which is locked to tenor) */
  toMonth: string;
  /** Annual rate as a percent string, e.g. "7.5" for 7.5% p.a. */
  rate: string;
}

export interface LumpSumFormRow {
  id: string;
  /** One-time extra payment amount (IDR string). */
  amount: string;
  /** 1-based month the lump sum is applied. */
  month: string;
}

export type DownPaymentMode = 'amount' | 'percent';

/**
 * fixed_only            — entire tenor at the fixed rate; no floating period
 * fixed_single_floating — fixed period, then one flat floating rate
 * fixed_tiered_floating — fixed period, then tiered floating rates
 */
export type CalculationMethod =
  | 'fixed_only'
  | 'fixed_single_floating'
  | 'fixed_tiered_floating';

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

  // ── Calculation method ─────────────────────────────────────────────────────
  calculationMethod: CalculationMethod;

  // ── Fixed rate ─────────────────────────────────────────────────────────────
  hasFixedPeriod: boolean;
  fixedRate: string; // e.g. "7.5"
  fixedDurationMonths: string;

  // ── Floating rate ──────────────────────────────────────────────────────────
  floatingBaseRate: string;
  tiers: TierFormRow[];

  // ── Fees ───────────────────────────────────────────────────────────────────
  includeAdminFee: boolean;
  adminFeeAmount: string;

  // ── KPR fees (Biaya Pembelian) ─────────────────────────────────────────────
  includeKprFees: boolean;
  /** % of loan amount, e.g. "1" for 1% */
  provisionFeePercent: string;
  /** Fixed IDR amount */
  appraisalFeeAmount: string;
  /** % of property price, e.g. "0.75" */
  notaryFeePercent: string;
  /** % of property price, e.g. "5" */
  bphtbPercent: string;
  /** PPN (VAT) for new developer properties */
  ppnEnabled: boolean;
  /** % of property price, e.g. "11" for 11% */
  ppnPercent: string;
  /** Life and fire insurance bundled with the KPR */
  insuranceEnabled: boolean;
  /** Annual life insurance premium as % of loan amount, e.g. "0.2" */
  lifeInsurancePremiumPercent: string;
  /** Annual fire insurance premium as % of property value, e.g. "0.075" */
  fireInsurancePremiumPercent: string;

  // ── Financing mode (Konvensional / Syariah) ────────────────────────────────
  financingMode: FinancingMode;
  syariahAkadType: SyariahAkadType;
  /** Annual margin rate as percent string, e.g. "8" for 8% p.a. (Murabahah) */
  syariahMarginPercent: string;
  /** Annual ujrah/nisbah rate as percent string (MMQ) */
  syariahUjrahPercent: string;
  /** Bank's initial ownership share as percent string, e.g. "80" for 80% (MMQ) */
  syariahBankSharePercent: string;

  // ── Early repayment (Pelunasan Dipercepat) ─────────────────────────────────
  earlyRepaymentMode: EarlyRepaymentMode;
  /** Extra IDR amount paid every month on top of the regular installment */
  extraMonthlyAmount: string;
  /** 1-based month to start extra monthly payments */
  extraMonthlyStartMonth: string;
  /** 1-based month to stop extra monthly payments; empty = until loan ends */
  extraMonthlyEndMonth: string;
  /** Zero or more one-time prepayments, each at its own month. */
  lumpSums: LumpSumFormRow[];
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
  | { type: 'SET_CALCULATION_METHOD'; method: CalculationMethod }
  | { type: 'SET_HAS_FIXED_PERIOD'; value: boolean }
  | { type: 'SET_FIXED_RATE'; value: string }
  | { type: 'SET_FIXED_DURATION_MONTHS'; value: string }
  | { type: 'SET_FLOATING_BASE_RATE'; value: string }
  | { type: 'ADD_TIER' }
  | { type: 'UPDATE_TIER'; id: string; field: 'toMonth' | 'rate'; value: string }
  | { type: 'REMOVE_TIER'; id: string }
  | { type: 'SET_INCLUDE_ADMIN_FEE'; value: boolean }
  | { type: 'SET_ADMIN_FEE_AMOUNT'; value: string }
  | { type: 'SET_INCLUDE_KPR_FEES'; value: boolean }
  | { type: 'SET_PROVISION_FEE_PERCENT'; value: string }
  | { type: 'SET_APPRAISAL_FEE_AMOUNT'; value: string }
  | { type: 'SET_NOTARY_FEE_PERCENT'; value: string }
  | { type: 'SET_BPHTB_PERCENT'; value: string }
  | { type: 'SET_PPN_ENABLED'; value: boolean }
  | { type: 'SET_PPN_PERCENT'; value: string }
  | { type: 'SET_INSURANCE_ENABLED'; value: boolean }
  | { type: 'SET_LIFE_INSURANCE_PREMIUM_PERCENT'; value: string }
  | { type: 'SET_FIRE_INSURANCE_PREMIUM_PERCENT'; value: string }
  | { type: 'SET_EARLY_REPAYMENT_MODE'; mode: EarlyRepaymentMode }
  | { type: 'SET_EXTRA_MONTHLY_AMOUNT'; value: string }
  | { type: 'SET_EXTRA_MONTHLY_START_MONTH'; value: string }
  | { type: 'SET_EXTRA_MONTHLY_END_MONTH'; value: string }
  | { type: 'ADD_LUMP_SUM' }
  | { type: 'UPDATE_LUMP_SUM'; id: string; field: 'amount' | 'month'; value: string }
  | { type: 'REMOVE_LUMP_SUM'; id: string }
  | { type: 'SET_FINANCING_MODE'; mode: FinancingMode }
  | { type: 'SET_SYARIAH_AKAD_TYPE'; akadType: SyariahAkadType }
  | { type: 'SET_SYARIAH_MARGIN_PERCENT'; value: string }
  | { type: 'SET_SYARIAH_UJRAH_PERCENT'; value: string }
  | { type: 'SET_SYARIAH_BANK_SHARE_PERCENT'; value: string }
  | { type: 'RESET_TO_DEFAULT' }
  | { type: 'LOAD_STATE'; state: MortgageFormState };
