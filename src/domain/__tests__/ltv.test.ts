import { describe, it, expect } from 'vitest';
import {
  assessLtv,
  LTV_CAPS_CONVENTIONAL,
  SYARIAH_LTV_BONUS,
} from '../calculators/ltv';

describe('assessLtv', () => {
  it('returns null for a non-positive property value', () => {
    expect(assessLtv({ propertyValue: 0, downPayment: 0, financingMode: 'conventional' })).toBeNull();
    expect(assessLtv({ propertyValue: -1, downPayment: 0, financingMode: 'conventional' })).toBeNull();
  });

  it('computes LTV and DP ratio from property value and down payment', () => {
    const a = assessLtv({ propertyValue: 1_000_000_000, downPayment: 200_000_000, financingMode: 'conventional' })!;
    expect(a.loanPrincipal).toBe(800_000_000);
    expect(a.ltv).toBeCloseTo(0.8, 10);
    expect(a.downPaymentRatio).toBeCloseTo(0.2, 10);
  });

  it('marks a 15% DP as within the first-home conventional cap (85%) but a 10% DP as exceeding it', () => {
    const price = 1_000_000_000;
    const within = assessLtv({ propertyValue: price, downPayment: 150_000_000, financingMode: 'conventional' })!;
    const first = within.tiers.find((t) => t.order === 'first')!;
    expect(first.maxLtv).toBeCloseTo(LTV_CAPS_CONVENTIONAL.first, 10);
    expect(first.withinCap).toBe(true);
    expect(first.shortfall).toBe(0);

    const exceeds = assessLtv({ propertyValue: price, downPayment: 100_000_000, financingMode: 'conventional' })!;
    const firstX = exceeds.tiers.find((t) => t.order === 'first')!;
    expect(firstX.withinCap).toBe(false);
    // min DP for 85% cap = 15% = 150jt; already paid 100jt → need 50jt more
    expect(firstX.minDownPayment).toBe(150_000_000);
    expect(firstX.shortfall).toBe(50_000_000);
  });

  it('applies the syariah +5% LTV bonus (first-home cap becomes 90%)', () => {
    const a = assessLtv({ propertyValue: 1_000_000_000, downPayment: 100_000_000, financingMode: 'syariah' })!;
    const first = a.tiers.find((t) => t.order === 'first')!;
    expect(first.maxLtv).toBeCloseTo(LTV_CAPS_CONVENTIONAL.first + SYARIAH_LTV_BONUS, 10);
    // 10% DP → LTV 90% exactly meets the syariah first-home cap
    expect(first.withinCap).toBe(true);
  });

  it('returns three home-order tiers with progressively stricter caps', () => {
    const a = assessLtv({ propertyValue: 500_000_000, downPayment: 100_000_000, financingMode: 'conventional' })!;
    expect(a.tiers.map((t) => t.order)).toEqual(['first', 'second', 'third_plus']);
    expect(a.tiers[0].maxLtv).toBeGreaterThan(a.tiers[1].maxLtv);
    expect(a.tiers[1].maxLtv).toBeGreaterThan(a.tiers[2].maxLtv);
  });

  it('clamps a down payment larger than the property value to 0% LTV', () => {
    const a = assessLtv({ propertyValue: 100_000_000, downPayment: 250_000_000, financingMode: 'conventional' })!;
    expect(a.downPayment).toBe(100_000_000);
    expect(a.loanPrincipal).toBe(0);
    expect(a.ltv).toBe(0);
    expect(a.tiers.every((t) => t.withinCap)).toBe(true);
  });
});
