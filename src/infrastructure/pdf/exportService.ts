import * as Sentry from '@sentry/react';
import { captureError } from '../../lib/sentry';
import { renderPdf, renderMultiScenarioPdf } from './pdfRenderer';
import type {
  PdfExportData,
  PdfLoanInfo,
  PdfInterestRow,
  PdfFinancialRow,
  PdfScheduleRow,
  PdfTotalRow,
  PdfComparisonRow,
  PdfComparisonCell,
  PdfMultiScenarioExportData,
  PdfAffordabilitySection,
  PdfStressRow,
} from './pdfTypes';
import type { MortgageFormState } from '../../application/store/formTypes';
import type { MortgageSummary } from '../../domain/models/amortization.types';
import type { AffordabilityFormState } from '../../application/store/affordabilityTypes';
import type { AffordabilityResult } from '../../domain/calculators/affordability';
import { formatIDR, formatIDRCompact, formatPercent, formatTenor, monthToYear } from '../../domain/utils/currency';
import { formatDateID } from '../../domain/utils/date';

// ─── Multi-scenario types ─────────────────────────────────────────────────────

interface ScenarioForPdf {
  label: string;
  form: MortgageFormState;
  summary: MortgageSummary;
}

export interface AffordabilityExportData {
  form: AffordabilityFormState;
  /** One result per scenario, aligned with the scenarios array. */
  results: AffordabilityResult[];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildPdfExportData(
  form: MortgageFormState,
  summary: MortgageSummary,
  affordability?: { form: AffordabilityFormState; result: AffordabilityResult },
): PdfExportData {
  const now = new Date();
  const generatedAt =
    formatDateID(now) +
    ', ' +
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const scheduleRows = buildScheduleRows(summary);
  const hasExtraPayment = summary.schedule.some((r) => r.extraPayment > 0);
  return {
    generatedAt,
    loanInfo: buildLoanInfo(form, summary),
    interestRows: buildInterestRows(summary),
    financialRows: buildFinancialRows(summary),
    scheduleRows,
    totalRow: buildTotalRow(summary),
    hasExtraPayment,
    affordability: affordability
      ? buildAffordabilitySection(affordability.form, affordability.result)
      : undefined,
  };
}

export async function exportToPdf(
  form: MortgageFormState,
  summary: MortgageSummary,
  affordability?: AffordabilityExportData,
): Promise<void> {
  return Sentry.startSpan({ name: 'kpr.pdf_export', op: 'pdf.export' }, async () => {
    try {
      const afData = affordability?.results[0]
        ? { form: affordability.form, result: affordability.results[0] }
        : undefined;
      const data = buildPdfExportData(form, summary, afData);
      const doc = renderPdf(data);
      doc.save(makeSingleFilename());
    } catch (err) {
      captureError(err, { feature: 'pdf_export', scenarioCount: 1 });
      throw err;
    }
  });
}

export async function exportMultiScenarioPdf(
  scenarios: ScenarioForPdf[],
  affordability?: AffordabilityExportData,
): Promise<void> {
  return Sentry.startSpan({ name: 'kpr.pdf_export_multi', op: 'pdf.export' }, async () => {
    try {
      const data = buildMultiScenarioExportData(scenarios, affordability);
      const doc = renderMultiScenarioPdf(data);
      doc.save(makeMultiFilename());
    } catch (err) {
      captureError(err, { feature: 'pdf_export', scenarioCount: scenarios.length });
      throw err;
    }
  });
}

/** Returns a Blob + filename — used by the share path in ExportButton. */
export async function buildPdfBlob(
  form: MortgageFormState,
  summary: MortgageSummary,
  affordability?: AffordabilityExportData,
): Promise<{ blob: Blob; filename: string }> {
  return Sentry.startSpan({ name: 'kpr.pdf_blob', op: 'pdf.export' }, async () => {
    try {
      const afData = affordability?.results[0]
        ? { form: affordability.form, result: affordability.results[0] }
        : undefined;
      const data = buildPdfExportData(form, summary, afData);
      const doc = renderPdf(data);
      const filename = makeSingleFilename();
      const blob = doc.output('blob');
      return { blob, filename };
    } catch (err) {
      captureError(err, { feature: 'pdf_blob', scenarioCount: 1 });
      throw err;
    }
  });
}

/** Returns a Blob + filename for multi-scenario — used by the share path. */
export async function buildMultiPdfBlob(
  scenarios: ScenarioForPdf[],
  affordability?: AffordabilityExportData,
): Promise<{ blob: Blob; filename: string }> {
  return Sentry.startSpan({ name: 'kpr.pdf_blob_multi', op: 'pdf.export' }, async () => {
    try {
      const data = buildMultiScenarioExportData(scenarios, affordability);
      const doc = renderMultiScenarioPdf(data);
      const filename = makeMultiFilename();
      const blob = doc.output('blob');
      return { blob, filename };
    } catch (err) {
      captureError(err, { feature: 'pdf_blob', scenarioCount: scenarios.length });
      throw err;
    }
  });
}

function buildMultiScenarioExportData(
  scenarios: ScenarioForPdf[],
  affordability?: AffordabilityExportData,
): PdfMultiScenarioExportData {
  const now = new Date();
  const generatedAt =
    formatDateID(now) +
    ', ' +
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const scenarioData: PdfExportData[] = scenarios.map((s, i) => ({
    ...buildPdfExportData(
      s.form,
      s.summary,
      affordability?.results[i]
        ? { form: affordability.form, result: affordability.results[i] }
        : undefined,
    ),
    generatedAt,
    label: s.label,
  }));

  return {
    generatedAt,
    columnLabels: scenarios.map((s) => s.label),
    comparisonRows: buildComparisonRows(scenarios, affordability),
    scenarios: scenarioData,
  };
}

function buildComparisonRows(
  scenarios: ScenarioForPdf[],
  affordability?: AffordabilityExportData,
): PdfComparisonRow[] {
  function hints(values: number[]): PdfComparisonCell['hint'][] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return values.map(() => 'normal' as const);
    return values.map((v) => (v === min ? 'best' : v === max ? 'worst' : 'normal'));
  }

