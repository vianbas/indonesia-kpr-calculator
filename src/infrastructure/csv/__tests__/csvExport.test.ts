// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildScenarioCsvBlob, buildScenarioCsvString, escapeCsv, combinedReturnTerm } from '../csvExport';
import type { ScenarioForCsv } from '../csvTypes';
import type { MortgageFormState } from '../../../application/store/formTypes';
import type { MortgageSummary, AmortizationRow } from '../../../domain/models/amortization.types';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeRow(month: number, overrides: Partial<AmortizationRow> = {}): AmortizationRow {
  return {
    month,
    date: new Date(2024, 0, month),
    openingBalance: 100_000_000,
    principal: 1_000_000,
    interest: 500_000,
    installment: 1_500_000,
    closingBalance: 99_000_000,
    annualRate: 0.07,
    interestType: 'fixed',
    extraPayment: 0,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<MortgageSummary> = {}): MortgageSummary {
  return {
    installmentGroups: [
      { label: 'M1', fromMonth: 1, toMonth: 12, installmentAmount: 1_500_000, annualRate: 0.07, type: 'fixed' },
    ],
    totalPrincipal: 100_000_000,
    totalInterest: 20_000_000,
    totalPayment: 120_000_000,
    adminFee: 0,
    effectiveAnnualRate: 0.07,
    schedule: [makeRow(1), makeRow(2)],
    effectiveTenorMonths: 120,
    originalTenorMonths: 120,
    monthsSaved: 0,
    originalTotalInterest: 20_000_000,
    originalTotalPayment: 120_000_000,
    interestSaved: 0,
    interestSavedPercent: 0,
    downPayment: 25_000_000,
    provisionFee: 0,
    appraisalFee: 0,
    notaryFee: 0,
    bphtb: 0,
    ppnAmount: 0,
    lifeInsurance: 0,
    fireInsurance: 0,
    totalUpfrontCost: 25_000_000,
    ...overrides,
  };
}

const dummyForm = {} as MortgageFormState;

function scenario(label: string, summary: MortgageSummary): ScenarioForCsv {
  return { label, form: dummyForm, summary };
}

const conventional = () => makeSummary();
const murabahah = () => makeSummary({ financingMode: 'syariah', syariahAkadType: 'murabahah' });
const mmq = () => makeSummary({ financingMode: 'syariah', syariahAkadType: 'musyarakah_mutanaqishah' });

// ─── escapeCsv ────────────────────────────────────────────────────────────────

describe('escapeCsv', () => {
  it('leaves plain values unquoted', () => {
    expect(escapeCsv('Skenario 1')).toBe('Skenario 1');
    expect(escapeCsv(12345)).toBe('12345');
  });

  it('quotes values containing a comma', () => {
    expect(escapeCsv('BCA, 3yr')).toBe('"BCA, 3yr"');
  });

  it('quotes and doubles internal quotes', () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes values containing a newline', () => {
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });
});

// ─── combinedReturnTerm ─────────────────────────────────────────────────────

describe('combinedReturnTerm', () => {
  it('uses Bunga for all-conventional', () => {
    expect(combinedReturnTerm([scenario('A', conventional())])).toBe('Bunga');
  });

  it('uses Margin for all-murabahah', () => {
    expect(combinedReturnTerm([scenario('A', murabahah())])).toBe('Margin');
  });

  it('uses Ujrah for all-MMQ', () => {
    expect(combinedReturnTerm([scenario('A', mmq())])).toBe('Ujrah');
  });

  it('falls back to combined label for mixed modes', () => {
    expect(
      combinedReturnTerm([scenario('A', conventional()), scenario('B', murabahah())]),
    ).toBe('Bunga/Margin/Ujrah');
  });
});

// ─── buildScenarioCsvBlob ─────────────────────────────────────────────────────

describe('buildScenarioCsvBlob', () => {
  it('produces a text/csv blob with a UTF-8 BOM at the start of the string', () => {
    const { blob } = buildScenarioCsvBlob([scenario('Skenario 1', conventional())]);
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(buildScenarioCsvString([scenario('Skenario 1', conventional())]).charCodeAt(0)).toBe(0xfeff);
  });

  it('includes both the summary and amortization sections', () => {
    const text = buildScenarioCsvString([scenario('Skenario 1', conventional())]);
    expect(text).toContain('Ringkasan Skenario');
    expect(text).toContain('Jadwal Amortisasi');
  });

  it('single-scenario schedule includes all rows', () => {
    const text = buildScenarioCsvString([scenario('Skenario 1', conventional())]);
    // Schedule rows have a numeric month as their 2nd column (summary rows do not)
    const scheduleRows = text.split(/\r\n/).filter((l) => /^Skenario 1,\d/.test(l));
    expect(scheduleRows.length).toBe(2);
  });

  it('conventional summary uses the Bunga label', () => {
    expect(buildScenarioCsvString([scenario('A', conventional())])).toContain('Total Bunga');
  });

  it('murabahah summary uses the Margin label', () => {
    expect(buildScenarioCsvString([scenario('A', murabahah())])).toContain('Total Margin');
  });

  it('MMQ summary uses the Ujrah label', () => {
    expect(buildScenarioCsvString([scenario('A', mmq())])).toContain('Total Ujrah');
  });

  it('multi-scenario export includes every scenario label and all rows', () => {
    const scenarios = [scenario('BCA 3yr', conventional()), scenario('Mandiri iB', murabahah())];
    const text = buildScenarioCsvString(scenarios);
    expect(text).toContain('BCA 3yr');
    expect(text).toContain('Mandiri iB');
    expect(text.split(/\r\n/).filter((l) => /^BCA 3yr,\d/.test(l)).length).toBe(2);
    expect(text.split(/\r\n/).filter((l) => /^Mandiri iB,\d/.test(l)).length).toBe(2);
    expect(buildScenarioCsvBlob(scenarios).filename).toMatch(/^PerbandinganKPR_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('mixed conventional + Syariah export contains no NaN/undefined', () => {
    const text = buildScenarioCsvString([scenario('A', conventional()), scenario('B', mmq())]);
    expect(text).not.toMatch(/NaN/);
    expect(text).not.toMatch(/undefined/);
  });

  it('escapes a scenario label that contains a comma', () => {
    expect(buildScenarioCsvString([scenario('BCA, special', conventional())])).toContain('"BCA, special"');
  });

  it('uses the single-scenario filename prefix for one scenario', () => {
    expect(buildScenarioCsvBlob([scenario('A', conventional())]).filename).toMatch(
      /^SimulasiKPR_\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });

  it('appends affordability risk band when provided', () => {
    const text = buildScenarioCsvString([scenario('A', conventional())], {
      form: {} as never,
      results: [{ riskBand: 'safe' } as never],
    });
    expect(text).toContain('Risiko Kemampuan Bayar');
    expect(text).toContain('Aman');
  });
});
