import type { MortgageInput, FloatingTier } from '../../domain/models/mortgage.types';
import type { MortgageFormState } from '../store/formTypes';

/**
 * Converts the form state (strings) into a typed MortgageInput for the domain.
 * Returns null when essential fields are missing or unparseable — the validator
 * will produce the actual error messages for valid-looking but logically invalid inputs.
 */
export function formToMortgageInput(form: MortgageFormState): MortgageInput | null {
  const propertyPrice = parsePositiveNumber(form.propertyPrice);
  if (propertyPrice === null) return null;

  const downPaymentRaw = parsePositiveNumber(form.downPaymentValue, true); // 0 is valid
  if (downPaymentRaw === null) return null;

  const downPayment =
    form.downPaymentMode === 'percent'
      ? propertyPrice * (downPaymentRaw / 100)
      : downPaymentRaw;

  const principalAmount = propertyPrice - downPayment;
  if (principalAmount <= 0) return null;

  const tenorYears = parseInt(form.tenorYears) || 0;
  const tenorAdditional = parseInt(form.tenorAdditionalMonths) || 0;
  const tenorMonths = tenorYears * 12 + tenorAdditional;
  if (tenorMonths <= 0) return null;

  const startDate = new Date(form.startDate);
  if (isNaN(startDate.getTime())) return null;

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
    principalAmount,
    tenorMonths,
    paymentMethod: form.paymentMethod,
    fixedPeriod,
    floatingBaseRate,
    floatingTiers,
    startDate,
    includeAdminFee: form.includeAdminFee,
    adminFeeAmount: parsePositiveNumber(form.adminFeeAmount, true) ?? 0,
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
