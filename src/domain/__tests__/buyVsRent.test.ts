import { describe, it, expect } from 'vitest';
import { calculateBuyVsRent, type BuyVsRentMonthly } from '../calculators/buyVsRent';

/** Builds a simple linear-amortization schedule for tests. */
function makeSchedule(months: number, principal: number, installment: number): BuyVsRentMonthly[] {
  const principalPerMonth = principal / months;
  return Array.from({ length: months }, (_, i) => ({
    installment,
    closingBalance: Math.max(0, principal - principalPerMonth * (i + 1)),
  }));
}

const BASE = {
  propertyPrice: 1_000_000_000,
  upfrontCost: 200_000_000, // 20% DP
  schedule: makeSchedule(240, 800_000_000, 6_500_000),
  rentGrowthAnnual: 0.05,
  appreciationAnnual: 0.05,
  investmentReturnAnnual: 0.04,
  horizonMonths: 120,
};

describe('calculateBuyVsRent', () => {
  it('favours buying when the home outgrows investments and rent is dear', () => {
    const r = calculateBuyVsRent({ ...BASE, monthlyRent: 9_000_000 });
    expect(r.recommendation).toBe('buy');
    expect(r.finalBuyerWealth).toBeGreaterThan(r.finalRenterWealth);
    expect(r.breakEvenMonth).not.toBeNull();
  });

  it('favours renting when investment returns beat appreciation and rent is cheap', () => {
    const r = calculateBuyVsRent({
      ...BASE,
      appreciationAnnual: 0.01,
      investmentReturnAnnual: 0.1,
      monthlyRent: 2_000_000,
    });
    expect(r.recommendation).toBe('rent');
    expect(r.finalRenterWealth).toBeGreaterThan(r.finalBuyerWealth);
  });

  it('clamps the horizon to the schedule length', () => {
    const short = makeSchedule(36, 800_000_000, 6_500_000);
    const r = calculateBuyVsRent({ ...BASE, schedule: short, monthlyRent: 9_000_000, horizonMonths: 120 });
    expect(r.points[r.points.length - 1].month).toBe(36);
  });

  it('samples one point per year plus the final month', () => {
    const r = calculateBuyVsRent({ ...BASE, monthlyRent: 9_000_000 });
    expect(r.points.map((p) => p.month)).toEqual([12, 24, 36, 48, 60, 72, 84, 96, 108, 120]);
  });

  it('higher appreciation raises buyer wealth and home value', () => {
    const low = calculateBuyVsRent({ ...BASE, monthlyRent: 5_000_000, appreciationAnnual: 0.0 });
    const high = calculateBuyVsRent({ ...BASE, monthlyRent: 5_000_000, appreciationAnnual: 0.08 });
    expect(high.finalBuyerWealth).toBeGreaterThan(low.finalBuyerWealth);
    expect(high.finalHomeValue).toBeGreaterThan(low.finalHomeValue);
  });

  it('transitions buy → close → rent as rent varies (close-call band exists)', () => {
    // Investment beats appreciation, so cheap rent favours renting and dear rent
    // favours buying — guaranteeing a crossover band where they are within 5%.
    const params = { ...BASE, appreciationAnnual: 0.03, investmentReturnAnnual: 0.06 };
    let sawBuy = false;
    let sawRent = false;
    let sawClose = false;
    for (let rent = 1_000_000; rent <= 14_000_000; rent += 100_000) {
      const rec = calculateBuyVsRent({ ...params, monthlyRent: rent }).recommendation;
      if (rec === 'buy') sawBuy = true;
      if (rec === 'rent') sawRent = true;
      if (rec === 'close') sawClose = true;
    }
    expect(sawBuy).toBe(true);
    expect(sawRent).toBe(true);
    expect(sawClose).toBe(true);
  });
});
