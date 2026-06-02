// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import i18n from '../../i18n';
import { LtvIndicator } from '../components/results/LtvIndicator';
import type { MortgageFormState } from '../../application/store/formTypes';

// Minimal form that yields a valid loan valuation (price + DP present).
function makeForm(overrides: Partial<MortgageFormState> = {}): MortgageFormState {
  return {
    propertyPrice: '1000000000',
    downPaymentMode: 'percent',
    downPaymentValue: '20',
    tenorYears: '15',
    tenorAdditionalMonths: '0',
    paymentMethod: 'annuity',
    startDate: '2024-01-01',
    calculationMethod: 'fixed_only',
    hasFixedPeriod: true,
    fixedRate: '7',
    fixedDurationMonths: '180',
    floatingBaseRate: '11',
    tiers: [],
    includeAdminFee: false,
    adminFeeAmount: '',
    includeKprFees: false,
    provisionFeePercent: '',
    appraisalFeeAmount: '',
    notaryFeePercent: '',
    bphtbPercent: '',
    ppnEnabled: false,
    ppnPercent: '',
    insuranceEnabled: false,
    lifeInsurancePremiumPercent: '',
    fireInsurancePremiumPercent: '',
    financingMode: 'conventional',
    syariahAkadType: 'murabahah',
    syariahMarginPercent: '',
    syariahUjrahPercent: '',
    syariahBankSharePercent: '',
    earlyRepaymentMode: 'none',
    extraMonthlyAmount: '',
    extraMonthlyStartMonth: '',
    extraMonthlyEndMonth: '',
    lumpSums: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

describe('LtvIndicator — mode-aware terminology', () => {
  it('shows LTV labels for conventional financing', () => {
    render(<LtvIndicator form={makeForm()} />);
    expect(screen.getByText('Loan-to-Value (LTV)')).toBeInTheDocument();
    expect(screen.getByText(/^LTV \d+%$/)).toBeInTheDocument();
  });

  it('shows FTV labels for Syariah financing', () => {
    render(<LtvIndicator form={makeForm({ financingMode: 'syariah' })} />);
    expect(screen.getByText('Financing-to-Value (FTV)')).toBeInTheDocument();
    expect(screen.getByText(/^FTV \d+%$/)).toBeInTheDocument();
    expect(screen.queryByText('Loan-to-Value (LTV)')).not.toBeInTheDocument();
  });
});
