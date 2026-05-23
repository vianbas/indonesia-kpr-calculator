import { describe, it, expect } from 'vitest';
import { validateMortgageInput } from '../validators/mortgage.validator';
import type { MortgageInput } from '../models/mortgage.types';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeValidInput(overrides: Partial<MortgageInput> = {}): MortgageInput {
  return {
    principalAmount: 500_000_000,
    tenorMonths: 24,
    paymentMethod: 'annuity',
    fixedPeriod: { annualRate: 0.07, durationMonths: 12 },
    floatingBaseRate: 0.10,
    floatingTiers: [],
    startDate: new Date('2024-01-01'),
    includeAdminFee: false,
    adminFeeAmount: 0,
    ...overrides,
  };
}

function hasError(result: ReturnType<typeof validateMortgageInput>, field: string): boolean {
  return result.errors.some((e) => e.field.startsWith(field));
}

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('valid inputs', () => {
  it('passes with fixed + floating base rate', () => {
    const result = validateMortgageInput(makeValidInput());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passes with zero interest rate (0% is allowed)', () => {
    const result = validateMortgageInput(makeValidInput({ floatingBaseRate: 0, fixedPeriod: null }));
    expect(result.valid).toBe(true);
  });

  it('passes with no fixed period and only floating base rate', () => {
    const result = validateMortgageInput(
      makeValidInput({ fixedPeriod: null, floatingBaseRate: 0.09 }),
    );
    expect(result.valid).toBe(true);
  });

  it('passes with valid tiered floating rates covering full tenor', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 6,
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 1, toMonth: 3, annualRate: 0.08 },
          { id: '2', fromMonth: 4, toMonth: 6, annualRate: 0.10 },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it('passes with fixed period + tiered floating covering the rest', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 6,
        fixedPeriod: { annualRate: 0.07, durationMonths: 2 },
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 3, toMonth: 6, annualRate: 0.09 },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });
});

// ─── Basic field validation ───────────────────────────────────────────────────

describe('field-level validation', () => {
  it('rejects zero principal', () => {
    const result = validateMortgageInput(makeValidInput({ principalAmount: 0 }));
    expect(result.valid).toBe(false);
    expect(hasError(result, 'principalAmount')).toBe(true);
  });

  it('rejects negative principal', () => {
    const result = validateMortgageInput(makeValidInput({ principalAmount: -1 }));
    expect(result.valid).toBe(false);
    expect(hasError(result, 'principalAmount')).toBe(true);
  });

  it('rejects principal above 100 billion', () => {
    const result = validateMortgageInput(makeValidInput({ principalAmount: 100_000_000_001 }));
    expect(result.valid).toBe(false);
    expect(hasError(result, 'principalAmount')).toBe(true);
  });

  it('rejects tenor of 0', () => {
    const result = validateMortgageInput(makeValidInput({ tenorMonths: 0 }));
    expect(result.valid).toBe(false);
    expect(hasError(result, 'tenorMonths')).toBe(true);
  });

  it('rejects tenor > 360', () => {
    const result = validateMortgageInput(makeValidInput({ tenorMonths: 361 }));
    expect(result.valid).toBe(false);
    expect(hasError(result, 'tenorMonths')).toBe(true);
  });

  it('rejects negative annual rate in fixedPeriod', () => {
    const result = validateMortgageInput(
      makeValidInput({ fixedPeriod: { annualRate: -0.01, durationMonths: 12 } }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'fixedPeriod.annualRate')).toBe(true);
  });

  it('rejects floating base rate > 1 (> 100%)', () => {
    const result = validateMortgageInput(makeValidInput({ floatingBaseRate: 1.5 }));
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingBaseRate')).toBe(true);
  });

  it('rejects negative admin fee', () => {
    const result = validateMortgageInput(
      makeValidInput({ includeAdminFee: true, adminFeeAmount: -1000 }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'adminFeeAmount')).toBe(true);
  });
});

// ─── Business rule: fixed period vs tenor ────────────────────────────────────

describe('fixed period duration constraints', () => {
  it('rejects fixed period equal to tenor', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 12,
        fixedPeriod: { annualRate: 0.07, durationMonths: 12 },
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'fixedPeriod.durationMonths')).toBe(true);
  });

  it('rejects fixed period longer than tenor', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 12,
        fixedPeriod: { annualRate: 0.07, durationMonths: 24 },
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'fixedPeriod.durationMonths')).toBe(true);
  });
});

// ─── Business rule: rate coverage ────────────────────────────────────────────

describe('rate coverage', () => {
  it('rejects input with no rate at all', () => {
    const result = validateMortgageInput(
      makeValidInput({
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [],
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingBaseRate')).toBe(true);
  });

  it('rejects fixed period with no floating rate for remaining months', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 24,
        fixedPeriod: { annualRate: 0.07, durationMonths: 12 },
        floatingBaseRate: null,
        floatingTiers: [],
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingBaseRate')).toBe(true);
  });
});

// ─── Tier validation ──────────────────────────────────────────────────────────

describe('floating tier validation', () => {
  it('rejects tier where fromMonth > toMonth', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 6,
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 5, toMonth: 3, annualRate: 0.09 },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingTiers')).toBe(true);
  });

  it('rejects first tier not starting at month 1 (no fixed period)', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 6,
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 2, toMonth: 6, annualRate: 0.09 },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingTiers[0].fromMonth')).toBe(true);
  });

  it('rejects last tier not ending at tenorMonths', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 6,
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 1, toMonth: 5, annualRate: 0.09 },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingTiers[0].toMonth')).toBe(true);
  });

  it('detects gap between tiers', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 9,
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 1, toMonth: 3, annualRate: 0.08 },
          // month 4 is uncovered
          { id: '2', fromMonth: 5, toMonth: 9, annualRate: 0.10 },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Gap'))).toBe(true);
  });

  it('detects overlap between tiers', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 6,
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 1, toMonth: 4, annualRate: 0.08 },
          { id: '2', fromMonth: 3, toMonth: 6, annualRate: 0.10 }, // overlaps month 3–4
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Overlap'))).toBe(true);
  });

  it('rejects tier with period exceeding loan tenor', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 6,
        fixedPeriod: null,
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 1, toMonth: 8, annualRate: 0.09 }, // 8 > tenorMonths 6
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingTiers')).toBe(true);
  });

  it('rejects tiers starting before end of fixed period', () => {
    const result = validateMortgageInput(
      makeValidInput({
        tenorMonths: 12,
        fixedPeriod: { annualRate: 0.07, durationMonths: 6 },
        floatingBaseRate: null,
        floatingTiers: [
          { id: '1', fromMonth: 5, toMonth: 12, annualRate: 0.09 }, // starts at 5, not 7
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(hasError(result, 'floatingTiers[0].fromMonth')).toBe(true);
  });
});
