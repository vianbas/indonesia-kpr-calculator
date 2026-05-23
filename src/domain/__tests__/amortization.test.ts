import { describe, it, expect } from 'vitest';
import { generateAmortizationSchedule, calculateMortgageSummary } from '../calculators/amortization';
import { calculateAnnuityInstallment } from '../calculators/annuity';
import { calculateFlatInstallment } from '../calculators/flat';
import type { MortgageInput } from '../models/mortgage.types';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const START_DATE = new Date('2024-01-01');

function makeInput(overrides: Partial<MortgageInput> = {}): MortgageInput {
  return {
    principalAmount: 500_000_000,
    tenorMonths: 12,
    paymentMethod: 'annuity',
    fixedPeriod: null,
    floatingBaseRate: 0.07,
    floatingTiers: [],
    startDate: START_DATE,
    includeAdminFee: false,
    adminFeeAmount: 0,
    ...overrides,
  };
}

// ─── Annuity formula ──────────────────────────────────────────────────────────

describe('calculateAnnuityInstallment', () => {
  it('returns correct installment for standard input', () => {
    // P=500M, r=7%/12, n=12
    const result = calculateAnnuityInstallment(500_000_000, 0.07, 12);
    // Verify: result should be ~43.3M
    expect(result).toBeGreaterThan(43_000_000);
    expect(result).toBeLessThan(44_000_000);
  });

  it('returns P/n when rate is zero (zero-rate safe)', () => {
    const result = calculateAnnuityInstallment(600_000, 0, 3);
    expect(result).toBe(200_000);
  });

  it('returns 0 when principal is 0', () => {
    expect(calculateAnnuityInstallment(0, 0.07, 12)).toBe(0);
  });

  it('returns 0 when remainingMonths is 0', () => {
    expect(calculateAnnuityInstallment(500_000_000, 0.07, 0)).toBe(0);
  });

  it('handles very small rate (0.1% annually)', () => {
    const result = calculateAnnuityInstallment(1_000_000, 0.001, 12);
    // Should be just above 1_000_000/12 ≈ 83_334
    expect(result).toBeGreaterThan(83_333);
    expect(result).toBeLessThan(83_500);
  });
});

// ─── Balance must reach zero ──────────────────────────────────────────────────

describe('generateAmortizationSchedule — balance clearing', () => {
  it('closing balance is exactly 0 on the last month (annuity)', () => {
    const input = makeInput({ tenorMonths: 24, floatingBaseRate: 0.1 });
    const schedule = generateAmortizationSchedule(input);
    const last = schedule[schedule.length - 1];
    expect(last.closingBalance).toBe(0);
    expect(last.month).toBe(24);
  });

  it('closing balance is exactly 0 on the last month (flat)', () => {
    const input = makeInput({
      tenorMonths: 24,
      floatingBaseRate: 0.1,
      paymentMethod: 'flat',
    });
    const schedule = generateAmortizationSchedule(input);
    const last = schedule[schedule.length - 1];
    expect(last.closingBalance).toBe(0);
  });

  it('produces exactly tenorMonths rows', () => {
    const input = makeInput({ tenorMonths: 36 });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule).toHaveLength(36);
  });
});

// ─── Zero interest rate ───────────────────────────────────────────────────────

describe('zero interest rate', () => {
  it('annuity: generates no interest charges, installment = principal / n', () => {
    const input = makeInput({ floatingBaseRate: 0, tenorMonths: 10 });
    const schedule = generateAmortizationSchedule(input);
    for (const row of schedule) {
      expect(row.interest).toBe(0);
    }
    expect(schedule[0].installment).toBe(50_000_000); // 500M / 10
  });

  it('flat: generates no interest charges', () => {
    const input = makeInput({
      floatingBaseRate: 0,
      tenorMonths: 5,
      paymentMethod: 'flat',
    });
    const schedule = generateAmortizationSchedule(input);
    for (const row of schedule) {
      expect(row.interest).toBe(0);
    }
  });
});

// ─── Fixed period only ────────────────────────────────────────────────────────

