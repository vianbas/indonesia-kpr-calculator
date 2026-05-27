import { describe, it, expect } from 'vitest';
import { calculateRefinancing } from '../calculators/refinancing';
import type { RefinancingInput } from '../calculators/refinancing';

function makeInput(overrides: Partial<RefinancingInput> = {}): RefinancingInput {
  return {
    remainingBalance: 400_000_000,
    currentAnnualRate: 0.10,      // 10%
    remainingMonths: 240,
    newAnnualRate: 0.08,           // 8%
    newTenorMonths: 240,
    provisionFeePercent: 0.01,     // 1%
    appraisalFeeIDR: 5_000_000,
    adminFeeIDR: 2_000_000,
    ...overrides,
  };
}

describe('calculateRefinancing', () => {
  it('new rate lower than current — produces positive savings', () => {
    const r = calculateRefinancing(makeInput());
    expect(r.currentMonthlyPayment).toBeGreaterThan(r.newMonthlyPayment);
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.totalInterestSavings).toBeGreaterThan(0);
  });

  it('calculates total switching cost correctly', () => {
    const r = calculateRefinancing(makeInput());
    // 1% of 400M + 5M + 2M = 4M + 5M + 2M = 11M
    expect(r.totalSwitchingCost).toBe(11_000_000);
  });

  it('break-even months is ceil(switchingCost / monthlySavings)', () => {
    const r = calculateRefinancing(makeInput());
    expect(r.breakEvenMonths).not.toBeNull();
    expect(r.breakEvenMonths).toBe(
      Math.ceil(r.totalSwitchingCost / r.monthlySavings),
    );
  });

  it('net savings = interest savings - switching cost', () => {
    const r = calculateRefinancing(makeInput());
    expect(r.netSavings).toBeCloseTo(r.totalInterestSavings - r.totalSwitchingCost, 0);
  });

  it('recommends worth_it when savings are large and break-even is early', () => {
    const r = calculateRefinancing(makeInput());
    // 10% → 8% over 240 months: big savings, early break-even
    expect(r.recommendation).toBe('worth_it');
  });

  it('recommends not_worth_it when new rate is higher', () => {
    const r = calculateRefinancing(makeInput({ newAnnualRate: 0.12 }));
    expect(r.monthlySavings).toBeLessThanOrEqual(0);
    expect(r.recommendation).toBe('not_worth_it');
    expect(r.breakEvenMonths).toBeNull();
  });

  it('recommends not_worth_it when switching cost exceeds total interest savings', () => {
    const r = calculateRefinancing(
      makeInput({
        newAnnualRate: 0.099,        // tiny rate reduction
        provisionFeePercent: 0.05,   // 5% provision = 20M
        appraisalFeeIDR: 10_000_000,
        adminFeeIDR: 5_000_000,
      }),
    );
    expect(r.netSavings).toBeLessThanOrEqual(0);
    expect(r.recommendation).toBe('not_worth_it');
  });

  it('recommends marginal when break-even is in second half of new tenor', () => {
    // Rate barely lower, long tenor → break-even late
    const r = calculateRefinancing(
      makeInput({
        remainingBalance: 400_000_000,
        currentAnnualRate: 0.08,
        newAnnualRate: 0.075,
        remainingMonths: 240,
        newTenorMonths: 240,
        provisionFeePercent: 0.03,   // 3% = 12M provision
        appraisalFeeIDR: 5_000_000,
        adminFeeIDR: 5_000_000,
      }),
    );
    if (r.netSavings > 0 && r.breakEvenMonths !== null) {
      const expectedBand = r.breakEvenMonths > 240 / 2 ? 'marginal' : 'worth_it';
      expect(r.recommendation).toBe(expectedBand);
    }
  });

  it('break-even is null when monthly savings is zero', () => {
    const r = calculateRefinancing(
      makeInput({ currentAnnualRate: 0.08, newAnnualRate: 0.08, newTenorMonths: 240 }),
    );
    // Same rate, same tenor — no savings
    expect(r.monthlySavings).toBe(0);
    expect(r.breakEvenMonths).toBeNull();
  });

  it('zero switching cost with positive savings → breakEvenMonths = 0 or 1 (ceil of 0)', () => {
    const r = calculateRefinancing(
      makeInput({
        provisionFeePercent: 0,
        appraisalFeeIDR: 0,
        adminFeeIDR: 0,
      }),
    );
    expect(r.totalSwitchingCost).toBe(0);
    // ceil(0 / positive) = 0, but Math.ceil(0 / n) = 0
    expect(r.breakEvenMonths).toBe(0);
    expect(r.recommendation).toBe('worth_it');
  });

  it('zero balance → all zeros and not_worth_it', () => {
    const r = calculateRefinancing(makeInput({ remainingBalance: 0 }));
    expect(r.currentMonthlyPayment).toBe(0);
    expect(r.newMonthlyPayment).toBe(0);
    expect(r.monthlySavings).toBe(0);
    expect(r.recommendation).toBe('not_worth_it');
  });

  it('current total payment = monthly × remaining months', () => {
    const r = calculateRefinancing(makeInput());
    expect(r.currentTotalPayment).toBeCloseTo(r.currentMonthlyPayment * 240, -2);
  });

  it('new total payment = new monthly × new tenor', () => {
    const r = calculateRefinancing(makeInput({ newTenorMonths: 180 }));
    expect(r.newTotalPayment).toBeCloseTo(r.newMonthlyPayment * 180, -2);
  });

  it('current total interest is non-negative', () => {
    const r = calculateRefinancing(makeInput());
    expect(r.currentTotalInterest).toBeGreaterThanOrEqual(0);
  });

  it('positive monthly savings but negative net savings → not_worth_it (switching cost exceeds total interest benefit)', () => {
    // 9% vs 10%: monthly payment drops (positive monthlySavings) but 20% provision
    // fee (80M) is larger than total interest savings (~63M) → netSavings < 0
    const r = calculateRefinancing(makeInput({
      newAnnualRate: 0.09,
      newTenorMonths: 240,
      provisionFeePercent: 0.20,
      appraisalFeeIDR: 0,
      adminFeeIDR: 0,
    }));
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.netSavings).toBeLessThan(0);
    expect(r.recommendation).toBe('not_worth_it');
    expect(r.recommendation).not.toBe('worth_it');
  });

  it('breakEvenMonths is non-null even when netSavings < 0 — monthly cash-flow recovery is not total interest recovery', () => {
    // Domain documents this behavior: breakEven is from monthly cash-flow alone;
    // recommendation (not_worth_it) is the correct guard when netSavings < 0.
    const r = calculateRefinancing(makeInput({
      newAnnualRate: 0.09,
      newTenorMonths: 240,
      provisionFeePercent: 0.20,
      appraisalFeeIDR: 0,
      adminFeeIDR: 0,
    }));
    expect(r.monthlySavings).toBeGreaterThan(0);
    expect(r.breakEvenMonths).not.toBeNull();
    expect(r.netSavings).toBeLessThan(0);
    expect(r.recommendation).toBe('not_worth_it');
  });

  it('shorter new tenor with lower rate may still be not_worth_it if interest savings negative', () => {
    // Lower rate but MUCH shorter tenor → lower total interest (savings negative means interest savings is negative)
    // Actually shorter tenor = less total interest = interest savings can be negative
    const r = calculateRefinancing(
      makeInput({
        newTenorMonths: 60,   // only 5 years left instead of 20
        newAnnualRate: 0.10,  // same rate, same balance, shorter tenor
        provisionFeePercent: 0.01,
      }),
    );
    // Shorter tenor → higher monthly payment → negative monthly savings
    expect(r.monthlySavings).toBeLessThan(0);
    expect(r.recommendation).toBe('not_worth_it');
  });
});
