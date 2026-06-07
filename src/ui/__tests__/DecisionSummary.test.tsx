// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DecisionSummary } from '../components/decision/DecisionSummary';
import type { DecisionSummaryResult } from '../../domain/calculators/decisionSummary';

const riskyResult: DecisionSummaryResult = {
  verdict: 'risky',
  flags: [],
};

const safeResult: DecisionSummaryResult = {
  verdict: 'safe',
  flags: [],
};

const watchResult: DecisionSummaryResult = {
  verdict: 'watch',
  flags: [],
};

describe('DecisionSummary sandbox', () => {
  it('does not render sandbox when verdict is safe', () => {
    render(<DecisionSummary result={safeResult} onComputeSandbox={vi.fn()} />);
    expect(screen.queryByTestId('decision-sandbox')).not.toBeInTheDocument();
  });

  it('does not render sandbox when onComputeSandbox is not provided', () => {
    render(<DecisionSummary result={riskyResult} />);
    expect(screen.queryByTestId('decision-sandbox')).not.toBeInTheDocument();
  });

  it('renders sandbox when verdict is risky and callback is provided', () => {
    render(<DecisionSummary result={riskyResult} onComputeSandbox={vi.fn()} />);
    expect(screen.getByTestId('decision-sandbox')).toBeInTheDocument();
    expect(screen.getByTestId('sandbox-income-input')).toBeInTheDocument();
  });

  it('renders sandbox when verdict is watch and callback is provided', () => {
    render(<DecisionSummary result={watchResult} onComputeSandbox={vi.fn()} />);
    expect(screen.getByTestId('decision-sandbox')).toBeInTheDocument();
  });

  it('calls onComputeSandbox and shows verdict badge when income is typed', () => {
    const sandbox = vi.fn().mockReturnValue({ verdict: 'safe', flags: [] } satisfies DecisionSummaryResult);
    render(<DecisionSummary result={riskyResult} onComputeSandbox={sandbox} />);

    const input = screen.getByTestId('sandbox-income-input');
    fireEvent.change(input, { target: { value: '3000000' } });

    expect(sandbox).toHaveBeenCalledWith(3_000_000);
    expect(screen.getByTestId('sandbox-verdict-badge')).toBeInTheDocument();
  });

  it('does not show verdict badge when input is empty', () => {
    render(<DecisionSummary result={riskyResult} onComputeSandbox={vi.fn().mockReturnValue(null)} />);
    expect(screen.queryByTestId('sandbox-verdict-badge')).not.toBeInTheDocument();
  });
});
