import { Decimal, roundMoney } from '../utils/math';

/**
 * Flat-rate (suku bunga flat) method — common in Indonesian consumer lending.
 *
 * Key distinction from annuity:
 *   - Monthly principal  = initialPrincipal / tenorMonths   (constant, based on initial)
 *   - Monthly interest   = initialPrincipal × monthlyRate   (constant, based on initial)
 *   - Monthly installment = principal + interest             (constant)
 *
 * Because interest is always calculated on the ORIGINAL principal (not the
 * declining balance), the effective rate is roughly 1.8–1.9× the stated flat rate.
 */

/**
 * Monthly principal repayment component (constant throughout the loan).
 */
export function calculateFlatMonthlyPrincipal(
  initialPrincipal: number,
  tenorMonths: number,
): number {
  if (tenorMonths <= 0) return 0;
  return roundMoney(new Decimal(initialPrincipal).dividedBy(tenorMonths));
}

/**
 * Monthly interest component for a given annual rate.
 * Always based on the INITIAL principal, regardless of remaining balance.
 *
 * Safe for zero rate: returns 0.
 */
export function calculateFlatMonthlyInterest(
  initialPrincipal: number,
  annualRate: number,
): number {
  if (annualRate === 0 || initialPrincipal <= 0) return 0;
  return roundMoney(
    new Decimal(initialPrincipal).times(new Decimal(annualRate).dividedBy(12)),
  );
}

/**
 * Total flat-rate monthly installment.
 * Note: when the rate changes mid-term (tiered/floating), this changes
 * because the interest component changes, but the principal component stays fixed.
 */
export function calculateFlatInstallment(
  initialPrincipal: number,
  annualRate: number,
  tenorMonths: number,
): number {
  return (
    calculateFlatMonthlyPrincipal(initialPrincipal, tenorMonths) +
    calculateFlatMonthlyInterest(initialPrincipal, annualRate)
  );
}