  function infoRow(label: string, valuesFn: (s: ScenarioForPdf) => string): PdfComparisonRow {
    return {
      label,
      cells: scenarios.map((s) => ({ value: valuesFn(s), hint: 'normal' as const })),
    };
  }

  function outcomeRow(
    label: string,
    displayFn: (s: ScenarioForPdf) => string,
    numericFn: (s: ScenarioForPdf) => number,
  ): PdfComparisonRow {
    const numericValues = scenarios.map(numericFn);
    const hintArr = hints(numericValues);
    return {
      label,
      cells: scenarios.map((s, i) => ({ value: displayFn(s), hint: hintArr[i] })),
    };
  }

  const principalDisplay = (s: ScenarioForPdf) => formatIDR(s.summary.totalPrincipal);
  const tenorDisplay = (s: ScenarioForPdf) => {
    const months = s.summary.schedule.length;
    return `${formatTenor(months)} (${months} Bln)`;
  };
  const methodDisplay = (s: ScenarioForPdf) =>
    s.form.paymentMethod === 'annuity' ? 'Anuitas' : 'Flat Rate';

  const rows: PdfComparisonRow[] = [
    { label: 'Info Kredit', cells: [], isSectionHeader: true },
    infoRow('Nilai Kredit', principalDisplay),
    infoRow('Tenor', tenorDisplay),
    infoRow('Metode Bayar', methodDisplay),
    { label: 'Hasil Simulasi', cells: [], isSectionHeader: true },
    outcomeRow(
      'Cicilan Pertama',
      (s) => formatIDR(s.summary.installmentGroups[0]?.installmentAmount ?? 0),
      (s) => s.summary.installmentGroups[0]?.installmentAmount ?? 0,
    ),
    outcomeRow(
      'Total Bunga',
      (s) => formatIDR(s.summary.totalInterest),
      (s) => s.summary.totalInterest,
    ),
    outcomeRow(
      'Total Pembayaran',
      (s) => formatIDR(s.summary.totalPayment),
      (s) => s.summary.totalPayment,
    ),
    outcomeRow(
      'Suku Bunga Efektif',
      (s) => formatPercent(s.summary.effectiveAnnualRate, 2, true),
      (s) => s.summary.effectiveAnnualRate,
    ),
  ];

