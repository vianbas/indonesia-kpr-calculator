/**
 * pdfRenderer.ts — jsPDF adapter.
 *
 * Library choice: jsPDF + jspdf-autotable
 *
 * TRADE-OFFS vs alternatives:
 *
 *  jsPDF + jspdf-autotable (chosen)
 *    + Runs entirely in the browser — no server required
 *    + Excellent table support with auto-pagination (critical for 360-row schedules)
 *    + Small footprint: ~130 KB gzip total
 *    + Proven in production banking/fintech apps
 *    − Limited CSS: layout done via coordinate math, not HTML/CSS
 *    − No rich typography or vector graphics
 *
 *  @react-pdf/renderer
 *    + Familiar React component mental model
 *    + Better typography control (custom fonts, proper text flow)
 *    − ~290 KB gzip — roughly 2× larger bundle
 *    − Requires a separate render tree; can't mix with DOM components
 *    − Table pagination must be implemented manually
 *
 *  html2canvas + jsPDF (screenshot approach)
 *    + Renders exact HTML/CSS appearance
 *    − Rasterized output: poor text quality, large file size
 *    − Accessibility: text is pixels, not selectable/searchable
 *    − Fragile: layout depends on window size and CSS at capture time
 *
 *  Puppeteer / Playwright (headless browser)
 *    + Perfect fidelity to web UI
 *    − Server-side only — requires infrastructure
 *    − Heavyweight dependency for a simple customer document
 *
 * This file is the only place that imports jsPDF. Swapping to another renderer
 * means replacing this file while leaving pdfTypes.ts and exportService.ts intact.
 */

import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CellHookData, Color, RowInput } from 'jspdf-autotable';
import type {
  PdfExportData,
  PdfScheduleRow,
  PdfMultiScenarioExportData,
  PdfAffordabilitySection,
  PdfRefinancingSection,
} from './pdfTypes';

// ─── Type helpers ─────────────────────────────────────────────────────────────

// jspdf-autotable stores table metadata on the doc object after each call.
type DocWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY?: number };
};

function getLastTableY(doc: DocWithAutoTable, fallback: number): number {
  return doc.lastAutoTable?.finalY ?? fallback;
}

// ─── Design constants ─────────────────────────────────────────────────────────

const M = 14; // page margin (mm)
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - M * 2;
const FOOTER_Y = 289;

// Colors (RGB tuples — match the web UI palette)
const C: Record<string, Color> = {
  blueDark:   [30,  64,  175],  // blue-800
  blue:       [37,  99,  235],  // blue-600
  blueMid:    [59,  130, 246],  // blue-500
  blueLight:  [219, 234, 254],  // blue-100
  blueBg:     [239, 246, 255],  // blue-50
  indigoDark: [67,  56,  202],  // indigo-700
  indigoBg:   [238, 242, 255],  // indigo-50
  white:      [255, 255, 255],
  black:      [17,  24,  39],   // gray-900
  gray:       [107, 114, 128],  // gray-500
  grayLight:  [243, 244, 246],  // gray-100
  grayBg:     [249, 250, 251],  // gray-50
  orange:     [194, 65,  12],   // orange-700
  green:      [21,  128, 61],   // green-700
};

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Renders a multi-scenario comparison PDF.
 * Page 1: comparison overview table.
 * Subsequent pages: full individual sections (A–D) per scenario.
 */
export function renderMultiScenarioPdf(data: PdfMultiScenarioExportData): jsPDF {
  const doc: DocWithAutoTable = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // ── Overview: document header + comparison table ──────────────────────────
  let y = renderDocumentHeader(doc, data.generatedAt);
  y = renderSectionTitle(doc, 'PERBANDINGAN SKENARIO', y);
  renderComparisonTable(doc, y, data);

  // ── Individual scenario sections ──────────────────────────────────────────
  for (const scenario of data.scenarios) {
    doc.addPage();
    let sy = renderScenarioPageHeader(doc, scenario.label ?? '', scenario.generatedAt);
    sy = renderLoanInfoSection(doc, sy, scenario);
    sy = renderInterestSchemeSection(doc, sy, scenario);
    sy = renderFinancialSummarySection(doc, sy, scenario);
    if (scenario.affordability) {
      sy = renderAffordabilitySection(doc, sy, scenario.affordability);
    }
    if (scenario.refinancing) {
      sy = renderRefinancingSection(doc, sy, scenario.refinancing);
    }
    renderAmortizationSection(doc, sy, scenario);
  }

  renderPageNumbers(doc);
  return doc;
}

