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
export const BANK_RATES_AS_OF = 'Q3 2026';

/**
 * Illustrative KPR promo rates from major Indonesian banks.
 * These are reference figures only — actual rates vary by branch, product,
 * loan amount, and promotion period. Always verify with the bank directly.
 *
 * Source: publicly available promo rate tables from each bank's website
 * (refreshed 2026-08-13, see issue #118). Post-fixed floating/"counter" rates
 * are rarely published alongside the promo teaser rate, so where a bank did
 * not disclose an exact figure the floating rate below is a best estimate
 * from the published range (flagged per entry). Fixed-period promos in 2026
 * skew toward multi-tier "berjenjang" schedules that this two-number model
 * can't represent exactly — each entry picks the schedule's blended/entry
 * rate, not every step.
 */
export const BANK_RATES: BankRateOption[] = [
  // ── BCA ─────────────────────────────────────────────────────────────────────
  // Fixed: rumahsaya.bca.co.id "Bunga Spesial" (official, promo through 2026-08-20).
  // Floating: ~11% p.a., reviewed every 6 months (industry comparison sources).
  {
    id: 'bca_1yr',
    bank: 'BCA',
    label: 'BCA — Fixed 1 yr @ 2.49% → 11.00%',
    fixedRate: '2.49',
    fixedDurationMonths: '12',
    floatingRate: '11.00',
  },
  {
    id: 'bca_2yr',
    bank: 'BCA',
    label: 'BCA — Fixed 2 yr @ 2.90% → 11.00%',
    fixedRate: '2.90',
    fixedDurationMonths: '24',
    floatingRate: '11.00',
  },
  {
    id: 'bca_3yr',
    bank: 'BCA',
    label: 'BCA — Fixed 3 yr @ 4.50% → 11.00%',
    fixedRate: '4.50',
    fixedDurationMonths: '36',
    floatingRate: '11.00',
  },

  // ── BRI ──────────────────────────────────────────────────────────────────────
  // Fixed: bri.co.id official promo (KPR Consumer Expo 2026). Floating: counter
  // rate not disclosed on the promo page; multiple sources put it at 11–13%.
  {
    id: 'bri_1yr',
    bank: 'BRI',
    label: 'BRI — Fixed 1 yr @ 1.75% → 12.00%',
    fixedRate: '1.75',
    fixedDurationMonths: '12',
    floatingRate: '12.00',
  },
  {
    id: 'bri_3yr',
    bank: 'BRI',
    label: 'BRI — Fixed 3 yr @ 2.65% → 12.00%',
    fixedRate: '2.65',
    fixedDurationMonths: '36',
    floatingRate: '12.00',
  },

  // ── Mandiri ───────────────────────────────────────────────────────────────────
  // Fixed: bankmandiri.co.id HUT ke-26 promo (1 yr) + independent aggregator (3 yr).
  // Floating: 13.00% p.a. — stated directly on bankmandiri.co.id's own
  // "Penyesuaian Suku Bunga KPR" page.
  {
    id: 'mandiri_1yr',
    bank: 'Mandiri',
    label: 'Mandiri — Fixed 1 yr @ 2.70% → 13.00%',
    fixedRate: '2.70',
    fixedDurationMonths: '12',
    floatingRate: '13.00',
  },
  {
    id: 'mandiri_3yr',
    bank: 'Mandiri',
    label: 'Mandiri — Fixed 3 yr @ 4.65% → 13.00%',
    fixedRate: '4.65',
    fixedDurationMonths: '36',
    floatingRate: '13.00',
  },

  // ── BNI ───────────────────────────────────────────────────────────────────────
  // Fixed: bniexperience.bni.co.id official promo (1 yr) + independent aggregator
  // (3 yr). Floating: BNI's own customer-service statement caps it at 13.5%;
  // 13.00% used as a representative point within the disclosed range.
  {
    id: 'bni_1yr',
    bank: 'BNI',
    label: 'BNI — Fixed 1 yr @ 2.75% → 13.00%',
    fixedRate: '2.75',
    fixedDurationMonths: '12',
    floatingRate: '13.00',
  },
  {
    id: 'bni_3yr',
    bank: 'BNI',
    label: 'BNI — Fixed 3 yr @ 5.25% → 13.00%',
    fixedRate: '5.25',
    fixedDurationMonths: '36',
    floatingRate: '13.00',
  },

  // ── BTN ───────────────────────────────────────────────────────────────────────
  // Both figures from btn.co.id official promo pages (Pos Festival 2026 /
  // Fixed & Cap), valid for new agreements 2026-03-01 through 2026-06-30.
  {
    id: 'btn_3yr',
    bank: 'BTN',
    label: 'BTN — Fixed 3 yr @ 2.65% → 12.99%',
    fixedRate: '2.65',
    fixedDurationMonths: '36',
    floatingRate: '12.99',
  },

  // ── CIMB Niaga ────────────────────────────────────────────────────────────────
  // Fixed: independent aggregator (sikatabis.com). Floating: CIMB states its
  // formula as "LPS + 4.0–4.5%" rather than a flat number — not independently
  // recomputed here, so 12.75% is carried over as a placeholder estimate.
  // NEEDS VERIFICATION against a current LPS-linked quote before relying on it.
  {
    id: 'cimb_3yr',
    bank: 'CIMB Niaga',
    label: 'CIMB Niaga — Fixed 3 yr @ 4.75% → 12.75%',
    fixedRate: '4.75',
    fixedDurationMonths: '36',
    floatingRate: '12.75',
  },

  // ── Permata ───────────────────────────────────────────────────────────────────
  // Fixed: permatabank.com official promo page (valid through 2026-07-31).
  // Floating: not disclosed on the promo page; 11.00% is an estimate from a
  // secondary source citing a 10.75–11.00% range. NEEDS VERIFICATION.
  {
    id: 'permata_3yr',
    bank: 'Permata',
    label: 'Permata — Fixed 3 yr @ 4.00% → 11.00%',
    fixedRate: '4.00',
    fixedDurationMonths: '36',
    floatingRate: '11.00',
  },
];
