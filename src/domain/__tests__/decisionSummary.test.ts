import { describe, it, expect } from 'vitest';
import { computeDecisionSummary } from '../calculators/decisionSummary';
import type { ScenarioDecisionInput, DecisionSummaryInput } from '../calculators/decisionSummary';
import type { AffordabilityResult } from '../calculators/affordability';
import type { LtvAssessment } from '../calculators/ltv';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAffordability(overrides: Partial<AffordabilityResult> = {}): AffordabilityResult {
  return {
    totalIncome: 10_000_000,
    firstInstallment: 3_000_000,
    highestInstallment: 3_500_000,
    installmentJump: 500_000,
    dsrNow: 0.30,
    dsrAtHighest: 0.35,
    netSurplusNow: 4_000_000,
    netSurplusAtHighest: 3_500_000,
    stressTest: [
      { rateOffsetPct: 0, annualRate: 0.09, installment: 3_500_000, dsr: 0.35, netSurplus: 3_500_000, band: 'safe' },
      { rateOffsetPct: 1, annualRate: 0.10, installment: 3_700_000, dsr: 0.37, netSurplus: 3_300_000, band: 'watch' },
      { rateOffsetPct: 2, annualRate: 0.11, installment: 3_900_000, dsr: 0.39, netSurplus: 3_100_000, band: 'risky' },
      { rateOffsetPct: 3, annualRate: 0.12, installment: 4_100_000, dsr: 0.41, netSurplus: 2_900_000, band: 'risky' },
    ],
    maxAffordableLoan: 400_000_000,
    minRecommendedIncome: 11_000_000,
    riskBand: 'safe',
    ...overrides,
  };
}

function makeScenario(
  id: 1 | 2 | 3,
  affordabilityOverrides: Partial<AffordabilityResult> = {},
  extra: Partial<Omit<ScenarioDecisionInput, 'id' | 'affordability'>> = {},
): ScenarioDecisionInput {
  return {
    id,
    label: `Skenario ${id}`,
    totalInterest: 200_000_000,
    totalPrincipal: 500_000_000,
    affordability: makeAffordability(affordabilityOverrides),
    maxDSR: 0.35,
    ...extra,
  };
}

function makeLtv(withinCap: boolean): LtvAssessment {
  const tier = { order: 'first' as const, maxLtv: 0.85, minDownPayment: 150_000_000, withinCap, shortfall: withinCap ? 0 : 50_000_000 };
  return {
    propertyValue: 1_000_000_000,
    loanPrincipal: withinCap ? 800_000_000 : 900_000_000,
    downPayment: withinCap ? 200_000_000 : 100_000_000,
    ltv: withinCap ? 0.80 : 0.90,
    downPaymentRatio: withinCap ? 0.20 : 0.10,
    tiers: [
      tier,
      { order: 'second', maxLtv: 0.80, minDownPayment: 200_000_000, withinCap: withinCap && false, shortfall: 0 },
      { order: 'third_plus', maxLtv: 0.75, minDownPayment: 250_000_000, withinCap: false, shortfall: 0 },
    ],
  };
}

