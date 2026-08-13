export interface RefinancingFormState {
  remainingBalance: string;
  currentAnnualRatePercent: string;
  remainingMonths: string;
  newAnnualRatePercent: string;
  newTenorMonths: string;
  provisionFeePercent: string;
  penaltyFeePercent: string;
  appraisalFeeIDR: string;
  adminFeeIDR: string;
}

export const DEFAULT_REFINANCING: RefinancingFormState = {
  remainingBalance: '',
  currentAnnualRatePercent: '',
  remainingMonths: '',
  newAnnualRatePercent: '',
  newTenorMonths: '',
  provisionFeePercent: '1',
  penaltyFeePercent: '0',
  appraisalFeeIDR: '0',
  adminFeeIDR: '0',
};