  if (affordability && affordability.results.length === scenarios.length) {
    const results = affordability.results;
    const bandLabel = (r: AffordabilityResult) =>
      r.riskBand === 'safe' ? 'Aman' : r.riskBand === 'watch' ? 'Waspada' : 'Berisiko';

    rows.push({ label: 'Kemampuan Bayar', cells: [], isSectionHeader: true });
    rows.push({
      label: 'DSR Tertinggi',
      cells: results.map((r) => ({
        value: formatPercent(r.dsrAtHighest, 1),
        hint: 'normal' as const,
      })),
    });
    rows.push({
      label: 'Surplus Terendah',
      cells: results.map((r) => ({
        value: formatIDRCompact(r.netSurplusAtHighest),
        hint: 'normal' as const,
      })),
    });
    rows.push({
      label: 'Status Risiko',
      cells: results.map((r) => ({
        value: bandLabel(r),
        hint: 'normal' as const,
      })),
    });
  }

  return rows;
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildLoanInfo(form: MortgageFormState, summary: MortgageSummary): PdfLoanInfo {
  const propertyPrice = parseFormNumber(form.propertyPrice);
  const dpRaw = parseFormNumber(form.downPaymentValue);
  const downPayment =
    form.downPaymentMode === 'percent' ? propertyPrice * (dpRaw / 100) : dpRaw;
  const dpPercent = propertyPrice > 0 ? (downPayment / propertyPrice) * 100 : 0;

  const tenorMonths =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);

  const calculationMethodDisplay =
    form.calculationMethod === 'fixed_only'
      ? 'Fixed Only (Seluruh Tenor Tetap)'
      : form.calculationMethod === 'fixed_single_floating'
        ? 'Fixed + Floating Tunggal'
        : 'Fixed + Floating Bertingkat';

  const paymentMethodDisplay =
    form.paymentMethod === 'annuity'
      ? 'Anuitas (Cicilan Tetap per Periode)'
      : 'Flat Rate (Bunga Tetap pada Pokok Awal)';

  const startDate = new Date(form.startDate);
  const startDateDisplay = isNaN(startDate.getTime())
    ? form.startDate
    : formatDateID(startDate);

  const adminFeeDisplay =
    form.includeAdminFee && summary.adminFee > 0 ? formatIDR(summary.adminFee) : null;

  return {
    propertyPriceDisplay: formatIDR(propertyPrice),
    downPaymentDisplay: `${formatIDR(downPayment)} (${dpPercent.toFixed(1).replace('.', ',')}%)`,
    principalDisplay: formatIDR(summary.totalPrincipal),
    tenorDisplay: `${formatTenor(tenorMonths)} (${tenorMonths} Bulan)`,
    calculationMethodDisplay,
    paymentMethodDisplay,
    startDateDisplay,
    adminFeeDisplay,
  };
}

function buildInterestRows(summary: MortgageSummary): PdfInterestRow[] {
  return summary.installmentGroups.map((g) => ({
    periodDisplay: `Bulan ${g.fromMonth}–${g.toMonth}`,
    typeDisplay: g.type === 'fixed' ? 'Tetap' : 'Variabel',
    rateDisplay: formatPercent(g.annualRate, 2, true),
    installmentDisplay: formatIDR(g.installmentAmount),
  }));
}

function buildFinancialRows(summary: MortgageSummary): PdfFinancialRow[] {
  const rows: PdfFinancialRow[] = [
    { label: 'Nilai Kredit (Pokok)', value: formatIDR(summary.totalPrincipal), hint: 'normal' },
    { label: 'Total Bunga', value: formatIDR(summary.totalInterest), hint: 'interest' },
  ];

  if (summary.adminFee > 0) {
    rows.push({ label: 'Biaya Administrasi', value: formatIDR(summary.adminFee), hint: 'normal' });
  }

  rows.push({ label: 'Total Pembayaran', value: formatIDR(summary.totalPayment), hint: 'paid' });
  rows.push({
    label: 'Rata-rata Suku Bunga Efektif',
    value: formatPercent(summary.effectiveAnnualRate, 2, true),
    hint: 'normal',
  });

  // Early repayment savings
  if (summary.monthsSaved > 0) {
    rows.push({
      label: 'Tenor Efektif',
      value: `${formatTenor(summary.effectiveTenorMonths)} (hemat ${summary.monthsSaved} bulan)`,
      hint: 'normal',
    });
  }
  if (summary.interestSaved > 0) {
    rows.push({
      label: 'Bunga Dihemat',
      value: `${formatIDR(summary.interestSaved)} (${summary.interestSavedPercent.toFixed(1)}%)`,
      hint: 'normal',
    });
  }

  return rows;
}

