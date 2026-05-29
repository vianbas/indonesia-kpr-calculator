// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
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
    financingMode: 'conventional' as const,
    syariahAkadType: 'murabahah' as const,
    syariahMarginPercent: '8',
    syariahUjrahPercent: '8',
    syariahBankSharePercent: '80',
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

// ─── Compression + default-stripping ─────────────────────────────────────────

describe('encodeUrlState — v2 compression', () => {
  it('produces a shorter string than the old btoa approach', () => {
    const state = makeUrlState();
    const v2 = encodeUrlState(state);
    const v1 = btoa(JSON.stringify({ v: 1, ...state }));
    expect(v2.length).toBeLessThan(v1.length);
  });

  it('strips default-valued fields from the wire payload', () => {
    const state = makeUrlState();
    const compressed = encodeUrlState(state);
    const json = LZString.decompressFromEncodedURIComponent(compressed)!;
    const payload = JSON.parse(json);
    // Fields that equal their defaults should be absent
    expect(payload.forms[0]).not.toHaveProperty('downPaymentMode');
    expect(payload.forms[0]).not.toHaveProperty('tenorAdditionalMonths');
    expect(payload.forms[0]).not.toHaveProperty('paymentMethod');
    expect(payload.forms[0]).not.toHaveProperty('calculationMethod');
    expect(payload.forms[0]).not.toHaveProperty('earlyRepaymentMode');
    expect(payload.forms[0]).not.toHaveProperty('includeKprFees');
    expect(payload.forms[0]).not.toHaveProperty('financingMode');
    expect(payload.forms[0]).not.toHaveProperty('tiers');
  });

  it('keeps non-default field values in the wire payload', () => {
    const state = makeUrlState();
    state.forms[0].paymentMethod = 'flat';
    state.forms[0].earlyRepaymentMode = 'lump_sum';
    const json = LZString.decompressFromEncodedURIComponent(encodeUrlState(state))!;
    const payload = JSON.parse(json);
    expect(payload.forms[0].paymentMethod).toBe('flat');
    expect(payload.forms[0].earlyRepaymentMode).toBe('lump_sum');
  });

  it('always includes the 6 user-specific fields even when they match default values', () => {
    const state = makeUrlState();
    const json = LZString.decompressFromEncodedURIComponent(encodeUrlState(state))!;
    const payload = JSON.parse(json);
    expect(payload.forms[0]).toHaveProperty('propertyPrice');
    expect(payload.forms[0]).toHaveProperty('downPaymentValue');
    expect(payload.forms[0]).toHaveProperty('tenorYears');
    expect(payload.forms[0]).toHaveProperty('startDate');
    expect(payload.forms[0]).toHaveProperty('fixedRate');
    expect(payload.forms[0]).toHaveProperty('floatingBaseRate');
  });

  it('encodes version as 2', () => {
    const json = LZString.decompressFromEncodedURIComponent(encodeUrlState(makeUrlState()))!;
    expect(JSON.parse(json).v).toBe(2);
  });

  it('omits labels from payload when all are default', () => {
    const state = makeUrlState();
    const json = LZString.decompressFromEncodedURIComponent(encodeUrlState(state))!;
    expect(JSON.parse(json)).not.toHaveProperty('labels');
  });

  it('includes labels in payload when any differ from defaults', () => {
    const state = makeUrlState({ labels: ['BCA 3yr', 'Skenario 2', 'Skenario 3'] });
    const json = LZString.decompressFromEncodedURIComponent(encodeUrlState(state))!;
    expect(JSON.parse(json).labels).toEqual(['BCA 3yr', 'Skenario 2', 'Skenario 3']);
  });
});

