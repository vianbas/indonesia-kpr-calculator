import type { AmortizationRow, InstallmentGroup } from '../../domain/models/amortization.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarDataPoint {
  /** Month number (monthly mode) or year number (yearly mode) */
  period: number;
  periodLabel: string;
  principal: number;
  interest: number;
  installment: number;
  extraPayment: number;
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

/**
 * @param forceYearly When provided, overrides the automatic threshold check.
 * Pass this when ChartSection has already decided grouping for all charts so
 * the bar and line charts always use the same period axis.
 */
export function buildBarData(schedule: AmortizationRow[], forceYearly?: boolean): BarDataPoint[] {
  if (schedule.length === 0) return [];

  const useYearly = forceYearly !== undefined ? forceYearly : shouldUseYearlyGrouping(schedule);

  if (!useYearly) {
    return schedule.map((row) => ({
      period: row.month,
      periodLabel: `Bln ${row.month}`,
      principal: row.principal,
      interest: row.interest,
      installment: row.installment,
      extraPayment: row.extraPayment,
    }));
  }

  const yearMap = new Map<number, { principal: number; interest: number; installment: number; extraPayment: number }>();
  for (const row of schedule) {
    const year = Math.ceil(row.month / 12);
    const acc = yearMap.get(year);
    if (acc) {
      acc.principal += row.principal;
      acc.interest += row.interest;
      acc.installment += row.installment;
      acc.extraPayment += row.extraPayment;
    } else {
      yearMap.set(year, {
        principal: row.principal,
        interest: row.interest,
        installment: row.installment,
        extraPayment: row.extraPayment,
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

// ─── Prepayment chart data ────────────────────────────────────────────────────

export interface PrepaymentDataPoint {
  period: number;
  periodLabel: string;
  actual: number;
  baseline: number | null;
}

/**
 * Simulates the amortization without extra payments using installmentGroups and
 * returns balance data points that can be overlaid with the actual schedule.
 * Returns empty array when no extra payments exist in the actual schedule.
 */
export function buildPrepaymentChartData(
  schedule: AmortizationRow[],
  totalPrincipal: number,
  installmentGroups: InstallmentGroup[],
  forceYearly?: boolean,
): PrepaymentDataPoint[] {
  if (!schedule.some((r) => r.extraPayment > 0)) return [];

  const useYearly = forceYearly !== undefined ? forceYearly : shouldUseYearlyGrouping(schedule);

  // Simulate baseline: same installment amounts from groups, no extra payments
  const baselineByMonth = new Map<number, number>();
  let bal = totalPrincipal;
  for (const group of installmentGroups) {
    for (let m = group.fromMonth; m <= group.toMonth && bal > 0; m++) {
      const interest = bal * (group.annualRate / 12);
      const principal = Math.min(bal, group.installmentAmount - interest);
      bal = Math.max(0, bal - principal);
      baselineByMonth.set(m, bal);
    }
  }

  // Actual balance from schedule
  const actualByMonth = new Map<number, number>();
  for (const row of schedule) actualByMonth.set(row.month, row.closingBalance);

  // Merge onto same period axis
  const allMonths = new Set([...actualByMonth.keys(), ...baselineByMonth.keys()]);

  if (!useYearly) {
    return Array.from(allMonths)
      .sort((a, b) => a - b)
      .map((m) => ({
        period: m,
        periodLabel: `Bln ${m}`,
        actual: actualByMonth.get(m) ?? 0,
        baseline: baselineByMonth.get(m) ?? null,
      }));
  }

  // Yearly: take last month of each year for both series
  const yearActual = new Map<number, number>();
  for (const row of schedule) yearActual.set(Math.ceil(row.month / 12), row.closingBalance);

  const yearBaseline = new Map<number, number>();
  for (const [m, b] of baselineByMonth) yearBaseline.set(Math.ceil(m / 12), b);

  const allYears = new Set([...yearActual.keys(), ...yearBaseline.keys()]);
  return Array.from(allYears)
    .sort((a, b) => a - b)
    .map((yr) => ({
      period: yr,
      periodLabel: `Thn ${yr}`,
      actual: yearActual.get(yr) ?? 0,
      baseline: yearBaseline.get(yr) ?? null,
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