/** Renders all sections and returns the jsPDF document ready to save. */
export function renderPdf(data: PdfExportData): jsPDF {
  const doc: DocWithAutoTable = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let y = renderDocumentHeader(doc, data.generatedAt);
  y = renderLoanInfoSection(doc, y, data);
  y = renderInterestSchemeSection(doc, y, data);
  y = renderFinancialSummarySection(doc, y, data);
  if (data.affordability) {
    y = renderAffordabilitySection(doc, y, data.affordability);
  }
  if (data.refinancing) {
    y = renderRefinancingSection(doc, y, data.refinancing);
  }
  renderAmortizationSection(doc, y, data);
  renderPageNumbers(doc);

  return doc;
}

// ─── Section A: document header ──────────────────────────────────────────────

function renderDocumentHeader(doc: DocWithAutoTable, generatedAt: string): number {
  // Dark blue banner
  doc.setFillColor(...(C.blueDark as [number, number, number]));
  doc.rect(0, 0, PAGE_W, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...(C.white as [number, number, number]));
  doc.text('SIMULASI KREDIT PEMILIKAN RUMAH (KPR)', M, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(186, 210, 254); // blue-200
  doc.text('Dokumen bersifat estimasi — bukan penawaran kredit resmi dari lembaga keuangan mana pun.', M, 17.5);

  doc.setFontSize(7);
  doc.text(`Dibuat: ${generatedAt}`, PAGE_W - M, 22.5, { align: 'right' });

  return 32;
}

// ─── Section A: Loan info ─────────────────────────────────────────────────────

function renderLoanInfoSection(doc: DocWithAutoTable, y: number, data: PdfExportData): number {
  y = renderSectionTitle(doc, 'A.  INFORMASI KREDIT', y);

  const { loanInfo } = data;
  const rows: [string, string][] = [
    ['Harga Properti',       loanInfo.propertyPriceDisplay],
    ['Uang Muka',            loanInfo.downPaymentDisplay],
    ['Nilai Kredit (KPR)',   loanInfo.principalDisplay],
    ['Jangka Waktu',         loanInfo.tenorDisplay],
    ['Skema Bunga',          loanInfo.calculationMethodDisplay],
    ['Metode Bayar',         loanInfo.paymentMethodDisplay],
    ['Tanggal Pencairan',    loanInfo.startDateDisplay],
  ];
  if (loanInfo.adminFeeDisplay) {
    rows.push(['Biaya Administrasi', loanInfo.adminFeeDisplay]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [],
    body: rows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2.8, bottom: 2.8, left: 3.5, right: 3.5 } },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', fillColor: C.grayBg as Color, textColor: C.black as Color },
      1: { textColor: C.black as Color },
    },
    didParseCell: (d: CellHookData) => {
      // Highlight the principal row
      if (d.section === 'body' && d.row.index === 2) {
        d.cell.styles.fillColor = C.blueLight as Color;
        d.cell.styles.textColor = C.blueDark as Color;
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });

  return getLastTableY(doc, y) + 7;
}

// ─── Section B: Interest scheme ───────────────────────────────────────────────

