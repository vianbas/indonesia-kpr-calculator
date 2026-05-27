/**
 * Syariah financing calculators — Murabahah and Musyarakah Mutanaqishah (MMQ).
 *
 * These produce MortgageSummary-compatible output so the rest of the app
 * (charts, amortization table, comparison, affordability, PDF) can consume them
 * without modification.
 *
 * IMPORTANT: Output is a simulation aid only. It does not certify Sharia
 * compliance and does not replicate any specific bank's akad or product terms.
 * Users must confirm all details with their bank.
 */
import { Decimal, roundMoney } from '../utils/math';
import { addMonths } from '../utils/date';
import { calculateAnnuityInstallment, calculateAnnuityInterest } from './annuity';
import type { MortgageInput } from '../models/mortgage.types';
import type { AmortizationRow, InstallmentGroup, MortgageSummary } from '../models/amortization.types';

// ─── Shared input type ────────────────────────────────────────────────────────

export interface SyariahBaseInput {
  financingAmount: number;
  tenorMonths: number;
  startDate: Date;
  includeAdminFee: boolean;
  adminFeeAmount: number;
  kprFees?: MortgageInput['kprFees'];
}

export interface MurabahahInput extends SyariahBaseInput {
  /** Annual margin rate as decimal: 0.08 = 8% p.a. */
  annualMarginRate: number;
}

