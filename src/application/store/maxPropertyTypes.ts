/**
 * Standalone form state for the reverse-affordability ("max property") tool.
 * Deliberately separate from MortgageFormState so it never pollutes the main
 * scenario state or the shareable URL.
 */
export interface MaxPropertyFormState {
  monthlyIncome: string;
  spouseIncome: string;
  existingMonthlyDebt: string;
  maxDsrPercent: string;
  annualRatePercent: string;
  tenorYears: string;
  downPaymentPercent: string;
  paymentMethod: 'annuity' | 'flat';
  financingMode: 'conventional' | 'syariah';
}

export const DEFAULT_MAX_PROPERTY: MaxPropertyFormState = {
  monthlyIncome: '',
  spouseIncome: '',
  existingMonthlyDebt: '0',
  maxDsrPercent: '30',
  annualRatePercent: '8',
  tenorYears: '15',
  downPaymentPercent: '20',
  paymentMethod: 'annuity',
  financingMode: 'conventional',
};
