import type {
  MortgageInput,
  FloatingTier,
  EarlyRepaymentConfig,
  ValidationError,
  SyariahAkadType,
} from '../../domain/models/mortgage.types';
import type { MortgageFormState } from '../store/formTypes';

export interface SyariahConversionParams {
  akadType: SyariahAkadType;
  financingAmount: number;
  tenorMonths: number;
  startDate: Date;
  includeAdminFee: boolean;
  adminFeeAmount: number;
  kprFees: MortgageInput['kprFees'];
  annualMarginRate: number;
  annualUjrahRate: number;
  bankSharePercent: number;
}

export interface ConversionResult {
  input: MortgageInput | null;
  /** Pre-validation errors detected during conversion (e.g. DP ≥ property price) */
  conversionErrors: ValidationError[];
  /** Present when financingMode === 'syariah' and fields are valid */
  syariahParams?: SyariahConversionParams;
}

/**
 * Converts the form state (strings) into a typed MortgageInput for the domain.
 * Returns null input when essential fields are missing or unparseable.
 * Returns conversionErrors for logically invalid combos detectable before Zod validation.
 */
export function formToMortgageInput(form: MortgageFormState): ConversionResult {
  const none: ConversionResult = { input: null, conversionErrors: [] };

  // ── Syariah mode — return syariahParams instead of conventional MortgageInput ─
  if (form.financingMode === 'syariah') {
    return buildSyariahConversionResult(form);
  }

  const propertyPrice = parsePositiveNumber(form.propertyPrice);
  if (propertyPrice === null) return none;

  const downPaymentRaw = parsePositiveNumber(form.downPaymentValue, true); // 0 is valid
  if (downPaymentRaw === null) return none;

  const downPayment =
    form.downPaymentMode === 'percent'
      ? propertyPrice * (downPaymentRaw / 100)
      : downPaymentRaw;

  const principalAmount = propertyPrice - downPayment;
  if (principalAmount <= 0) {
    return {
      input: null,
      conversionErrors: [{
        field: 'downPaymentValue',
        message: 'Uang muka melebihi atau sama dengan harga properti. Nilai kredit harus lebih dari Rp 0.',
      }],
    };
  }

  const tenorYears = parseInt(form.tenorYears) || 0;
  const tenorAdditional = parseInt(form.tenorAdditionalMonths) || 0;
  const tenorMonths = tenorYears * 12 + tenorAdditional;
  if (tenorMonths <= 0) return none;

  // Parse YYYY-MM-DD as local time (avoid UTC-midnight shift on non-UTC+X timezones)
  const startDate = parseLocalDate(form.startDate);
  if (startDate === null) return none;

  // ── Determine fixedPeriod and floating based on calculationMethod ──────────

  let fixedPeriod: MortgageInput['fixedPeriod'] = null;
  let floatingBaseRate: number | null = null;
  let floatingTiers: FloatingTier[] = [];

  if (form.calculationMethod === 'fixed_only') {
    // Entire tenor is at the fixed rate — no floating period
    if (!form.fixedRate) return none;
    fixedPeriod = {
      annualRate: percentToDecimal(form.fixedRate),
      durationMonths: tenorMonths,
    };
    // floatingBaseRate and floatingTiers remain null/[]

  } else if (form.calculationMethod === 'fixed_single_floating') {
    // Fixed period (optional) + single floating rate
    fixedPeriod =
      form.hasFixedPeriod && form.fixedDurationMonths && form.fixedRate
        ? {
            annualRate: percentToDecimal(form.fixedRate),
            durationMonths: parseInt(form.fixedDurationMonths) || 0,
          }
        : null;

    const rate = parseFloat(form.floatingBaseRate);
    if (!isNaN(rate)) {
      floatingBaseRate = percentToDecimal(form.floatingBaseRate);
    }

  } else {
    // fixed_tiered_floating: fixed period (optional) + tiered floating rates
    fixedPeriod =
      form.hasFixedPeriod && form.fixedDurationMonths && form.fixedRate
        ? {
            annualRate: percentToDecimal(form.fixedRate),
            durationMonths: parseInt(form.fixedDurationMonths) || 0,
          }
        : null;

    const fixedEnd = fixedPeriod?.durationMonths ?? 0;
    let fromMonth = fixedEnd + 1;
    floatingTiers = form.tiers
      .map((t): FloatingTier | null => {
        const toMonth = parseInt(t.toMonth);
        const annualRate = percentToDecimal(t.rate);
        if (isNaN(toMonth) || isNaN(annualRate)) return null;
        const tier: FloatingTier = { id: t.id, fromMonth, toMonth, annualRate };
        fromMonth = toMonth + 1;
        return tier;
      })
      .filter((t): t is FloatingTier => t !== null);
  }

  return {
    input: {
      principalAmount,
      tenorMonths,
      paymentMethod: form.paymentMethod,
      fixedPeriod,
      floatingBaseRate,
      floatingTiers,
      startDate,
      includeAdminFee: form.includeAdminFee,
      adminFeeAmount: parsePositiveNumber(form.adminFeeAmount, true) ?? 0,
      earlyRepayment: buildEarlyRepaymentConfig(form, tenorMonths),
      kprFees: buildKprFees(form, propertyPrice, principalAmount, tenorMonths),
    },
    conversionErrors: [],
  };
}

