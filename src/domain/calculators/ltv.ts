import type { FinancingMode } from '../models/mortgage.types';

/**
 * Loan-to-Value (LTV) guardrail.
 *
 * LTV = loan principal ÷ property value. A lower down payment means a higher LTV
 * and more risk for both borrower and lender. Bank Indonesia historically caps
 * LTV (i.e. sets a minimum down payment) on tiers by how many homes the buyer
 * already owns, with syariah financing allowed a slightly higher LTV.
 *
 * The caps below are TRANSPARENT REFERENCE DEFAULTS for landed houses — not live
 * BI policy. BI has at times relaxed LTV to 100% (e.g. the 2021–2024 easing), and
 * every bank sets its own limits. Treat the output as guidance, not regulation.
 */

export type HomeOrder = 'first' | 'second' | 'third_plus';

/** Max loan ÷ property value for conventional financing, by home order. */
export const LTV_CAPS_CONVENTIONAL: Record<HomeOrder, number> = {
  first: 0.85,
  second: 0.8,
  third_plus: 0.75,
};

/** Syariah financing is allowed +5 percentage points of LTV (lower DP). */
export const SYARIAH_LTV_BONUS = 0.05;

export const HOME_ORDERS: readonly HomeOrder[] = ['first', 'second', 'third_plus'];

export interface LtvTierAssessment {
  order: HomeOrder;
  /** Max LTV cap (decimal) for this tier and financing mode. */
  maxLtv: number;
  /** Minimum down payment (IDR) needed to satisfy this cap. */
  minDownPayment: number;
  /** True when the current LTV is within this cap. */
  withinCap: boolean;
  /** Extra down payment (IDR) needed to reach the cap; 0 when already within. */
  shortfall: number;
}

export interface LtvAssessment {
  propertyValue: number;
  loanPrincipal: number;
  downPayment: number;
  /** Loan ÷ property value (decimal). */
  ltv: number;
  /** Down payment ÷ property value (decimal). */
  downPaymentRatio: number;
  tiers: LtvTierAssessment[];
}

export interface LtvParams {
  propertyValue: number;
  downPayment: number;
  financingMode: FinancingMode;
}

const EPS = 1e-9;

/**
 * Assesses a loan's LTV against the reference caps. Returns null when the
 * property value is non-positive (nothing meaningful to assess).
 */
export function assessLtv({ propertyValue, downPayment, financingMode }: LtvParams): LtvAssessment | null {
  if (!Number.isFinite(propertyValue) || propertyValue <= 0) return null;

  const dp = Math.min(Math.max(0, downPayment), propertyValue);
  const loanPrincipal = propertyValue - dp;
  const ltv = loanPrincipal / propertyValue;
  const bonus = financingMode === 'syariah' ? SYARIAH_LTV_BONUS : 0;

  const tiers: LtvTierAssessment[] = HOME_ORDERS.map((order) => {
    const maxLtv = Math.min(1, LTV_CAPS_CONVENTIONAL[order] + bonus);
    // Subtract a tiny epsilon before ceil so float noise (e.g. 1 - 0.85 =
    // 0.15000000000000002) doesn't push the min DP up by a rupiah.
    const minDownPayment = Math.ceil(propertyValue * (1 - maxLtv) - 1e-6);
    const withinCap = ltv <= maxLtv + EPS;
    const shortfall = withinCap ? 0 : Math.max(0, minDownPayment - dp);
    return { order, maxLtv, minDownPayment, withinCap, shortfall };
  });

  return {
    propertyValue,
    loanPrincipal,
    downPayment: dp,
    ltv,
    downPaymentRatio: dp / propertyValue,
    tiers,
  };
}
