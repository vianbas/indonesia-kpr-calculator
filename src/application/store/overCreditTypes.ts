export interface OverCreditFormState {
  agreedPrice: string;
  sellerRemainingPrincipal: string;
  appraisalValue: string;
  buyerDownPayment: string;
  newAnnualRatePercent: string;
  newTenorMonths: string;
  isSameBank: boolean;
  provisionFeePercent: string;
  appraisalFeeIDR: string;
  notaryFeeIDR: string;
  balikNamaFeeIDR: string;
  insuranceIDR: string;
  oldBankPenaltyPercent: string;
  npoptkp: string;
}

export const DEFAULT_OVER_CREDIT: OverCreditFormState = {
  agreedPrice: '',
  sellerRemainingPrincipal: '',
  appraisalValue: '',
  buyerDownPayment: '',
  newAnnualRatePercent: '',
  newTenorMonths: '',
  isSameBank: true,
  provisionFeePercent: '1',
  appraisalFeeIDR: '0',
  notaryFeeIDR: '0',
  balikNamaFeeIDR: '0',
  insuranceIDR: '0',
  oldBankPenaltyPercent: '0',
  npoptkp: '60000000',
};
