import { describe, it, expect } from 'vitest';
import { generateAmortizationSchedule, calculateMortgageSummary } from '../calculators/amortization';
import type { MortgageInput } from '../models/mortgage.types';

const START_DATE = new Date('2024-01-01');

function makeInput(overrides: Partial<MortgageInput> = {}): MortgageInput {
  return {
    principalAmount: 500_000_000,
    tenorMonths: 120,
    paymentMethod: 'annuity',
    fixedPeriod: null,
    floatingBaseRate: 0.1,
    floatingTiers: [],
    startDate: START_DATE,
    includeAdminFee: false,
    adminFeeAmount: 0,
    ...overrides,
  };
}

// ─── No early repayment: baseline must still work ─────────────────────────────

describe('generateAmortizationSchedule — no early repayment', () => {
  it('all rows have extraPayment = 0', () => {
    const schedule = generateAmortizationSchedule(makeInput());
    expect(schedule.every((r) => r.extraPayment === 0)).toBe(true);
  });

  it('produces exactly tenorMonths rows', () => {
    const schedule = generateAmortizationSchedule(makeInput({ tenorMonths: 24 }));
    expect(schedule).toHaveLength(24);
  });

  it('closing balance is 0 on the last row', () => {
    const schedule = generateAmortizationSchedule(makeInput());
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });
});

// ─── Extra monthly payment ────────────────────────────────────────────────────

describe('generateAmortizationSchedule — extra_monthly', () => {
  it('schedule terminates earlier than tenorMonths', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 2_000_000, startMonth: 1 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule.length).toBeLessThan(input.tenorMonths);
  });

  it('closing balance is exactly 0 on the last row', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 2_000_000, startMonth: 1 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('rows before startMonth have extraPayment = 0', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 1_000_000, startMonth: 6 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    const before = schedule.filter((r) => r.month < 6);
    expect(before.every((r) => r.extraPayment === 0)).toBe(true);
  });

  it('rows from startMonth have extraPayment > 0 (while balance allows)', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 1_000_000, startMonth: 3 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    const active = schedule.filter((r) => r.month >= 3 && r.closingBalance > 0);
    expect(active.every((r) => r.extraPayment > 0)).toBe(true);
  });

  it('respects endMonth — no extra after endMonth', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 1_000_000, startMonth: 1, endMonth: 12 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    const after = schedule.filter((r) => r.month > 12 && r.closingBalance > 0);
    expect(after.every((r) => r.extraPayment === 0)).toBe(true);
  });

  it('extraPayment is capped to remaining balance when loan is almost paid', () => {
    // Small principal to trigger cap easily
    const input = makeInput({
      principalAmount: 1_000_000,
      tenorMonths: 12,
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 5_000_000, startMonth: 1 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    // Last row: closingBalance = 0 and extraPayment ≤ openingBalance
    const last = schedule[schedule.length - 1];
    expect(last.closingBalance).toBe(0);
    expect(last.extraPayment).toBeGreaterThanOrEqual(0);
    expect(last.extraPayment).toBeLessThanOrEqual(last.openingBalance);
  });
});

// ─── Lump sum ─────────────────────────────────────────────────────────────────

describe('generateAmortizationSchedule — lump_sum', () => {
  it('extra payment appears only on the specified month', () => {
    const lumpMonth = 24;
    const input = makeInput({
      earlyRepayment: {
        mode: 'lump_sum',
        lumpSum: { amount: 50_000_000, month: lumpMonth },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    const withExtra = schedule.filter((r) => r.extraPayment > 0);
    expect(withExtra).toHaveLength(1);
    expect(withExtra[0].month).toBe(lumpMonth);
  });

  it('schedule is shorter than tenorMonths after a large lump sum', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'lump_sum',
        lumpSum: { amount: 200_000_000, month: 12 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule.length).toBeLessThan(input.tenorMonths);
  });

  it('closing balance is 0 on the last row', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'lump_sum',
        lumpSum: { amount: 50_000_000, month: 24 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });
});

// ─── Both modes ───────────────────────────────────────────────────────────────

describe('generateAmortizationSchedule — both', () => {
  it('applies both extra monthly and lump sum', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'both',
        extraMonthly: { amount: 1_000_000, startMonth: 1 },
        lumpSum: { amount: 30_000_000, month: 12 },
      },
    });
    const scheduleBase   = generateAmortizationSchedule(makeInput());
    const scheduleBoth   = generateAmortizationSchedule(input);
    // Combined should finish even earlier than either alone
    expect(scheduleBoth.length).toBeLessThan(scheduleBase.length);
    expect(scheduleBoth[scheduleBoth.length - 1].closingBalance).toBe(0);
  });
});

// ─── MortgageSummary savings fields ──────────────────────────────────────────

describe('calculateMortgageSummary — savings fields', () => {
  it('returns zero savings when mode is none', () => {
    const input = makeInput();
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);
    expect(summary.monthsSaved).toBe(0);
    expect(summary.interestSaved).toBe(0);
    expect(summary.interestSavedPercent).toBe(0);
    expect(summary.effectiveTenorMonths).toBe(input.tenorMonths);
    expect(summary.originalTenorMonths).toBe(input.tenorMonths);
    expect(summary.originalTotalInterest).toBe(summary.totalInterest);
  });

  it('reports correct monthsSaved and interestSaved with extra monthly', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 2_000_000, startMonth: 1 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);

    expect(summary.monthsSaved).toBeGreaterThan(0);
    expect(summary.interestSaved).toBeGreaterThan(0);
    expect(summary.interestSavedPercent).toBeGreaterThan(0);
    expect(summary.interestSavedPercent).toBeLessThan(100);
    expect(summary.effectiveTenorMonths).toBe(schedule.length);
    expect(summary.originalTenorMonths).toBe(input.tenorMonths);
    expect(summary.originalTotalInterest).toBeGreaterThan(summary.totalInterest);
  });

  it('originalTotalInterest equals base schedule total interest', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'lump_sum',
        lumpSum: { amount: 50_000_000, month: 12 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);

    // Manually compute base schedule interest
    const baseSchedule = generateAmortizationSchedule({ ...input, earlyRepayment: undefined });
    const baseTotalInterest = baseSchedule.reduce((s, r) => s + r.interest, 0);

    expect(summary.originalTotalInterest).toBeCloseTo(baseTotalInterest, 0);
  });

  it('effectiveTenorMonths matches schedule length', () => {
    const input = makeInput({
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 3_000_000, startMonth: 1 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);
    expect(summary.effectiveTenorMonths).toBe(schedule.length);
  });
});

// ─── Flat rate early repayment ────────────────────────────────────────────────

describe('generateAmortizationSchedule — flat rate with extra_monthly', () => {
  it('schedule terminates early with flat payment method', () => {
    const input = makeInput({
      paymentMethod: 'flat',
      earlyRepayment: {
        mode: 'extra_monthly',
        extraMonthly: { amount: 3_000_000, startMonth: 1 },
      },
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule.length).toBeLessThan(input.tenorMonths);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });
});
