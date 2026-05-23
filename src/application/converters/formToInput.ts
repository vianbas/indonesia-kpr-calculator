import type { MortgageInput, FloatingTier, ValidationError } from '../../domain/models/mortgage.types';
import type { MortgageFormState } from '../store/formTypes';

export interface ConversionResult {
  input: MortgageInput | null;
  /** Pre-validation errors detected during conversion (e.g. DP ≥ property price) */
  conversionErrors: ValidationError[];
}

/**
 * Converts the form state (strings) into a typed MortgageInput for the domain.
 * Returns null input when essential fields are missing or unparseable.
 * Returns conversionErrors for logically invalid combos detectable before Zod validation.
 */
export function formToMortgageInput(form: MortgageFormState): ConversionResult {
  const none: ConversionResult = { input: null, conversionErrors: [] };

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

  // Fixed period
  const fixedPeriod =
    form.hasFixedPeriod && form.fixedDurationMonths && form.fixedRate
      ? {
          annualRate: percentToDecimal(form.fixedRate),
          durationMonths: parseInt(form.fixedDurationMonths) || 0,
        }
      : null;

  const fixedEnd = fixedPeriod?.durationMonths ?? 0;

  // Floating
  let floatingBaseRate: number | null = null;
  let floatingTiers: FloatingTier[] = [];

  if (form.floatingMode === 'base') {
    const rate = parseFloat(form.floatingBaseRate);
    if (!isNaN(rate)) {
      floatingBaseRate = percentToDecimal(form.floatingBaseRate);
    }
  } else {
    // Build tiers — fromMonth is derived, not stored
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
    },
    conversionErrors: [],
  };
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
