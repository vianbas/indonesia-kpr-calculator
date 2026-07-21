// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import i18n from '../../i18n';
import { OverCreditPanel } from '../components/overcredit/OverCreditPanel';
import { DEFAULT_OVER_CREDIT, type OverCreditFormState } from '../../application/store/overCreditTypes';
import { calculateOverCredit } from '../../domain/calculators/overCredit';

function toResult(form: OverCreditFormState) {
  const agreedPrice = parseFloat(form.agreedPrice);
  const newTenor = parseInt(form.newTenorMonths);
  const newRate = parseFloat(form.newAnnualRatePercent) / 100;
  if (!(agreedPrice > 0) || !(newTenor > 0) || Number.isNaN(newRate)) return null;
  return calculateOverCredit({
    agreedPrice,
    sellerRemainingPrincipal: parseFloat(form.sellerRemainingPrincipal) || 0,
    appraisalValue: parseFloat(form.appraisalValue) || 0,
    buyerDownPayment: parseFloat(form.buyerDownPayment) || 0,
    newAnnualRate: newRate,
    newTenorMonths: newTenor,
    isSameBank: form.isSameBank,
    provisionFeePercent: (parseFloat(form.provisionFeePercent) || 0) / 100,
    appraisalFeeIDR: parseFloat(form.appraisalFeeIDR) || 0,
    notaryFeeIDR: parseFloat(form.notaryFeeIDR) || 0,
    balikNamaFeeIDR: parseFloat(form.balikNamaFeeIDR) || 0,
    insuranceIDR: parseFloat(form.insuranceIDR) || 0,
    oldBankPenaltyPercent: (parseFloat(form.oldBankPenaltyPercent) || 0) / 100,
    npoptkp: parseFloat(form.npoptkp) || 0,
  });
}

function Harness({ initial }: { initial?: Partial<OverCreditFormState> }) {
  const [form, setForm] = useState<OverCreditFormState>({ ...DEFAULT_OVER_CREDIT, ...initial });
  return (
    <OverCreditPanel
      form={form}
      onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
      result={toResult(form)}
    />
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /over kredit/i }));
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

describe('OverCreditPanel', () => {
  it('renders the title and, once open, the deal inputs', () => {
    render(<Harness />);
    openPanel();
    expect(screen.getByLabelText(/agreed price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seller's remaining principal/i)).toBeInTheDocument();
  });

  it('shows the empty state until required fields are filled', () => {
    render(<Harness />);
    openPanel();
    expect(screen.getByText(/enter the agreed price/i)).toBeInTheDocument();
  });

  it('shows the hero cash-upfront number and installment once filled', () => {
    render(
      <Harness
        initial={{ agreedPrice: '800000000', sellerRemainingPrincipal: '500000000', buyerDownPayment: '200000000', newAnnualRatePercent: '9', newTenorMonths: '180' }}
      />,
    );
    openPanel();
    expect(screen.getByText('Cash You Need Upfront')).toBeInTheDocument();
    expect(screen.getByText('New Installment')).toBeInTheDocument();
  });

  it('shows the appraisal-shortfall warning when appraisal is below the agreed price', () => {
    render(
      <Harness
        initial={{ agreedPrice: '800000000', appraisalValue: '700000000', buyerDownPayment: '200000000', newAnnualRatePercent: '9', newTenorMonths: '180' }}
      />,
    );
    openPanel();
    expect(screen.getByText(/prepare an extra/i)).toBeInTheDocument();
  });
});
