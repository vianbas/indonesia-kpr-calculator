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
} from './pdfTypes';
import type { MortgageFormState } from '../../application/store/formTypes';
import type { MortgageSummary } from '../../domain/models/amortization.types';
import { formatIDR, formatPercent, formatTenor, monthToYear } from '../../domain/utils/currency';
import { formatDateID } from '../../domain/utils/date';

// ─── Multi-scenario types ─────────────────────────────────────────────────────

interface ScenarioForPdf {
  label: string;
  form: MortgageFormState;
  summary: MortgageSummary;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildPdfExportData(
  form: MortgageFormState,
  summary: MortgageSummary,
): PdfExportData {
  const now = new Date();
  const generatedAt =
    formatDateID(now) +
    ', ' +
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return {
    generatedAt,
    loanInfo: buildLoanInfo(form, summary),
    interestRows: buildInterestRows(summary),
    financialRows: buildFinancialRows(summary),
    scheduleRows: buildScheduleRows(summary),
    totalRow: buildTotalRow(summary),
  };
}

export async function exportToPdf(
  form: MortgageFormState,
  summary: MortgageSummary,
): Promise<void> {
  const data = buildPdfExportData(form, summary);
  const doc = renderPdf(data);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  doc.save(`SimulasiKPR_${dateStr}_${hh}${mm}.pdf`);
}

export async function exportMultiScenarioPdf(scenarios: ScenarioForPdf[]): Promise<void> {
  const data = buildMultiScenarioExportData(scenarios);
  const doc = renderMultiScenarioPdf(data);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  doc.save(`PerbandinganKPR_${dateStr}_${hh}${mm}.pdf`);
}

function buildMultiScenarioExportData(scenarios: ScenarioForPdf[]): PdfMultiScenarioExportData {
  const now = new Date();
  const generatedAt =
    formatDateID(now) +
    ', ' +
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const scenarioData: PdfExportData[] = scenarios.map((s) => ({
    ...buildPdfExportData(s.form, s.summary),
    generatedAt, // uniform timestamp across all pages
    label: s.label,
  }));

  return {
    generatedAt,
    columnLabels: scenarios.map((s) => s.label),
    comparisonRows: buildComparisonRows(scenarios),
    scenarios: scenarioData,
  };
}

function buildComparisonRows(scenarios: ScenarioForPdf[]): PdfComparisonRow[] {
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

  return [
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
