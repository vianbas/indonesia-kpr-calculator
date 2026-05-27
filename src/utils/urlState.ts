import * as Sentry from '@sentry/react';
import { captureError } from '../lib/sentry';
import type {
  MortgageFormState,
  TierFormRow,
  DownPaymentMode,
  CalculationMethod,
  EarlyRepaymentMode,
} from '../application/store/formTypes';
import type { ScenarioId } from '../application/store/scenarioTypes';
import type { PaymentMethod } from '../domain/models/mortgage.types';

// ─── Public shape ─────────────────────────────────────────────────────────────

export interface UrlState {
  forms: MortgageFormState[];
  activeCount: 1 | 2 | 3;
  activeTab: ScenarioId;
}

/** Internal wire format — never expose the version field outside this module. */
type StoredPayload = UrlState & { v: 1 };

// ─── Type guards ──────────────────────────────────────────────────────────────

const PAYMENT_METHODS: ReadonlySet<PaymentMethod> = new Set(['annuity', 'flat']);
const CALC_METHODS: ReadonlySet<CalculationMethod> = new Set([
  'fixed_only',
  'fixed_single_floating',
  'fixed_tiered_floating',
]);
const DP_MODES: ReadonlySet<DownPaymentMode> = new Set(['amount', 'percent']);
const ER_MODES: ReadonlySet<EarlyRepaymentMode> = new Set([
  'none', 'extra_monthly', 'lump_sum', 'both',
]);

function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}
function isPaymentMethod(v: unknown): v is PaymentMethod {
  return isStr(v) && PAYMENT_METHODS.has(v as PaymentMethod);
}
function isCalcMethod(v: unknown): v is CalculationMethod {
  return isStr(v) && CALC_METHODS.has(v as CalculationMethod);
}
function isDpMode(v: unknown): v is DownPaymentMode {
  return isStr(v) && DP_MODES.has(v as DownPaymentMode);
}
function isErMode(v: unknown): v is EarlyRepaymentMode {
  return isStr(v) && ER_MODES.has(v as EarlyRepaymentMode);
}

function isTier(t: unknown): t is TierFormRow {
  if (!t || typeof t !== 'object') return false;
  const o = t as Record<string, unknown>;
  return isStr(o.id) && isStr(o.toMonth) && isStr(o.rate);
}

function isForm(f: unknown): f is Omit<MortgageFormState, 'earlyRepaymentMode' | 'extraMonthlyAmount' | 'extraMonthlyStartMonth' | 'extraMonthlyEndMonth' | 'lumpSumAmount' | 'lumpSumMonth'> {
  if (!f || typeof f !== 'object') return false;
  const o = f as Record<string, unknown>;

  // Core 15 fields — always required
  if (!(
    isStr(o.propertyPrice) &&
    isDpMode(o.downPaymentMode) &&
    isStr(o.downPaymentValue) &&
    isStr(o.tenorYears) &&
    isStr(o.tenorAdditionalMonths) &&
    isPaymentMethod(o.paymentMethod) &&
    isStr(o.startDate) &&
    isCalcMethod(o.calculationMethod) &&
    isBool(o.hasFixedPeriod) &&
    isStr(o.fixedRate) &&
    isStr(o.fixedDurationMonths) &&
    isStr(o.floatingBaseRate) &&
    Array.isArray(o.tiers) &&
    (o.tiers as unknown[]).every(isTier) &&
    isBool(o.includeAdminFee) &&
    isStr(o.adminFeeAmount)
  )) return false;

  // Early repayment fields — optional for backward compat; validate if present
  if ('earlyRepaymentMode' in o && !isErMode(o.earlyRepaymentMode)) return false;
  if ('extraMonthlyAmount' in o && !isStr(o.extraMonthlyAmount)) return false;
  if ('extraMonthlyStartMonth' in o && !isStr(o.extraMonthlyStartMonth)) return false;
  if ('extraMonthlyEndMonth' in o && !isStr(o.extraMonthlyEndMonth)) return false;
  if ('lumpSumAmount' in o && !isStr(o.lumpSumAmount)) return false;
  if ('lumpSumMonth' in o && !isStr(o.lumpSumMonth)) return false;

  // KPR fee fields — optional for backward compat; validate if present
  if ('includeKprFees' in o && !isBool(o.includeKprFees)) return false;
  if ('provisionFeePercent' in o && !isStr(o.provisionFeePercent)) return false;
  if ('appraisalFeeAmount' in o && !isStr(o.appraisalFeeAmount)) return false;
  if ('notaryFeePercent' in o && !isStr(o.notaryFeePercent)) return false;
  if ('bphtbPercent' in o && !isStr(o.bphtbPercent)) return false;
  // Cash-to-close fields (added in Phase 19)
  if ('ppnEnabled' in o && !isBool(o.ppnEnabled)) return false;
  if ('ppnPercent' in o && !isStr(o.ppnPercent)) return false;
  if ('insuranceEnabled' in o && !isBool(o.insuranceEnabled)) return false;
  if ('lifeInsurancePremiumPercent' in o && !isStr(o.lifeInsurancePremiumPercent)) return false;
  if ('fireInsurancePremiumPercent' in o && !isStr(o.fireInsurancePremiumPercent)) return false;

  return true;
}

