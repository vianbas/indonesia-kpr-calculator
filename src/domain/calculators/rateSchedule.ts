import type { MortgageInput } from '../models/mortgage.types';
import type { RateEntry, RateSchedule } from '../models/amortization.types';
import { formatPercent } from '../utils/currency';

/**
 * Builds a month → RateEntry map for the entire loan tenor.
 *
 * Resolution order:
 *   1. fixedPeriod covers months 1..fixedPeriod.durationMonths
 *   2. floatingTiers (if provided) cover the remaining months
 *   3. floatingBaseRate (fallback) covers the remaining months
 *
 * The caller must ensure validateMortgageInput() passes before calling this,
 * otherwise months may be missing from the map.
 */
export function buildRateSchedule(input: MortgageInput): RateSchedule {
  const { tenorMonths, fixedPeriod, floatingBaseRate, floatingTiers } = input;
  const schedule: RateSchedule = new Map<number, RateEntry>();

  // ── Fixed period ────────────────────────────────────────────────────────────
  const fixedEnd = fixedPeriod?.durationMonths ?? 0;
  for (let month = 1; month <= fixedEnd; month++) {
    schedule.set(month, {
      annualRate: fixedPeriod!.annualRate,
      type: 'fixed',
      tierLabel: formatPercent(fixedPeriod!.annualRate),
    });
  }

  // ── Floating period ─────────────────────────────────────────────────────────
  const floatingStart = fixedEnd + 1;
  if (floatingStart > tenorMonths) return schedule; // entire loan is fixed

  if (floatingTiers.length > 0) {
    // Sort defensively — validator guarantees contiguity, but sort makes
    // the builder robust against unsorted input from tests or future callers.
    const sorted = [...floatingTiers].sort((a, b) => a.fromMonth - b.fromMonth);
    for (const tier of sorted) {
      const from = Math.max(tier.fromMonth, floatingStart);
      const to = Math.min(tier.toMonth, tenorMonths);
      for (let month = from; month <= to; month++) {
        schedule.set(month, {
          annualRate: tier.annualRate,
          type: 'floating',
          tierLabel: formatPercent(tier.annualRate),
        });
      }
    }
  } else if (floatingBaseRate !== null) {
    for (let month = floatingStart; month <= tenorMonths; month++) {
      schedule.set(month, {
        annualRate: floatingBaseRate,
        type: 'floating',
        tierLabel: formatPercent(floatingBaseRate),
      });
    }
  }

  return schedule;
}
