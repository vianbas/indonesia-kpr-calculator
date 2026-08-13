// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import i18n from '../../i18n';
import { RefinancingPanel } from '../components/refinancing/RefinancingPanel';
import {
  DEFAULT_REFINANCING,
  type RefinancingFormState,
} from '../../application/store/refinancingTypes';
import { calculateRefinancing } from '../../domain/calculators/refinancing';

const FILLED: Partial<RefinancingFormState> = {
  remainingBalance: '400000000',
  currentAnnualRatePercent: '10',
  remainingMonths: '240',
  newAnnualRatePercent: '8',
  newTenorMonths: '240',
  provisionFeePercent: '1',
  appraisalFeeIDR: '5000000',
  adminFeeIDR: '2000000',
};

// Mirrors the wiring in CalculatorPage so the panel is exercised end to end.
function toResult(form: RefinancingFormState) {
  const balance = parseFloat(form.remainingBalance);
  const currentRate = parseFloat(form.currentAnnualRatePercent) / 100;
  const remaining = parseInt(form.remainingMonths);
  const newRate = parseFloat(form.newAnnualRatePercent) / 100;
  const newTenor = parseInt(form.newTenorMonths);
  if (!(balance > 0 && currentRate > 0 && remaining > 0 && newRate > 0 && newTenor > 0)) {
    return null;
  }
  return calculateRefinancing({
    remainingBalance: balance,
    currentAnnualRate: currentRate,
    remainingMonths: remaining,
    newAnnualRate: newRate,
    newTenorMonths: newTenor,
    provisionFeePercent: (parseFloat(form.provisionFeePercent) || 0) / 100,
    penaltyFeePercent: (parseFloat(form.penaltyFeePercent) || 0) / 100,
    appraisalFeeIDR: parseFloat(form.appraisalFeeIDR) || 0,
    adminFeeIDR: parseFloat(form.adminFeeIDR) || 0,
  });
}

function Harness({ initial }: { initial?: Partial<RefinancingFormState> }) {
  const [form, setForm] = useState<RefinancingFormState>({
    ...DEFAULT_REFINANCING,
    ...initial,
  });
  return (
    <RefinancingPanel
      form={form}
      onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
      result={toResult(form)}
      activeScenario={null}
      onPrefill={() => {}}
    />
  );
}

const penaltyInput = () => screen.getByLabelText(/old bank penalty/i);

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

describe('RefinancingPanel — old-bank penalty', () => {
  it('renders the penalty as its own input, separate from the new bank provision', () => {
    render(<Harness />);
    expect(penaltyInput()).toBeInTheDocument();
    expect(screen.getByLabelText(/new bank provision/i)).toBeInTheDocument();
  });

  it('no longer labels the provision field as a penalty', () => {
    render(<Harness />);
    expect(screen.queryByLabelText(/provision \/ penalty/i)).not.toBeInTheDocument();
  });

  it('defaults the penalty to 0 so existing numbers are unchanged until it is set', () => {
    render(<Harness />);
    expect(penaltyInput()).toHaveValue(0);
  });

  it('adds the penalty to the switching-cost preview', () => {
    render(<Harness initial={FILLED} />);
    // 1% of 400M + 5M + 2M = 11M — the running total in the input group
    expect(screen.getByText(/Rp\s?11\.000\.000/, { selector: 'strong' })).toBeInTheDocument();

    fireEvent.change(penaltyInput(), { target: { value: '2' } });
    // + 2% of 400M = 19M
    expect(screen.getByText(/Rp\s?19\.000\.000/, { selector: 'strong' })).toBeInTheDocument();
  });

  it('breaks the switching cost down into provision and penalty on the result card', () => {
    render(<Harness initial={{ ...FILLED, penaltyFeePercent: '2' }} />);
    expect(screen.getByText(/new bank provision/i, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/old bank penalty/i, { selector: 'span' })).toBeInTheDocument();
    // 1% and 2% of 400M
    expect(screen.getByText(/Rp\s?4\.000\.000/, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?8\.000\.000/, { selector: 'span' })).toBeInTheDocument();
  });

  it('pushes break-even later once a penalty is entered', () => {
    render(<Harness initial={FILLED} />);
    const before = screen.getByText(/\d+ months/).textContent;

    fireEvent.change(penaltyInput(), { target: { value: '2' } });
    const after = screen.getByText(/\d+ months/).textContent;

    expect(parseInt(after!)).toBeGreaterThan(parseInt(before!));
  });

  it('nudges the user when a balance is entered but no penalty is set', () => {
    render(<Harness initial={FILLED} />);
    expect(screen.getByText(/early-settlement penalty/i)).toBeInTheDocument();
  });

  it('drops the nudge once a penalty is entered', () => {
    render(<Harness initial={{ ...FILLED, penaltyFeePercent: '2' }} />);
    expect(screen.queryByText(/early-settlement penalty/i)).not.toBeInTheDocument();
  });

  it('keeps the nudge hidden while the form is still empty', () => {
    render(<Harness />);
    expect(screen.queryByText(/early-settlement penalty/i)).not.toBeInTheDocument();
  });
});