function makeInput(overrides: Partial<DecisionSummaryInput> = {}): DecisionSummaryInput {
  return {
    activeScenarioId: 1,
    scenarios: [makeScenario(1)],
    ltvAssessment: makeLtv(true),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeDecisionSummary', () => {
  describe('incomplete state (no scenarios)', () => {
    it('returns incomplete verdict when no scenarios provided', () => {
      const result = computeDecisionSummary({ activeScenarioId: 1, scenarios: [], ltvAssessment: null });
      expect(result.verdict).toBe('incomplete');
      expect(result.flags).toHaveLength(0);
    });

    it('adds ltv_over flag when LTV fails first-home cap in incomplete state', () => {
      const result = computeDecisionSummary({
        activeScenarioId: 1,
        scenarios: [],
        ltvAssessment: makeLtv(false),
      });
      expect(result.verdict).toBe('incomplete');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].type).toBe('ltv_over');
      expect(result.flags[0].severity).toBe('warn');
    });

    it('has no ltv_over flag when LTV passes in incomplete state', () => {
      const result = computeDecisionSummary({
        activeScenarioId: 1,
        scenarios: [],
        ltvAssessment: makeLtv(true),
      });
      expect(result.flags).toHaveLength(0);
    });
  });

  describe('verdict reflects active scenario riskBand', () => {
    it('returns safe verdict for safe riskBand', () => {
      const result = computeDecisionSummary(makeInput());
      expect(result.verdict).toBe('safe');
    });

    it('returns watch verdict for watch riskBand', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { riskBand: 'watch' })],
      }));
      expect(result.verdict).toBe('watch');
    });

    it('returns risky verdict for risky riskBand', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { riskBand: 'risky', dsrAtHighest: 0.40 })],
      }));
      expect(result.verdict).toBe('risky');
    });
  });

  describe('flags', () => {
    it('emits dsr_over flag (critical) when dsrAtHighest > maxDSR', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { dsrAtHighest: 0.40, riskBand: 'risky' })],
      }));
      const flag = result.flags.find((f) => f.type === 'dsr_over');
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe('critical');
      expect(flag?.dsrPct).toBeCloseTo(40, 5);
      expect(flag?.maxDsrPct).toBeCloseTo(35, 5);
    });

    it('does NOT emit dsr_over flag when DSR is within limit', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { dsrAtHighest: 0.30 })],
      }));
      expect(result.flags.find((f) => f.type === 'dsr_over')).toBeUndefined();
    });

    it('emits negative_surplus flag (critical) when netSurplusAtHighest < 0', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { netSurplusAtHighest: -500_000, riskBand: 'risky' })],
      }));
      const flag = result.flags.find((f) => f.type === 'negative_surplus');
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe('critical');
    });

    it('emits rate_shock flag (warn) when +1% stress band is risky', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, {
          stressTest: [
            { rateOffsetPct: 0, annualRate: 0.09, installment: 3_500_000, dsr: 0.35, netSurplus: 3_500_000, band: 'safe' },
            { rateOffsetPct: 1, annualRate: 0.10, installment: 4_200_000, dsr: 0.42, netSurplus: 2_000_000, band: 'risky' },
            { rateOffsetPct: 2, annualRate: 0.11, installment: 4_500_000, dsr: 0.45, netSurplus: 1_500_000, band: 'risky' },
            { rateOffsetPct: 3, annualRate: 0.12, installment: 4_800_000, dsr: 0.48, netSurplus: 1_000_000, band: 'risky' },
          ],
        })],
      }));
      const flag = result.flags.find((f) => f.type === 'rate_shock');
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe('warn');
      expect(flag?.rateOffsetPct).toBe(1);
    });

    it('does NOT emit rate_shock flag when +1% stress band is watch (not risky)', () => {
      const result = computeDecisionSummary(makeInput());
      expect(result.flags.find((f) => f.type === 'rate_shock')).toBeUndefined();
    });

    it('emits ltv_over flag (warn) when LTV fails first-home cap', () => {
      const result = computeDecisionSummary(makeInput({ ltvAssessment: makeLtv(false) }));
      const flag = result.flags.find((f) => f.type === 'ltv_over');
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe('warn');
    });

    it('does NOT emit ltv_over flag when ltvAssessment is null', () => {
      const result = computeDecisionSummary(makeInput({ ltvAssessment: null }));
      expect(result.flags.find((f) => f.type === 'ltv_over')).toBeUndefined();
    });

    it('emits installment_jump flag (warn) when jump >= 15% of first installment', () => {
      // jump = 600k / first = 3M → 20% — above threshold
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { firstInstallment: 3_000_000, installmentJump: 600_000 })],
      }));
      const flag = result.flags.find((f) => f.type === 'installment_jump');
      expect(flag).toBeDefined();
      expect(flag?.jumpPct).toBeCloseTo(20, 5);
    });

    it('does NOT emit installment_jump flag when jump < 15% of first installment', () => {
      // jump = 300k / first = 3M → 10% — below threshold
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { firstInstallment: 3_000_000, installmentJump: 300_000 })],
      }));
      expect(result.flags.find((f) => f.type === 'installment_jump')).toBeUndefined();
    });

    it('does NOT emit installment_jump flag when firstInstallment is 0', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { firstInstallment: 0, installmentJump: 100_000 })],
      }));
      expect(result.flags.find((f) => f.type === 'installment_jump')).toBeUndefined();
    });
  });

  describe('best scenario selection', () => {
    it('returns no best scenario when only one scenario', () => {
      const result = computeDecisionSummary(makeInput());
      expect(result.bestScenarioId).toBeUndefined();
    });

    it('recommends the safe scenario with lowest total interest', () => {
      const result = computeDecisionSummary(makeInput({
        activeScenarioId: 1,
        scenarios: [
          makeScenario(1, { riskBand: 'safe' }, { totalInterest: 300_000_000 }),
          makeScenario(2, { riskBand: 'safe' }, { totalInterest: 200_000_000 }),
          makeScenario(3, { riskBand: 'risky' }, { totalInterest: 150_000_000 }),
        ],
      }));
      // Scenario 2 is safe with lowest interest (ignoring risky scenario 3)
      expect(result.bestScenarioId).toBe(2);
      expect(result.bestScenarioLabel).toBe('Skenario 2');
    });

    it('falls back to all scenarios when none are safe, picks lowest interest', () => {
      const result = computeDecisionSummary(makeInput({
        activeScenarioId: 1,
        scenarios: [
          makeScenario(1, { riskBand: 'risky' }, { totalInterest: 300_000_000 }),
          makeScenario(2, { riskBand: 'risky' }, { totalInterest: 200_000_000 }),
        ],
      }));
      expect(result.bestScenarioId).toBe(2);
    });

    it('returns no best scenario when the active scenario is already the best', () => {
      const result = computeDecisionSummary(makeInput({
        activeScenarioId: 2,
        scenarios: [
          makeScenario(1, { riskBand: 'safe' }, { totalInterest: 300_000_000 }),
          makeScenario(2, { riskBand: 'safe' }, { totalInterest: 200_000_000 }),
        ],
      }));
      expect(result.bestScenarioId).toBeUndefined();
    });

    it('tiebreaks by lowest id when total interest is equal', () => {
      const result = computeDecisionSummary(makeInput({
        activeScenarioId: 1,
        scenarios: [
          makeScenario(1, { riskBand: 'safe' }, { totalInterest: 200_000_000 }),
          makeScenario(2, { riskBand: 'safe' }, { totalInterest: 200_000_000 }),
        ],
      }));
      // id 1 wins tiebreak but it's the active — so no recommendation
      expect(result.bestScenarioId).toBeUndefined();
    });

    it('uses the correct active scenario when activeScenarioId differs from first', () => {
      const result = computeDecisionSummary(makeInput({
        activeScenarioId: 2,
        scenarios: [
          makeScenario(1, { riskBand: 'safe' }, { totalInterest: 200_000_000 }),
          makeScenario(2, { riskBand: 'watch' }, { totalInterest: 300_000_000 }),
        ],
      }));
      expect(result.verdict).toBe('watch');
      expect(result.bestScenarioId).toBe(1);
    });
  });

  describe('suggestions', () => {
    it('dsr_over flag carries add_income suggestion', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { dsrAtHighest: 0.40, riskBand: 'risky' })],
      }));
      const flag = result.flags.find((f) => f.type === 'dsr_over')!;
      const income = flag.suggestions.find((s) => s.type === 'add_income');
      expect(income).toBeDefined();
      expect(income!.amountIDR).toBeGreaterThan(0);
    });

    it('dsr_over flag carries reduce_loan when loan exceeds maxAffordableLoan', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { dsrAtHighest: 0.40, riskBand: 'risky', maxAffordableLoan: 400_000_000 }, { totalPrincipal: 600_000_000 })],
      }));
      const flag = result.flags.find((f) => f.type === 'dsr_over')!;
      const reduce = flag.suggestions.find((s) => s.type === 'reduce_loan');
      expect(reduce).toBeDefined();
      expect(reduce!.amountIDR).toBeGreaterThan(0);
    });

    it('dsr_over flag has no reduce_loan when loan <= maxAffordableLoan', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { dsrAtHighest: 0.40, riskBand: 'risky', maxAffordableLoan: 600_000_000 }, { totalPrincipal: 500_000_000 })],
      }));
      const flag = result.flags.find((f) => f.type === 'dsr_over')!;
      expect(flag.suggestions.find((s) => s.type === 'reduce_loan')).toBeUndefined();
    });

    it('negative_surplus flag carries add_income suggestion with deficit amount', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { netSurplusAtHighest: -500_000, riskBand: 'risky' })],
      }));
      const flag = result.flags.find((f) => f.type === 'negative_surplus')!;
      const income = flag.suggestions.find((s) => s.type === 'add_income');
      expect(income).toBeDefined();
      expect(income!.amountIDR).toBe(500_000);
    });

    it('rate_shock flag carries extend_fixed suggestion', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, {
          stressTest: [
            { rateOffsetPct: 0, annualRate: 0.09, installment: 3_500_000, dsr: 0.35, netSurplus: 3_500_000, band: 'safe' },
            { rateOffsetPct: 1, annualRate: 0.10, installment: 4_200_000, dsr: 0.42, netSurplus: 2_000_000, band: 'risky' },
            { rateOffsetPct: 2, annualRate: 0.11, installment: 4_500_000, dsr: 0.45, netSurplus: 1_500_000, band: 'risky' },
            { rateOffsetPct: 3, annualRate: 0.12, installment: 4_800_000, dsr: 0.48, netSurplus: 1_000_000, band: 'risky' },
          ],
        })],
      }));
      const flag = result.flags.find((f) => f.type === 'rate_shock')!;
      expect(flag.suggestions.find((s) => s.type === 'extend_fixed')).toBeDefined();
    });

    it('ltv_over flag carries add_dp suggestion with shortfall amount', () => {
      const result = computeDecisionSummary(makeInput({ ltvAssessment: makeLtv(false) }));
      const flag = result.flags.find((f) => f.type === 'ltv_over')!;
      const dp = flag.suggestions.find((s) => s.type === 'add_dp');
      expect(dp).toBeDefined();
      expect(dp!.amountIDR).toBe(50_000_000);
    });

    it('ltv_over in incomplete state carries add_dp suggestion', () => {
      const result = computeDecisionSummary({ activeScenarioId: 1, scenarios: [], ltvAssessment: makeLtv(false) });
      const flag = result.flags.find((f) => f.type === 'ltv_over')!;
      expect(flag.suggestions.find((s) => s.type === 'add_dp')).toBeDefined();
    });

    it('installment_jump flag has empty suggestions array', () => {
      const result = computeDecisionSummary(makeInput({
        scenarios: [makeScenario(1, { firstInstallment: 3_000_000, installmentJump: 600_000 })],
      }));
      const flag = result.flags.find((f) => f.type === 'installment_jump')!;
      expect(flag.suggestions).toHaveLength(0);
    });
  });
});