describe('labels — round-trip', () => {
  it('preserves custom labels through encode → decode', () => {
    const state = makeUrlState({ labels: ['BCA 3yr', 'Mandiri 1yr', 'Skenario 3'] });
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded?.labels).toEqual(['BCA 3yr', 'Mandiri 1yr', 'Skenario 3']);
  });

  it('returns no labels field when payload omits them', () => {
    const state = makeUrlState();
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded?.labels).toBeUndefined();
  });

  it('drops invalid labels (wrong length or empty string)', () => {
    const raw = LZString.compressToEncodedURIComponent(
      JSON.stringify({ v: 2, forms: [{}], activeCount: 1, activeTab: 1, labels: ['ok', ''] }),
    );
    // incomplete array — should not attach labels
    const decoded = decodeUrlState(raw);
    expect(decoded?.labels).toBeUndefined();
  });
});

// ─── Round-trip (encode → decode) ────────────────────────────────────────────

describe('encodeUrlState / decodeUrlState — round-trip', () => {
  it('all-default form survives encode → decode with correct values', () => {
    const state = makeUrlState();
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    expect(decoded!.forms[0]).toMatchObject(minimalForm());
  });

  it('non-default values survive encode → decode', () => {
    const state = makeUrlState();
    state.forms[0].paymentMethod = 'flat';
    state.forms[0].earlyRepaymentMode = 'extra_monthly';
    state.forms[0].extraMonthlyAmount = '500000';
    state.forms[0].includeKprFees = true;
    state.forms[0].provisionFeePercent = '1.5';
    state.forms[0].financingMode = 'syariah';
    state.forms[0].syariahAkadType = 'musyarakah_mutanaqishah';
    state.forms[0].syariahUjrahPercent = '7.75';
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    const f = decoded!.forms[0];
    expect(f.paymentMethod).toBe('flat');
    expect(f.earlyRepaymentMode).toBe('extra_monthly');
    expect(f.extraMonthlyAmount).toBe('500000');
    expect(f.includeKprFees).toBe(true);
    expect(f.provisionFeePercent).toBe('1.5');
    expect(f.financingMode).toBe('syariah');
    expect(f.syariahAkadType).toBe('musyarakah_mutanaqishah');
    expect(f.syariahUjrahPercent).toBe('7.75');
  });

  it('non-empty tiers survive encode → decode', () => {
    const state = makeUrlState();
    state.forms[0].tiers = [{ id: 'tier1', toMonth: '60', rate: '9.5' }];
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded!.forms[0].tiers).toHaveLength(1);
    expect(decoded!.forms[0].tiers[0].rate).toBe('9.5');
  });

  it('activeCount, activeTab, and multiple forms survive encode → decode', () => {
    const form2 = { ...minimalForm(), propertyPrice: '600000000', ppnEnabled: true };
    const state: UrlState = { forms: [minimalForm(), form2], activeCount: 2, activeTab: 2 };
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    expect(decoded!.activeCount).toBe(2);
    expect(decoded!.activeTab).toBe(2);
    expect(decoded!.forms).toHaveLength(2);
    expect(decoded!.forms[1].propertyPrice).toBe('600000000');
    expect(decoded!.forms[1].ppnEnabled).toBe(true);
  });

  it('returns null for a corrupt string', () => {
    expect(decodeUrlState('not-valid!!!')).toBeNull();
  });

  it('returns null when the payload version is not 1 or 2', () => {
    const raw = { v: 3, forms: [minimalForm()], activeCount: 1, activeTab: 1 };
    const s = LZString.compressToEncodedURIComponent(JSON.stringify(raw));
    expect(decodeUrlState(s)).toBeNull();
  });

  it('returns null when activeCount does not match forms length', () => {
    const raw = { v: 2, forms: [minimalForm()], activeCount: 2, activeTab: 1 };
    const s = LZString.compressToEncodedURIComponent(JSON.stringify(raw));
    expect(decodeUrlState(s)).toBeNull();
  });
});

// ─── Backward compatibility: legacy v1 base64 URLs ───────────────────────────

