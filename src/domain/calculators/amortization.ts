import { Decimal, roundMoney } from '../utils/math';
import { addMonths } from '../utils/date';
import { buildRateSchedule } from './rateSchedule';
import { calculateAnnuityInstallment, calculateAnnuityInterest } from './annuity';
import { calculateFlatMonthlyPrincipal, calculateFlatMonthlyInterest } from './flat';
import type { MortgageInput } from '../models/mortgage.types';
import type {
  AmortizationRow,
  InstallmentGroup,
  MortgageSummary,
} from '../models/amortization.types';

// ─── Schedule generator ───────────────────────────────────────────────────────

/**
 * Generates a complete month-by-month amortization schedule.
 *
 * Annuity strategy:
 *   - Installment is recalculated at EVERY rate change using the remaining
 *     balance and remaining months. This mirrors how Indonesian banks
 *     notify customers of new installment amounts when the rate changes.
 *   - The final month is adjusted to exactly clear any rounding residual.
 *
 * Flat strategy:
 *   - Monthly principal is fixed at initialPrincipal / tenorMonths.
 *   - Monthly interest is recalculated at each rate change (still based on
 *     the initial principal, not the current balance).
 *   - Installment = principal + interest (changes only when rate changes).
 *
 * @throws {Error} If the rate schedule has a gap (input failed validation)
 */
export function generateAmortizationSchedule(input: MortgageInput): AmortizationRow[] {
  const { principalAmount, tenorMonths, paymentMethod, startDate } = input;
  const rateSchedule = buildRateSchedule(input);

  const rows: AmortizationRow[] = [];
  let balance = principalAmount;

  // Annuity: track current installment so we only recalculate on rate change
  let currentInstallment = 0;
  let prevRate = -1; // sentinel — forces recalculation on month 1

  // Flat: principal slice is constant throughout
  const flatMonthlyPrincipal =
    paymentMethod === 'flat'
      ? calculateFlatMonthlyPrincipal(principalAmount, tenorMonths)
      : 0;

  for (let month = 1; month <= tenorMonths; month++) {
    const entry = rateSchedule.get(month);
    if (entry === undefined) {
      throw new Error(
        `Rate schedule is missing an entry for month ${month}. ` +
          `Ensure the input passes validateMortgageInput() before calling generateAmortizationSchedule().`,
      );
    }

    const { annualRate, type, tierLabel } = entry;
    const remainingMonths = tenorMonths - month + 1;
    const isLastMonth = month === tenorMonths;

    // ── Installment recalculation at rate boundaries (annuity only) ──────────
    if (paymentMethod === 'annuity' && annualRate !== prevRate) {
      currentInstallment = calculateAnnuityInstallment(balance, annualRate, remainingMonths);
      prevRate = annualRate;
    }

    // ── Interest calculation ─────────────────────────────────────────────────
    const interest =
      paymentMethod === 'flat'
        ? calculateFlatMonthlyInterest(principalAmount, annualRate)
        : calculateAnnuityInterest(balance, annualRate);

    // ── Principal & installment ──────────────────────────────────────────────
    let principal: number;
    let installment: number;

    if (paymentMethod === 'flat') {
      // Last month: adjust principal to exactly clear any rounding residual
      principal = isLastMonth ? balance : flatMonthlyPrincipal;
      installment = principal + interest;
    } else {
      // Annuity
      if (isLastMonth) {
        // Final payment clears the remaining balance exactly
        principal = balance;
        installment = balance + interest;
      } else {
        installment = currentInstallment;
        principal = installment - interest;

        // Guard: if rounding causes principal > balance, cap it
        if (principal > balance) {
          principal = balance;
          installment = balance + interest;
        }
      }
    }

    const closingBalance = Math.max(
      0,
      roundMoney(new Decimal(balance).minus(principal)),
    );

    rows.push({
      month,
      date: addMonths(startDate, month - 1),
      openingBalance: balance,
      principal,
      interest,
      installment,
      closingBalance,
      annualRate,
      interestType: type,
      tierLabel,
    });

    balance = closingBalance;
  }

  return rows;
}

// ─── Summary calculator ───────────────────────────────────────────────────────

/**
 * Aggregates an amortization schedule into totals and grouped installment periods.
 * Call after generateAmortizationSchedule().
 */
export function calculateMortgageSummary(
  input: MortgageInput,
  schedule: AmortizationRow[],
): MortgageSummary {
  if (schedule.length === 0) {
    return {
      installmentGroups: [],
      totalPrincipal: 0,
      totalInterest: 0,
      totalPayment: 0,
      adminFee: 0,
      effectiveAnnualRate: 0,
      schedule,
    };
  }

  // Accumulate as Decimal throughout — avoids 360 float↔Decimal conversions per sum
  const totalInterest = roundMoney(
    schedule.reduce((sum, row) => sum.plus(row.interest), new Decimal(0)),
  );
  const totalPrincipal = roundMoney(
    schedule.reduce((sum, row) => sum.plus(row.principal), new Decimal(0)),
  );
  const adminFee = input.includeAdminFee ? input.adminFeeAmount : 0;
  const totalPayment = roundMoney(
    new Decimal(totalPrincipal).plus(totalInterest).plus(adminFee),
  );

  // Simple weighted average — accurate enough for display purposes
  const effectiveAnnualRate =
    schedule.reduce((sum, row) => sum + row.annualRate, 0) / schedule.length;

  return {
    installmentGroups: buildInstallmentGroups(schedule),
    totalPrincipal,
    totalInterest,
    totalPayment,
    adminFee,
    effectiveAnnualRate,
    schedule,
  };
}

// ─── Installment group builder ────────────────────────────────────────────────

/**
 * Collapses consecutive rows with the same rate into InstallmentGroup entries.
 * This drives the summary card that shows "Month 1–24: Rp X/month (Fixed 7%)".
 */
function buildInstallmentGroups(schedule: AmortizationRow[]): InstallmentGroup[] {
  const groups: InstallmentGroup[] = [];
  let groupStart = schedule[0];
  let currentRate = schedule[0].annualRate;
  let currentType = schedule[0].interestType;

  for (let i = 1; i < schedule.length; i++) {
    const row = schedule[i];
    if (row.annualRate !== currentRate) {
      groups.push(makeGroup(groupStart, schedule[i - 1], currentRate, currentType));
      groupStart = row;
      currentRate = row.annualRate;
      currentType = row.interestType;
    }
  }

  // Push the final group
  groups.push(makeGroup(groupStart, schedule[schedule.length - 1], currentRate, currentType));
  return groups;
}

function makeGroup(
  firstRow: AmortizationRow,
  lastRow: AmortizationRow,
  annualRate: number,
  type: 'fixed' | 'floating',
): InstallmentGroup {
  const rateLabel = `${(annualRate * 100).toFixed(2)}%`;
  const typeLabel = type === 'fixed' ? 'Fixed' : 'Floating';
  const monthRange =
    firstRow.month === lastRow.month
      ? `Bulan ${firstRow.month}`
      : `Bulan ${firstRow.month}–${lastRow.month}`;

  return {
    label: `${monthRange} (${typeLabel} ${rateLabel})`,
    fromMonth: firstRow.month,
    toMonth: lastRow.month,
    installmentAmount: firstRow.installment,
    annualRate,
    type,
  };
}