function renderInterestSchemeSection(doc: DocWithAutoTable, y: number, data: PdfExportData): number {
  y = ensureSpace(doc, y, 50);
  y = renderSectionTitle(doc, 'B.  SKEMA SUKU BUNGA', y);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [['Periode', 'Jenis', 'Suku Bunga (p.a.)', 'Cicilan / Bulan']],
    body: data.interestRows.map((r) => [r.periodDisplay, r.typeDisplay, r.rateDisplay, r.installmentDisplay]),
    styles: { fontSize: 8.5, cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 } },
    headStyles: { fillColor: C.blue as Color, textColor: C.white as Color, fontStyle: 'bold', halign: 'center', fontSize: 8 },
    alternateRowStyles: { fillColor: C.grayBg as Color },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 42, halign: 'center' },
      3: { cellWidth: CONTENT_W - 38 - 30 - 42, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const typeVal = data.interestRows[d.row.index]?.typeDisplay;
      if (d.column.index === 1) {
        d.cell.styles.textColor = typeVal === 'Tetap' ? (C.blueDark as Color) : (C.indigoDark as Color);
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });

  return getLastTableY(doc, y) + 7;
}

// ─── Section C: Financial summary ─────────────────────────────────────────────

function renderFinancialSummarySection(doc: DocWithAutoTable, y: number, data: PdfExportData): number {
  y = ensureSpace(doc, y, 60);
  y = renderSectionTitle(doc, 'C.  RINGKASAN PEMBAYARAN', y);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [],
    body: data.financialRows.map((r) => [r.label, r.value]),
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3.5, right: 3.5 } },
    columnStyles: {
      0: { cellWidth: 78, fontStyle: 'bold', fillColor: C.grayBg as Color, textColor: C.black as Color },
      1: { halign: 'right', fontStyle: 'bold', textColor: C.black as Color },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body' || d.column.index !== 1) return;
      const hint = data.financialRows[d.row.index]?.hint;
      if (hint === 'interest') d.cell.styles.textColor = C.orange as Color;
      if (hint === 'paid')     d.cell.styles.textColor = C.green  as Color;
    },
  });

  return getLastTableY(doc, y) + 7;
}

// ─── Section D: Affordability analysis ───────────────────────────────────────