describe('fixed period only (no floating)', () => {
  it('all rows have interestType = fixed', () => {
    const input = makeInput({
      tenorMonths: 6,
      fixedPeriod: { annualRate: 0.08, durationMonths: 6 },
      floatingBaseRate: null,
      floatingTiers: [],
    });
    const schedule = generateAmortizationSchedule(input);
    for (const row of schedule) {
      expect(row.interestType).toBe('fixed');
      expect(row.annualRate).toBe(0.08);
    }
  });

  it('installment is constant throughout (annuity)', () => {
    const input = makeInput({
      tenorMonths: 12,
      fixedPeriod: { annualRate: 0.09, durationMonths: 12 },
      floatingBaseRate: null,
    });
    const schedule = generateAmortizationSchedule(input);
    const firstInstallment = schedule[0].installment;
    // All months except last should have the same installment
    for (let i = 0; i < schedule.length - 1; i++) {
      expect(schedule[i].installment).toBe(firstInstallment);
    }
  });
});

// ─── Fixed → simple floating ──────────────────────────────────────────────────

describe('fixed then floating transition', () => {
  it('rate changes at the correct month boundary', () => {
    const input = makeInput({
      tenorMonths: 6,
      fixedPeriod: { annualRate: 0.07, durationMonths: 3 },
      floatingBaseRate: 0.10,
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule[0].interestType).toBe('fixed');
    expect(schedule[0].annualRate).toBe(0.07);
    expect(schedule[3].interestType).toBe('floating');
    expect(schedule[3].annualRate).toBe(0.10);
  });

  it('installment changes at rate boundary (annuity recalculates)', () => {
    const input = makeInput({
      tenorMonths: 24,
      fixedPeriod: { annualRate: 0.07, durationMonths: 12 },
      floatingBaseRate: 0.11,
    });
    const schedule = generateAmortizationSchedule(input);
    const fixedInstallment = schedule[0].installment;
    const floatingInstallment = schedule[12].installment;
    // Higher floating rate → higher installment on remaining balance
    expect(floatingInstallment).toBeGreaterThan(fixedInstallment);
  });

  it('principal carried into floating period equals closing balance of month fixedDuration', () => {
    const input = makeInput({
      tenorMonths: 12,
      fixedPeriod: { annualRate: 0.07, durationMonths: 6 },
      floatingBaseRate: 0.09,
    });
    const schedule = generateAmortizationSchedule(input);
    const lastFixed = schedule[5]; // month 6 (0-indexed 5)
    const firstFloat = schedule[6]; // month 7
    expect(firstFloat.openingBalance).toBe(lastFixed.closingBalance);
  });
});

// ─── Tiered floating ──────────────────────────────────────────────────────────

describe('tiered floating rates', () => {
  it('applies correct rate per tier', () => {
    const input = makeInput({
      principalAmount: 300_000_000,
      tenorMonths: 6,
      fixedPeriod: null,
      floatingBaseRate: null,
      floatingTiers: [
        { id: '1', fromMonth: 1, toMonth: 2, annualRate: 0.08 },
        { id: '2', fromMonth: 3, toMonth: 4, annualRate: 0.09 },
        { id: '3', fromMonth: 5, toMonth: 6, annualRate: 0.10 },
      ],
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule[0].annualRate).toBe(0.08);
    expect(schedule[2].annualRate).toBe(0.09);
    expect(schedule[4].annualRate).toBe(0.10);
  });

  it('closing balance reaches 0 with tiered rates', () => {
    const input = makeInput({
      tenorMonths: 6,
      fixedPeriod: null,
      floatingBaseRate: null,
      floatingTiers: [
        { id: 'a', fromMonth: 1, toMonth: 3, annualRate: 0.07 },
        { id: 'b', fromMonth: 4, toMonth: 6, annualRate: 0.09 },
      ],
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule[schedule.length - 1].closingBalance).toBe(0);
  });

  it('fixed + tiered floating produces correct interestType labels', () => {
    const input = makeInput({
      tenorMonths: 6,
      fixedPeriod: { annualRate: 0.07, durationMonths: 2 },
      floatingBaseRate: null,
      floatingTiers: [
        { id: 'x', fromMonth: 3, toMonth: 6, annualRate: 0.09 },
      ],
    });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule[0].interestType).toBe('fixed');
    expect(schedule[1].interestType).toBe('fixed');
    expect(schedule[2].interestType).toBe('floating');
    expect(schedule[5].interestType).toBe('floating');
  });
});

// ─── Totals consistency ───────────────────────────────────────────────────────

describe('calculateMortgageSummary totals', () => {
  it('totalPrincipal equals the original loan amount', () => {
    const input = makeInput({ tenorMonths: 12, floatingBaseRate: 0.08 });
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);
    // Allow ±1 IDR for rounding
    expect(Math.abs(summary.totalPrincipal - input.principalAmount)).toBeLessThanOrEqual(1);
  });

  it('totalPayment = totalPrincipal + totalInterest + adminFee', () => {
    const input = makeInput({
      tenorMonths: 12,
      floatingBaseRate: 0.09,
      includeAdminFee: true,
      adminFeeAmount: 2_000_000,
    });
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);
    expect(summary.totalPayment).toBe(
      summary.totalPrincipal + summary.totalInterest + summary.adminFee,
    );
  });

  it('installment groups cover all months (no gaps)', () => {
    const input = makeInput({
      tenorMonths: 12,
      fixedPeriod: { annualRate: 0.07, durationMonths: 6 },
      floatingBaseRate: 0.10,
    });
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);
    const coveredMonths = summary.installmentGroups.reduce(
      (sum, g) => sum + (g.toMonth - g.fromMonth + 1),
      0,
    );
    expect(coveredMonths).toBe(input.tenorMonths);
  });

  it('flat: sum of principal equals initial principal', () => {
    const input = makeInput({
      tenorMonths: 12,
      floatingBaseRate: 0.09,
      paymentMethod: 'flat',
    });
    const schedule = generateAmortizationSchedule(input);
    const summary = calculateMortgageSummary(input, schedule);
    expect(Math.abs(summary.totalPrincipal - input.principalAmount)).toBeLessThanOrEqual(1);
  });
});

