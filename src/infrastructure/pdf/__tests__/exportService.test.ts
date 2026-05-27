import { describe, it, expect } from 'vitest';
import { buildPdfExportData } from '../exportService';
import { SUMMARY_MURABAHAH, SUMMARY_MMQ, SUMMARY_FIXED_ONLY } from '../../../stories/fixtures';
import type { MortgageFormState } from '../../../application/store/formTypes';

// ─── Minimal mock form ────────────────────────────────────────────────────────

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
    earlyRepaymentMode: 'none',
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
    financingMode: 'conventional',
    syariahAkadType: 'murabahah',
    syariahMarginPercent: '8',
    syariahUjrahPercent: '8',
    syariahBankSharePercent: '80',
    ...overrides,
  };
}

// ─── Conventional (baseline) ─────────────────────────────────────────────────

describe('buildPdfExportData — conventional scenario', () => {
  const form = makeForm();
  const data = buildPdfExportData(form, SUMMARY_FIXED_ONLY);

  it('does not set isSyariah', () => {
    expect(data.isSyariah).toBeUndefined();
  });

  it('does not set akadTypeDisplay', () => {
    expect(data.akadTypeDisplay).toBeUndefined();
  });

  it('does not set interestColumnLabel', () => {
    expect(data.interestColumnLabel).toBeUndefined();
  });

  it('uses "Nilai Kredit (Pokok)" label', () => {
    const row = data.financialRows.find((r) => r.label === 'Nilai Kredit (Pokok)');
    expect(row).toBeDefined();
  });

  it('uses "Total Bunga" label', () => {
    const row = data.financialRows.find((r) => r.label === 'Total Bunga');
    expect(row).toBeDefined();
  });

  it('has no "Harga Jual Bank" row', () => {
    expect(data.financialRows.find((r) => r.label === 'Harga Jual Bank')).toBeUndefined();
  });

  it('interest rows typeDisplay uses Tetap/Variabel', () => {
    for (const row of data.interestRows) {
      expect(['Tetap', 'Variabel']).toContain(row.typeDisplay);
    }
  });
});

// ─── Syariah Murabahah ────────────────────────────────────────────────────────

describe('buildPdfExportData — Syariah Murabahah scenario', () => {
  const form = makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' });
  const data = buildPdfExportData(form, SUMMARY_MURABAHAH);

  it('sets isSyariah = true', () => {
    expect(data.isSyariah).toBe(true);
  });

  it('sets akadTypeDisplay to "Murabahah"', () => {
    expect(data.akadTypeDisplay).toBe('Murabahah');
  });

  it('sets interestColumnLabel to "Margin"', () => {
    expect(data.interestColumnLabel).toBe('Margin');
  });

  it('uses "Nilai Pembiayaan" principal label', () => {
    const row = data.financialRows.find((r) => r.label === 'Nilai Pembiayaan');
    expect(row).toBeDefined();
  });

  it('does NOT use "Nilai Kredit (Pokok)" label', () => {
    expect(data.financialRows.find((r) => r.label === 'Nilai Kredit (Pokok)')).toBeUndefined();
  });

  it('uses "Total Margin" label', () => {
    const row = data.financialRows.find((r) => r.label === 'Total Margin');
    expect(row).toBeDefined();
  });

  it('includes "Harga Jual Bank" row', () => {
    const row = data.financialRows.find((r) => r.label === 'Harga Jual Bank');
    expect(row).toBeDefined();
  });

  it('interest rows typeDisplay is "Murabahah"', () => {
    expect(data.interestRows[0]?.typeDisplay).toBe('Murabahah');
  });

  it('loan info calculationMethodDisplay mentions Murabahah', () => {
    expect(data.loanInfo.calculationMethodDisplay).toContain('Murabahah');
  });
});

// ─── Syariah MMQ ──────────────────────────────────────────────────────────────

describe('buildPdfExportData — Syariah MMQ scenario', () => {
  const form = makeForm({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' });
  const data = buildPdfExportData(form, SUMMARY_MMQ);

  it('sets isSyariah = true', () => {
    expect(data.isSyariah).toBe(true);
  });

  it('sets akadTypeDisplay to MMQ variant', () => {
    expect(data.akadTypeDisplay).toContain('MMQ');
  });

  it('sets interestColumnLabel to "Ujrah"', () => {
    expect(data.interestColumnLabel).toBe('Ujrah');
  });

  it('uses "Total Ujrah" label', () => {
    const row = data.financialRows.find((r) => r.label === 'Total Ujrah');
    expect(row).toBeDefined();
  });

  it('does NOT include "Harga Jual Bank" row', () => {
    expect(data.financialRows.find((r) => r.label === 'Harga Jual Bank')).toBeUndefined();
  });

  it('interest rows typeDisplay is "MMQ"', () => {
    expect(data.interestRows[0]?.typeDisplay).toBe('MMQ');
  });

  it('loan info calculationMethodDisplay mentions MMQ', () => {
    expect(data.loanInfo.calculationMethodDisplay).toContain('MMQ');
  });
});
