// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DecisionSummary } from '../components/decision/DecisionSummary';
import type { DecisionSummaryResult } from '../../domain/calculators/decisionSummary';
import type { AffordabilityResult } from '../../domain/calculators/affordability';

const riskyResult: DecisionSummaryResult = { verdict: 'risky', flags: [] };
const safeResult: DecisionSummaryResult = { verdict: 'safe', flags: [] };
const watchResult: DecisionSummaryResult = { verdict: 'watch', flags: [] };

const mockAffordability: AffordabilityResult = {
  totalIncome: 10_000_000,
  firstInstallment: 4_000_000,
  highestInstallment: 4_500_000,
  installmentJump: 500_000,
  dsrNow: 0.40,
  dsrAtHighest: 0.45,
  netSurplusNow: 2_000_000,
  netSurplusAtHighest: 1_500_000,
  stressTest: [],
  maxAffordableLoan: 400_000_000,
  minRecommendedIncome: 12_857_143,
  riskBand: 'risky',
};

describe('DecisionSummary — DSR gauge', () => {
  it('renders gauge when activeAffordability is provided and verdict is not incomplete', () => {
    render(<DecisionSummary result={riskyResult} activeAffordability={mockAffordability} maxDSR={0.35} />);
    expect(screen.getByTestId('dsr-gauge')).toBeInTheDocument();
  });

  it('does not render gauge when activeAffordability is absent', () => {
    render(<DecisionSummary result={riskyResult} />);
    expect(screen.queryByTestId('dsr-gauge')).not.toBeInTheDocument();
  });

  it('does not render gauge when verdict is incomplete', () => {
    render(<DecisionSummary result={{ verdict: 'incomplete', flags: [] }} activeAffordability={mockAffordability} />);
    expect(screen.queryByTestId('dsr-gauge')).not.toBeInTheDocument();
  });

  it('renders gauge for safe verdict', () => {
    render(
      <DecisionSummary
        result={safeResult}
        activeAffordability={{ ...mockAffordability, dsrAtHighest: 0.30, riskBand: 'safe' }}
        maxDSR={0.35}
      />,
    );
    expect(screen.getByTestId('dsr-gauge')).toBeInTheDocument();
  });
});

describe('DecisionSummary — min recommended income', () => {
  it('shows callout when verdict is risky and income below min recommended', () => {
    render(<DecisionSummary result={riskyResult} activeAffordability={mockAffordability} />);
    expect(screen.getByTestId('min-income-callout')).toBeInTheDocument();
  });

  it('shows callout when verdict is watch and income below min recommended', () => {
    render(<DecisionSummary result={watchResult} activeAffordability={mockAffordability} />);
    expect(screen.getByTestId('min-income-callout')).toBeInTheDocument();
  });

  it('does not show callout when income already meets minimum', () => {
    const okAffordability = { ...mockAffordability, totalIncome: 15_000_000, minRecommendedIncome: 12_857_143 };
    render(<DecisionSummary result={riskyResult} activeAffordability={okAffordability} />);
    expect(screen.queryByTestId('min-income-callout')).not.toBeInTheDocument();
  });

  it('does not show callout when verdict is safe', () => {
    render(<DecisionSummary result={safeResult} activeAffordability={mockAffordability} />);
    expect(screen.queryByTestId('min-income-callout')).not.toBeInTheDocument();
  });
});

describe('DecisionSummary — sandbox', () => {
  it('does not render sandbox when verdict is safe', () => {
    render(<DecisionSummary result={safeResult} onComputeSandbox={vi.fn()} />);
    expect(screen.queryByTestId('decision-sandbox')).not.toBeInTheDocument();
  });

  it('does not render sandbox when onComputeSandbox is not provided', () => {
    render(<DecisionSummary result={riskyResult} />);
    expect(screen.queryByTestId('decision-sandbox')).not.toBeInTheDocument();
  });

  it('renders sandbox with income and DP inputs when verdict is risky', () => {
    render(<DecisionSummary result={riskyResult} onComputeSandbox={vi.fn()} />);
    expect(screen.getByTestId('decision-sandbox')).toBeInTheDocument();
    expect(screen.getByTestId('sandbox-income-input')).toBeInTheDocument();
    expect(screen.getByTestId('sandbox-dp-input')).toBeInTheDocument();
  });

  it('renders sandbox when verdict is watch', () => {
    render(<DecisionSummary result={watchResult} onComputeSandbox={vi.fn()} />);
    expect(screen.getByTestId('decision-sandbox')).toBeInTheDocument();
  });

  it('calls onComputeSandbox with income and DP and shows verdict badge', () => {
    const sandbox = vi.fn().mockReturnValue({ verdict: 'safe', flags: [] } satisfies DecisionSummaryResult);
    render(<DecisionSummary result={riskyResult} onComputeSandbox={sandbox} />);

    fireEvent.change(screen.getByTestId('sandbox-income-input'), { target: { value: '3000000' } });
    expect(sandbox).toHaveBeenCalledWith(3_000_000, 0, 0);

    fireEvent.change(screen.getByTestId('sandbox-dp-input'), { target: { value: '50000000' } });
    expect(sandbox).toHaveBeenCalledWith(3_000_000, 50_000_000, 0);

    expect(screen.getByTestId('sandbox-verdict-badge')).toBeInTheDocument();
  });

  it('does not show verdict badge when both inputs are empty', () => {
    render(<DecisionSummary result={riskyResult} onComputeSandbox={vi.fn().mockReturnValue(null)} />);
    // both inputs start as '' → no sandboxResult
    expect(screen.queryByTestId('sandbox-verdict-badge')).not.toBeInTheDocument();
  });

  it('shows reset button only when sandbox values are changed from seeded defaults', () => {
    render(<DecisionSummary result={riskyResult} onComputeSandbox={vi.fn()} />);
    // initially no suggestions → both inputs empty → reset hidden
    expect(screen.queryByTestId('sandbox-reset')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('sandbox-income-input'), { target: { value: '1000000' } });
    expect(screen.getByTestId('sandbox-reset')).toBeInTheDocument();
  });
});