function renderAffordabilitySection(
  doc: DocWithAutoTable,
  y: number,
  af: PdfAffordabilitySection,
): number {
  y = ensureSpace(doc, y, 60);
  y = renderSectionTitle(doc, 'D.  ANALISIS KEMAMPUAN BAYAR', y);

  // ── Input summary (compact 2-column) ──────────────────────────────────────
  const inputRows: [string, string][] = [
    ['Penghasilan Total', af.totalIncome],
    ['Hutang / Cicilan Lain', af.existingDebt],
    ['Pengeluaran Hidup', af.livingExpense],
    ['Batas DSR', af.maxDsr],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [],
    body: inputRows,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: { top: 2.4, bottom: 2.4, left: 3.5, right: 3.5 } },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', fillColor: C.grayBg as Color, textColor: C.gray as Color },
      1: { textColor: C.black as Color },
    },
  });
  y = getLastTableY(doc, y) + 4;

  // ── Results (2-column) ────────────────────────────────────────────────────
  const bandFill: Color =
    af.riskBandType === 'safe'
      ? [220, 252, 231]
      : af.riskBandType === 'watch'
        ? [254, 249, 195]
        : [254, 226, 226];
  const bandText: Color =
    af.riskBandType === 'safe'
      ? [22, 101, 52]
      : af.riskBandType === 'watch'
        ? [133, 77, 14]
        : [153, 27, 27];

  const resultRows: [string, string][] = [
    ['DSR Saat Ini', af.dsrNow],
    ['DSR Tertinggi', af.dsrAtHighest],
    ['Surplus Terendah', af.netSurplusAtHighest],
    ['Maks. Kredit Terjangkau', af.maxAffordableLoan],
    ['Min. Penghasilan Disarankan', af.minRecommendedIncome],
    ['Status Risiko', af.riskBand],
  ];

  const dsrHighestIdx = 1;
  const surplusIdx = 2;
  const bandIdx = 5;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [],
    body: resultRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2.8, bottom: 2.8, left: 3.5, right: 3.5 } },
    columnStyles: {
      0: { cellWidth: 68, fontStyle: 'bold', fillColor: C.grayBg as Color, textColor: C.black as Color },
      1: { fontStyle: 'bold', textColor: C.black as Color },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body' || d.column.index !== 1) return;
      if (d.row.index === dsrHighestIdx && af.dsrAtHighestOverLimit) {
        d.cell.styles.textColor = C.orange as Color;
      }
      if (d.row.index === surplusIdx && af.surplusNegative) {
        d.cell.styles.textColor = C.orange as Color;
      }
      if (d.row.index === bandIdx) {
        d.cell.styles.fillColor = bandFill;
        d.cell.styles.textColor = bandText;
      }
    },
  });
  y = getLastTableY(doc, y) + 4;

  // ── Stress test table ─────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 38);

  const stressHead = [['Skenario', 'Cicilan', 'DSR', 'Surplus', 'Status']];
  const stressBody = af.stressRows.map((r) => [
    r.scenario,
    r.installment,
    r.dsr,
    r.netSurplus,
    r.band,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: stressHead,
    body: stressBody,
    styles: { fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    headStyles: {
      fillColor: C.indigoDark as Color,
      textColor: C.white as Color,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: C.grayBg as Color },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'right' as const },
      2: { cellWidth: 22, halign: 'center' as const },
      3: { cellWidth: CONTENT_W - 30 - 40 - 22 - 24, halign: 'right' as const },
      4: { cellWidth: 24, halign: 'center' as const, fontStyle: 'bold' },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const row = af.stressRows[d.row.index];
      if (!row) return;
      if (d.column.index === 2 && row.dsrOverLimit) {
        d.cell.styles.textColor = C.orange as Color;
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.column.index === 3 && row.surplusNegative) {
        d.cell.styles.textColor = C.orange as Color;
      }
      if (d.column.index === 4) {
        if (row.bandType === 'safe') {
          d.cell.styles.fillColor = [220, 252, 231] as Color;
          d.cell.styles.textColor = [22, 101, 52] as Color;
        } else if (row.bandType === 'watch') {
          d.cell.styles.fillColor = [254, 249, 195] as Color;
          d.cell.styles.textColor = [133, 77, 14] as Color;
        } else {
          d.cell.styles.fillColor = [254, 226, 226] as Color;
          d.cell.styles.textColor = [153, 27, 27] as Color;
        }
      }
    },
  });

  return getLastTableY(doc, y) + 7;
}

// ─── Section E: Refinancing analysis ─────────────────────────────────────────

