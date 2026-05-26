import { describe, it, expect } from 'vitest';
import { calculateAffordability } from '../../domain/calculators/affordability';
import type { AffordabilityInput } from '../../domain/calculators/affordability';

function makeInput(overrides: Partial<AffordabilityInput> = {}): AffordabilityInput {
  return {
    totalIncome: 25_000_000,
    existingMonthlyDebt: 2_000_000,
    monthlyLivingExpense: 5_000_000,
    minMonthlySurplus: 2_000_000,
    maxDSR: 0.35,
    firstInstallment: 4_650_000,
    highestInstallment: 4_950_000,
    paymentMethod: 'annuity',
    stressBaseRate: 0.11,
    stressBalance: 380_000_000,
    stressRemainingMonths: 98,
    principalAmount: 400_000_000,
    tenorMonths: 120,
    ...overrides,
  };
}

// ─── DSR ──────────────────────────────────────────────────────────────────────

describe('calculateAffordability — DSR', () => {
  it('dsrNow = (firstInstallment + existingDebt) / totalIncome', () => {
    const r = calculateAffordability(makeInput());
    expect(r.dsrNow).toBeCloseTo((4_650_000 + 2_000_000) / 25_000_000, 6);
  });

  it('dsrAtHighest = (highestInstallment + existingDebt) / totalIncome', () => {
    const r = calculateAffordability(makeInput());
    expect(r.dsrAtHighest).toBeCloseTo((4_950_000 + 2_000_000) / 25_000_000, 6);
  });

  it('dsrNow is 0 when totalIncome is 0', () => {
    const r = calculateAffordability(makeInput({ totalIncome: 0 }));
    expect(r.dsrNow).toBe(0);
    expect(r.dsrAtHighest).toBe(0);
  });
});

// ─── Net surplus ──────────────────────────────────────────────────────────────

describe('calculateAffordability — net surplus', () => {
  it('netSurplusNow = income - firstInstallment - existingDebt - living', () => {
    const r = calculateAffordability(makeInput());
    const expected = 25_000_000 - 4_650_000 - 2_000_000 - 5_000_000;
    expect(r.netSurplusNow).toBe(expected);
  });

  it('netSurplusAtHighest uses highestInstallment', () => {
    const r = calculateAffordability(makeInput());
    const expected = 25_000_000 - 4_950_000 - 2_000_000 - 5_000_000;
    expect(r.netSurplusAtHighest).toBe(expected);
  });

  it('netSurplus can be negative', () => {
    const r = calculateAffordability(makeInput({ totalIncome: 8_000_000 }));
    expect(r.netSurplusAtHighest).toBeLessThan(0);
  });
});

// ─── installmentJump ─────────────────────────────────────────────────────────

describe('calculateAffordability — installment jump', () => {
  it('installmentJump = highestInstallment - firstInstallment', () => {
    const r = calculateAffordability(makeInput());
    expect(r.installmentJump).toBe(300_000);
  });

  it('installmentJump is 0 when first equals highest (fixed-only)', () => {
    const r = calculateAffordability(
      makeInput({ firstInstallment: 4_000_000, highestInstallment: 4_000_000 }),
    );
    expect(r.installmentJump).toBe(0);
  });
});

// ─── Risk band ────────────────────────────────────────────────────────────────

describe('calculateAffordability — risk band', () => {
  it('safe when DSR at highest is well within limit and surplus above minimum', () => {
    const r = calculateAffordability(makeInput());
    // DSR at highest = 6.95M / 25M = 27.8% < 35%
    expect(r.riskBand).toBe('safe');
  });

  it('risky when DSR exceeds maxDSR', () => {
    // highestInstallment + existingDebt = 10.95M, income = 20M → DSR = 54.75% > 35%
    const r = calculateAffordability(
      makeInput({ totalIncome: 20_000_000, highestInstallment: 9_000_000 }),
    );
    expect(r.riskBand).toBe('risky');
  });

  it('risky when net surplus is negative', () => {
    const r = calculateAffordability(
      makeInput({ totalIncome: 10_000_000, monthlyLivingExpense: 5_000_000 }),
    );
    // surplus = 10M - 4.95M - 2M - 5M = -1.95M < 0
    expect(r.riskBand).toBe('risky');
  });

  it('watch when DSR is between 85% and 100% of maxDSR', () => {
    // DSR at highest should be > 35% * 0.85 = 29.75% but <= 35%
    // highestInstallment such that (inst + 2M) / 25M = 32%
    // inst = 25M * 0.32 - 2M = 6M
    const r = calculateAffordability(
      makeInput({ highestInstallment: 6_000_000 }),
    );
    const dsr = (6_000_000 + 2_000_000) / 25_000_000; // 32%
    expect(dsr).toBeGreaterThan(0.35 * 0.85);
    expect(dsr).toBeLessThanOrEqual(0.35);
    expect(r.riskBand).toBe('watch');
  });

  it('watch when surplus is below minimum but above 0', () => {
    // surplus = income - inst - debt - living
    // 25M - 4.95M - 2M - 17M = 1.05M (< minMonthlySurplus 2M)
    const r = calculateAffordability(
      makeInput({ monthlyLivingExpense: 17_000_000 }),
    );
    expect(r.riskBand).toBe('watch');
  });

  it('totalIncome = 0 returns safe (no crash)', () => {
    const r = calculateAffordability(makeInput({ totalIncome: 0 }));
    expect(r.riskBand).toBe('safe');
  });
});

