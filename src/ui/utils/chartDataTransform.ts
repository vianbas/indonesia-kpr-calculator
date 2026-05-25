import type { AmortizationRow } from '../../domain/models/amortization.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarDataPoint {
  /** Month number (monthly mode) or year number (yearly mode) */
  period: number;
  periodLabel: string;
  principal: number;
  interest: number;
  installment: number;
}

export interface BalanceDataPoint {
  period: number;
  periodLabel: string;
  balance: number;
}

export interface RateChangeMark {
  /** Period value matching an XAxis data point */
  period: number;
  type: 'fixed' | 'floating';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const YEARLY_THRESHOLD = 24;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function shouldUseYearlyGrouping(schedule: AmortizationRow[]): boolean {
  return schedule.length > YEARLY_THRESHOLD;
}

/** Compact IDR label for chart axes — no "Rp" prefix, short suffix. */
export function formatChartAmount(value: number): string {
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`;
  if (value >= 1_000_000)
    return `${Math.round(value / 1_000_000)}Jt`;
  if (value >= 1_000)
    return `${Math.round(value / 1_000)}Rb`;
  return String(Math.round(value));
}

// ─── Bar chart data ───────────────────────────────────────────────────────────

export function buildBarData(schedule: AmortizationRow[]): BarDataPoint[] {
  if (schedule.length === 0) return [];

  if (!shouldUseYearlyGrouping(schedule)) {
    return schedule.map((row) => ({
      period: row.month,
      periodLabel: `Bln ${row.month}`,
      principal: row.principal,
      interest: row.interest,
      installment: row.installment,
    }));
  }

  const yearMap = new Map<number, { principal: number; interest: number; installment: number }>();
  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    const acc = yearMap.get(year);
    if (acc) {
      acc.principal += row.principal;
      acc.interest += row.interest;
      acc.installment += row.installment;
    } else {
      yearMap.set(year, {
        principal: row.principal,
        interest: row.interest,
        installment: row.installment,
      });
    }
  }

  return Array.from(yearMap.entries()).map(([year, data]) => ({
    period: year,
    periodLabel: `Thn ${year}`,
    ...data,
  }));
}

// ─── Balance line chart data ──────────────────────────────────────────────────

/**
 * @param forceYearly When provided, overrides the automatic threshold check.
 * Pass this when building data for a multi-scenario chart so all scenarios
 * use a consistent period axis.
 */
export function buildBalanceData(
  schedule: AmortizationRow[],
  forceYearly?: boolean,
): BalanceDataPoint[] {
  if (schedule.length === 0) return [];

  const useYearly = forceYearly !== undefined ? forceYearly : shouldUseYearlyGrouping(schedule);

  if (!useYearly) {
    return schedule.map((row) => ({
      period: row.month,
      periodLabel: `Bln ${row.month}`,
      balance: row.closingBalance,
    }));
  }

  // Take the closing balance of the last month in each year
  const yearMap = new Map<number, number>();
  for (const row of schedule) {
    yearMap.set(Math.ceil(row.month / 12), row.closingBalance);
  }

  return Array.from(yearMap.entries()).map(([year, balance]) => ({
    period: year,
    periodLabel: `Thn ${year}`,
    balance,
  }));
}

// ─── Rate change markers ──────────────────────────────────────────────────────

/**
 * Returns one mark per rate-change boundary.
 * In yearly mode, deduplicates multiple changes within the same year.
 */
export function buildRateChangeMarks(
  schedule: AmortizationRow[],
  forceYearly?: boolean,
): RateChangeMark[] {
  const marks: RateChangeMark[] = [];
  const useYearly = forceYearly !== undefined ? forceYearly : shouldUseYearlyGrouping(schedule);
  const seen = new Set<number>();

  for (let i = 1; i < schedule.length; i++) {
    if (schedule[i - 1].annualRate !== schedule[i].annualRate) {
      const row = schedule[i];
      const period = useYearly ? Math.ceil(row.month / 12) : row.month;
      if (!seen.has(period)) {
        seen.add(period);
        marks.push({ period, type: row.interestType });
      }
    }
  }

  return marks;
}
