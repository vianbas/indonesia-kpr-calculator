/**
 * Data contract for the PDF renderer.
 *
 * All values are pre-formatted strings so the renderer only handles layout —
 * no domain logic, no currency formatting. This allows swapping the renderer
 * (e.g. jsPDF → react-pdf) without touching the business layer.
 */

export interface PdfLoanInfo {
  propertyPriceDisplay: string;       // "Rp 500.000.000"
  downPaymentDisplay: string;         // "Rp 100.000.000 (20,0%)"
  principalDisplay: string;           // "Rp 400.000.000"
  tenorDisplay: string;               // "10 Tahun (120 Bulan)"
  calculationMethodDisplay: string;   // "Fixed + Floating Tunggal"
  paymentMethodDisplay: string;       // "Anuitas (Cicilan Tetap per Periode)"
  startDateDisplay: string;           // "1 Januari 2024"
  adminFeeDisplay: string | null;     // null when not applicable
}

export interface PdfInterestRow {
  periodDisplay: string;      // "Bulan 1–24"
  typeDisplay: string;        // "Tetap" | "Variabel"
  rateDisplay: string;        // "7,50% p.a."
  installmentDisplay: string; // "Rp 4.382.450"
}

export interface PdfFinancialRow {
  label: string;
  value: string;
  /** Optional semantic hint for renderer-level color coding */
  hint?: 'interest' | 'paid' | 'normal';
}

/**
 * One row in the amortization table.
 * When isRateChange is true the row is a visual separator; data fields are empty.
 */
export interface PdfScheduleRow {
  month: string;
  year: string;
  rate: string;
  installment: string;
  principal: string;
  interest: string;
  balance: string;
  /** Formatted extra payment; empty string when none */
  extraPayment: string;
  isRateChange: boolean;
  /** Only populated when isRateChange is true */
  rateChangeLabel?: string;
}

export interface PdfTotalRow {
  label: string;
  installment: string;
  principal: string;
  interest: string;
  finalBalance: string;
}

/** Top-level data bag passed from exportService → pdfRenderer */
export interface PdfExportData {
  generatedAt: string;
  /** Set when this is part of a multi-scenario export, e.g. "Skenario 1" */
  label?: string;
  loanInfo: PdfLoanInfo;
  interestRows: PdfInterestRow[];
  financialRows: PdfFinancialRow[];
  scheduleRows: PdfScheduleRow[];
  totalRow: PdfTotalRow;
  /** True when any schedule row has an extra payment — drives the 8-column amortization table */
  hasExtraPayment: boolean;
}

// ─── Multi-scenario types ─────────────────────────────────────────────────────

export interface PdfComparisonCell {
  value: string;
  hint: 'best' | 'worst' | 'normal';
}

export interface PdfComparisonRow {
  label: string;
  cells: PdfComparisonCell[];
  isSectionHeader?: boolean;
}

export interface PdfMultiScenarioExportData {
  generatedAt: string;
  /** Display labels for each scenario column, e.g. ["Skenario 1", "Skenario 2"] */
  columnLabels: string[];
  comparisonRows: PdfComparisonRow[];
  /** Full individual data for each scenario (sections A–D) */
  scenarios: PdfExportData[];
}