function renderRefinancingSection(
  doc: DocWithAutoTable,
  y: number,
  rf: PdfRefinancingSection,
): number {
  y = ensureSpace(doc, y, 60);

  const sectionLetter = 'E';
  y = renderSectionTitle(doc, `${sectionLetter}.  ANALISIS REFINANCING`, y);

  // ── Input summary ─────────────────────────────────────────────────────────
  const inputRows: [string, string][] = [
    ['Sisa Pokok Hutang',  rf.remainingBalance],
    ['Suku Bunga Saat Ini', rf.currentRate],
    ['Sisa Tenor',         rf.remainingMonths],
    ['Suku Bunga Baru',    rf.newRate],
    ['Tenor Baru',         rf.newTenorMonths],
    ['Total Biaya Pindah', rf.totalSwitchingCost],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [],
    body: inputRows,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: { top: 2.4, bottom: 2.4, left: 3.5, right: 3.5 } },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', fillColor: C.grayBg as Color, textColor: C.gray as Color },
      1: { textColor: C.black as Color },
    },
  });
  y = getLastTableY(doc, y) + 4;

  // ── Results ───────────────────────────────────────────────────────────────
  const recFill: Color =
    rf.recommendationType === 'worth_it'
      ? [220, 252, 231]
      : rf.recommendationType === 'marginal'
        ? [254, 249, 195]
        : [254, 226, 226];
  const recText: Color =
    rf.recommendationType === 'worth_it'
      ? [22, 101, 52]
      : rf.recommendationType === 'marginal'
        ? [133, 77, 14]
        : [153, 27, 27];

  const monthlySavingsLabel = rf.savingsNegative
    ? `Naik ${rf.monthlySavings}/bln`
    : `Hemat ${rf.monthlySavings}/bln`;

  const resultRows: [string, string][] = [
    ['Cicilan Saat Ini',       rf.currentMonthlyPayment],
    ['Cicilan Baru',           rf.newMonthlyPayment],
    ['Selisih Cicilan',        monthlySavingsLabel],
    ['Penghematan Bunga',      rf.totalInterestSavings],
    ['Penghematan Bersih',     rf.netSavings],
    ['Break-Even',             rf.breakEvenMonths],
    ['Rekomendasi',            rf.recommendation],
  ];

  const newPaymentIdx = 1;
  const savingsIdx = 2;
  const netSavingsIdx = 4;
  const recIdx = 6;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [],
    body: resultRows,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 2.8, bottom: 2.8, left: 3.5, right: 3.5 } },
    columnStyles: {
      0: { cellWidth: 68, fontStyle: 'bold', fillColor: C.grayBg as Color, textColor: C.black as Color },
      1: { fontStyle: 'bold', textColor: C.black as Color },
    },
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body' || d.column.index !== 1) return;
      if (d.row.index === newPaymentIdx && !rf.savingsNegative) {
        d.cell.styles.textColor = C.green as Color;
      }
      if (d.row.index === savingsIdx) {
        d.cell.styles.textColor = rf.savingsNegative ? (C.orange as Color) : (C.green as Color);
      }
      if (d.row.index === netSavingsIdx) {
        d.cell.styles.textColor = rf.netSavingsNegative ? (C.orange as Color) : (C.green as Color);
      }
      if (d.row.index === recIdx) {
        d.cell.styles.fillColor = recFill;
        d.cell.styles.textColor = recText;
      }
    },
  });

  return getLastTableY(doc, y) + 7;
}

// ─── Section F: Amortization schedule ────────────────────────────────────────

