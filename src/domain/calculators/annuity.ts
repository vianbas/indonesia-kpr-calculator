import { Decimal, roundMoney } from '../utils/math';

/**
 * Calculates the monthly installment amount using the standard annuity formula:
 *   M = P × r(1+r)^n / ((1+r)^n − 1)
 *
 * Safe for zero interest rate: returns P / n (equal principal, no interest).
 *
 * @param principal    Current outstanding balance (IDR)
 * @param annualRate   Annual interest rate as decimal (0.07 = 7%)
 * @param remainingMonths Number of periods remaining from this point
 */
export function calculateAnnuityInstallment(
  principal: number,
  annualRate: number,
  remainingMonths: number,
): number {
  if (remainingMonths <= 0 || principal <= 0) return 0;

  const P = new Decimal(principal);

  // Zero-rate edge case: no interest component, installment = equal slices of principal
  if (annualRate === 0) {
    return roundMoney(P.dividedBy(remainingMonths));
  }

  const r = new Decimal(annualRate).dividedBy(12);
  const onePlusR = r.plus(1);
  const onePlusRPowN = onePlusR.toPower(remainingMonths);

  // M = P × r × (1+r)^n / ((1+r)^n − 1)
  const installment = P.times(r)
    .times(onePlusRPowN)
    .dividedBy(onePlusRPowN.minus(1));

  return roundMoney(installment);
}

/**
 * Calculates the interest portion of an annuity payment.
 * Interest = current_balance × monthly_rate
 */
export function calculateAnnuityInterest(currentBalance: number, annualRate: number): number {
  if (annualRate === 0 || currentBalance <= 0) return 0;
  return roundMoney(new Decimal(currentBalance).times(new Decimal(annualRate).dividedBy(12)));
}
