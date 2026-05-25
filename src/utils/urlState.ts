import type {
  MortgageFormState,
  TierFormRow,
  DownPaymentMode,
  CalculationMethod,
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

function isTier(t: unknown): t is TierFormRow {
  if (!t || typeof t !== 'object') return false;
  const o = t as Record<string, unknown>;
  return isStr(o.id) && isStr(o.toMonth) && isStr(o.rate);
}

function isForm(f: unknown): f is MortgageFormState {
  if (!f || typeof f !== 'object') return false;
  const o = f as Record<string, unknown>;
  return (
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
  );
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
    return urlState;
  } catch {
    return null;
  }
}

// ─── URL init helper (called once at app start) ───────────────────────────────

export function parseUrlInit(): UrlState | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s');
    if (!s) return null;
    return decodeUrlState(s);
  } catch {
    return null;
  }
}