function renderAmortizationSection(doc: DocWithAutoTable, y: number, data: PdfExportData): void {
  y = ensureSpace(doc, y, 45);
  const amortLetter = data.refinancing ? 'F' : 'E';
  y = renderSectionTitle(doc, `${amortLetter}.  JADWAL ANGSURAN (AMORTISASI)`, y);

  const { hasExtraPayment } = data;
  const numCols = hasExtraPayment ? 8 : 7;

  // Build body — separator rows use colSpan so text spans the full row width
  const body = buildAmortizationBody(data.scheduleRows, numCols);
  const separatorSet = buildSeparatorIndexSet(data.scheduleRows);

  const { totalRow } = data;
  const foot: RowInput[] = hasExtraPayment
    ? [[
        { content: totalRow.label,       colSpan: 3, styles: { halign: 'left'  as const, fontStyle: 'bold' as const } },
        { content: totalRow.installment,             styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
        { content: totalRow.principal,               styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: C.blue } },
        { content: totalRow.interest,                styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: C.orange } },
        { content: totalRow.finalBalance,            styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: C.green } },
        { content: '',                               styles: { halign: 'right' as const } },
      ]]
    : [[
        { content: totalRow.label,       colSpan: 3, styles: { halign: 'left'  as const, fontStyle: 'bold' as const } },
        { content: totalRow.installment,             styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
        { content: totalRow.principal,               styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: C.blue } },
        { content: totalRow.interest,                styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: C.orange } },
        { content: totalRow.finalBalance,            styles: { halign: 'right' as const, fontStyle: 'bold' as const, textColor: C.green } },
      ]];

  // Column widths: 7-col = 12+11+22+31+30+29+rem; 8-col splits remainder with extra column
  const rem7 = CONTENT_W - 12 - 11 - 22 - 31 - 30 - 29;
  const extraW = 24;
  const rem8 = rem7 - extraW;

  const colStyles7 = {
    0: { halign: 'center' as const, cellWidth: 12 },
    1: { halign: 'center' as const, cellWidth: 11 },
    2: { halign: 'center' as const, cellWidth: 22 },
    3: { halign: 'right'  as const, cellWidth: 31 },
    4: { halign: 'right'  as const, cellWidth: 30 },
    5: { halign: 'right'  as const, cellWidth: 29 },
    6: { halign: 'right'  as const, cellWidth: rem7 },
  };
  const colStyles8 = {
    ...colStyles7,
    6: { halign: 'right' as const, cellWidth: rem8 },
    7: { halign: 'right' as const, cellWidth: extraW },
  };

  const head7 = [['Bln', 'Thn', 'Suku Bunga', 'Cicilan', 'Pokok', 'Bunga', 'Saldo Akhir']];
  const head8 = [['Bln', 'Thn', 'Suku Bunga', 'Cicilan', 'Pokok', 'Bunga', 'Saldo Akhir', 'Ekstra']];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: hasExtraPayment ? head8 : head7,
    body,
    foot,
    showHead: 'everyPage',
    showFoot: 'lastPage',
    styles: {
      fontSize: 7,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.blue as Color,
      textColor: C.white as Color,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: C.blueLight as Color,
      textColor: C.blueDark as Color,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: C.grayBg as Color },
    columnStyles: hasExtraPayment ? colStyles8 : colStyles7,
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const idx = d.row.index;

      if (separatorSet.has(idx)) {
        d.cell.styles.fillColor = C.indigoBg as Color;
        d.cell.styles.textColor = C.indigoDark as Color;
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.fontSize = 6.8;
      } else {
        if (d.column.index === 4) d.cell.styles.textColor = C.blue as Color;    // Pokok
        if (d.column.index === 5) d.cell.styles.textColor = C.orange as Color;  // Bunga
        if (hasExtraPayment && d.column.index === 7) {                          // Ekstra
          d.cell.styles.textColor = [13, 148, 136] as Color;
        }
        const nonSepIndices = [...Array(body.length).keys()].filter(i => !separatorSet.has(i));
        const lastDataIdx = nonSepIndices[nonSepIndices.length - 1];
        if (idx === lastDataIdx) d.cell.styles.fillColor = [220, 252, 231] as Color;
      }
    },
  });
}

// ─── Multi-scenario helpers ───────────────────────────────────────────────────

