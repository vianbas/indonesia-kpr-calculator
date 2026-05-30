import { roundMoney } from '../utils/math';

/**
 * Buy vs Rent breakeven — a net-worth comparison.
 *
 * Both parties start with the same cash. The BUYER spends the upfront cash
 * (DP + fees) and pays the mortgage; their wealth is home equity (home value −
 * remaining loan balance). The RENTER invests that same upfront cash and, each
 * month, invests the difference between the buyer's installment and the rent
 * (drawing the portfolio down when rent exceeds the installment); their wealth
 * is the portfolio value. Breakeven is the first month the buyer's wealth
 * overtakes the renter's.
 */

export type BuyVsRentRecommendation = 'buy' | 'rent' | 'close';

export interface BuyVsRentMonthly {
  /** Installment due this month (principal + interest), IDR. */
  installment: number;
  /** Remaining loan balance at the END of this month, IDR. */
  closingBalance: number;
}

export interface BuyVsRentInput {
  /** Property value today, IDR. */
  propertyPrice: number;
  /** Upfront cash to buy: down payment + one-time fees, IDR. */
  upfrontCost: number;
  /** Per-month installment + closing balance, in month order. */
  schedule: BuyVsRentMonthly[];
  /** Rent for the comparable home, IDR/month at month 1. */
  monthlyRent: number;
  /** Annual rent growth (decimal, e.g. 0.05 = 5%/yr). */
  rentGrowthAnnual: number;
  /** Annual property appreciation (decimal). */
  appreciationAnnual: number;
  /** Annual return on the upfront cash if invested instead (decimal). */
  investmentReturnAnnual: number;
  /** Comparison horizon in months (clamped to the schedule length). */
  horizonMonths: number;
}

export interface BuyVsRentPoint {
  month: number;
  /** Buyer net worth (home equity) through this month. */
  buyerWealth: number;
  /** Renter net worth (invested portfolio) through this month. */
  renterWealth: number;
}

export interface BuyVsRentResult {
  /** First month the buyer's wealth overtakes the renter's; null if never within horizon. */
  breakEvenMonth: number | null;
  /** Yearly-sampled points (+ the final month) for summary/charting. */
  points: BuyVsRentPoint[];
  finalBuyerWealth: number;
  finalRenterWealth: number;
  /** Home value at the horizon, IDR. */
  finalHomeValue: number;
  recommendation: BuyVsRentRecommendation;
}

/** Compound growth factor over `month` months given an annual rate. */
function growth(annual: number, month: number): number {
  return Math.pow(1 + annual, month / 12);
}

export function calculateBuyVsRent(input: BuyVsRentInput): BuyVsRentResult {
  const {
    propertyPrice,
    upfrontCost,
    schedule,
    monthlyRent,
    rentGrowthAnnual,
    appreciationAnnual,
    investmentReturnAnnual,
    horizonMonths,
  } = input;

  const horizon = Math.max(1, Math.min(horizonMonths, schedule.length));
  const monthlyInvReturn = investmentReturnAnnual / 12;

  // Renter starts by investing the cash the buyer spent upfront.
  let portfolio = upfrontCost;
  let breakEvenMonth: number | null = null;
  const points: BuyVsRentPoint[] = [];

  let finalBuyerWealth = 0;
  let finalRenterWealth = 0;
  let finalHomeValue = propertyPrice;

  for (let m = 1; m <= horizon; m++) {
    const row = schedule[m - 1];

    // Rent steps up once per completed year.
    const rentThisMonth = monthlyRent * Math.pow(1 + rentGrowthAnnual, Math.floor((m - 1) / 12));

    // Renter invests the gap between the buyer's installment and the rent
    // (negative when rent is dearer, i.e. the portfolio is drawn down).
    portfolio = portfolio * (1 + monthlyInvReturn) + (row.installment - rentThisMonth);

    const homeValue = propertyPrice * growth(appreciationAnnual, m);
    const buyerWealth = homeValue - row.closingBalance;

    if (breakEvenMonth === null && buyerWealth >= portfolio) {
      breakEvenMonth = m;
    }

    if (m % 12 === 0 || m === horizon) {
      points.push({ month: m, buyerWealth: roundMoney(buyerWealth), renterWealth: roundMoney(portfolio) });
    }

    finalBuyerWealth = roundMoney(buyerWealth);
    finalRenterWealth = roundMoney(portfolio);
    finalHomeValue = roundMoney(homeValue);
  }

  const diff = finalBuyerWealth - finalRenterWealth; // positive → buying is ahead
  const threshold = 0.05 * Math.max(Math.abs(finalBuyerWealth), Math.abs(finalRenterWealth), 1);
  let recommendation: BuyVsRentRecommendation;
  if (Math.abs(diff) <= threshold) recommendation = 'close';
  else if (diff > 0) recommendation = 'buy';
  else recommendation = 'rent';

  return { breakEvenMonth, points, finalBuyerWealth, finalRenterWealth, finalHomeValue, recommendation };
}