// ─── KPR fees builder ─────────────────────────────────────────────────────────

function buildKprFees(
  form: import('../store/formTypes').MortgageFormState,
  propertyPrice: number,
  principalAmount: number,
  tenorMonths: number,
): import('../../domain/models/mortgage.types').MortgageInput['kprFees'] {
  if (!form.includeKprFees) return undefined;

  const provisionPct = (parseFloat(form.provisionFeePercent) || 0) / 100;
  const notaryPct = (parseFloat(form.notaryFeePercent) || 0) / 100;
  const bphtbPct = (parseFloat(form.bphtbPercent) || 0) / 100;

  const tenorYears = tenorMonths / 12;

  const ppnAmount = form.ppnEnabled
    ? Math.round(((parseFloat(form.ppnPercent) || 0) / 100) * propertyPrice)
    : 0;

  const lifeInsurance = form.insuranceEnabled
    ? Math.round(((parseFloat(form.lifeInsurancePremiumPercent) || 0) / 100) * principalAmount * tenorYears)
    : 0;

  const fireInsurance = form.insuranceEnabled
    ? Math.round(((parseFloat(form.fireInsurancePremiumPercent) || 0) / 100) * propertyPrice * tenorYears)
    : 0;

  return {
    downPayment: Math.max(0, propertyPrice - principalAmount),
    provisionFee: Math.round(provisionPct * principalAmount),
    appraisalFee: parsePositiveNumber(form.appraisalFeeAmount, true) ?? 0,
    notaryFee: Math.round(notaryPct * propertyPrice),
    bphtb: Math.round(bphtbPct * propertyPrice),
    ppnAmount,
    lifeInsurance,
    fireInsurance,
  };
}

// ─── Early repayment builder ──────────────────────────────────────────────────

