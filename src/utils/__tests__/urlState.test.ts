// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { encodeUrlState, decodeUrlState } from '../urlState';
import type { UrlState } from '../urlState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minimalForm() {
  return {
    propertyPrice: '500000000',
    downPaymentMode: 'percent' as const,
    downPaymentValue: '20',
    tenorYears: '10',
    tenorAdditionalMonths: '0',
    paymentMethod: 'annuity' as const,
    startDate: '2024-01-15',
    calculationMethod: 'fixed_single_floating' as const,
    hasFixedPeriod: true,
    fixedRate: '7.5',
    fixedDurationMonths: '24',
    floatingBaseRate: '11',
    tiers: [] as { id: string; toMonth: string; rate: string }[],
    includeAdminFee: false,
    adminFeeAmount: '0',
    earlyRepaymentMode: 'none' as const,
    extraMonthlyAmount: '',
    extraMonthlyStartMonth: '1',
    extraMonthlyEndMonth: '',
    lumpSumAmount: '',
    lumpSumMonth: '',
    includeKprFees: false,
    provisionFeePercent: '1',
    appraisalFeeAmount: '0',
    notaryFeePercent: '0.75',
    bphtbPercent: '5',
    ppnEnabled: false,
    ppnPercent: '11',
    insuranceEnabled: false,
    lifeInsurancePremiumPercent: '0',
    fireInsurancePremiumPercent: '0',
  };
}

function makeUrlState(overrides: Partial<UrlState> = {}): UrlState {
  return {
    forms: [minimalForm()],
    activeCount: 1,
    activeTab: 1,
    ...overrides,
  };
}

// ─── Old URL compatibility ─────────────────────────────────────────────────────

describe('decodeUrlState — backward compatibility: old URLs without PPN/insurance fields', () => {
  // Build a payload that looks like a URL saved before Phase 19 (cash-to-close absent)
  const { ppnEnabled, ppnPercent, insuranceEnabled, lifeInsurancePremiumPercent, fireInsurancePremiumPercent, ...oldForm } =
    minimalForm();
  void ppnEnabled; void ppnPercent; void insuranceEnabled;
  void lifeInsurancePremiumPercent; void fireInsurancePremiumPercent;
  const b64 = btoa(JSON.stringify({ v: 1, forms: [oldForm], activeCount: 1, activeTab: 1 }));
  const result = decodeUrlState(b64);

  it('decodes successfully when PPN/insurance fields are absent', () => {
    expect(result).not.toBeNull();
  });

  it('defaults ppnEnabled to false', () => {
    expect(result!.forms[0].ppnEnabled).toBe(false);
  });

  it('defaults ppnPercent to "11"', () => {
    expect(result!.forms[0].ppnPercent).toBe('11');
  });

  it('defaults insuranceEnabled to false', () => {
    expect(result!.forms[0].insuranceEnabled).toBe(false);
  });

  it('defaults lifeInsurancePremiumPercent to "0"', () => {
    expect(result!.forms[0].lifeInsurancePremiumPercent).toBe('0');
  });

  it('defaults fireInsurancePremiumPercent to "0"', () => {
    expect(result!.forms[0].fireInsurancePremiumPercent).toBe('0');
  });
});

// ─── New URL round-trip ────────────────────────────────────────────────────────

describe('encodeUrlState / decodeUrlState — round-trip with PPN and insurance fields', () => {
  it('PPN enabled state survives encode → decode', () => {
    const state = makeUrlState();
    state.forms[0].ppnEnabled = true;
    state.forms[0].ppnPercent = '11';
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    expect(decoded!.forms[0].ppnEnabled).toBe(true);
    expect(decoded!.forms[0].ppnPercent).toBe('11');
  });

  it('insurance enabled state survives encode → decode', () => {
    const state = makeUrlState();
    state.forms[0].insuranceEnabled = true;
    state.forms[0].lifeInsurancePremiumPercent = '0.5';
    state.forms[0].fireInsurancePremiumPercent = '0.15';
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    expect(decoded!.forms[0].insuranceEnabled).toBe(true);
    expect(decoded!.forms[0].lifeInsurancePremiumPercent).toBe('0.5');
    expect(decoded!.forms[0].fireInsurancePremiumPercent).toBe('0.15');
  });

  it('activeCount, activeTab, and multiple forms survive encode → decode', () => {
    const form1 = minimalForm();
    const form2 = { ...minimalForm(), propertyPrice: '600000000', ppnEnabled: true };
    const state: UrlState = { forms: [form1, form2], activeCount: 2, activeTab: 2 };
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    expect(decoded!.activeCount).toBe(2);
    expect(decoded!.activeTab).toBe(2);
    expect(decoded!.forms).toHaveLength(2);
    expect(decoded!.forms[1].propertyPrice).toBe('600000000');
    expect(decoded!.forms[1].ppnEnabled).toBe(true);
  });

  it('returns null for a corrupt base64 string', () => {
    expect(decodeUrlState('not-valid-base64!!!')).toBeNull();
  });

  it('returns null when the payload version is not 1', () => {
    const raw = { v: 2, forms: [minimalForm()], activeCount: 1, activeTab: 1 };
    expect(decodeUrlState(btoa(JSON.stringify(raw)))).toBeNull();
  });

  it('returns null when activeCount does not match forms length', () => {
    const raw = { v: 1, forms: [minimalForm()], activeCount: 2, activeTab: 1 };
    expect(decodeUrlState(btoa(JSON.stringify(raw)))).toBeNull();
  });
});
