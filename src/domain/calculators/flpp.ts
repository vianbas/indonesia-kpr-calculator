import { calculateAnnuityInstallment } from './annuity';
import { roundMoney } from '../utils/math';

/**
 * FLPP — Fasilitas Likuiditas Pembiayaan Perumahan.
 *
 * Indonesia's subsidized mortgage for low-income first-home buyers: a fixed
 * 5% p.a. rate for the full tenor (up to 20 years), available when the property
 * price and the buyer's income are within caps. The caps vary by region and
 * year, so they are passed in (with documented reference defaults in the UI) —
 * the constants here are the stable parts of the scheme, not official figures.
 */

export const FLPP_SUBSIDIZED_ANNUAL_RATE = 0.05;
export const FLPP_MAX_TENOR_MONTHS = 240; // 20 years
export const FLPP_DEFAULT_PRICE_CAP = 185_000_000;
export const FLPP_DEFAULT_INCOME_CAP = 8_000_000;

export interface FlppInput {
  propertyPrice: number;
  monthlyIncome: number;
  loanPrincipal: number;
  tenorMonths: number;
  isFirstHome: boolean;
  /** Max property price to qualify (IDR). */
  priceCap: number;
  /** Max monthly household income to qualify (IDR). */
  incomeCap: number;
}

export interface FlppEligibility {
  priceOk: boolean;
  incomeOk: boolean;
  firstHomeOk: boolean;
  tenorOk: boolean;
  eligible: boolean;
}

export interface FlppResult {
  eligibility: FlppEligibility;
  /** Monthly installment under the subsidized 5% fixed rate over the (capped) tenor. */
  subsidizedInstallment: number;
  /** Total interest over the subsidized loan. */
  subsidizedTotalInterest: number;
  /** Tenor used for the subsidized installment (clamped to the FLPP maximum). */
  subsidizedTenorMonths: number;
}

export function assessFlpp(input: FlppInput): FlppResult {
  const { propertyPrice, monthlyIncome, loanPrincipal, tenorMonths, isFirstHome, priceCap, incomeCap } = input;

  const subsidizedTenorMonths = Math.min(Math.max(1, tenorMonths), FLPP_MAX_TENOR_MONTHS);

  const priceOk = propertyPrice > 0 && propertyPrice <= priceCap;
  const incomeOk = monthlyIncome > 0 && monthlyIncome <= incomeCap;
  const firstHomeOk = isFirstHome;
  const tenorOk = tenorMonths > 0 && tenorMonths <= FLPP_MAX_TENOR_MONTHS;
  const eligible = priceOk && incomeOk && firstHomeOk && tenorOk;

  const subsidizedInstallment =
    loanPrincipal > 0
      ? roundMoney(calculateAnnuityInstallment(loanPrincipal, FLPP_SUBSIDIZED_ANNUAL_RATE, subsidizedTenorMonths))
      : 0;
  const subsidizedTotalInterest = roundMoney(
    Math.max(0, subsidizedInstallment * subsidizedTenorMonths - loanPrincipal),
  );

  return {
    eligibility: { priceOk, incomeOk, firstHomeOk, tenorOk, eligible },
    subsidizedInstallment,
    subsidizedTotalInterest,
    subsidizedTenorMonths,
  };
}