// ─── Flat vs annuity comparison ───────────────────────────────────────────────

describe('flat vs annuity interest comparison', () => {
  it('flat method always yields higher total interest than annuity for same inputs', () => {
    const base = makeInput({ tenorMonths: 24, floatingBaseRate: 0.1 });
    const annuitySchedule = generateAmortizationSchedule(base);
    const flatSchedule = generateAmortizationSchedule({ ...base, paymentMethod: 'flat' });

    const annuitySummary = calculateMortgageSummary(base, annuitySchedule);
    const flatSummary = calculateMortgageSummary(
      { ...base, paymentMethod: 'flat' },
      flatSchedule,
    );
    expect(flatSummary.totalInterest).toBeGreaterThan(annuitySummary.totalInterest);
  });

  it('flat installment formula matches schedule row installment', () => {
    const input = makeInput({
      tenorMonths: 12,
      floatingBaseRate: 0.09,
      paymentMethod: 'flat',
    });
    const expected = calculateFlatInstallment(
      input.principalAmount,
      0.09,
      input.tenorMonths,
    );
    const schedule = generateAmortizationSchedule(input);
    // Non-last rows should match the formula exactly
    expect(schedule[0].installment).toBe(expected);
  });
});

// ─── Payment date calculation ─────────────────────────────────────────────────

describe('payment dates', () => {
  it('month 1 date equals startDate', () => {
    const input = makeInput({ startDate: new Date(2024, 2, 15) }); // Mar 15 local time
    const schedule = generateAmortizationSchedule(input);
    const d = schedule[0].date;
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // March
    expect(d.getDate()).toBe(15);
  });

  it('month 2 date is one month after startDate', () => {
    // Use local-time constructor to avoid UTC-midnight timezone offset issues
    const input = makeInput({ startDate: new Date(2024, 0, 1), tenorMonths: 2 });
    const schedule = generateAmortizationSchedule(input);
    expect(schedule[1].date.getMonth()).toBe(1); // February (0-indexed)
  });
});
