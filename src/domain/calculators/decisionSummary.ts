import type { AffordabilityResult } from './affordability';
import type { LtvAssessment } from './ltv';
import type { ScenarioId } from '../../application/store/scenarioTypes';

export type DecisionVerdict = 'safe' | 'watch' | 'risky' | 'incomplete';

export type DecisionFlagType =
  | 'dsr_over'
  | 'negative_surplus'
  | 'rate_shock'
  | 'ltv_over'
  | 'installment_jump';

export interface DecisionSuggestion {
  type: 'add_dp' | 'add_income' | 'reduce_loan' | 'extend_fixed';
  amountIDR?: number;
}

export interface DecisionFlag {
  type: DecisionFlagType;
  severity: 'critical' | 'warn';
  // Raw numbers for the UI to format — only set for flag types that need them
  dsrPct?: number;
  maxDsrPct?: number;
  rateOffsetPct?: number;
  jumpPct?: number;
  suggestions: DecisionSuggestion[];
}

export interface ScenarioDecisionInput {
  id: ScenarioId;
  label: string;
  totalInterest: number;
  totalPrincipal: number;
  affordability: AffordabilityResult;
  maxDSR: number; // decimal, e.g. 0.35
}

export interface DecisionSummaryInput {
  activeScenarioId: ScenarioId;
  /** Populated only when income is entered. Empty array → incomplete state. */
  scenarios: ScenarioDecisionInput[];
  ltvAssessment: LtvAssessment | null;
}

export interface DecisionSummaryResult {
  verdict: DecisionVerdict;
  flags: DecisionFlag[];
  /** Present when ≥ 2 scenarios exist and a different one is recommended. */
  bestScenarioId?: ScenarioId;
  bestScenarioLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundUpTo1k(n: number): number {
  return Math.ceil(n / 1_000) * 1_000;
}

function buildFlags(s: ScenarioDecisionInput, ltvAssessment: LtvAssessment | null): DecisionFlag[] {
  const flags: DecisionFlag[] = [];
  const { affordability: r, maxDSR, totalPrincipal } = s;

  if (r.dsrAtHighest > maxDSR) {
    const incomeShortfall = roundUpTo1k(r.totalIncome * (r.dsrAtHighest / maxDSR - 1));
    const loanExcess = Math.max(0, totalPrincipal - r.maxAffordableLoan);
    const suggestions: DecisionSuggestion[] = [
      { type: 'add_income', amountIDR: incomeShortfall },
      ...(loanExcess > 0 ? [{ type: 'reduce_loan' as const, amountIDR: roundUpTo1k(loanExcess) }] : []),
    ];
    flags.push({
      type: 'dsr_over',
      severity: 'critical',
      dsrPct: r.dsrAtHighest * 100,
      maxDsrPct: maxDSR * 100,
      suggestions,
    });
  }

  if (r.netSurplusAtHighest < 0) {
    const deficit = roundUpTo1k(-r.netSurplusAtHighest);
    flags.push({
      type: 'negative_surplus',
      severity: 'critical',
      suggestions: [{ type: 'add_income', amountIDR: deficit }],
    });
  }

  // Rate shock: +1% pushes into risky territory
  if (r.stressTest[1]?.band === 'risky') {
    flags.push({ type: 'rate_shock', severity: 'warn', rateOffsetPct: 1, suggestions: [{ type: 'extend_fixed' }] });
  }

  if (ltvAssessment && !ltvAssessment.tiers[0].withinCap) {
    const shortfall = ltvAssessment.tiers[0].shortfall;
    flags.push({
      type: 'ltv_over',
      severity: 'warn',
      suggestions: shortfall > 0 ? [{ type: 'add_dp', amountIDR: shortfall }] : [],
    });
  }

  // Significant installment jump when floating kicks in (≥ 15% of first installment)
  if (r.firstInstallment > 0 && r.installmentJump / r.firstInstallment >= 0.15) {
    flags.push({
      type: 'installment_jump',
      severity: 'warn',
      jumpPct: (r.installmentJump / r.firstInstallment) * 100,
      suggestions: [],
    });
  }

  return flags;
}

function pickBestScenario(
  scenarios: ScenarioDecisionInput[],
  activeId: ScenarioId,
): { id: ScenarioId; label: string } | null {
  if (scenarios.length < 2) return null;

  const safe = scenarios.filter((s) => s.affordability.riskBand === 'safe');
  const pool = safe.length > 0 ? safe : scenarios;

  // Lowest total interest; tiebreak by id (deterministic)
  const best = pool.reduce((a, b) => {
    if (a.totalInterest !== b.totalInterest) return a.totalInterest < b.totalInterest ? a : b;
    return a.id < b.id ? a : b;
  });

  return best.id !== activeId ? { id: best.id, label: best.label } : null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeDecisionSummary(input: DecisionSummaryInput): DecisionSummaryResult {
  const { activeScenarioId, scenarios, ltvAssessment } = input;

  if (scenarios.length === 0) {
    const flags: DecisionFlag[] = [];
    if (ltvAssessment && !ltvAssessment.tiers[0].withinCap) {
      const shortfall = ltvAssessment.tiers[0].shortfall;
      flags.push({
        type: 'ltv_over',
        severity: 'warn',
        suggestions: shortfall > 0 ? [{ type: 'add_dp', amountIDR: shortfall }] : [],
      });
    }
    return { verdict: 'incomplete', flags };
  }

  const active = scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];
  const verdict: DecisionVerdict = active.affordability.riskBand;
  const flags = buildFlags(active, ltvAssessment);
  const best = pickBestScenario(scenarios, activeScenarioId);

  return {
    verdict,
    flags,
    ...(best ? { bestScenarioId: best.id, bestScenarioLabel: best.label } : {}),
  };
}
