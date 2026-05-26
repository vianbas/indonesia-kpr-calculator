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
 * When input.earlyRepayment is set (mode ≠ 'none'):
 *   - Extra payment is applied after the regular principal each month.
 *   - Extra is capped so it never exceeds remaining balance after regular principal.
 *   - The schedule terminates early when closingBalance reaches 0.
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

  // Early repayment — resolve config once
  const erCfg = input.earlyRepayment;
  const hasEarlyRepayment = Boolean(erCfg && erCfg.mode !== 'none');

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
    const isNaturalLastMonth = month === tenorMonths;

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
      // Natural last month always clears the exact balance (handles rounding residual).
      // Earlier months with early repayment: cap when balance is below the monthly slice.
      if (isNaturalLastMonth || balance <= flatMonthlyPrincipal) {
        principal = balance;
      } else {
        principal = flatMonthlyPrincipal;
      }
      installment = principal + interest;
    } else {
      // Annuity
      if (isNaturalLastMonth) {
        // Final payment clears the remaining balance exactly (handles rounding residual)
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

    // ── Extra payment (early repayment) ──────────────────────────────────────
    let extraPayment = 0;
    if (hasEarlyRepayment && erCfg) {
      const { mode, extraMonthly, lumpSum } = erCfg;

      if ((mode === 'extra_monthly' || mode === 'both') && extraMonthly) {
        const { amount, startMonth, endMonth } = extraMonthly;
        if (month >= startMonth && (endMonth === undefined || month <= endMonth)) {
          extraPayment += amount;
        }
      }

      if ((mode === 'lump_sum' || mode === 'both') && lumpSum && lumpSum.month === month) {
        extraPayment += lumpSum.amount;
      }

      // Cap: can never pay more than the remaining balance after regular principal
      if (extraPayment > 0) {
        const maxExtra = Math.max(0, balance - principal);
        extraPayment = roundMoney(Math.min(extraPayment, maxExtra));
      }
    }

    const closingBalance = Math.max(
      0,
      roundMoney(new Decimal(balance).minus(principal).minus(extraPayment)),
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
      extraPayment,
    });

    balance = closingBalance;

    // Early exit when early repayment clears the balance before tenor ends
    if (balance === 0) break;
  }

  return rows;
}

// ─── Summary calculator ───────────────────────────────────────────────────────

/**
 * Aggregates an amortization schedule into totals and grouped installment periods.
 * Call after generateAmortizationSchedule().
 *
 * When input.earlyRepayment mode is not 'none', this function also computes
 * a base schedule (no early repayment) internally to populate the savings fields.
 */
export function calculateMortgageSummary(
  input: MortgageInput,
  schedule: AmortizationRow[],
): MortgageSummary {
  const fees = input.kprFees;
  const downPayment = fees?.downPayment ?? 0;
  const provisionFee = fees?.provisionFee ?? 0;
  const appraisalFee = fees?.appraisalFee ?? 0;
  const notaryFee = fees?.notaryFee ?? 0;
  const bphtb = fees?.bphtb ?? 0;
  const ppnAmount = fees?.ppnAmount ?? 0;
  const lifeInsurance = fees?.lifeInsurance ?? 0;
  const fireInsurance = fees?.fireInsurance ?? 0;

  const emptyBase = {
    installmentGroups: [],
    totalPrincipal: 0,
    totalInterest: 0,
    totalPayment: 0,
    adminFee: 0,
    effectiveAnnualRate: 0,
    schedule,
    effectiveTenorMonths: 0,
    originalTenorMonths: input.tenorMonths,
    monthsSaved: 0,
    originalTotalInterest: 0,
    originalTotalPayment: 0,
    interestSaved: 0,
    interestSavedPercent: 0,
    downPayment,
    provisionFee,
    appraisalFee,
    notaryFee,
    bphtb,
    ppnAmount,
    lifeInsurance,
    fireInsurance,
    totalUpfrontCost: 0,
  };

  if (schedule.length === 0) return emptyBase;

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

  const effectiveTenorMonths = schedule.length;
  const originalTenorMonths = input.tenorMonths;

  // ── Early repayment comparison ─────────────────────────────────────────────
  const hasEarlyRepayment =
    Boolean(input.earlyRepayment && input.earlyRepayment.mode !== 'none');

  let originalTotalInterest = totalInterest;
  let originalTotalPayment = totalPayment;

  if (hasEarlyRepayment) {
    // Run a base pass without early repayment to get original totals
    const baseInput: MortgageInput = { ...input, earlyRepayment: undefined };
    const baseSchedule = generateAmortizationSchedule(baseInput);
    originalTotalInterest = roundMoney(
      baseSchedule.reduce((sum, row) => sum.plus(row.interest), new Decimal(0)),
    );
    const baseTotalPrincipal = roundMoney(
      baseSchedule.reduce((sum, row) => sum.plus(row.principal), new Decimal(0)),
    );
    originalTotalPayment = roundMoney(
      new Decimal(baseTotalPrincipal).plus(originalTotalInterest).plus(adminFee),
    );
  }

  const monthsSaved = Math.max(0, originalTenorMonths - effectiveTenorMonths);
  const interestSaved = roundMoney(
    Math.max(0, new Decimal(originalTotalInterest).minus(totalInterest).toNumber()),
  );
  const interestSavedPercent =
    originalTotalInterest > 0
      ? Math.round((interestSaved / originalTotalInterest) * 10000) / 100
      : 0;

  const totalUpfrontCost = roundMoney(
    new Decimal(downPayment)
      .plus(adminFee)
      .plus(provisionFee)
      .plus(appraisalFee)
      .plus(notaryFee)
      .plus(bphtb)
      .plus(ppnAmount)
      .plus(lifeInsurance)
      .plus(fireInsurance),
  );

  return {
    installmentGroups: buildInstallmentGroups(schedule),
    totalPrincipal,
    totalInterest,
    totalPayment,
    adminFee,
    effectiveAnnualRate,
    schedule,
    effectiveTenorMonths,
    originalTenorMonths,
    monthsSaved,
    originalTotalInterest,
    originalTotalPayment,
    interestSaved,
    interestSavedPercent,
    downPayment,
    provisionFee,
    appraisalFee,
    notaryFee,
    bphtb,
    ppnAmount,
    lifeInsurance,
    fireInsurance,
    totalUpfrontCost,
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