// ─── Min recommended income ───────────────────────────────────────────────────

describe('calculateAffordability — min recommended income', () => {
  it('minRecommendedIncome = (highestInstallment + existingDebt) / maxDSR', () => {
    const r = calculateAffordability(makeInput());
    const expected = (4_950_000 + 2_000_000) / 0.35;
    expect(r.minRecommendedIncome).toBeCloseTo(expected, 0);
  });
});

// ─── Max affordable loan ──────────────────────────────────────────────────────

describe('calculateAffordability — max affordable loan', () => {
  it('returns 0 when totalIncome is 0', () => {
    const r = calculateAffordability(makeInput({ totalIncome: 0 }));
    expect(r.maxAffordableLoan).toBe(0);
  });

  it('returns 0 when existingDebt already exceeds maxDSR limit', () => {
    // maxInstallment = 25M * 0.35 - 30M = -21.25M → capped to 0
    const r = calculateAffordability(makeInput({ existingMonthlyDebt: 30_000_000 }));
    expect(r.maxAffordableLoan).toBe(0);
  });

  it('annuity max loan is a positive number for normal inputs', () => {
    const r = calculateAffordability(makeInput());
    expect(r.maxAffordableLoan).toBeGreaterThan(0);
  });

  it('flat max loan is a positive number for normal inputs', () => {
    const r = calculateAffordability(makeInput({ paymentMethod: 'flat' }));
    expect(r.maxAffordableLoan).toBeGreaterThan(0);
  });

  it('flat and annuity max loans differ for the same inputs', () => {
    const annuity = calculateAffordability(makeInput({ paymentMethod: 'annuity' }));
    const flat = calculateAffordability(makeInput({ paymentMethod: 'flat' }));
    expect(annuity.maxAffordableLoan).not.toBe(flat.maxAffordableLoan);
  });
});

// ─── Stress test ──────────────────────────────────────────────────────────────

describe('calculateAffordability — stress test', () => {
  it('produces exactly 4 rows (offsets 0, 1, 2, 3)', () => {
    const r = calculateAffordability(makeInput());
    expect(r.stressTest).toHaveLength(4);
    expect(r.stressTest.map((s) => s.rateOffsetPct)).toEqual([0, 1, 2, 3]);
  });

  it('annualRate at offset 0 equals stressBaseRate', () => {
    const r = calculateAffordability(makeInput({ stressBaseRate: 0.11 }));
    expect(r.stressTest[0].annualRate).toBeCloseTo(0.11, 6);
  });

  it('annualRate at offset 3 equals stressBaseRate + 0.03', () => {
    const r = calculateAffordability(makeInput({ stressBaseRate: 0.11 }));
    expect(r.stressTest[3].annualRate).toBeCloseTo(0.14, 6);
  });

  it('installment increases with each offset step', () => {
    const r = calculateAffordability(makeInput());
    for (let i = 1; i < r.stressTest.length; i++) {
      expect(r.stressTest[i].installment).toBeGreaterThan(r.stressTest[i - 1].installment);
    }
  });

  it('DSR increases with each offset step', () => {
    const r = calculateAffordability(makeInput());
    for (let i = 1; i < r.stressTest.length; i++) {
      expect(r.stressTest[i].dsr).toBeGreaterThan(r.stressTest[i - 1].dsr);
    }
  });

  it('net surplus decreases with each offset step', () => {
    const r = calculateAffordability(makeInput());
    for (let i = 1; i < r.stressTest.length; i++) {
      expect(r.stressTest[i].netSurplus).toBeLessThan(r.stressTest[i - 1].netSurplus);
    }
  });

  it('stress offset=0 base row uses annuity formula against stressBalance', () => {
    const input = makeInput({ stressBaseRate: 0.11, stressBalance: 380_000_000, stressRemainingMonths: 98 });
    const r = calculateAffordability(input);
    // The base row installment should be a reasonable KPR amount
    expect(r.stressTest[0].installment).toBeGreaterThan(4_000_000);
    expect(r.stressTest[0].installment).toBeLessThan(10_000_000);
  });

  it('flat stress test: each row uses initial principal (not declining balance)', () => {
    const input = makeInput({ paymentMethod: 'flat', stressBaseRate: 0.11 });
    const r0 = calculateAffordability(input);
    // Flat installment at offset 0: principal/tenor + principal * rate/12
    const expectedPrincipal = Math.round(400_000_000 / 120);
    const expectedInterest = Math.round((400_000_000 * 0.11) / 12);
    expect(r0.stressTest[0].installment).toBe(expectedPrincipal + expectedInterest);
  });

  it('all stress rows get band=safe for very high income', () => {
    const r = calculateAffordability(makeInput({ totalIncome: 200_000_000 }));
    expect(r.stressTest.every((s) => s.band === 'safe')).toBe(true);
  });
});
