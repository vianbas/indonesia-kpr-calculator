export interface RefinancingFormState {
  remainingBalance: string;
  currentAnnualRatePercent: string;
  remainingMonths: string;
  newAnnualRatePercent: string;
  newTenorMonths: string;
  provisionFeePercent: string;
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
  appraisalFeeIDR: '0',
  adminFeeIDR: '0',
};
