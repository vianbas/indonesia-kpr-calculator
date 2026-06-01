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
  PdfRefinancingSection,
} from './pdfTypes';
import type { MortgageFormState } from '../../application/store/formTypes';
import type { MortgageSummary } from '../../domain/models/amortization.types';
import type { AffordabilityFormState } from '../../application/store/affordabilityTypes';
import type { AffordabilityResult } from '../../domain/calculators/affordability';
import type { RefinancingFormState } from '../../application/store/refinancingTypes';
import type { RefinancingResult } from '../../domain/calculators/refinancing';
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

export interface RefinancingExportData {
  form: RefinancingFormState;
  result: RefinancingResult;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildPdfExportData(
  form: MortgageFormState,
  summary: MortgageSummary,
  affordability?: { form: AffordabilityFormState; result: AffordabilityResult },
  refinancing?: RefinancingExportData,
): PdfExportData {
  const now = new Date();
  const generatedAt =
    formatDateID(now) +
    ', ' +
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const isSyariah = summary.financingMode === 'syariah';
  const akadType = summary.syariahAkadType;
  const akadTypeDisplay = isSyariah
    ? akadType === 'murabahah'
      ? 'Murabahah'
      : 'Musyarakah Mutanaqishah (MMQ)'
    : undefined;
  const interestColumnLabel = isSyariah
    ? akadType === 'murabahah' ? 'Margin' : 'Ujrah'
    : undefined;

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
    refinancing: refinancing
      ? buildRefinancingSection(refinancing.form, refinancing.result)
      : undefined,
    isSyariah: isSyariah || undefined,
    akadTypeDisplay,
    interestColumnLabel,
  };
}

