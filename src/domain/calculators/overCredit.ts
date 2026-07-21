import { calculateAnnuityInstallment } from './annuity';
import { roundMoney } from '../utils/math';

export type OverCreditFlag =
  | 'appraisal_shortfall'
  | 'ltv_over_guardrail'
  | 'seller_negative_equity'
  | 'penalty_maybe_applies';

export interface OverCreditInput {
  agreedPrice: number;
  sellerRemainingPrincipal: number;
  /** Bank appraisal value; 0 → treated as agreedPrice. */
  appraisalValue: number;
  buyerDownPayment: number;
  /** Decimal, 0.09 = 9%. */
  newAnnualRate: number;
  newTenorMonths: number;
  isSameBank: boolean;
  /** Decimal, 0.01 = 1%. */
  provisionFeePercent: number;
  appraisalFeeIDR: number;
  notaryFeeIDR: number;
  balikNamaFeeIDR: number;
  insuranceIDR: number;
  /** Decimal; applied only when !isSameBank. */
  oldBankPenaltyPercent: number;
  npoptkp: number;
}

export interface OverCreditResult {
  sellerEquity: number;
  newLoanAmount: number;
  newMonthlyPayment: number;
  newTotalPayment: number;
  newTotalInterest: number;
  provisionFee: number;
  bphtb: number;
  oldBankPenalty: number;
  totalProcessCost: number;
  buyerCashUpfront: number;
  appraisalShortfall: number;
  /** Loan ÷ appraisal value (decimal). */
  effectiveLtv: number;
  totalCostOfAcquisition: number;
  flags: OverCreditFlag[];
}

/** Reference first-home LTV cap (matches LTV_CAPS_CONVENTIONAL.first in ltv.ts). */
const LTV_GUARDRAIL = 0.85;

/** BPHTB rate: 5% of the tax base above NPOPTKP. */
const BPHTB_RATE = 0.05;

export function calculateOverCredit(input: OverCreditInput): OverCreditResult {
  const {
    agreedPrice,
    sellerRemainingPrincipal,
    appraisalValue,
    buyerDownPayment,
    newAnnualRate,
    newTenorMonths,
    isSameBank,
    provisionFeePercent,
    appraisalFeeIDR,
    notaryFeeIDR,
    balikNamaFeeIDR,
    insuranceIDR,
    oldBankPenaltyPercent,
    npoptkp,
  } = input;

  const appraisalEff = appraisalValue > 0 ? appraisalValue : agreedPrice;

  const sellerEquity = roundMoney(Math.max(0, agreedPrice - sellerRemainingPrincipal));
  const newLoanAmount = roundMoney(Math.max(0, agreedPrice - buyerDownPayment));

  const newMonthlyPayment = calculateAnnuityInstallment(newLoanAmount, newAnnualRate, newTenorMonths);
  const newTotalPayment = roundMoney(newMonthlyPayment * newTenorMonths);
  const newTotalInterest = roundMoney(Math.max(0, newTotalPayment - newLoanAmount));

  const provisionFee = roundMoney(newLoanAmount * provisionFeePercent);
  const bphtb = roundMoney(BPHTB_RATE * Math.max(0, agreedPrice - npoptkp));
  const oldBankPenalty = isSameBank
    ? 0
    : roundMoney(sellerRemainingPrincipal * oldBankPenaltyPercent);

  const totalProcessCost = roundMoney(
    provisionFee + appraisalFeeIDR + notaryFeeIDR + balikNamaFeeIDR + insuranceIDR + bphtb + oldBankPenalty,
  );

  const buyerCashUpfront = roundMoney(buyerDownPayment + totalProcessCost);
  const appraisalShortfall = roundMoney(Math.max(0, agreedPrice - appraisalEff));
  const effectiveLtv = appraisalEff > 0 ? newLoanAmount / appraisalEff : 0;
  const totalCostOfAcquisition = roundMoney(buyerCashUpfront + newTotalPayment);

  const flags: OverCreditFlag[] = [];
  if (appraisalShortfall > 0) flags.push('appraisal_shortfall');
  if (effectiveLtv > LTV_GUARDRAIL) flags.push('ltv_over_guardrail');
  if (sellerRemainingPrincipal > agreedPrice) flags.push('seller_negative_equity');
  if (!isSameBank && oldBankPenaltyPercent === 0) flags.push('penalty_maybe_applies');

  return {
    sellerEquity,
    newLoanAmount,
    newMonthlyPayment,
    newTotalPayment,
    newTotalInterest,
    provisionFee,
    bphtb,
    oldBankPenalty,
    totalProcessCost,
    buyerCashUpfront,
    appraisalShortfall,
    effectiveLtv,
    totalCostOfAcquisition,
    flags,
  };
}
