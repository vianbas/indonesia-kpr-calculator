/**
 * Tests for formToMortgageInput — the converter between raw form strings
 * and the typed MortgageInput domain object.
 *
 * These tests are completely independent from the React UI. They exercise only
 * the application/converters layer and the domain types it produces.
 */

import { describe, it, expect } from 'vitest';
import { formToMortgageInput } from '../converters/formToInput';
import type { MortgageFormState } from '../store/formTypes';

// ─── Test helper ──────────────────────────────────────────────────────────────

function makeForm(overrides: Partial<MortgageFormState> = {}): MortgageFormState {
  return {
    propertyPrice: '500000000',
    downPaymentMode: 'percent',
    downPaymentValue: '20',
    tenorYears: '10',
    tenorAdditionalMonths: '0',
    paymentMethod: 'annuity',
    startDate: '2024-01-15',
    calculationMethod: 'fixed_single_floating',
    hasFixedPeriod: true,
    fixedRate: '7.5',
    fixedDurationMonths: '24',
    floatingBaseRate: '11',
    tiers: [],
    includeAdminFee: false,
    adminFeeAmount: '0',
    ...overrides,
  };
}

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('formToMortgageInput — valid input', () => {
  it('returns a non-null input and no conversion errors for a complete valid form', () => {
    const { input, conversionErrors } = formToMortgageInput(makeForm());
    expect(input).not.toBeNull();
    expect(conversionErrors).toHaveLength(0);
  });

  it('correctly derives principalAmount = propertyPrice − downPayment (percent mode)', () => {
    // propertyPrice=500M, downPayment=20% → principal=400M
    const { input } = formToMortgageInput(makeForm({
      propertyPrice: '500000000',
      downPaymentMode: 'percent',
      downPaymentValue: '20',
    }));
    expect(input?.principalAmount).toBe(400_000_000);
  });

  it('correctly derives principalAmount when downPayment is entered as an absolute amount', () => {
    // propertyPrice=600M, downPayment=Rp100M → principal=500M
    const { input } = formToMortgageInput(makeForm({
      propertyPrice: '600000000',
      downPaymentMode: 'amount',
      downPaymentValue: '100000000',
    }));
    expect(input?.principalAmount).toBe(500_000_000);
  });

  it('converts tenor years + additional months to total tenorMonths correctly', () => {
    // 10 years + 6 months = 126 months
    const { input } = formToMortgageInput(makeForm({
      tenorYears: '10',
      tenorAdditionalMonths: '6',
    }));
    expect(input?.tenorMonths).toBe(126);
  });

  it('converts fixedRate percent string "7.5" to decimal 0.075 in fixedPeriod', () => {
    const { input } = formToMortgageInput(makeForm({ fixedRate: '7.5' }));
    expect(input?.fixedPeriod?.annualRate).toBeCloseTo(0.075, 10);
  });

  it('converts floatingBaseRate percent string "11" to decimal 0.11', () => {
    const { input } = formToMortgageInput(makeForm({ floatingBaseRate: '11' }));
    expect(input?.floatingBaseRate).toBeCloseTo(0.11, 10);
  });

  it('parses startDate "2024-06-15" as local time — day must be 15, not shifted by UTC offset', () => {
    // new Date("2024-06-15") parses as UTC midnight, which can shift to June 14
    // in negative-offset timezones. parseLocalDate() must avoid this.
    const { input } = formToMortgageInput(makeForm({ startDate: '2024-06-15' }));
    expect(input?.startDate.getDate()).toBe(15);
    expect(input?.startDate.getMonth()).toBe(5);  // June = 0-based 5
    expect(input?.startDate.getFullYear()).toBe(2024);
  });

  it('sets fixedPeriod to null when hasFixedPeriod is false', () => {
    const { input } = formToMortgageInput(makeForm({
      hasFixedPeriod: false,
      floatingBaseRate: '9',
    }));
    expect(input?.fixedPeriod).toBeNull();
  });

  it('converts tiered method: derives fromMonth from previous tier toMonth', () => {
    // fixedEnd = 24 months, so tier 1 starts at month 25
    const { input } = formToMortgageInput(makeForm({
      calculationMethod: 'fixed_tiered_floating',
      tiers: [
        { id: 'a', toMonth: '60', rate: '9' },
        { id: 'b', toMonth: '120', rate: '11' },
      ],
    }));
    expect(input?.floatingTiers).toHaveLength(2);
    expect(input?.floatingTiers[0].fromMonth).toBe(25); // fixedEnd(24) + 1
    expect(input?.floatingTiers[0].toMonth).toBe(60);
    expect(input?.floatingTiers[1].fromMonth).toBe(61); // prev toMonth(60) + 1
    expect(input?.floatingTiers[1].toMonth).toBe(120);
  });

  it('fixed_only method: sets fixedPeriod.durationMonths equal to tenorMonths', () => {
    // 10 years = 120 months; fixed period covers the full tenor
    const { input } = formToMortgageInput(makeForm({
      calculationMethod: 'fixed_only',
      fixedRate: '8',
    }));
    expect(input?.fixedPeriod?.durationMonths).toBe(120);
    expect(input?.floatingBaseRate).toBeNull();
    expect(input?.floatingTiers).toHaveLength(0);
  });

  it('fixed_only method: returns null when fixedRate is missing (incomplete form)', () => {
    const { input, conversionErrors } = formToMortgageInput(makeForm({
      calculationMethod: 'fixed_only',
      fixedRate: '',
    }));
    expect(input).toBeNull();
    expect(conversionErrors).toHaveLength(0);
  });

  it('includes adminFeeAmount when includeAdminFee is true', () => {
    const { input } = formToMortgageInput(makeForm({
      includeAdminFee: true,
      adminFeeAmount: '2500000',
    }));
    expect(input?.includeAdminFee).toBe(true);
    expect(input?.adminFeeAmount).toBe(2_500_000);
  });
});

