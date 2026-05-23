/**
 * Phase 8 — Calculation precision and edge-case tests.
 *
 * Every test uses mathematically verifiable expected values so a reader can
 * check the arithmetic independently without running the code. All tests are
 * completely independent from the React UI.
 *
 * Notation used in comments:
 *   P  = principal amount (IDR)
 *   r  = monthly interest rate = annualRate / 12
 *   n  = number of months (tenor)
 *   M  = monthly installment
 *   Annuity formula: M = P × r × (1+r)^n / ((1+r)^n − 1)
 */

import { describe, it, expect } from 'vitest';
import { generateAmortizationSchedule, calculateMortgageSummary } from '../calculators/amortization';
import { validateMortgageInput } from '../validators/mortgage.validator';
import { calculateAnnuityInstallment } from '../calculators/annuity';
import { calculateFlatInstallment } from '../calculators/flat';
import type { MortgageInput } from '../models/mortgage.types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const BASE_DATE = new Date(2024, 0, 1); // 1 Jan 2024 — local time

function makeInput(overrides: Partial<MortgageInput> = {}): MortgageInput {
  return {
    principalAmount: 500_000_000,
    tenorMonths: 120,
    paymentMethod: 'annuity',
    fixedPeriod: null,
    floatingBaseRate: 0.09,
    floatingTiers: [],
    startDate: BASE_DATE,
    includeAdminFee: false,
    adminFeeAmount: 0,
    ...overrides,
  };
}

function run(input: MortgageInput) {
  const schedule = generateAmortizationSchedule(input);
  const summary = calculateMortgageSummary(input, schedule);
  return { schedule, summary };
}

// ─── 1. Zero interest only ────────────────────────────────────────────────────