/** Page header for individual scenario pages within a multi-scenario PDF. */
function renderScenarioPageHeader(
  doc: DocWithAutoTable,
  label: string,
  generatedAt: string,
): number {
  doc.setFillColor(...(C.blueDark as [number, number, number]));
  doc.rect(0, 0, PAGE_W, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...(C.white as [number, number, number]));
  doc.text(`SIMULASI KPR — ${label.toUpperCase()}`, M, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(186, 210, 254); // blue-200
  doc.text(
    'Dokumen bersifat estimasi — bukan penawaran kredit resmi dari lembaga keuangan mana pun.',
    M,
    17.5,
  );

  doc.setFontSize(7);
  doc.text(`Dibuat: ${generatedAt}`, PAGE_W - M, 22.5, { align: 'right' });

  return 32;
}

/** Renders the side-by-side comparison autotable. */
function renderComparisonTable(
  doc: DocWithAutoTable,
  y: number,
  data: PdfMultiScenarioExportData,
): number {
  const nCols = data.columnLabels.length;
  const labelW = 52;
  const valueW = (CONTENT_W - labelW) / nCols;

  const bestFill: Color = [220, 252, 231];  // green-100
  const bestText: Color = [22, 101, 52];    // green-800
  const worstFill: Color = [254, 226, 226]; // red-100
  const worstText: Color = [153, 27, 27];   // red-800

  const dataRows = data.comparisonRows.filter((r) => !r.isSectionHeader);
  const sectionHeaderIndices = new Set<number>();
  let bodyIdx = 0;
  const bodyRows = data.comparisonRows.map((r) => {
    if (r.isSectionHeader) {
      sectionHeaderIndices.add(bodyIdx++);
      return [{ content: r.label, colSpan: nCols + 1, styles: { halign: 'left' as const } }];
    }
    bodyIdx++;
    return [r.label, ...r.cells.map((c) => c.value)];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    tableWidth: CONTENT_W,
    head: [['', ...data.columnLabels]],
    body: bodyRows,
    styles: { fontSize: 8.5, cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 } },
    headStyles: {
      fillColor: C.blue as Color,
      textColor: C.white as Color,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: C.grayBg as Color },
    columnStyles: {
      0: { cellWidth: labelW, fontStyle: 'bold', fillColor: C.grayBg as Color, textColor: C.black as Color },
      ...Object.fromEntries(
        Array.from({ length: nCols }, (_, i) => [
          i + 1,
          { cellWidth: valueW, halign: 'right' as const },
        ]),
      ),
    },
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const idx = d.row.index;

      if (sectionHeaderIndices.has(idx)) {
        d.cell.styles.fillColor = C.blueDark as Color;
        d.cell.styles.textColor = C.white as Color;
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.fontSize = 7.5;
        return;
      }

      if (d.column.index === 0) return;

      // Find corresponding data row for this body index
      let dataRowIndex = 0;
      let counted = 0;
      for (let i = 0; i <= idx; i++) {
        if (!sectionHeaderIndices.has(i)) {
          if (i === idx) dataRowIndex = counted;
          counted++;
        }
      }
      const row = dataRows[dataRowIndex];
      if (!row) return;
      const cell = row.cells[d.column.index - 1];
      if (!cell) return;

      if (cell.hint === 'best') {
        d.cell.styles.fillColor = bestFill;
        d.cell.styles.textColor = bestText;
        d.cell.styles.fontStyle = 'bold';
      } else if (cell.hint === 'worst') {
        d.cell.styles.fillColor = worstFill;
        d.cell.styles.textColor = worstText;
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });

  return getLastTableY(doc, y) + 7;
}

// ─── Page numbers ─────────────────────────────────────────────────────────────

function renderPageNumbers(doc: DocWithAutoTable): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    // Footer separator line
    doc.setDrawColor(...(C.gray as [number, number, number]));
    doc.setLineWidth(0.2);
    doc.line(M, FOOTER_Y - 2, PAGE_W - M, FOOTER_Y - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...(C.gray as [number, number, number]));
    doc.text(
      `Simulasi KPR  •  Halaman ${i} dari ${total}  •  Bukan penawaran kredit resmi`,
      PAGE_W / 2,
      FOOTER_Y + 1,
      { align: 'center' },
    );
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function renderSectionTitle(doc: DocWithAutoTable, title: string, y: number): number {
  const titleH = 7;
  doc.setFillColor(...(C.blueDark as [number, number, number]));
  doc.roundedRect(M, y, CONTENT_W, titleH, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...(C.white as [number, number, number]));
  doc.text(title, M + 3.5, y + 4.9);
  return y + titleH + 1.5;
}

/** If the remaining vertical space is less than `needed` mm, add a new page. */
function ensureSpace(doc: DocWithAutoTable, currentY: number, needed: number): number {
  if (currentY + needed > PAGE_H - 18) {
    doc.addPage();
    return 16;
  }
  return currentY;
}

/**
 * Builds the autoTable body array. Separator rows use colSpan to span all columns.
 */
function buildAmortizationBody(rows: PdfScheduleRow[], numCols: number): RowInput[] {
  return rows.map((row): RowInput => {
    if (row.isRateChange) {
      return [{ content: row.rateChangeLabel ?? '', colSpan: numCols, styles: { halign: 'left' as const } }];
    }
    const base = [row.month, row.year, row.rate, row.installment, row.principal, row.interest, row.balance];
    if (numCols === 8) base.push(row.extraPayment || '—');
    return base;
  });
}

/** Returns the set of body-array indices that are separator rows. */
function buildSeparatorIndexSet(rows: PdfScheduleRow[]): Set<number> {
  const set = new Set<number>();
  rows.forEach((row, i) => { if (row.isRateChange) set.add(i); });
  return set;
}
