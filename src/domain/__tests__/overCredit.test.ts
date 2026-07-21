import { describe, it, expect } from 'vitest';
import { calculateOverCredit } from '../calculators/overCredit';
import type { OverCreditInput } from '../calculators/overCredit';

function makeInput(overrides: Partial<OverCreditInput> = {}): OverCreditInput {
  return {
    agreedPrice: 800_000_000,
    sellerRemainingPrincipal: 500_000_000,
    appraisalValue: 0, // 0 → treated as agreedPrice
    buyerDownPayment: 200_000_000,
    newAnnualRate: 0.09,
    newTenorMonths: 180,
    isSameBank: true,
    provisionFeePercent: 0.01,
    appraisalFeeIDR: 3_000_000,
    notaryFeeIDR: 5_000_000,
    balikNamaFeeIDR: 4_000_000,
    insuranceIDR: 6_000_000,
    oldBankPenaltyPercent: 0,
    npoptkp: 60_000_000,
    ...overrides,
  };
}

describe('calculateOverCredit', () => {
  it('seller equity = agreed price minus seller remaining principal', () => {
    const r = calculateOverCredit(makeInput());
    expect(r.sellerEquity).toBe(300_000_000); // 800M - 500M
  });

  it('clamps seller equity to 0 and flags negative equity when principal exceeds price', () => {
    const r = calculateOverCredit(makeInput({ sellerRemainingPrincipal: 900_000_000 }));
    expect(r.sellerEquity).toBe(0);
    expect(r.flags).toContain('seller_negative_equity');
  });

  it('new loan amount = agreed price minus buyer down payment', () => {
    const r = calculateOverCredit(makeInput());
    expect(r.newLoanAmount).toBe(600_000_000); // 800M - 200M
  });

  it('new loan amount clamps to 0 when down payment covers the whole price', () => {
    const r = calculateOverCredit(makeInput({ buyerDownPayment: 800_000_000 }));
    expect(r.newLoanAmount).toBe(0);
    expect(r.newMonthlyPayment).toBe(0);
  });

  it('computes BPHTB as 5% of (agreed price - NPOPTKP)', () => {
    const r = calculateOverCredit(makeInput());
    // 5% of (800M - 60M) = 5% of 740M = 37M
    expect(r.bphtb).toBe(37_000_000);
  });

  it('BPHTB is 0 when agreed price is at or below NPOPTKP', () => {
    const r = calculateOverCredit(makeInput({ agreedPrice: 50_000_000, buyerDownPayment: 0, sellerRemainingPrincipal: 0 }));
    expect(r.bphtb).toBe(0);
  });

  it('applies no old-bank penalty when same bank', () => {
    const r = calculateOverCredit(makeInput({ isSameBank: true, oldBankPenaltyPercent: 0.02 }));
    expect(r.oldBankPenalty).toBe(0);
  });

  it('applies old-bank penalty on seller remaining principal when different bank', () => {
    const r = calculateOverCredit(makeInput({ isSameBank: false, oldBankPenaltyPercent: 0.02 }));
    expect(r.oldBankPenalty).toBe(10_000_000); // 2% of 500M
  });

  it('flags penalty_maybe_applies when different bank but penalty percent is 0', () => {
    const r = calculateOverCredit(makeInput({ isSameBank: false, oldBankPenaltyPercent: 0 }));
    expect(r.flags).toContain('penalty_maybe_applies');
    expect(r.oldBankPenalty).toBe(0);
  });

  it('total process cost sums provision, fixed fees, BPHTB and penalty', () => {
    const r = calculateOverCredit(makeInput());
    // provision 1% of 600M = 6M; +appraisal 3M +notary 5M +balikNama 4M +insurance 6M +bphtb 37M +penalty 0
    expect(r.provisionFee).toBe(6_000_000);
    expect(r.totalProcessCost).toBe(61_000_000);
  });

  it('buyer cash upfront = down payment + total process cost', () => {
    const r = calculateOverCredit(makeInput());
    // 200M DP + 61M process = 261M
    expect(r.buyerCashUpfront).toBe(261_000_000);
  });

  it('reports appraisal shortfall and flags it when appraisal < agreed price', () => {
    const r = calculateOverCredit(makeInput({ appraisalValue: 700_000_000 }));
    expect(r.appraisalShortfall).toBe(100_000_000); // 800M - 700M
    expect(r.flags).toContain('appraisal_shortfall');
  });

  it('has zero appraisal shortfall when appraisal >= agreed price or left empty', () => {
    const r = calculateOverCredit(makeInput({ appraisalValue: 0 }));
    expect(r.appraisalShortfall).toBe(0);
    expect(r.flags).not.toContain('appraisal_shortfall');
  });

  it('computes effective LTV against appraisal and flags when over the 0.85 guardrail', () => {
    // newLoan 600M / appraisal 800M = 0.75 → within guardrail
    const within = calculateOverCredit(makeInput());
    expect(within.effectiveLtv).toBeCloseTo(0.75, 5);
    expect(within.flags).not.toContain('ltv_over_guardrail');
    // Small DP → high LTV: newLoan 760M / 800M = 0.95 → over guardrail
    const over = calculateOverCredit(makeInput({ buyerDownPayment: 40_000_000 }));
    expect(over.effectiveLtv).toBeCloseTo(0.95, 5);
    expect(over.flags).toContain('ltv_over_guardrail');
  });

  it('total cost of acquisition = cash upfront + total of all installments', () => {
    const r = calculateOverCredit(makeInput());
    expect(r.totalCostOfAcquisition).toBe(r.buyerCashUpfront + r.newTotalPayment);
  });
});