describe('zero interest only', () => {
  it('annuity: each installment equals exactly P/n when annualRate = 0', () => {
    // P=600,000 n=6 r=0 → M = 600,000/6 = 100,000 per month, zero interest
    const input = makeInput({ principalAmount: 600_000, tenorMonths: 6, floatingBaseRate: 0 });
    const { schedule } = run(input);
    for (const row of schedule) {
      expect(row.interest).toBe(0);
      expect(row.installment).toBe(100_000);
    }
  });

  it('flat: each installment equals exactly P/n when annualRate = 0', () => {
    // Same principal, same tenor, flat method — result is identical to annuity at 0%
    const input = makeInput({
      principalAmount: 600_000,
      tenorMonths: 6,
      floatingBaseRate: 0,
      paymentMethod: 'flat',
    });
    const { schedule } = run(input);
    for (const row of schedule) {
      expect(row.interest).toBe(0);
      expect(row.installment).toBe(100_000);
    }
  });

  it('annuity: final balance is exactly Rp 0 with zero interest', () => {
    const input = makeInput({ principalAmount: 1_000_000, tenorMonths: 3, floatingBaseRate: 0 });
    const { schedule } = run(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('zero interest passes domain validation', () => {
    const input = makeInput({ floatingBaseRate: 0, fixedPeriod: null });
    expect(validateMortgageInput(input).valid).toBe(true);
  });
});

// ─── 2. Fixed + floating interest ────────────────────────────────────────────

describe('fixed + floating interest — precise transition', () => {
  it('months 1–24 carry annualRate 0.075 and months 25–120 carry annualRate 0.11', () => {
    // Fixed: 7.5% for 24 months; Floating: 11% for remaining 96 months
    const input = makeInput({
      principalAmount: 400_000_000,
      tenorMonths: 120,
      fixedPeriod: { annualRate: 0.075, durationMonths: 24 },
      floatingBaseRate: 0.11,
    });
    const { schedule } = run(input);

    // Fixed period
    for (let i = 0; i < 24; i++) {
      expect(schedule[i].annualRate).toBe(0.075);
      expect(schedule[i].interestType).toBe('fixed');
    }
    // Floating period
    for (let i = 24; i < 120; i++) {
      expect(schedule[i].annualRate).toBe(0.11);
      expect(schedule[i].interestType).toBe('floating');
    }
  });

  it('installment in the floating period is higher than in the fixed period (higher rate)', () => {
    // With a higher floating rate and still-large remaining balance,
    // the recalculated installment must exceed the fixed-period installment.
    const input = makeInput({
      principalAmount: 400_000_000,
      tenorMonths: 120,
      fixedPeriod: { annualRate: 0.075, durationMonths: 24 },
      floatingBaseRate: 0.11,
    });
    const { schedule } = run(input);
    const fixedInstallment    = schedule[0].installment;
    const floatingInstallment = schedule[24].installment;
    expect(floatingInstallment).toBeGreaterThan(fixedInstallment);
  });

  it('opening balance of month 25 equals closing balance of month 24', () => {
    const input = makeInput({
      principalAmount: 400_000_000,
      tenorMonths: 120,
      fixedPeriod: { annualRate: 0.075, durationMonths: 24 },
      floatingBaseRate: 0.11,
    });
    const { schedule } = run(input);
    expect(schedule[24].openingBalance).toBe(schedule[23].closingBalance);
  });

  it('final balance is exactly Rp 0 after fixed then floating period', () => {
    const input = makeInput({
      principalAmount: 400_000_000,
      tenorMonths: 120,
      fixedPeriod: { annualRate: 0.075, durationMonths: 24 },
      floatingBaseRate: 0.11,
    });
    const { schedule } = run(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('month-1 interest = P × (annualRate/12) exactly for a known rate', () => {
    // P=1,200,000, annualRate=0.12 → monthly rate=0.01 → interest month 1 = 12,000
    const input = makeInput({
      principalAmount: 1_200_000,
      tenorMonths: 12,
      fixedPeriod: null,
      floatingBaseRate: 0.12,
    });
    const { schedule } = run(input);
    // Interest month 1 = 1,200,000 × 0.01 = 12,000
    expect(schedule[0].interest).toBe(12_000);
  });
});

// ─── 3. Fixed + tiered floating interest ─────────────────────────────────────

describe('fixed + tiered floating interest', () => {
  it('applies the correct rate for each of three tiers after the fixed period', () => {
    // Fixed 2 months @ 7%, then tier1 2 months @ 8%, tier2 2 months @ 9%, tier3 2 months @ 10%
    const input = makeInput({
      principalAmount: 300_000_000,
      tenorMonths: 8,
      fixedPeriod: { annualRate: 0.07, durationMonths: 2 },
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 3, toMonth: 4, annualRate: 0.08 },
        { id: '2', fromMonth: 5, toMonth: 6, annualRate: 0.09 },
        { id: '3', fromMonth: 7, toMonth: 8, annualRate: 0.10 },
      ],
    });
    const { schedule } = run(input);
    expect(schedule[0].annualRate).toBe(0.07);  // month 1 — fixed
    expect(schedule[1].annualRate).toBe(0.07);  // month 2 — fixed
    expect(schedule[2].annualRate).toBe(0.08);  // month 3 — tier 1
    expect(schedule[3].annualRate).toBe(0.08);  // month 4 — tier 1
    expect(schedule[4].annualRate).toBe(0.09);  // month 5 — tier 2
    expect(schedule[5].annualRate).toBe(0.09);  // month 6 — tier 2
    expect(schedule[6].annualRate).toBe(0.10);  // month 7 — tier 3
    expect(schedule[7].annualRate).toBe(0.10);  // month 8 — tier 3
  });

  it('each tier boundary opens with the closing balance of the previous month', () => {
    const input = makeInput({
      principalAmount: 300_000_000,
      tenorMonths: 6,
      fixedPeriod: { annualRate: 0.07, durationMonths: 2 },
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 3, toMonth: 4, annualRate: 0.09 },
        { id: '2', fromMonth: 5, toMonth: 6, annualRate: 0.11 },
      ],
    });
    const { schedule } = run(input);
    // At every month transition, openingBalance[i] === closingBalance[i-1]
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].openingBalance).toBe(schedule[i - 1].closingBalance);
    }
  });

  it('final balance is exactly Rp 0 after three tiers', () => {
    const input = makeInput({
      principalAmount: 120_000_000,
      tenorMonths: 6,
      fixedPeriod: null,
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 1, toMonth: 2, annualRate: 0.07 },
        { id: '2', fromMonth: 3, toMonth: 4, annualRate: 0.09 },
        { id: '3', fromMonth: 5, toMonth: 6, annualRate: 0.11 },
      ],
    });
    const { schedule } = run(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('installment groups in summary match the number of tiers', () => {
    const input = makeInput({
      principalAmount: 300_000_000,
      tenorMonths: 6,
      fixedPeriod: { annualRate: 0.07, durationMonths: 2 },
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 3, toMonth: 4, annualRate: 0.09 },
        { id: '2', fromMonth: 5, toMonth: 6, annualRate: 0.11 },
      ],
    });
    const { summary } = run(input);
    // fixed + 2 tiers = 3 groups
    expect(summary.installmentGroups).toHaveLength(3);
  });
});