describe('decodeUrlState — backward compatibility: legacy base64 (v1) URLs', () => {
  it('decodes a fully-populated v1 base64 URL', () => {
    const b64 = btoa(JSON.stringify({ v: 1, forms: [minimalForm()], activeCount: 1, activeTab: 1 }));
    const result = decodeUrlState(b64);
    expect(result).not.toBeNull();
    expect(result!.forms[0].propertyPrice).toBe('500000000');
  });

  it('still fills defaults for v1 URLs missing PPN/insurance fields', () => {
    const { ppnEnabled, ppnPercent, insuranceEnabled, lifeInsurancePremiumPercent, fireInsurancePremiumPercent, ...oldForm } =
      minimalForm();
    void ppnEnabled; void ppnPercent; void insuranceEnabled;
    void lifeInsurancePremiumPercent; void fireInsurancePremiumPercent;
    const b64 = btoa(JSON.stringify({ v: 1, forms: [oldForm], activeCount: 1, activeTab: 1 }));
    const result = decodeUrlState(b64);
    expect(result).not.toBeNull();
    expect(result!.forms[0].ppnEnabled).toBe(false);
    expect(result!.forms[0].ppnPercent).toBe('11');
    expect(result!.forms[0].insuranceEnabled).toBe(false);
    expect(result!.forms[0].lifeInsurancePremiumPercent).toBe('0');
    expect(result!.forms[0].fireInsurancePremiumPercent).toBe('0');
  });

  it('still fills defaults for v1 URLs missing Syariah fields', () => {
    const { financingMode, syariahAkadType, syariahMarginPercent, syariahUjrahPercent, syariahBankSharePercent, ...oldForm } =
      minimalForm();
    void financingMode; void syariahAkadType; void syariahMarginPercent;
    void syariahUjrahPercent; void syariahBankSharePercent;
    const b64 = btoa(JSON.stringify({ v: 1, forms: [oldForm], activeCount: 1, activeTab: 1 }));
    const result = decodeUrlState(b64);
    expect(result).not.toBeNull();
    expect(result!.forms[0].financingMode).toBe('conventional');
    expect(result!.forms[0].syariahAkadType).toBe('murabahah');
    expect(result!.forms[0].syariahMarginPercent).toBe('8');
  });
});

// ─── Syariah round-trip ───────────────────────────────────────────────────────

describe('encodeUrlState / decodeUrlState — Syariah round-trip', () => {
  it('Syariah Murabahah state survives encode → decode', () => {
    const state = makeUrlState();
    state.forms[0].financingMode = 'syariah';
    state.forms[0].syariahAkadType = 'murabahah';
    state.forms[0].syariahMarginPercent = '9.5';
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    expect(decoded!.forms[0].financingMode).toBe('syariah');
    expect(decoded!.forms[0].syariahAkadType).toBe('murabahah');
    expect(decoded!.forms[0].syariahMarginPercent).toBe('9.5');
  });

  it('Syariah MMQ state survives encode → decode', () => {
    const state = makeUrlState();
    state.forms[0].financingMode = 'syariah';
    state.forms[0].syariahAkadType = 'musyarakah_mutanaqishah';
    state.forms[0].syariahUjrahPercent = '7.75';
    state.forms[0].syariahBankSharePercent = '85';
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).not.toBeNull();
    expect(decoded!.forms[0].syariahAkadType).toBe('musyarakah_mutanaqishah');
    expect(decoded!.forms[0].syariahUjrahPercent).toBe('7.75');
    expect(decoded!.forms[0].syariahBankSharePercent).toBe('85');
  });

  it('rejects an invalid financingMode value', () => {
    const raw = {
      v: 2,
      forms: [{ ...minimalForm(), financingMode: 'islamic' }],
      activeCount: 1,
      activeTab: 1,
    };
    const s = LZString.compressToEncodedURIComponent(JSON.stringify(raw));
    expect(decodeUrlState(s)).toBeNull();
  });
});