/**
 * Triggers a file download via a temporary anchor element.
 * Uses a 100 ms timeout before revoking the object URL so the browser has time
 * to initiate the download before the URL is invalidated.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function exportToPdf(
  form: MortgageFormState,
  summary: MortgageSummary,
  affordability?: AffordabilityExportData,
  refinancing?: RefinancingExportData,
): Promise<void> {
  const { blob, filename } = await buildPdfBlob(form, summary, affordability, refinancing);
  downloadBlob(blob, filename);
}

export async function exportMultiScenarioPdf(
  scenarios: ScenarioForPdf[],
  affordability?: AffordabilityExportData,
  refinancing?: RefinancingExportData,
): Promise<void> {
  const { blob, filename } = await buildMultiPdfBlob(scenarios, affordability, refinancing);
  downloadBlob(blob, filename);
}

/** Returns a Blob + filename — used by the share path in ExportButton. */
export async function buildPdfBlob(
  form: MortgageFormState,
  summary: MortgageSummary,
  affordability?: AffordabilityExportData,
  refinancing?: RefinancingExportData,
): Promise<{ blob: Blob; filename: string }> {
  return Sentry.startSpan({ name: 'kpr.pdf_blob', op: 'pdf.export' }, async () => {
    try {
      const afData = affordability?.results[0]
        ? { form: affordability.form, result: affordability.results[0] }
        : undefined;
      const data = buildPdfExportData(form, summary, afData, refinancing);
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
  refinancing?: RefinancingExportData,
): Promise<{ blob: Blob; filename: string }> {
  return Sentry.startSpan({ name: 'kpr.pdf_blob_multi', op: 'pdf.export' }, async () => {
    try {
      const data = buildMultiScenarioExportData(scenarios, affordability, refinancing);
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
  refinancing?: RefinancingExportData,
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
      // Refinancing is global — only include it in the first scenario to avoid duplication
      i === 0 ? refinancing : undefined,
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

  const isSyariah = summary.financingMode === 'syariah';
  const akadType = summary.syariahAkadType;

  let calculationMethodDisplay: string;
  if (isSyariah) {
    calculationMethodDisplay = akadType === 'murabahah'
      ? 'Murabahah (Cicilan Tetap)'
      : 'Musyarakah Mutanaqishah / MMQ';
  } else {
    calculationMethodDisplay =
      form.calculationMethod === 'fixed_only'
        ? 'Fixed Only (Seluruh Tenor Tetap)'
        : form.calculationMethod === 'fixed_single_floating'
          ? 'Fixed + Floating Tunggal'
          : 'Fixed + Floating Bertingkat';
  }

  let paymentMethodDisplay: string;
  if (isSyariah) {
    paymentMethodDisplay = akadType === 'murabahah'
      ? 'Murabahah (Angsuran Tetap)'
      : 'MMQ (Ujrah Menurun)';
  } else {
    paymentMethodDisplay =
      form.paymentMethod === 'annuity'
        ? 'Anuitas (Cicilan Tetap per Periode)'
        : 'Flat Rate (Bunga Tetap pada Pokok Awal)';
  }

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
  const isSyariah = summary.financingMode === 'syariah';
  const akadType = summary.syariahAkadType;
  return summary.installmentGroups.map((g) => {
    let typeDisplay: string;
    if (isSyariah) {
      typeDisplay = akadType === 'murabahah' ? 'Murabahah' : 'MMQ';
    } else {
      typeDisplay = g.type === 'fixed' ? 'Tetap' : 'Variabel';
    }
    return {
      periodDisplay: `Bulan ${g.fromMonth}–${g.toMonth}`,
      typeDisplay,
      rateDisplay: formatPercent(g.annualRate, 2, true),
      installmentDisplay: formatIDR(g.installmentAmount),
    };
  });
}

function buildFinancialRows(summary: MortgageSummary): PdfFinancialRow[] {
  const isSyariah = summary.financingMode === 'syariah';
  const akadType = summary.syariahAkadType;

  const principalLabel = isSyariah ? 'Nilai Pembiayaan (Pokok)' : 'Nilai Kredit (Pokok)';
  let interestLabel: string;
  if (isSyariah) {
    interestLabel = akadType === 'murabahah' ? 'Total Margin' : 'Total Ujrah';
  } else {
    interestLabel = 'Total Bunga';
  }

  const rows: PdfFinancialRow[] = [
    { label: principalLabel, value: formatIDR(summary.totalPrincipal), hint: 'normal' },
    { label: interestLabel, value: formatIDR(summary.totalInterest), hint: 'interest' },
  ];

  if (isSyariah && akadType === 'murabahah' && summary.totalSalePrice) {
    rows.push({ label: 'Harga Jual Bank', value: formatIDR(summary.totalSalePrice), hint: 'normal' });
  }

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

  // Upfront / cash-to-close section (adminFee already shown above in loan summary)
  if (summary.totalUpfrontCost > 0) {
    rows.push({ label: 'Uang Muka (DP)', value: formatIDR(summary.downPayment), hint: 'normal' });
    if (summary.provisionFee > 0) rows.push({ label: 'Biaya Provisi', value: formatIDR(summary.provisionFee), hint: 'normal' });
    if (summary.appraisalFee > 0) rows.push({ label: 'Biaya Appraisal', value: formatIDR(summary.appraisalFee), hint: 'normal' });
    if (summary.notaryFee > 0) rows.push({ label: 'Biaya Notaris / PPAT', value: formatIDR(summary.notaryFee), hint: 'normal' });
    if (summary.bphtb > 0) rows.push({ label: 'BPHTB', value: formatIDR(summary.bphtb), hint: 'normal' });
    if (summary.ppnAmount > 0) rows.push({ label: 'PPN', value: formatIDR(summary.ppnAmount), hint: 'normal' });
    if (summary.lifeInsurance > 0) rows.push({ label: 'Asuransi Jiwa KPR (est.)', value: formatIDR(summary.lifeInsurance), hint: 'normal' });
    if (summary.fireInsurance > 0) rows.push({ label: 'Asuransi Kebakaran (est.)', value: formatIDR(summary.fireInsurance), hint: 'normal' });
    rows.push({ label: 'Total Dana Awal (Akad)', value: formatIDR(summary.totalUpfrontCost), hint: 'paid' });
  }

  return rows;
}

function buildScheduleRows(summary: MortgageSummary): PdfScheduleRow[] {
  const { schedule } = summary;
  const isSyariah = summary.financingMode === 'syariah';
  const rows: PdfScheduleRow[] = [];

  for (let i = 0; i < schedule.length; i++) {
    const row = schedule[i];
    const prev = schedule[i - 1];

    if (i > 0 && prev && prev.annualRate !== row.annualRate) {
      let typeLabel: string;
      if (isSyariah) {
        typeLabel = 'Ujrah';
      } else {
        typeLabel = row.interestType === 'fixed' ? 'Tetap' : 'Variabel';
      }
      const rateWord = isSyariah ? 'ujrah' : 'suku bunga';
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
        rateChangeLabel: `Perubahan ${rateWord} mulai Bulan ${row.month} > ${formatPercent(row.annualRate, 2, true)} (${typeLabel})`,
      });
    }

    rows.push({
      month: String(row.month),
      year: String(monthToYear(row.month)),
      rate: formatPercent(row.annualRate),
      installment: formatIDR(row.installment),
      principal: formatIDR(row.principal),
      interest: formatIDR(row.interest ?? 0),
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

// ─── Refinancing section builder ─────────────────────────────────────────────

function buildRefinancingSection(
  form: RefinancingFormState,
  result: RefinancingResult,
): PdfRefinancingSection {
  const recLabel =
    result.recommendation === 'worth_it'
      ? 'Disarankan'
      : result.recommendation === 'marginal'
        ? 'Perlu Pertimbangan'
        : 'Tidak Disarankan';

  return {
    remainingBalance: formatIDR(parseFloat(form.remainingBalance) || 0),
    currentRate: formatPercent((parseFloat(form.currentAnnualRatePercent) || 0) / 100, 2, true),
    remainingMonths: `${form.remainingMonths} bulan`,
    newRate: formatPercent((parseFloat(form.newAnnualRatePercent) || 0) / 100, 2, true),
    newTenorMonths: `${form.newTenorMonths} bulan`,
    currentMonthlyPayment: formatIDR(result.currentMonthlyPayment),
    newMonthlyPayment: formatIDR(result.newMonthlyPayment),
    monthlySavings: formatIDR(Math.abs(result.monthlySavings)),
    savingsNegative: result.monthlySavings < 0,
    totalSwitchingCost: formatIDR(result.totalSwitchingCost),
    totalInterestSavings: formatIDR(Math.abs(result.totalInterestSavings)),
    netSavings: formatIDR(Math.abs(result.netSavings)),
    netSavingsNegative: result.netSavings < 0,
    breakEvenMonths:
      result.breakEvenMonths === null
        ? 'Tidak tercapai'
        : result.breakEvenMonths === 0
          ? 'Segera'
          : `${result.breakEvenMonths} bulan`,
    recommendation: recLabel,
    recommendationType: result.recommendation,
  };
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
