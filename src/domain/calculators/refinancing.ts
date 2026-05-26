import { calculateAnnuityInstallment } from './annuity';
import { roundMoney } from '../utils/math';

export type RefinancingRecommendation = 'worth_it' | 'marginal' | 'not_worth_it';

export interface RefinancingInput {
  remainingBalance: number;
  currentAnnualRate: number;
  remainingMonths: number;
  newAnnualRate: number;
  newTenorMonths: number;
  provisionFeePercent: number;  // decimal, e.g. 0.01 = 1%
  appraisalFeeIDR: number;
  adminFeeIDR: number;
}

export interface RefinancingResult {
  currentMonthlyPayment: number;
  currentTotalInterest: number;
  currentTotalPayment: number;
  newMonthlyPayment: number;
  newTotalInterest: number;
  newTotalPayment: number;
  monthlySavings: number;
  totalInterestSavings: number;
  totalSwitchingCost: number;
  breakEvenMonths: number | null;
  netSavings: number;
  recommendation: RefinancingRecommendation;
}

export function calculateRefinancing(input: RefinancingInput): RefinancingResult {
  const {
    remainingBalance,
    currentAnnualRate,
    remainingMonths,
    newAnnualRate,
    newTenorMonths,
    provisionFeePercent,
    appraisalFeeIDR,
    adminFeeIDR,
  } = input;

  const currentMonthlyPayment = calculateAnnuityInstallment(
    remainingBalance,
    currentAnnualRate,
    remainingMonths,
  );
  const currentTotalPayment = roundMoney(currentMonthlyPayment * remainingMonths);
  const currentTotalInterest = roundMoney(
    Math.max(0, currentTotalPayment - remainingBalance),
  );

  const newMonthlyPayment = calculateAnnuityInstallment(
    remainingBalance,
    newAnnualRate,
    newTenorMonths,
  );
  const newTotalPayment = roundMoney(newMonthlyPayment * newTenorMonths);
  const newTotalInterest = roundMoney(Math.max(0, newTotalPayment - remainingBalance));

  const totalSwitchingCost = roundMoney(
    remainingBalance * provisionFeePercent + appraisalFeeIDR + adminFeeIDR,
  );

  const monthlySavings = roundMoney(currentMonthlyPayment - newMonthlyPayment);
  const totalInterestSavings = roundMoney(currentTotalInterest - newTotalInterest);
  const netSavings = roundMoney(totalInterestSavings - totalSwitchingCost);

  const breakEvenMonths =
    monthlySavings > 0
      ? Math.ceil(totalSwitchingCost / monthlySavings)
      : null;

  let recommendation: RefinancingRecommendation;
  if (monthlySavings <= 0 || netSavings <= 0) {
    recommendation = 'not_worth_it';
  } else if (breakEvenMonths !== null && breakEvenMonths <= newTenorMonths / 2) {
    recommendation = 'worth_it';
  } else {
    recommendation = 'marginal';
  }

  return {
    currentMonthlyPayment,
    currentTotalInterest,
    currentTotalPayment,
    newMonthlyPayment,
    newTotalInterest,
    newTotalPayment,
    monthlySavings,
    totalInterestSavings,
    totalSwitchingCost,
    breakEvenMonths,
    netSavings,
    recommendation,
  };
}
