// ─── Formatters ───────────────────────────────────────────────────────────────

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const idrPlainFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ─── Public functions ─────────────────────────────────────────────────────────

/** Full IDR currency: 500_000_000 → "Rp500.000.000" */
export function formatIDR(amount: number): string {
  return idrFormatter.format(amount);
}

/**
 * Compact IDR for summary cards — avoids long strings on small screens.
 *   1_500_000_000 → "Rp 1,5 M"
 *     500_000_000 → "Rp 500 Jt"
 *      50_000_000 → "Rp 50 Jt"
 *         500_000 → "Rp 500 Rb"
 */
export function formatIDRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (abs >= 1_000_000)     return `${sign}Rp ${(abs / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Jt`;
  if (abs >= 1_000)         return `${sign}Rp ${(abs / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Rb`;
  return formatIDR(amount);
}

/** Plain number with thousand separators (no "Rp" prefix): 1_500_000 → "1.500.000" */
export function formatNumber(amount: number): string {
  return idrPlainFormatter.format(amount);
}

/**
 * Format a decimal rate as a percentage string.
 *   0.075  → "7,50% p.a."  (with suffix)
 *   0.075  → "7,50%"       (without suffix)
 */
export function formatPercent(rate: number, decimalPlaces = 2, showSuffix = false): string {
  const pct = (rate * 100).toFixed(decimalPlaces).replace('.', ',');
  return showSuffix ? `${pct}% p.a.` : `${pct}%`;
}

/** Format a month count as a human-readable tenor: 36 → "3 Tahun", 38 → "3 Tahun 2 Bulan" */
export function formatTenor(months: number): string {
  if (months % 12 === 0) return `${months / 12} Tahun`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return years > 0 ? `${years} Tahun ${rem} Bulan` : `${rem} Bulan`;
}

/**
 * Derive the calendar year number from a 1-based month index.
 *   month 1–12  → Year 1
 *   month 13–24 → Year 2
 */
export function monthToYear(month: number): number {
  return Math.ceil(month / 12);
}