export interface MmqInput extends SyariahBaseInput {
  /** Annual ujrah / nisbah rate as decimal: 0.08 = 8% p.a. */
  annualUjrahRate: number;
  /** Bank's initial ownership share as decimal: 0.8 = 80% */
  bankSharePercent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractFees(input: SyariahBaseInput) {
  const fees = input.kprFees;
  return {
    downPayment:   fees?.downPayment   ?? 0,
    provisionFee:  fees?.provisionFee  ?? 0,
    appraisalFee:  fees?.appraisalFee  ?? 0,
    notaryFee:     fees?.notaryFee     ?? 0,
    bphtb:         fees?.bphtb         ?? 0,
    ppnAmount:     fees?.ppnAmount     ?? 0,
    lifeInsurance: fees?.lifeInsurance ?? 0,
    fireInsurance: fees?.fireInsurance ?? 0,
  };
}

function computeUpfrontCost(
  f: ReturnType<typeof extractFees>,
  adminFee: number,
): number {
  return roundMoney(
    new Decimal(f.downPayment)
      .plus(adminFee)
      .plus(f.provisionFee)
      .plus(f.appraisalFee)
      .plus(f.notaryFee)
      .plus(f.bphtb)
      .plus(f.ppnAmount)
      .plus(f.lifeInsurance)
      .plus(f.fireInsurance),
  );
}

// ─── Murabahah ────────────────────────────────────────────────────────────────

/**
 * Murabahah simulation (margin tetap, angsuran tetap).
 *
 * Formula:
 *   totalMargin   = financingAmount × annualMarginRate × (tenorMonths / 12)
 *   totalSalePrice = financingAmount + totalMargin
 *   monthlyInstallment = totalSalePrice / tenorMonths
 *
 * Each schedule row has equal principal and equal margin portions.
 * The last month absorbs any rounding residual to land at exactly Rp 0.
 */
export function calculateMurabahahSummary(input: MurabahahInput): MortgageSummary {
  const { financingAmount, annualMarginRate, tenorMonths, startDate } = input;

  const totalMargin = roundMoney(
    new Decimal(financingAmount)
      .times(annualMarginRate)
      .times(new Decimal(tenorMonths).dividedBy(12)),
  );
  const totalSalePrice = roundMoney(new Decimal(financingAmount).plus(totalMargin));

  const monthlyInstallment = roundMoney(
    new Decimal(totalSalePrice).dividedBy(tenorMonths),
  );
  const monthlyPrincipal = roundMoney(
    new Decimal(financingAmount).dividedBy(tenorMonths),
  );
  const monthlyMargin = roundMoney(
    new Decimal(totalMargin).dividedBy(tenorMonths),
  );

  const schedule: AmortizationRow[] = [];
  let balance = financingAmount;
  // Track running totals to compute the last-row residual correctly
  let accumulatedPrincipal = new Decimal(0);
  let accumulatedMargin = new Decimal(0);

  for (let month = 1; month <= tenorMonths; month++) {
    const date = addMonths(startDate, month - 1);
    const openingBalance = balance;
    const isLast = month === tenorMonths;

    let principal: number;
    let interest: number;
    let installment: number;

    if (isLast) {
      // Clear any rounding residual so final balance lands at exactly 0
      principal = roundMoney(balance);
      const remainingMargin = roundMoney(
        new Decimal(totalMargin).minus(accumulatedMargin),
      );
      interest = remainingMargin;
      installment = roundMoney(new Decimal(principal).plus(interest));
    } else {
      principal = monthlyPrincipal;
      interest = monthlyMargin;
      installment = monthlyInstallment;
    }

    accumulatedPrincipal = accumulatedPrincipal.plus(principal);
    accumulatedMargin = accumulatedMargin.plus(interest);

    const closingBalance = Math.max(0, roundMoney(new Decimal(openingBalance).minus(principal)));

    schedule.push({
      month,
      date,
      openingBalance,
      principal,
      interest,
      installment,
      closingBalance,
      annualRate: annualMarginRate,
      interestType: 'fixed',
      extraPayment: 0,
    });

    balance = closingBalance;
  }

  const adminFee = input.includeAdminFee ? input.adminFeeAmount : 0;
  const f = extractFees(input);

  const actualTotalMargin = roundMoney(
    schedule.reduce((s, r) => s.plus(r.interest), new Decimal(0)),
  );
  const actualTotalPrincipal = roundMoney(
    schedule.reduce((s, r) => s.plus(r.principal), new Decimal(0)),
  );
  const actualTotalPayment = roundMoney(
    new Decimal(actualTotalPrincipal).plus(actualTotalMargin).plus(adminFee),
  );

  const group: InstallmentGroup = {
    label: `Bulan 1–${tenorMonths} (Margin ${(annualMarginRate * 100).toFixed(2)}%)`,
    fromMonth: 1,
    toMonth: tenorMonths,
    installmentAmount: monthlyInstallment,
    annualRate: annualMarginRate,
    type: 'fixed',
  };

  return {
    installmentGroups: [group],
    totalPrincipal: actualTotalPrincipal,
    totalInterest: actualTotalMargin,  // mapped so charts render correctly
    totalPayment: actualTotalPayment,
    adminFee,
    effectiveAnnualRate: annualMarginRate,
    schedule,
    effectiveTenorMonths: tenorMonths,
    originalTenorMonths: tenorMonths,
    monthsSaved: 0,
    originalTotalInterest: actualTotalMargin,
    originalTotalPayment: actualTotalPayment,
    interestSaved: 0,
    interestSavedPercent: 0,
    ...f,
    totalUpfrontCost: computeUpfrontCost(f, adminFee),
    // Syariah-specific
    financingMode: 'syariah',
    syariahAkadType: 'murabahah',
    totalMargin: actualTotalMargin,
    totalSalePrice: roundMoney(new Decimal(actualTotalPrincipal).plus(actualTotalMargin)),
  };
}

// ─── Musyarakah Mutanaqishah (MMQ) ───────────────────────────────────────────

/**
 * MMQ simulation (porsi bank menurun, ujrah berbasis saldo).
 *
 * Uses annuity-equivalent mechanics:
 *   installment = P × r(1+r)^n / ((1+r)^n − 1)
 *   each month: ujrah = outstanding × annualUjrahRate / 12
 *               principal (porsi pembelian) = installment − ujrah
 *
 * The last month is adjusted to clear any rounding residual.
 *
 * bankSharePercent is recorded for display purposes; it is not used in the
 * payment calculation because the annuity formula already models a declining
 * balance accurately.
 */
export function calculateMmqSummary(input: MmqInput): MortgageSummary {
  const { financingAmount, annualUjrahRate, tenorMonths, startDate } = input;

  const installment = calculateAnnuityInstallment(financingAmount, annualUjrahRate, tenorMonths);

  const schedule: AmortizationRow[] = [];
  let balance = financingAmount;

  for (let month = 1; month <= tenorMonths; month++) {
    const date = addMonths(startDate, month - 1);
    const openingBalance = balance;
    const isLast = month === tenorMonths;

    const ujrah = calculateAnnuityInterest(openingBalance, annualUjrahRate);
    let principal: number;
    let thisInstallment: number;

    if (isLast) {
      // Clear remaining balance
      principal = roundMoney(balance);
      thisInstallment = roundMoney(new Decimal(principal).plus(ujrah));
    } else {
      principal = roundMoney(new Decimal(installment).minus(ujrah));
      thisInstallment = installment;
    }

    const closingBalance = roundMoney(new Decimal(openingBalance).minus(principal));

    schedule.push({
      month,
      date,
      openingBalance,
      principal,
      interest: ujrah,  // ujrah mapped to interest for chart/table compat
      installment: thisInstallment,
      closingBalance: Math.max(0, closingBalance),
      annualRate: annualUjrahRate,
      interestType: 'fixed',
      extraPayment: 0,
    });

    balance = Math.max(0, closingBalance);
  }

  const adminFee = input.includeAdminFee ? input.adminFeeAmount : 0;
  const f = extractFees(input);

  const totalUjrah = roundMoney(
    schedule.reduce((s, r) => s.plus(r.interest), new Decimal(0)),
  );
  const totalPrincipal = roundMoney(
    schedule.reduce((s, r) => s.plus(r.principal), new Decimal(0)),
  );
  const totalPayment = roundMoney(
    new Decimal(totalPrincipal).plus(totalUjrah).plus(adminFee),
  );

  const group: InstallmentGroup = {
    label: `Bulan 1–${tenorMonths} (Ujrah ${(annualUjrahRate * 100).toFixed(2)}%)`,
    fromMonth: 1,
    toMonth: tenorMonths,
    installmentAmount: installment,
    annualRate: annualUjrahRate,
    type: 'fixed',
  };

  return {
    installmentGroups: [group],
    totalPrincipal,
    totalInterest: totalUjrah,  // mapped so charts render correctly
    totalPayment,
    adminFee,
    effectiveAnnualRate: annualUjrahRate,
    schedule,
    effectiveTenorMonths: tenorMonths,
    originalTenorMonths: tenorMonths,
    monthsSaved: 0,
    originalTotalInterest: totalUjrah,
    originalTotalPayment: totalPayment,
    interestSaved: 0,
    interestSavedPercent: 0,
    ...f,
    totalUpfrontCost: computeUpfrontCost(f, adminFee),
    // Syariah-specific
    financingMode: 'syariah',
    syariahAkadType: 'musyarakah_mutanaqishah',
    totalUjrah,
  };
}
