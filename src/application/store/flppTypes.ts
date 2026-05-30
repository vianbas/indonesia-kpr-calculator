import { FLPP_DEFAULT_PRICE_CAP, FLPP_DEFAULT_INCOME_CAP } from '../../domain/calculators/flpp';

export interface FlppFormState {
  /** Household monthly income (IDR string). */
  monthlyIncome: string;
  /** Max property price to qualify (IDR string) — overridable, varies by region. */
  priceCapIDR: string;
  /** Max monthly income to qualify (IDR string) — overridable. */
  incomeCapIDR: string;
  /** Whether this is the buyer's first home. */
  isFirstHome: boolean;
}

export const DEFAULT_FLPP: FlppFormState = {
  monthlyIncome: '',
  priceCapIDR: String(FLPP_DEFAULT_PRICE_CAP),
  incomeCapIDR: String(FLPP_DEFAULT_INCOME_CAP),
  isFirstHome: true,
};