function buildScheduleRows(summary: MortgageSummary): PdfScheduleRow[] {
  const { schedule } = summary;
  const rows: PdfScheduleRow[] = [];

  for (let i = 0; i < schedule.length; i++) {
    const row = schedule[i];
    const prev = schedule[i - 1];

    if (i > 0 && prev.annualRate !== row.annualRate) {
      const typeLabel = row.interestType === 'fixed' ? 'Tetap' : 'Variabel';
      rows.push({
        month: '',
        year: '',
        rate: '',
        installment: '',
        principal: '',
        interest: '',
        balance: '',
        extraPayment: '',
        isRateChange: true,
        rateChangeLabel: `Perubahan suku bunga mulai Bulan ${row.month} → ${formatPercent(row.annualRate, 2, true)} (${typeLabel})`,
      });
    }

    rows.push({
      month: String(row.month),
      year: String(monthToYear(row.month)),
      rate: formatPercent(row.annualRate),
      installment: formatIDR(row.installment),
      principal: formatIDR(row.principal),
      interest: formatIDR(row.interest),
      balance: formatIDR(row.closingBalance),
      extraPayment: row.extraPayment > 0 ? formatIDR(row.extraPayment) : '',
      isRateChange: false,
    });
  }

  return rows;
}

function buildTotalRow(summary: MortgageSummary): PdfTotalRow {
  const { schedule } = summary;
  return {
    label: `Total (${schedule.length} Bulan)`,
    installment: formatIDR(summary.totalPayment),
    principal: formatIDR(summary.totalPrincipal),
    interest: formatIDR(summary.totalInterest),
    finalBalance: formatIDR(schedule[schedule.length - 1]?.closingBalance ?? 0),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFormNumber(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
}

function makeDateTag(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${dateStr}_${hh}${mm}`;
}

function makeSingleFilename(): string {
  return `SimulasiKPR_${makeDateTag()}.pdf`;
}

function makeMultiFilename(): string {
  return `PerbandinganKPR_${makeDateTag()}.pdf`;
}

// ─── Affordability section builder ───────────────────────────────────────────

function buildAffordabilitySection(
  form: AffordabilityFormState,
  result: AffordabilityResult,
): PdfAffordabilitySection {
  const totalIncome = (parseFloat(form.monthlyIncome) || 0) + (parseFloat(form.spouseIncome) || 0);
  const existingDebt = parseFloat(form.existingMonthlyDebt) || 0;
  const livingExpense = parseFloat(form.monthlyLivingExpense) || 0;
  const maxDsr = Math.max(0.01, (parseFloat(form.maxDSRPercent) || 35) / 100);

  const bandLabel = (band: AffordabilityResult['riskBand']) =>
    band === 'safe' ? 'Aman' : band === 'watch' ? 'Waspada' : 'Berisiko';

  const stressRows: PdfStressRow[] = result.stressTest.map((row) => ({
    scenario:
      row.rateOffsetPct === 0
        ? `${formatPercent(row.annualRate, 0)} (kini)`
        : `+${row.rateOffsetPct}%`,
    installment: formatIDR(row.installment),
    dsr: formatPercent(row.dsr, 1),
    dsrOverLimit: row.dsr > maxDsr,
    netSurplus: formatIDR(row.netSurplus),
    surplusNegative: row.netSurplus < 0,
    band: bandLabel(row.band),
    bandType: row.band,
  }));

  return {
    totalIncome: formatIDR(totalIncome) + '/bln',
    existingDebt: formatIDR(existingDebt) + '/bln',
    livingExpense: formatIDR(livingExpense) + '/bln',
    maxDsr: formatPercent(maxDsr, 0),
    dsrNow: formatPercent(result.dsrNow, 1),
    dsrAtHighest: formatPercent(result.dsrAtHighest, 1),
    dsrAtHighestOverLimit: result.dsrAtHighest > maxDsr,
    netSurplusAtHighest: formatIDR(result.netSurplusAtHighest),
    surplusNegative: result.netSurplusAtHighest < 0,
    riskBand: bandLabel(result.riskBand),
    riskBandType: result.riskBand,
    maxAffordableLoan: formatIDR(result.maxAffordableLoan),
    minRecommendedIncome: formatIDR(result.minRecommendedIncome) + '/bln',
    stressRows,
  };
}