// ─── 4. Invalid inputs — negative amount ─────────────────────────────────────

describe('invalid inputs — negative amount', () => {
  it('validator rejects a negative principalAmount', () => {
    const result = validateMortgageInput(makeInput({ principalAmount: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'principalAmount')).toBe(true);
  });

  it('validator rejects principalAmount = 0', () => {
    const result = validateMortgageInput(makeInput({ principalAmount: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'principalAmount')).toBe(true);
  });

  it('validator rejects a negative annualRate in the fixed period', () => {
    const result = validateMortgageInput(makeInput({
      tenorMonths: 24,
      fixedPeriod: { annualRate: -0.05, durationMonths: 12 },
      floatingBaseRate: 0.09,
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.startsWith('fixedPeriod.annualRate'))).toBe(true);
  });

  it('validator rejects a negative floating base rate', () => {
    const result = validateMortgageInput(makeInput({ floatingBaseRate: -0.01 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'floatingBaseRate')).toBe(true);
  });

  it('validator rejects a negative annual rate inside a tier', () => {
    const result = validateMortgageInput(makeInput({
      floatingBaseRate: null,
      floatingTiers: [{ id: '1', fromMonth: 1, toMonth: 120, annualRate: -0.07 }],
    }));
    expect(result.valid).toBe(false);
  });

  it('validator rejects a negative adminFeeAmount', () => {
    const result = validateMortgageInput(makeInput({
      includeAdminFee: true,
      adminFeeAmount: -500_000,
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'adminFeeAmount')).toBe(true);
  });
});

// ─── 5. Invalid inputs — tenor ───────────────────────────────────────────────

describe('invalid inputs — tenor', () => {
  it('validator rejects tenorMonths = 0', () => {
    const result = validateMortgageInput(makeInput({ tenorMonths: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'tenorMonths')).toBe(true);
  });

  it('validator rejects tenorMonths = 361 (exceeds 30-year maximum)', () => {
    const result = validateMortgageInput(makeInput({ tenorMonths: 361 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'tenorMonths')).toBe(true);
  });

  it('validator rejects tenorMonths = 360 with a fixed period equal to tenor (no floating period)', () => {
    // fixedPeriod.durationMonths must be strictly less than tenorMonths
    const result = validateMortgageInput(makeInput({
      tenorMonths: 360,
      fixedPeriod: { annualRate: 0.07, durationMonths: 360 },
      floatingBaseRate: null,
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'fixedPeriod.durationMonths')).toBe(true);
  });

  it('validator accepts the maximum valid tenor of 360 months with a valid rate config', () => {
    const result = validateMortgageInput(makeInput({ tenorMonths: 360 }));
    expect(result.valid).toBe(true);
  });

  it('validator accepts the minimum valid tenor of 1 month', () => {
    const result = validateMortgageInput(makeInput({ tenorMonths: 1 }));
    expect(result.valid).toBe(true);
  });
});

// ─── 6. Rounding consistency ──────────────────────────────────────────────────

describe('rounding consistency', () => {
  it('flat rate: monthly installment = (P/n) + (P × r/12) for nice round numbers — exact', () => {
    // P=600,000 n=12 annualRate=6% (0.06)
    // monthly principal = 600,000/12 = 50,000
    // monthly interest  = 600,000 × 0.06/12 = 3,000
    // installment       = 53,000 exactly — no rounding needed
    const expectedInstallment = calculateFlatInstallment(600_000, 0.06, 12);
    expect(expectedInstallment).toBe(53_000);

    const input = makeInput({
      principalAmount: 600_000,
      tenorMonths: 12,
      paymentMethod: 'flat',
      floatingBaseRate: 0.06,
    });
    const { schedule } = run(input);
    // All non-last rows must equal the formula result exactly
    for (let i = 0; i < schedule.length - 1; i++) {
      expect(schedule[i].installment).toBe(53_000);
    }
  });

  it('flat rate: total interest = P × annualRate/12 × n for a constant-rate loan', () => {
    // P=600,000 n=12 annualRate=6%
    // total interest = 3,000 × 12 = 36,000 exactly
    const input = makeInput({
      principalAmount: 600_000,
      tenorMonths: 12,
      paymentMethod: 'flat',
      floatingBaseRate: 0.06,
    });
    const { summary } = run(input);
    expect(summary.totalInterest).toBe(36_000);
    expect(summary.totalPrincipal).toBe(600_000);
    expect(summary.totalPayment).toBe(636_000);
  });

  it('annuity: month-1 interest = principal × (annualRate/12) exactly', () => {
    // P=1,200,000 annualRate=12% → r=0.01 → interest month 1 = 12,000
    const input = makeInput({
      principalAmount: 1_200_000,
      tenorMonths: 12,
      floatingBaseRate: 0.12,
    });
    const { schedule } = run(input);
    expect(schedule[0].interest).toBe(12_000); // 1,200,000 × 0.01
  });

  it('annuity: month-1 principal = installment − interest', () => {
    const input = makeInput({
      principalAmount: 1_200_000,
      tenorMonths: 12,
      floatingBaseRate: 0.12,
    });
    const { schedule } = run(input);
    expect(schedule[0].principal).toBe(schedule[0].installment - schedule[0].interest);
  });

  it('annuity: totalPrincipal is within Rp 1 of the original loan for a 120-month loan', () => {
    // Rounding per row can cause a ±1 IDR cumulative drift — within 1 IDR is acceptable
    const input = makeInput({
      principalAmount: 500_000_000,
      tenorMonths: 120,
      floatingBaseRate: 0.085,
    });
    const { summary } = run(input);
    expect(Math.abs(summary.totalPrincipal - 500_000_000)).toBeLessThanOrEqual(1);
  });

  it('annuity: totalPrincipal is within Rp 1 of the original loan for a 360-month loan', () => {
    const input = makeInput({
      principalAmount: 500_000_000,
      tenorMonths: 360,
      floatingBaseRate: 0.11,
    });
    const { summary } = run(input);
    expect(Math.abs(summary.totalPrincipal - 500_000_000)).toBeLessThanOrEqual(1);
  });

  it('annuity: totalPayment = totalPrincipal + totalInterest + adminFee', () => {
    const input = makeInput({
      principalAmount: 400_000_000,
      tenorMonths: 120,
      floatingBaseRate: 0.09,
      includeAdminFee: true,
      adminFeeAmount: 3_000_000,
    });
    const { summary } = run(input);
    expect(summary.totalPayment).toBe(
      summary.totalPrincipal + summary.totalInterest + summary.adminFee,
    );
  });

  it('each row: installment = principal + interest (within 1 IDR) for annuity', () => {
    const input = makeInput({ principalAmount: 300_000_000, tenorMonths: 60, floatingBaseRate: 0.09 });
    const { schedule } = run(input);
    for (const row of schedule) {
      expect(Math.abs(row.installment - (row.principal + row.interest))).toBeLessThanOrEqual(1);
    }
  });
});

// ─── 7. Tier period exceeding loan tenor ─────────────────────────────────────

describe('tier period exceeding loan tenor', () => {
  it('validator rejects a single tier whose toMonth exceeds tenorMonths', () => {
    // tenorMonths=6, tier ends at month 8 → invalid
    const result = validateMortgageInput(makeInput({
      tenorMonths: 6,
      floatingBaseRate: null,
      floatingTiers: [{ id: '1', fromMonth: 1, toMonth: 8, annualRate: 0.09 }],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.startsWith('floatingTiers'))).toBe(true);
  });

  it('validator rejects when the last tier ends before tenorMonths (undercoverage)', () => {
    // tenorMonths=6, last tier ends at month 5 — month 6 has no rate
    const result = validateMortgageInput(makeInput({
      tenorMonths: 6,
      floatingBaseRate: null,
      floatingTiers: [{ id: '1', fromMonth: 1, toMonth: 5, annualRate: 0.09 }],
    }));
    expect(result.valid).toBe(false);
  });

  it('validator rejects overlapping tiers', () => {
    // tier 1: months 1–4, tier 2: months 3–6 → overlap at months 3–4
    const result = validateMortgageInput(makeInput({
      tenorMonths: 6,
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 1, toMonth: 4, annualRate: 0.08 },
        { id: '2', fromMonth: 3, toMonth: 6, annualRate: 0.10 },
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.toLowerCase().includes('overlap'))).toBe(true);
  });

  it('validator rejects a gap between two tiers', () => {
    // tier 1: months 1–3, tier 2: months 5–6 → month 4 uncovered
    const result = validateMortgageInput(makeInput({
      tenorMonths: 6,
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 1, toMonth: 3, annualRate: 0.08 },
        { id: '2', fromMonth: 5, toMonth: 6, annualRate: 0.10 },
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.toLowerCase().includes('gap'))).toBe(true);
  });

  it('validator accepts tiers that cover the full tenor exactly', () => {
    const result = validateMortgageInput(makeInput({
      tenorMonths: 6,
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 1, toMonth: 3, annualRate: 0.08 },
        { id: '2', fromMonth: 4, toMonth: 6, annualRate: 0.10 },
      ],
    }));
    expect(result.valid).toBe(true);
  });
});

// ─── 8. Final remaining balance close to zero ─────────────────────────────────

describe('final remaining balance must be Rp 0', () => {
  it('annuity — 12 months single rate: closing balance is exactly 0', () => {
    const { schedule } = run(makeInput({ tenorMonths: 12 }));
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('annuity — 360 months (maximum tenor): closing balance is exactly 0', () => {
    const { schedule } = run(makeInput({ tenorMonths: 360, floatingBaseRate: 0.11 }));
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('flat — 12 months: closing balance is exactly 0', () => {
    const { schedule } = run(makeInput({
      tenorMonths: 12,
      paymentMethod: 'flat',
      floatingBaseRate: 0.09,
    }));
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('annuity — fixed + floating transition: closing balance is exactly 0', () => {
    const input = makeInput({
      principalAmount: 400_000_000,
      tenorMonths: 120,
      fixedPeriod: { annualRate: 0.075, durationMonths: 24 },
      floatingBaseRate: 0.11,
    });
    const { schedule } = run(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('annuity — tiered floating only: closing balance is exactly 0', () => {
    const input = makeInput({
      principalAmount: 240_000_000,
      tenorMonths: 12,
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 1,  toMonth: 6,  annualRate: 0.08 },
        { id: '2', fromMonth: 7,  toMonth: 12, annualRate: 0.10 },
      ],
    });
    const { schedule } = run(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('schedule length equals tenorMonths exactly — no extra or missing rows', () => {
    const tenors = [1, 6, 12, 24, 120, 360];
    for (const tenorMonths of tenors) {
      const { schedule } = run(makeInput({ tenorMonths }));
      expect(schedule).toHaveLength(tenorMonths);
    }
  });

  it('annuity installment formula: calculateAnnuityInstallment result matches schedule row 1', () => {
    // The standalone formula function and the scheduler must agree on installment amount
    const P = 500_000_000;
    const annualRate = 0.09;
    const n = 120;
    const formulaResult = calculateAnnuityInstallment(P, annualRate, n);
    const { schedule } = run(makeInput({ principalAmount: P, tenorMonths: n, floatingBaseRate: annualRate }));
    expect(schedule[0].installment).toBe(formulaResult);
  });
});
