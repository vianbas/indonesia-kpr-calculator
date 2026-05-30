import { describe, it, expect } from 'vitest';
import {
  assessFlpp,
  FLPP_SUBSIDIZED_ANNUAL_RATE,
  FLPP_MAX_TENOR_MONTHS,
} from '../calculators/flpp';
import { calculateAnnuityInstallment } from '../calculators/annuity';

const ELIGIBLE = {
  propertyPrice: 170_000_000,
  monthlyIncome: 6_000_000,
  loanPrincipal: 153_000_000, // 10% DP
  tenorMonths: 240,
  isFirstHome: true,
  priceCap: 185_000_000,
  incomeCap: 8_000_000,
};

describe('assessFlpp', () => {
  it('marks a within-caps first-home buyer as eligible', () => {
    const r = assessFlpp(ELIGIBLE);
    expect(r.eligibility).toMatchObject({
      priceOk: true,
      incomeOk: true,
      firstHomeOk: true,
      tenorOk: true,
      eligible: true,
    });
  });

  it('fails eligibility when the property price exceeds the cap', () => {
    const r = assessFlpp({ ...ELIGIBLE, propertyPrice: 250_000_000 });
    expect(r.eligibility.priceOk).toBe(false);
    expect(r.eligibility.eligible).toBe(false);
  });

  it('fails eligibility when income exceeds the cap', () => {
    const r = assessFlpp({ ...ELIGIBLE, monthlyIncome: 12_000_000 });
    expect(r.eligibility.incomeOk).toBe(false);
    expect(r.eligibility.eligible).toBe(false);
  });

  it('fails eligibility for a non-first-home buyer', () => {
    const r = assessFlpp({ ...ELIGIBLE, isFirstHome: false });
    expect(r.eligibility.firstHomeOk).toBe(false);
    expect(r.eligibility.eligible).toBe(false);
  });

  it('computes the subsidized installment at the fixed 5% rate', () => {
    const r = assessFlpp(ELIGIBLE);
    const expected = calculateAnnuityInstallment(
      ELIGIBLE.loanPrincipal,
      FLPP_SUBSIDIZED_ANNUAL_RATE,
      ELIGIBLE.tenorMonths,
    );
    expect(r.subsidizedInstallment).toBeCloseTo(expected, 0);
    expect(r.subsidizedTotalInterest).toBeGreaterThan(0);
  });

  it('clamps the subsidized tenor to the FLPP maximum and flags an over-long tenor', () => {
    const r = assessFlpp({ ...ELIGIBLE, tenorMonths: 300 });
    expect(r.subsidizedTenorMonths).toBe(FLPP_MAX_TENOR_MONTHS);
    expect(r.eligibility.tenorOk).toBe(false);
    expect(r.eligibility.eligible).toBe(false);
  });

  it('returns a zero installment when there is no loan principal', () => {
    const r = assessFlpp({ ...ELIGIBLE, loanPrincipal: 0 });
    expect(r.subsidizedInstallment).toBe(0);
    expect(r.subsidizedTotalInterest).toBe(0);
  });
});
