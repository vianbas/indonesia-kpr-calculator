// @vitest-environment jsdom
/**
 * Unit tests for the PDF export service.
 *
 * jsPDF and pdfRenderer are mocked — these tests only cover the data-building
 * logic in exportService.ts (buildPdfExportData, buildScheduleRows, downloadBlob)
 * and the ExportButton interaction paths.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import type { MortgageSummary } from '../../../domain/models/amortization.types';
import type { MortgageFormState } from '../../../application/store/formTypes';

// ─── Mock jsPDF + pdfRenderer ─────────────────────────────────────────────────

const mockOutput = vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' }));
const mockSave   = vi.fn();
const mockDocInstance = { output: mockOutput, save: mockSave };

vi.mock('jspdf', () => ({
  default: vi.fn(() => mockDocInstance),
}));

vi.mock('jspdf-autotable', () => ({
  autoTable: vi.fn(),
}));

vi.mock('../pdfRenderer', () => ({
  renderPdf:               vi.fn(() => mockDocInstance),
  renderMultiScenarioPdf:  vi.fn(() => mockDocInstance),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(month: number, rate = 0.07, interestType: 'fixed' | 'floating' = 'fixed') {
  return {
    month,
    date: new Date(),
    openingBalance: 400_000_000,
    principal: 1_000_000,
    interest: 2_333_333,
    installment: 3_333_333,
    closingBalance: 399_000_000,
    annualRate: rate,
    interestType,
    extraPayment: 0,
  };
}

function makeSummary(overrides: Partial<MortgageSummary> = {}): MortgageSummary {
  return {
    installmentGroups: [
      { label: 'Group 1', fromMonth: 1, toMonth: 120, installmentAmount: 3_333_333, annualRate: 0.07, type: 'fixed' },
    ],
    totalPrincipal:       400_000_000,
    totalInterest:         80_000_000,
    totalPayment:         480_000_000,
    adminFee:                       0,
    effectiveAnnualRate:         0.07,
    schedule: [makeRow(1), makeRow(2)],
    effectiveTenorMonths:          120,
    originalTenorMonths:           120,
    monthsSaved:                     0,
    originalTotalInterest:  80_000_000,
    originalTotalPayment:  480_000_000,
    interestSaved:                   0,
    interestSavedPercent:            0,
    downPayment:           100_000_000,
    provisionFee:                    0,
    appraisalFee:                    0,
    notaryFee:                       0,
    bphtb:                           0,
    ppnAmount:                       0,
    lifeInsurance:                   0,
    fireInsurance:                   0,
    totalUpfrontCost:      100_000_000,
    ...overrides,
  };
}

function makeForm(overrides: Partial<MortgageFormState> = {}): MortgageFormState {
  return {
    propertyPrice:                '500000000',
    downPaymentMode:              'amount' as const,
    downPaymentValue:             '100000000',
    tenorYears:                   '10',
    tenorAdditionalMonths:        '0',
    paymentMethod:                'annuity' as const,
    startDate:                    '2024-01-01',
    calculationMethod:            'fixed_only' as const,
    hasFixedPeriod:               true,
    fixedRate:                    '7',
    fixedDurationMonths:          '120',
    floatingBaseRate:             '9',
    tiers:                        [],
    includeAdminFee:              false,
    adminFeeAmount:               '',
    includeKprFees:               false,
    provisionFeePercent:          '',
    appraisalFeeAmount:           '',
    notaryFeePercent:             '',
    bphtbPercent:                 '',
    ppnEnabled:                   false,
    ppnPercent:                   '',
    insuranceEnabled:             false,
    lifeInsurancePremiumPercent:  '',
    fireInsurancePremiumPercent:  '',
    financingMode:                'conventional' as const,
    syariahAkadType:              'murabahah' as const,
    syariahMarginPercent:         '',
    syariahUjrahPercent:          '',
    syariahBankSharePercent:      '',
    earlyRepaymentMode:           'none' as const,
    extraMonthlyAmount:           '',
    extraMonthlyStartMonth:       '',
    extraMonthlyEndMonth:         '',
    lumpSumAmount:                '',
    lumpSumMonth:                 '',
    ...overrides,
  };
}

// ─── Import the module under test AFTER mocks are set up ─────────────────────

import {
  buildPdfExportData,
  downloadBlob,
} from '../exportService';

// ─── downloadBlob ─────────────────────────────────────────────────────────────

describe('downloadBlob', () => {
  let createObjectURL: MockInstance;
  let revokeObjectURL: MockInstance;
  let appendChildSpy: MockInstance;
  let removeChildSpy: MockInstance;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn(() => 'blob:http://localhost/fake-url');
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true, configurable: true });
    clickSpy = vi.fn();
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy as () => void);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('appends an anchor, clicks it, removes it', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    downloadBlob(blob, 'test.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });

  it('revokes the object URL after 100 ms timeout', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    downloadBlob(blob, 'test.pdf');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-url');
  });

  it('sets the download attribute to the given filename', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    let capturedAnchor: HTMLAnchorElement | null = null;
    appendChildSpy.mockImplementation((node) => { capturedAnchor = node as HTMLAnchorElement; return node; });

    downloadBlob(blob, 'SimulasiKPR_20240101_1200.pdf');

    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe('SimulasiKPR_20240101_1200.pdf');
  });
});

// ─── buildPdfExportData — conventional ───────────────────────────────────────

describe('buildPdfExportData — conventional', () => {
  it('does not set isSyariah', () => {
    const data = buildPdfExportData(makeForm(), makeSummary());
    expect(data.isSyariah).toBeUndefined();
    expect(data.akadTypeDisplay).toBeUndefined();
    expect(data.interestColumnLabel).toBeUndefined();
  });

  it('uses conventional principal label', () => {
    const data = buildPdfExportData(makeForm(), makeSummary());
    const principalRow = data.financialRows.find((r) => r.hint === 'normal' && r.label.includes('Kredit'));
    expect(principalRow?.label).toBe('Nilai Kredit (Pokok)');
  });

  it('uses "Total Bunga" for interest row', () => {
    const data = buildPdfExportData(makeForm(), makeSummary());
    const interestRow = data.financialRows.find((r) => r.hint === 'interest');
    expect(interestRow?.label).toBe('Total Bunga');
  });

  it('does not include Harga Jual Bank row', () => {
    const data = buildPdfExportData(makeForm(), makeSummary());
    const salePriceRow = data.financialRows.find((r) => r.label === 'Harga Jual Bank');
    expect(salePriceRow).toBeUndefined();
  });

  it('uses Tetap/Variabel typeDisplay for interest rows', () => {
    const data = buildPdfExportData(makeForm(), makeSummary());
    expect(data.interestRows[0].typeDisplay).toBe('Tetap');
  });
});

// ─── buildPdfExportData — Murabahah ──────────────────────────────────────────

describe('buildPdfExportData — Murabahah', () => {
  const murabahahSummary = makeSummary({
    financingMode: 'syariah',
    syariahAkadType: 'murabahah',
    totalSalePrice: 480_000_000,
    totalMargin: 80_000_000,
  });

  it('sets isSyariah = true', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), murabahahSummary);
    expect(data.isSyariah).toBe(true);
  });

  it('sets akadTypeDisplay = "Murabahah"', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), murabahahSummary);
    expect(data.akadTypeDisplay).toBe('Murabahah');
  });

  it('sets interestColumnLabel = "Margin"', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), murabahahSummary);
    expect(data.interestColumnLabel).toBe('Margin');
  });

  it('uses "Nilai Pembiayaan (Pokok)" label', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), murabahahSummary);
    const principalRow = data.financialRows.find((r) => r.hint === 'normal' && r.label.includes('Pembiayaan'));
    expect(principalRow?.label).toBe('Nilai Pembiayaan (Pokok)');
  });

  it('uses "Total Margin" for interest row', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), murabahahSummary);
    const interestRow = data.financialRows.find((r) => r.hint === 'interest');
    expect(interestRow?.label).toBe('Total Margin');
  });

  it('includes Harga Jual Bank row when totalSalePrice is set', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), murabahahSummary);
    const salePriceRow = data.financialRows.find((r) => r.label === 'Harga Jual Bank');
    expect(salePriceRow).toBeDefined();
  });

  it('sets typeDisplay to "Murabahah" in interest rows', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), murabahahSummary);
    expect(data.interestRows[0].typeDisplay).toBe('Murabahah');
  });
});

// ─── buildPdfExportData — MMQ ─────────────────────────────────────────────────

describe('buildPdfExportData — MMQ', () => {
  const mmqSummary = makeSummary({
    financingMode: 'syariah',
    syariahAkadType: 'musyarakah_mutanaqishah',
    totalUjrah: 80_000_000,
  });

  it('sets akadTypeDisplay = "Musyarakah Mutanaqishah (MMQ)"', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' }), mmqSummary);
    expect(data.akadTypeDisplay).toBe('Musyarakah Mutanaqishah (MMQ)');
  });

  it('sets interestColumnLabel = "Ujrah"', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' }), mmqSummary);
    expect(data.interestColumnLabel).toBe('Ujrah');
  });

  it('uses "Total Ujrah" for interest row', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' }), mmqSummary);
    const interestRow = data.financialRows.find((r) => r.hint === 'interest');
    expect(interestRow?.label).toBe('Total Ujrah');
  });

  it('does not include Harga Jual Bank row', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' }), mmqSummary);
    const salePriceRow = data.financialRows.find((r) => r.label === 'Harga Jual Bank');
    expect(salePriceRow).toBeUndefined();
  });

  it('sets typeDisplay to "MMQ" in interest rows', () => {
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' }), mmqSummary);
    expect(data.interestRows[0].typeDisplay).toBe('MMQ');
  });
});

// ─── buildScheduleRows — Syariah null safety ──────────────────────────────────

describe('buildPdfExportData — scheduleRows Syariah null safety', () => {
  it('handles a Syariah schedule without NaN or undefined values', () => {
    const summary = makeSummary({
      financingMode: 'syariah',
      syariahAkadType: 'murabahah',
      schedule: [makeRow(1, 0.06), makeRow(2, 0.06)],
    });
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }), summary);
    for (const row of data.scheduleRows) {
      expect(row.interest).not.toBe('');
      expect(row.interest).not.toContain('NaN');
      expect(row.installment).not.toContain('NaN');
    }
  });

  it('emits a rate-change separator row with Syariah wording when rate changes', () => {
    const summary = makeSummary({
      financingMode: 'syariah',
      syariahAkadType: 'musyarakah_mutanaqishah',
      schedule: [makeRow(1, 0.06), makeRow(2, 0.08)],
    });
    const data = buildPdfExportData(makeForm({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' }), summary);
    const separator = data.scheduleRows.find((r) => r.isRateChange);
    expect(separator).toBeDefined();
    expect(separator!.rateChangeLabel).toContain('ujrah');
  });

  it('does not emit a rate-change row when rate is constant', () => {
    const summary = makeSummary({
      schedule: [makeRow(1, 0.07), makeRow(2, 0.07)],
    });
    const data = buildPdfExportData(makeForm(), summary);
    const separator = data.scheduleRows.find((r) => r.isRateChange);
    expect(separator).toBeUndefined();
  });
});

// ─── multi-scenario mix ───────────────────────────────────────────────────────

describe('buildPdfExportData — multi-scenario shape', () => {
  it('builds conventional data without Syariah fields', () => {
    const data = buildPdfExportData(makeForm(), makeSummary());
    expect(data.isSyariah).toBeUndefined();
    expect(data.scheduleRows.length).toBeGreaterThan(0);
    expect(data.financialRows.length).toBeGreaterThan(0);
  });

  it('builds Murabahah data correctly alongside conventional', () => {
    const conventional = buildPdfExportData(makeForm(), makeSummary());
    const syariah = buildPdfExportData(
      makeForm({ financingMode: 'syariah', syariahAkadType: 'murabahah' }),
      makeSummary({ financingMode: 'syariah', syariahAkadType: 'murabahah', totalSalePrice: 480_000_000 }),
    );
    expect(conventional.isSyariah).toBeUndefined();
    expect(syariah.isSyariah).toBe(true);
    expect(syariah.akadTypeDisplay).toBe('Murabahah');
  });
});
