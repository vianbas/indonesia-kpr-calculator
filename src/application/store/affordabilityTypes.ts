export interface AffordabilityFormState {
  monthlyIncome: string;
  spouseIncome: string;
  existingMonthlyDebt: string;
  monthlyLivingExpense: string;
  /** Minimum net monthly cash the user wants to retain after all obligations */
  minMonthlySurplus: string;
  /** Maximum acceptable debt-service ratio as a percent string, e.g. "35" */
  maxDSRPercent: string;
}

export const DEFAULT_AFFORDABILITY: AffordabilityFormState = {
  monthlyIncome: '',
  spouseIncome: '',
  existingMonthlyDebt: '0',
  monthlyLivingExpense: '0',
  minMonthlySurplus: '0',
  maxDSRPercent: '35',
};