/** Fills optional fields with defaults when loading an older URL that lacks them. */
function normalizeForm(f: unknown): MortgageFormState {
  const o = f as Record<string, unknown>;
  return {
    ...(f as MortgageFormState),
    // Early repayment fields (added after initial release)
    earlyRepaymentMode: isErMode(o.earlyRepaymentMode) ? o.earlyRepaymentMode : 'none',
    extraMonthlyAmount: isStr(o.extraMonthlyAmount) ? o.extraMonthlyAmount : '',
    extraMonthlyStartMonth: isStr(o.extraMonthlyStartMonth) ? o.extraMonthlyStartMonth : '1',
    extraMonthlyEndMonth: isStr(o.extraMonthlyEndMonth) ? o.extraMonthlyEndMonth : '',
    lumpSumAmount: isStr(o.lumpSumAmount) ? o.lumpSumAmount : '',
    lumpSumMonth: isStr(o.lumpSumMonth) ? o.lumpSumMonth : '',
    // KPR fee fields (added in Phase 15)
    includeKprFees: isBool(o.includeKprFees) ? o.includeKprFees : false,
    provisionFeePercent: isStr(o.provisionFeePercent) ? o.provisionFeePercent : '1',
    appraisalFeeAmount: isStr(o.appraisalFeeAmount) ? o.appraisalFeeAmount : '0',
    notaryFeePercent: isStr(o.notaryFeePercent) ? o.notaryFeePercent : '0.75',
    bphtbPercent: isStr(o.bphtbPercent) ? o.bphtbPercent : '5',
    // Cash-to-close fields (added in Phase 19)
    ppnEnabled: isBool(o.ppnEnabled) ? o.ppnEnabled : false,
    ppnPercent: isStr(o.ppnPercent) ? o.ppnPercent : '11',
    insuranceEnabled: isBool(o.insuranceEnabled) ? o.insuranceEnabled : false,
    lifeInsurancePremiumPercent: isStr(o.lifeInsurancePremiumPercent) ? o.lifeInsurancePremiumPercent : '0',
    fireInsurancePremiumPercent: isStr(o.fireInsurancePremiumPercent) ? o.fireInsurancePremiumPercent : '0',
  };
}

function isStoredPayload(raw: unknown): raw is StoredPayload {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return false;
  if (!Array.isArray(o.forms) || o.forms.length < 1 || o.forms.length > 3) return false;
  if (!(o.forms as unknown[]).every(isForm)) return false;
  if (o.activeCount !== 1 && o.activeCount !== 2 && o.activeCount !== 3) return false;
  if (o.activeTab !== 1 && o.activeTab !== 2 && o.activeTab !== 3) return false;
  // Consistency: forms array length must match activeCount
  if ((o.forms as unknown[]).length !== o.activeCount) return false;
  // activeTab must reference an active scenario
  if ((o.activeTab as number) > (o.activeCount as number)) return false;
  return true;
}

// ─── Encode / decode ──────────────────────────────────────────────────────────

export function encodeUrlState(state: UrlState): string {
  const payload: StoredPayload = { v: 1, ...state };
  return btoa(JSON.stringify(payload));
}

export function decodeUrlState(b64: string): UrlState | null {
  try {
    const json = atob(b64);
    const raw: unknown = JSON.parse(json);
    if (!isStoredPayload(raw)) return null;
    const { v: _v, ...urlState } = raw;
    // Normalize early repayment fields for URLs created before this feature existed
    urlState.forms = (urlState.forms as unknown[]).map(normalizeForm);
    return urlState as UrlState;
  } catch (err) {
    captureError(err, { feature: 'url_decode' });
    return null;
  }
}

// ─── URL init helper (called once at app start) ───────────────────────────────

export function parseUrlInit(): UrlState | null {
  return Sentry.startSpan({ name: 'kpr.url.parse_shared_state', op: 'url.parse' }, () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('s');
      if (!s) return null;
      return decodeUrlState(s);
    } catch {
      return null;
    }
  });
}