function buildEarlyRepaymentConfig(form: import('../store/formTypes').MortgageFormState, tenorMonths: number): EarlyRepaymentConfig | undefined {
  const { earlyRepaymentMode } = form;
  if (earlyRepaymentMode === 'none') return undefined;

  const config: EarlyRepaymentConfig = { mode: earlyRepaymentMode };

  if (earlyRepaymentMode === 'extra_monthly' || earlyRepaymentMode === 'both') {
    const amount = parsePositiveNumber(form.extraMonthlyAmount);
    const startMonth = parseInt(form.extraMonthlyStartMonth) || 1;
    const endMonthRaw = parseInt(form.extraMonthlyEndMonth);
    let endMonth = !isNaN(endMonthRaw) && endMonthRaw > 0 ? endMonthRaw : undefined;
    // If endMonth is before startMonth, the window is impossible — treat as open-ended
    if (endMonth !== undefined && endMonth < startMonth) endMonth = undefined;
    if (amount !== null && amount > 0) {
      config.extraMonthly = { amount, startMonth, endMonth };
    }
  }

  if (earlyRepaymentMode === 'lump_sum' || earlyRepaymentMode === 'both') {
    const amount = parsePositiveNumber(form.lumpSumAmount);
    const monthRaw = parseInt(form.lumpSumMonth);
    // Cap to tenor so a month beyond the loan end doesn't silently vanish
    const month = !isNaN(monthRaw) ? Math.min(monthRaw, tenorMonths) : NaN;
    if (amount !== null && amount > 0 && !isNaN(month) && month > 0) {
      config.lumpSum = { amount, month };
    }
  }

  // If the mode requires data but none was provided, treat as 'none'
  const hasExtra = Boolean(config.extraMonthly);
  const hasLump = Boolean(config.lumpSum);
  if (
    (earlyRepaymentMode === 'extra_monthly' && !hasExtra) ||
    (earlyRepaymentMode === 'lump_sum' && !hasLump) ||
    (earlyRepaymentMode === 'both' && !hasExtra && !hasLump)
  ) {
    return undefined;
  }

  return config;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parses a number string; returns null if blank or NaN (unless allowZero). */
function parsePositiveNumber(value: string, allowZero = false): number | null {
  if (!value.trim()) return null;
  const n = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return null;
  if (!allowZero && n <= 0) return null;
  return n;
}

/** Converts a percent string "7.5" to decimal 0.075 */
function percentToDecimal(value: string): number {
  return parseFloat(value) / 100;
}

// ─── Syariah conversion ───────────────────────────────────────────────────────

function buildSyariahConversionResult(form: MortgageFormState): ConversionResult {
  const none: ConversionResult = { input: null, conversionErrors: [] };

  const propertyPrice = parsePositiveNumber(form.propertyPrice);
  if (propertyPrice === null) return none;

  const downPaymentRaw = parsePositiveNumber(form.downPaymentValue, true);
  if (downPaymentRaw === null) return none;

  const downPayment =
    form.downPaymentMode === 'percent'
      ? propertyPrice * (downPaymentRaw / 100)
      : downPaymentRaw;

  const financingAmount = propertyPrice - downPayment;
  if (financingAmount <= 0) {
    return {
      input: null,
      conversionErrors: [{
        field: 'downPaymentValue',
        message: 'Uang muka melebihi atau sama dengan harga properti. Nilai pembiayaan harus lebih dari Rp 0.',
      }],
    };
  }

  const tenorYears = parseInt(form.tenorYears) || 0;
  const tenorAdditional = parseInt(form.tenorAdditionalMonths) || 0;
  const tenorMonths = tenorYears * 12 + tenorAdditional;
  if (tenorMonths <= 0) return none;

  const startDate = parseLocalDate(form.startDate);
  if (startDate === null) return none;

  const annualMarginRate = percentToDecimal(form.syariahMarginPercent);
  const annualUjrahRate = percentToDecimal(form.syariahUjrahPercent);
  const bankSharePercent = (parseFloat(form.syariahBankSharePercent) || 80) / 100;

  if (isNaN(annualMarginRate) || annualMarginRate < 0) return none;
  if (isNaN(annualUjrahRate) || annualUjrahRate < 0) return none;

  const adminFeeAmount = parsePositiveNumber(form.adminFeeAmount, true) ?? 0;
  const kprFees = buildKprFees(form, propertyPrice, financingAmount, tenorMonths);

  return {
    input: null, // no conventional MortgageInput for Syariah
    conversionErrors: [],
    syariahParams: {
      akadType: form.syariahAkadType,
      financingAmount,
      tenorMonths,
      startDate,
      includeAdminFee: form.includeAdminFee,
      adminFeeAmount,
      kprFees,
      annualMarginRate,
      annualUjrahRate,
      bankSharePercent,
    },
  };
}

/**
 * Parses "YYYY-MM-DD" as a local-time Date.
 * `new Date("YYYY-MM-DD")` is spec-defined as UTC midnight, which shifts the
 * date backward by the UTC offset in negative-offset timezones.
 */
function parseLocalDate(value: string): Date | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [yyyy, mm, dd] = parts;
  if (!yyyy || !mm || !dd) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}
