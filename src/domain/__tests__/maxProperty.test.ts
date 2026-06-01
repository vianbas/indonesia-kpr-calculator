import { describe, it, expect } from 'vitest';
import { calculateMaxProperty, type MaxPropertyInput } from '../calculators/maxProperty';
import { maxLoanForInstallment } from '../calculators/affordability';

// ─── Fixture ────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<MaxPropertyInput> = {}): MaxPropertyInput {
  return {
    monthlyIncome: 20_000_000,
    spouseIncome: 0,
    existingMonthlyDebt: 0,
    maxDsrPercent: 30,
    annualRatePercent: 8,
    tenorMonths: 180, // 15 yr
    downPaymentPercent: 20,
    paymentMethod: 'annuity',
    financingMode: 'conventional',
    ...overrides,
  };
}

const finite = (n: number) => Number.isFinite(n) && !Number.isNaN(n);

// ─── maxLoanForInstallment helper ──────────────────────────────────────────

describe('maxLoanForInstallment', () => {
  it('annuity: inverts the annuity formula (round-trip with the forward calc)', () => {
    // forward: installment for L=600jt, 8%, 180mo  → invert back to ~600jt
    const r = 0.08 / 12;
    const n = 180;
    const L = 600_000_000;
    const installment = (L * r) / (1 - Math.pow(1 + r, -n));
    const loan = maxLoanForInstallment({ maxInstallment: installment, annualRate: 0.08, tenorMonths: n, paymentMethod: 'annuity' });
    expect(Math.abs(loan - L)).toBeLessThan(5); // rounding tolerance
  });

  it('flat: uses a single monthly-rate conversion (L = M / (1/n + r))', () => {
    const r = 0.08 / 12;
    const n = 120;
    const M = 5_000_000;
    const expected = Math.round(M / (1 / n + r));
    expect(maxLoanForInstallment({ maxInstallment: M, annualRate: 0.08, tenorMonths: n, paymentMethod: 'flat' })).toBe(expected);
  });

  it('handles zero rate (annuity → M × n)', () => {
    expect(maxLoanForInstallment({ maxInstallment: 1_000_000, annualRate: 0, tenorMonths: 120, paymentMethod: 'annuity' })).toBe(120_000_000);
  });

  it('returns 0 for zero or negative capacity', () => {
    expect(maxLoanForInstallment({ maxInstallment: 0, annualRate: 0.08, tenorMonths: 120, paymentMethod: 'annuity' })).toBe(0);
    expect(maxLoanForInstallment({ maxInstallment: -100, annualRate: 0.08, tenorMonths: 120, paymentMethod: 'annuity' })).toBe(0);
  });

  it('returns 0 for invalid tenor', () => {
    expect(maxLoanForInstallment({ maxInstallment: 1_000_000, annualRate: 0.08, tenorMonths: 0, paymentMethod: 'annuity' })).toBe(0);
  });
});

// ─── calculateMaxProperty ──────────────────────────────────────────────────

describe('calculateMaxProperty', () => {
  it('computes an annuity max property price from income', () => {
    const r = makeInput();
    const res = calculateMaxProperty(r);
    expect(res.isAffordable).toBe(true);
    // capacity = 20jt × 30% = 6jt installment budget
    expect(res.maxInstallment).toBe(6_000_000);
    expect(res.maxLoanAmount).toBeGreaterThan(0);
    // property = loan / (1 - 0.2)
    expect(res.maxPropertyPrice).toBe(Math.round(res.maxLoanAmount / 0.8));
    expect(res.downPaymentAmount).toBe(Math.round(res.maxPropertyPrice * 0.2));
  });

  it('computes a flat max property price', () => {
    const res = calculateMaxProperty(makeInput({ paymentMethod: 'flat' }));
    expect(res.isAffordable).toBe(true);
    expect(finite(res.maxPropertyPrice)).toBe(true);
  });

  it('handles zero interest rate', () => {
    const res = calculateMaxProperty(makeInput({ annualRatePercent: 0 }));
    expect(res.isAffordable).toBe(true);
    expect(finite(res.maxPropertyPrice)).toBe(true);
  });

  it('existing debt reduces capacity', () => {
    const base = calculateMaxProperty(makeInput());
    const withDebt = calculateMaxProperty(makeInput({ existingMonthlyDebt: 2_000_000 }));
    expect(withDebt.maxPropertyPrice).toBeLessThan(base.maxPropertyPrice);
    expect(withDebt.notes).toContain('maxProperty.noteExistingDebt');
  });

  it('zero income returns a safe zero result with a note', () => {
    const res = calculateMaxProperty(makeInput({ monthlyIncome: 0, spouseIncome: 0 }));
    expect(res.isAffordable).toBe(false);
    expect(res.maxPropertyPrice).toBe(0);
    expect(res.notes).toContain('maxProperty.noteNoIncome');
  });

  it('existing debt greater than capacity returns a safe zero result', () => {
    const res = calculateMaxProperty(makeInput({ existingMonthlyDebt: 999_000_000 }));
    expect(res.isAffordable).toBe(false);
    expect(res.maxPropertyPrice).toBe(0);
    expect(res.notes).toContain('maxProperty.noteDebtTooHigh');
  });

  it('downPaymentPercent = 20 grosses the loan up to the property price correctly', () => {
    const res = calculateMaxProperty(makeInput({ downPaymentPercent: 20 }));
    expect(res.maxPropertyPrice).toBe(Math.round(res.maxLoanAmount / 0.8));
  });

  it('downPaymentPercent near 100 does not return Infinity', () => {
    const res = calculateMaxProperty(makeInput({ downPaymentPercent: 99 }));
    expect(finite(res.maxPropertyPrice)).toBe(true);
  });

  it('downPaymentPercent >= 100 returns a safe zero result', () => {
    const res = calculateMaxProperty(makeInput({ downPaymentPercent: 100 }));
    expect(res.isAffordable).toBe(false);
    expect(res.maxPropertyPrice).toBe(0);
    expect(res.notes).toContain('maxProperty.noteDownPaymentInvalid');
  });

  it('never produces NaN/Infinity for messy inputs', () => {
    const res = calculateMaxProperty(makeInput({ annualRatePercent: -5, downPaymentPercent: -10, tenorMonths: 0 }));
    for (const v of [res.maxInstallment, res.maxLoanAmount, res.maxPropertyPrice, res.downPaymentAmount, res.impliedInstallment, res.dsrPercent]) {
      expect(finite(v)).toBe(true);
    }
  });

  it('Syariah mode adds a financing-terminology note', () => {
    const res = calculateMaxProperty(makeInput({ financingMode: 'syariah' }));
    expect(res.notes).toContain('maxProperty.noteSyariah');
  });
});
