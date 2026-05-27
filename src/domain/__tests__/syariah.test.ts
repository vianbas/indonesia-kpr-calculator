import { describe, it, expect } from 'vitest';
import { calculateMurabahahSummary, calculateMmqSummary } from '../calculators/syariah';
import type { MurabahahInput, MmqInput } from '../calculators/syariah';

const START_DATE = new Date(2024, 0, 1); // 2024-01-01 local

function murabahahInput(overrides: Partial<MurabahahInput> = {}): MurabahahInput {
  return {
    financingAmount: 400_000_000,
    annualMarginRate: 0.08,
    tenorMonths: 12,
    startDate: START_DATE,
    includeAdminFee: false,
    adminFeeAmount: 0,
    ...overrides,
  };
}

function mmqInput(overrides: Partial<MmqInput> = {}): MmqInput {
  return {
    financingAmount: 400_000_000,
    annualUjrahRate: 0.08,
    bankSharePercent: 0.8,
    tenorMonths: 12,
    startDate: START_DATE,
    includeAdminFee: false,
    adminFeeAmount: 0,
    ...overrides,
  };
}

// ─── Murabahah ────────────────────────────────────────────────────────────────

describe('calculateMurabahahSummary', () => {
  it('computes correct totalMargin', () => {
    const s = calculateMurabahahSummary(murabahahInput());
    // totalMargin = 400M × 0.08 × (12/12) = 32M
    expect(s.totalMargin).toBe(32_000_000);
  });

  it('computes correct totalSalePrice', () => {
    const s = calculateMurabahahSummary(murabahahInput());
    expect(s.totalSalePrice).toBe(432_000_000);
  });

  it('monthly installment is totalSalePrice / tenorMonths (≈ 36M)', () => {
    const s = calculateMurabahahSummary(murabahahInput());
    const expected = Math.round(432_000_000 / 12);
    // Each group installment should match
    expect(s.installmentGroups[0].installmentAmount).toBe(expected);
  });

  it('all installments are equal (Murabahah is flat-equivalent, last row absorbs rounding)', () => {
    const tenor = 24;
    const s = calculateMurabahahSummary(murabahahInput({ tenorMonths: tenor }));
    const amounts = s.schedule.map((r) => r.installment);
    // Mid-period installments should all be exactly equal
    const regularSet = new Set(amounts.slice(0, -1));
    expect(regularSet.size).toBe(1);
    // Last-row rounding residual is bounded by tenorMonths Rupiah
    const first = amounts[0];
    const last = amounts[amounts.length - 1];
    expect(Math.abs(last - first)).toBeLessThanOrEqual(tenor);
  });

  it('closing balance ends at 0', () => {
    const s = calculateMurabahahSummary(murabahahInput());
    expect(s.schedule[s.schedule.length - 1].closingBalance).toBe(0);
  });

  it('totalInterest is mapped to totalMargin for chart compatibility', () => {
    const s = calculateMurabahahSummary(murabahahInput());
    expect(s.totalInterest).toBe(s.totalMargin);
  });

  it('schedule length equals tenorMonths', () => {
    const s = calculateMurabahahSummary(murabahahInput({ tenorMonths: 36 }));
    expect(s.schedule).toHaveLength(36);
  });

  it('financingMode is syariah', () => {
    expect(calculateMurabahahSummary(murabahahInput()).financingMode).toBe('syariah');
  });

  it('syariahAkadType is murabahah', () => {
    expect(calculateMurabahahSummary(murabahahInput()).syariahAkadType).toBe('murabahah');
  });

  it('includes adminFee in totalPayment when includeAdminFee is true', () => {
    const s1 = calculateMurabahahSummary(murabahahInput());
    const s2 = calculateMurabahahSummary(murabahahInput({ includeAdminFee: true, adminFeeAmount: 5_000_000 }));
    expect(s2.totalPayment - s1.totalPayment).toBe(5_000_000);
  });

  it('handles 240-month tenor without rounding explosion', () => {
    const s = calculateMurabahahSummary(murabahahInput({ tenorMonths: 240 }));
    expect(s.schedule[s.schedule.length - 1].closingBalance).toBe(0);
    expect(s.totalSalePrice).toBeDefined();
    expect(s.totalMargin).toBeGreaterThan(0);
  });
});

// ─── MMQ ──────────────────────────────────────────────────────────────────────

describe('calculateMmqSummary', () => {
  it('closing balance ends at 0', () => {
    const s = calculateMmqSummary(mmqInput());
    expect(s.schedule[s.schedule.length - 1].closingBalance).toBe(0);
  });

  it('totalInterest is mapped to totalUjrah for chart compatibility', () => {
    const s = calculateMmqSummary(mmqInput());
    expect(s.totalInterest).toBe(s.totalUjrah);
  });

  it('financingMode is syariah', () => {
    expect(calculateMmqSummary(mmqInput()).financingMode).toBe('syariah');
  });

  it('syariahAkadType is musyarakah_mutanaqishah', () => {
    expect(calculateMmqSummary(mmqInput()).syariahAkadType).toBe('musyarakah_mutanaqishah');
  });

  it('installment is consistent with annuity formula', () => {
    const s = calculateMmqSummary(mmqInput());
    const r = 0.08 / 12;
    const n = 12;
    const P = 400_000_000;
    // annuity formula
    const expected = Math.round(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
    expect(s.installmentGroups[0].installmentAmount).toBe(expected);
  });

  it('principal portion increases each month (declining balance behavior)', () => {
    const s = calculateMmqSummary(mmqInput({ tenorMonths: 24 }));
    const principals = s.schedule.map((r) => r.principal);
    // Annuity: principal rises over time
    expect(principals[1]).toBeGreaterThan(principals[0]);
    expect(principals[23]).toBeGreaterThan(principals[1]);
  });

  it('schedule length equals tenorMonths', () => {
    expect(calculateMmqSummary(mmqInput({ tenorMonths: 60 })).schedule).toHaveLength(60);
  });

  it('handles 240-month tenor without rounding explosion', () => {
    const s = calculateMmqSummary(mmqInput({ tenorMonths: 240 }));
    expect(s.schedule[s.schedule.length - 1].closingBalance).toBe(0);
  });

  it('ujrah is 0 for 0% rate (edge case)', () => {
    const s = calculateMmqSummary(mmqInput({ annualUjrahRate: 0 }));
    // With 0 rate every installment is equal principal, total interest ≈ 0
    expect(s.totalUjrah).toBe(0);
  });
});
