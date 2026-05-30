export interface BuyVsRentFormState {
  /** Monthly rent for a comparable home (IDR string). */
  monthlyRent: string;
  /** Annual rent growth, percent string (e.g. "5"). */
  rentGrowthPercent: string;
  /** Annual property appreciation, percent string. */
  appreciationPercent: string;
  /** Annual return if the upfront cash were invested instead, percent string. */
  investmentReturnPercent: string;
  /** Comparison horizon in years. */
  horizonYears: string;
}

export const DEFAULT_BUY_VS_RENT: BuyVsRentFormState = {
  monthlyRent: '',
  rentGrowthPercent: '5',
  appreciationPercent: '5',
  investmentReturnPercent: '4',
  horizonYears: '10',
};