// ─── Down payment errors ───────────────────────────────────────────────────────

describe('formToMortgageInput — down payment ≥ property price', () => {
  it('returns a conversionError (not silent null) when down payment equals property price', () => {
    // 100% down payment → principalAmount = 0 → must produce a visible error
    const { input, conversionErrors } = formToMortgageInput(makeForm({
      propertyPrice: '500000000',
      downPaymentMode: 'percent',
      downPaymentValue: '100',
    }));
    expect(input).toBeNull();
    expect(conversionErrors).toHaveLength(1);
    expect(conversionErrors[0].field).toBe('downPaymentValue');
    expect(conversionErrors[0].message).toMatch(/uang muka/i);
  });

  it('returns a conversionError when down payment exceeds property price (percent mode)', () => {
    // 120% down payment → principal would be negative
    const { input, conversionErrors } = formToMortgageInput(makeForm({
      propertyPrice: '500000000',
      downPaymentMode: 'percent',
      downPaymentValue: '120',
    }));
    expect(input).toBeNull();
    expect(conversionErrors).toHaveLength(1);
    expect(conversionErrors[0].field).toBe('downPaymentValue');
  });

  it('returns a conversionError when down payment exceeds property price (amount mode)', () => {
    // DP = 600M, price = 500M → principal negative
    const { input, conversionErrors } = formToMortgageInput(makeForm({
      propertyPrice: '500000000',
      downPaymentMode: 'amount',
      downPaymentValue: '600000000',
    }));
    expect(input).toBeNull();
    expect(conversionErrors).toHaveLength(1);
    expect(conversionErrors[0].field).toBe('downPaymentValue');
  });

  it('returns null with NO conversionError (form incomplete) when propertyPrice is empty', () => {
    // Missing price is a different case — form is just incomplete, not an error to surface
    const { input, conversionErrors } = formToMortgageInput(makeForm({ propertyPrice: '' }));
    expect(input).toBeNull();
    expect(conversionErrors).toHaveLength(0);
  });
});

// ─── Incomplete / unparseable fields ─────────────────────────────────────────

describe('formToMortgageInput — incomplete or unparseable form fields', () => {
  it('returns null input when propertyPrice is empty', () => {
    const { input } = formToMortgageInput(makeForm({ propertyPrice: '' }));
    expect(input).toBeNull();
  });

  it('returns null input when tenorYears and tenorAdditionalMonths are both zero', () => {
    const { input } = formToMortgageInput(makeForm({
      tenorYears: '0',
      tenorAdditionalMonths: '0',
    }));
    expect(input).toBeNull();
  });

  it('returns null input when startDate is not a valid date string', () => {
    const { input } = formToMortgageInput(makeForm({ startDate: 'not-a-date' }));
    expect(input).toBeNull();
  });

  it('silently drops a tier whose rate is not a valid number', () => {
    // Invalid tier is filtered; validator will then flag the gap
    const { input } = formToMortgageInput(makeForm({
      calculationMethod: 'fixed_tiered_floating',
      tiers: [
        { id: 'a', toMonth: '120', rate: '' }, // empty rate → NaN
      ],
    }));
    expect(input?.floatingTiers).toHaveLength(0);
  });
});
