import type { ScenarioForCsv } from './csvTypes';
import type { MortgageSummary } from '../../domain/models/amortization.types';
import type { AffordabilityExportData } from '../pdf/exportService';

// ─── CSV primitives ─────────────────────────────────────────────────────────

/**
 * Quotes a cell only when it contains a comma, double-quote, or newline, and
 * doubles any internal double-quotes — per RFC 4180. Numbers pass through as
 * their plain string form so spreadsheets treat them as numeric.
 */
export function escapeCsv(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toRow(cells: (string | number)[]): string {
  return cells.map(escapeCsv).join(',');
}

const round = (n: number) => Math.round(n);

// ─── Mode-aware terminology ───────────────────────────────────────────────────

function isSyariah(s: MortgageSummary): boolean {
  return s.financingMode === 'syariah';
}

function modeLabel(s: MortgageSummary): string {
  if (!isSyariah(s)) return 'Konvensional';
  return 'Syariah';
}

function akadLabel(s: MortgageSummary): string {
  if (!isSyariah(s)) return '-';
  return s.syariahAkadType === 'murabahah' ? 'Murabahah' : 'MMQ';
}

/** Per-scenario label for the interest/margin/ujrah concept. */
function returnTermFor(s: MortgageSummary): string {
  if (!isSyariah(s)) return 'Bunga';
  return s.syariahAkadType === 'murabahah' ? 'Margin' : 'Ujrah';
}

/**
 * Column header for the "cost of financing" across a set of scenarios. When all
 * scenarios share one mode the precise term is used (Bunga / Margin / Ujrah);
 * a mixed set falls back to the combined label so no row is mislabeled.
 */
export function combinedReturnTerm(scenarios: ScenarioForCsv[]): string {
  const terms = new Set(scenarios.map((s) => returnTermFor(s.summary)));
  if (terms.size === 1) return [...terms][0];
  return 'Bunga/Margin/Ujrah';
}

// ─── Section builders ─────────────────────────────────────────────────────────

function summarySection(
  scenarios: ScenarioForCsv[],
  affordability: AffordabilityExportData | undefined,
): string[] {
  const term = combinedReturnTerm(scenarios);
  const hasAffordability =
    affordability !== undefined && affordability.results.length === scenarios.length;

  const header = [
    'Skenario',
    'Mode Pembiayaan',
    'Akad',
    'Harga Properti',
    'Uang Muka',
    'Nilai Pembiayaan/Pokok',
    'Cicilan Bulanan',
    `Total ${term}`,
    'Total Pembayaran',
    'Total Dana Awal',
    'Tenor Efektif (Bulan)',
  ];
  if (hasAffordability) header.push('Risiko Kemampuan Bayar');

  const bandLabel = (band: string) =>
    band === 'safe' ? 'Aman' : band === 'watch' ? 'Waspada' : 'Berisiko';

  const lines = ['Ringkasan Skenario', toRow(header)];

  scenarios.forEach((s, i) => {
    const sum = s.summary;
    const propertyPrice = sum.totalPrincipal + sum.downPayment;
    const monthlyInstallment = sum.installmentGroups[0]?.installmentAmount ?? 0;
    const cells: (string | number)[] = [
      s.label,
      modeLabel(sum),
      akadLabel(sum),
      round(propertyPrice),
      round(sum.downPayment),
      round(sum.totalPrincipal),
      round(monthlyInstallment),
      round(sum.totalInterest),
      round(sum.totalPayment),
      round(sum.totalUpfrontCost),
      sum.effectiveTenorMonths,
    ];
    if (hasAffordability) {
      cells.push(bandLabel(affordability!.results[i].riskBand));
    }
    lines.push(toRow(cells));
  });

  return lines;
}

function scheduleSection(scenarios: ScenarioForCsv[]): string[] {
  const term = combinedReturnTerm(scenarios);
  const header = [
    'Skenario',
    'Bulan',
    'Tanggal',
    'Saldo Awal',
    'Pokok',
    term,
    'Cicilan',
    'Extra',
    'Saldo Akhir',
  ];

  const lines = ['Jadwal Amortisasi', toRow(header)];

  for (const s of scenarios) {
    for (const r of s.summary.schedule) {
      const date = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date);
      lines.push(
        toRow([
          s.label,
          r.month,
          date,
          round(r.openingBalance),
          round(r.principal),
          round(r.interest ?? 0),
          round(r.installment),
          round(r.extraPayment ?? 0),
          round(r.closingBalance),
        ]),
      );
    }
  }

  return lines;
}

// ─── Public API ─────────────────────────────────────────────────────────────

function makeDateTag(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

const BOM = '﻿';

/**
 * Builds the raw CSV text (including the leading UTF-8 BOM) covering 1–3
 * scenarios in two sections: a scenario summary and the full amortization
 * schedule. Exposed separately from the blob wrapper so it can be asserted on
 * directly in tests without relying on Blob.text().
 */
export function buildScenarioCsvString(
  scenarios: ScenarioForCsv[],
  affordability?: AffordabilityExportData,
): string {
  const lines = [
    ...summarySection(scenarios, affordability),
    '',
    ...scheduleSection(scenarios),
  ];
  return BOM + lines.join('\r\n');
}

/** Filename for a scenario CSV export, e.g. `PerbandinganKPR_2026-06-01.csv`. */
export function csvFilename(scenarioCount: number): string {
  const prefix = scenarioCount > 1 ? 'PerbandinganKPR' : 'SimulasiKPR';
  return `${prefix}_${makeDateTag()}.csv`;
}

/**
 * Builds a UTF-8-BOM CSV blob covering 1–3 scenarios. The leading BOM (0xFEFF)
 * makes Excel open Indonesian text without an encoding prompt.
 */
export function buildScenarioCsvBlob(
  scenarios: ScenarioForCsv[],
  affordability?: AffordabilityExportData,
): { blob: Blob; filename: string } {
  const csv = buildScenarioCsvString(scenarios, affordability);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  return { blob, filename: csvFilename(scenarios.length) };
}
