export interface BankRateOption {
  id: string;
  /** Display label shown in the picker */
  label: string;
  /** Bank name, used for optgroup grouping */
  bank: string;
  /** Fixed rate as a percent string, e.g. "4.25" */
  fixedRate: string;
  /** Fixed period length in months, e.g. "24" */
  fixedDurationMonths: string;
  /** Floating / variable rate after the fixed period, e.g. "12.50" */
  floatingRate: string;
}

/**
 * Quarter these reference rates were last updated.
 * Display this to users so they know the data may be stale.
 */
export const BANK_RATES_AS_OF = 'Q4 2024';

/**
 * Illustrative KPR promo rates from major Indonesian banks.
 * These are reference figures only — actual rates vary by branch, product,
 * loan amount, and promotion period. Always verify with the bank directly.
 *
 * Source: publicly available promo rate tables from each bank's website.
 */
export const BANK_RATES: BankRateOption[] = [
  // ── BCA ─────────────────────────────────────────────────────────────────────
  {
    id: 'bca_1yr',
    bank: 'BCA',
    label: 'BCA — Fixed 1 yr @ 3.47% → 12.50%',
    fixedRate: '3.47',
    fixedDurationMonths: '12',
    floatingRate: '12.50',
  },
  {
    id: 'bca_2yr',
    bank: 'BCA',
    label: 'BCA — Fixed 2 yr @ 4.25% → 12.50%',
    fixedRate: '4.25',
    fixedDurationMonths: '24',
    floatingRate: '12.50',
  },
  {
    id: 'bca_3yr',
    bank: 'BCA',
    label: 'BCA — Fixed 3 yr @ 5.00% → 12.50%',
    fixedRate: '5.00',
    fixedDurationMonths: '36',
    floatingRate: '12.50',
  },

  // ── BRI ──────────────────────────────────────────────────────────────────────
  {
    id: 'bri_1yr',
    bank: 'BRI',
    label: 'BRI — Fixed 1 yr @ 3.97% → 12.00%',
    fixedRate: '3.97',
    fixedDurationMonths: '12',
    floatingRate: '12.00',
  },
  {
    id: 'bri_3yr',
    bank: 'BRI',
    label: 'BRI — Fixed 3 yr @ 5.25% → 12.00%',
    fixedRate: '5.25',
    fixedDurationMonths: '36',
    floatingRate: '12.00',
  },

  // ── Mandiri ───────────────────────────────────────────────────────────────────
  {
    id: 'mandiri_1yr',
    bank: 'Mandiri',
    label: 'Mandiri — Fixed 1 yr @ 2.85% → 12.50%',
    fixedRate: '2.85',
    fixedDurationMonths: '12',
    floatingRate: '12.50',
  },
  {
    id: 'mandiri_3yr',
    bank: 'Mandiri',
    label: 'Mandiri — Fixed 3 yr @ 4.65% → 12.50%',
    fixedRate: '4.65',
    fixedDurationMonths: '36',
    floatingRate: '12.50',
  },

  // ── BNI ───────────────────────────────────────────────────────────────────────
  {
    id: 'bni_1yr',
    bank: 'BNI',
    label: 'BNI — Fixed 1 yr @ 3.97% → 12.00%',
    fixedRate: '3.97',
    fixedDurationMonths: '12',
    floatingRate: '12.00',
  },
  {
    id: 'bni_3yr',
    bank: 'BNI',
    label: 'BNI — Fixed 3 yr @ 5.25% → 12.00%',
    fixedRate: '5.25',
    fixedDurationMonths: '36',
    floatingRate: '12.00',
  },

  // ── BTN ───────────────────────────────────────────────────────────────────────
  {
    id: 'btn_5yr',
    bank: 'BTN',
    label: 'BTN — Fixed 5 yr @ 6.50% → 13.00%',
    fixedRate: '6.50',
    fixedDurationMonths: '60',
    floatingRate: '13.00',
  },

  // ── CIMB Niaga ────────────────────────────────────────────────────────────────
  {
    id: 'cimb_3yr',
    bank: 'CIMB Niaga',
    label: 'CIMB Niaga — Fixed 3 yr @ 5.50% → 12.75%',
    fixedRate: '5.50',
    fixedDurationMonths: '36',
    floatingRate: '12.75',
  },

  // ── Permata ───────────────────────────────────────────────────────────────────
  {
    id: 'permata_2yr',
    bank: 'Permata',
    label: 'Permata — Fixed 2 yr @ 5.00% → 12.50%',
    fixedRate: '5.00',
    fixedDurationMonths: '24',
    floatingRate: '12.50',
  },
];
