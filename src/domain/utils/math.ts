import Decimal from 'decimal.js';

// 20 significant digits, banker's-style half-up rounding for all monetary ops
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Round to nearest IDR (no cents) */
export function roundMoney(value: Decimal | number): number {
  return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/** Convert annual rate (decimal) to monthly rate as Decimal */
export function toMonthlyRateDecimal(annualRate: number): Decimal {
  return new Decimal(annualRate).dividedBy(12);
}
