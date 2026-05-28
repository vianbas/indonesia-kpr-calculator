import LZString from 'lz-string';
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
import type { PaymentMethod, FinancingMode, SyariahAkadType } from '../domain/models/mortgage.types';

// ─── Public shape ─────────────────────────────────────────────────────────────

export interface UrlState {
  forms: MortgageFormState[];
  activeCount: 1 | 2 | 3;
  activeTab: ScenarioId;
}

/** Internal wire format — never expose the version field outside this module. */
type StoredPayload = UrlState & { v: 1 | 2 };

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
const FINANCING_MODES: ReadonlySet<FinancingMode> = new Set(['conventional', 'syariah']);
const SYARIAH_AKAD_TYPES: ReadonlySet<SyariahAkadType> = new Set([
  'murabahah', 'musyarakah_mutanaqishah',
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
function isFinancingMode(v: unknown): v is FinancingMode {
  return isStr(v) && FINANCING_MODES.has(v as FinancingMode);
}
function isSyariahAkadType(v: unknown): v is SyariahAkadType {
  return isStr(v) && SYARIAH_AKAD_TYPES.has(v as SyariahAkadType);
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

function isForm(f: unknown): f is Partial<MortgageFormState> {
  if (!f || typeof f !== 'object') return false;
  const o = f as Record<string, unknown>;

  // These 6 fields are always user-specific — never stripped, always required
  if (!(
    isStr(o.propertyPrice) &&
    isStr(o.downPaymentValue) &&
    isStr(o.tenorYears) &&
    isStr(o.startDate) &&
    isStr(o.fixedRate) &&
    isStr(o.floatingBaseRate)
  )) return false;

  // Fields that may be absent in v2 (stripped when equal to defaults)
  if ('downPaymentMode' in o && !isDpMode(o.downPaymentMode)) return false;
  if ('tenorAdditionalMonths' in o && !isStr(o.tenorAdditionalMonths)) return false;
  if ('paymentMethod' in o && !isPaymentMethod(o.paymentMethod)) return false;
  if ('calculationMethod' in o && !isCalcMethod(o.calculationMethod)) return false;
  if ('hasFixedPeriod' in o && !isBool(o.hasFixedPeriod)) return false;
  if ('fixedDurationMonths' in o && !isStr(o.fixedDurationMonths)) return false;
  if ('tiers' in o && (!Array.isArray(o.tiers) || !(o.tiers as unknown[]).every(isTier))) return false;
  if ('includeAdminFee' in o && !isBool(o.includeAdminFee)) return false;
  if ('adminFeeAmount' in o && !isStr(o.adminFeeAmount)) return false;

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
  if ('ppnEnabled' in o && !isBool(o.ppnEnabled)) return false;
  if ('ppnPercent' in o && !isStr(o.ppnPercent)) return false;
  if ('insuranceEnabled' in o && !isBool(o.insuranceEnabled)) return false;
  if ('lifeInsurancePremiumPercent' in o && !isStr(o.lifeInsurancePremiumPercent)) return false;
  if ('fireInsurancePremiumPercent' in o && !isStr(o.fireInsurancePremiumPercent)) return false;

  // Syariah fields (optional — old URLs decode as conventional)
  if ('financingMode' in o && !isFinancingMode(o.financingMode)) return false;
  if ('syariahAkadType' in o && !isSyariahAkadType(o.syariahAkadType)) return false;
  if ('syariahMarginPercent' in o && !isStr(o.syariahMarginPercent)) return false;
  if ('syariahUjrahPercent' in o && !isStr(o.syariahUjrahPercent)) return false;
  if ('syariahBankSharePercent' in o && !isStr(o.syariahBankSharePercent)) return false;

  return true;
}

/** Fills every optional field with its default when loading a URL that lacks them. */
function normalizeForm(f: unknown): MortgageFormState {
  const o = f as Record<string, unknown>;
  return {
    ...(f as MortgageFormState),
    // Fields made optional in v2 (stripped when equal to defaults)
    downPaymentMode: isDpMode(o.downPaymentMode) ? o.downPaymentMode : 'percent',
    tenorAdditionalMonths: isStr(o.tenorAdditionalMonths) ? o.tenorAdditionalMonths : '0',
    paymentMethod: isPaymentMethod(o.paymentMethod) ? o.paymentMethod : 'annuity',
    calculationMethod: isCalcMethod(o.calculationMethod) ? o.calculationMethod : 'fixed_single_floating',
    hasFixedPeriod: isBool(o.hasFixedPeriod) ? o.hasFixedPeriod : true,
    fixedDurationMonths: isStr(o.fixedDurationMonths) ? o.fixedDurationMonths : '24',
    tiers: Array.isArray(o.tiers) ? (o.tiers as unknown[]).filter(isTier) as TierFormRow[] : [],
    includeAdminFee: isBool(o.includeAdminFee) ? o.includeAdminFee : false,
    adminFeeAmount: isStr(o.adminFeeAmount) ? o.adminFeeAmount : '0',
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
    // Syariah fields (v1.1.0) — default to conventional for old URLs
    financingMode: isFinancingMode(o.financingMode) ? o.financingMode : 'conventional',
    syariahAkadType: isSyariahAkadType(o.syariahAkadType) ? o.syariahAkadType : 'murabahah',
    syariahMarginPercent: isStr(o.syariahMarginPercent) ? o.syariahMarginPercent : '8',
    syariahUjrahPercent: isStr(o.syariahUjrahPercent) ? o.syariahUjrahPercent : '8',
    syariahBankSharePercent: isStr(o.syariahBankSharePercent) ? o.syariahBankSharePercent : '80',
  };
}

function isStoredPayload(raw: unknown): raw is StoredPayload {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 && o.v !== 2) return false;
  if (!Array.isArray(o.forms) || o.forms.length < 1 || o.forms.length > 3) return false;
  if (!(o.forms as unknown[]).every(isForm)) return false;
  if (o.activeCount !== 1 && o.activeCount !== 2 && o.activeCount !== 3) return false;
  if (o.activeTab !== 1 && o.activeTab !== 2 && o.activeTab !== 3) return false;
  if ((o.forms as unknown[]).length !== o.activeCount) return false;
  if ((o.activeTab as number) > (o.activeCount as number)) return false;
  return true;
}

// ─── Default-stripping (v2 encoding) ─────────────────────────────────────────

/**
 * Fields whose default value is known and stable. When a form field matches
 * its default exactly, we omit it from the wire payload to save space.
 * normalizeForm() restores all omitted fields on decode.
 */
const FORM_WIRE_DEFAULTS: Partial<Record<keyof MortgageFormState, unknown>> = {
  downPaymentMode: 'percent',
  tenorAdditionalMonths: '0',
  paymentMethod: 'annuity',
  calculationMethod: 'fixed_single_floating',
  hasFixedPeriod: true,
  fixedDurationMonths: '24',
  tiers: [],
  includeAdminFee: false,
  adminFeeAmount: '0',
  includeKprFees: false,
  provisionFeePercent: '1',
  appraisalFeeAmount: '0',
  notaryFeePercent: '0.75',
  bphtbPercent: '5',
  ppnEnabled: false,
  ppnPercent: '11',
  insuranceEnabled: false,
  lifeInsurancePremiumPercent: '0',
  fireInsurancePremiumPercent: '0',
  earlyRepaymentMode: 'none',
  extraMonthlyAmount: '',
  extraMonthlyStartMonth: '1',
  extraMonthlyEndMonth: '',
  lumpSumAmount: '',
  lumpSumMonth: '',
  financingMode: 'conventional',
  syariahAkadType: 'murabahah',
  syariahMarginPercent: '8',
  syariahUjrahPercent: '8',
  syariahBankSharePercent: '80',
};

function stripFormDefaults(form: MortgageFormState): Partial<MortgageFormState> {
  const out: Partial<MortgageFormState> = {};
  for (const _key of Object.keys(form)) {
    const key = _key as keyof MortgageFormState;
    const value = form[key];
    const def = FORM_WIRE_DEFAULTS[key];

    if (def === undefined) {
      // No strippable default — always include
      (out as Record<string, unknown>)[key] = value;
    } else if (Array.isArray(def)) {
      // Array default (tiers: []) — only strip when empty
      if (Array.isArray(value) && (value as unknown[]).length > 0) {
        (out as Record<string, unknown>)[key] = value;
      }
    } else if (value !== def) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

// ─── Encode / decode ──────────────────────────────────────────────────────────

export function encodeUrlState(state: UrlState): string {
  const payload = {
    v: 2 as const,
    forms: state.forms.map(stripFormDefaults),
    activeCount: state.activeCount,
    activeTab: state.activeTab,
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

function parsePayload(json: string): UrlState | null {
  const raw: unknown = JSON.parse(json);
  if (!isStoredPayload(raw)) return null;
  const { v: _v, ...urlState } = raw;
  urlState.forms = (urlState.forms as unknown[]).map(normalizeForm);
  return urlState as UrlState;
}

export function decodeUrlState(s: string): UrlState | null {
  try {
    // Try lz-string first (v2 compressed format)
    const lzJson = LZString.decompressFromEncodedURIComponent(s);
    if (lzJson) return parsePayload(lzJson);

    // Fall back to legacy plain base64 (v1 URLs shared before this change)
    return parsePayload(atob(s));
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
