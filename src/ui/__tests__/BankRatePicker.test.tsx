// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BankRatePicker } from '../components/form/BankRatePicker';
import { BANK_RATES } from '../../data/bankRates';
import type { MortgageFormState } from '../../application/store/formTypes';

// ─── Fixture ──────────────────────────────────────────────────────────────────

const baseForm: MortgageFormState = {
  propertyPrice: '500000000',
  downPaymentMode: 'amount',
  downPaymentValue: '100000000',
  tenorYears: '15',
  tenorAdditionalMonths: '0',
  paymentMethod: 'annuity',
  startDate: '2024-01-01',
  calculationMethod: 'fixed_single_floating',
  hasFixedPeriod: false,
  fixedRate: '',
  fixedDurationMonths: '',
  floatingBaseRate: '',
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
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BankRatePicker', () => {
  afterEach(cleanup);

  it('renders with placeholder selected when form has no matching bank rate', () => {
    const dispatch = vi.fn();
    render(<BankRatePicker form={baseForm} dispatch={dispatch} />);
    const select = screen.getByRole<HTMLSelectElement>('combobox');
    expect(select.value).toBe('');
  });

  it('shows all bank rate options', () => {
    render(<BankRatePicker form={baseForm} dispatch={vi.fn()} />);
    for (const entry of BANK_RATES) {
      expect(screen.getByRole('option', { name: entry.label })).toBeInTheDocument();
    }
  });

  it('selects the matching option when form rates match a bank entry', () => {
    const bca2yr = BANK_RATES.find((b) => b.id === 'bca_2yr')!;
    const form: MortgageFormState = {
      ...baseForm,
      fixedRate: bca2yr.fixedRate,
      floatingBaseRate: bca2yr.floatingRate,
    };
    render(<BankRatePicker form={form} dispatch={vi.fn()} />);
    const select = screen.getByRole<HTMLSelectElement>('combobox');
    expect(select.value).toBe('bca_2yr');
  });

  it('dispatches SET_FIXED_RATE, SET_FIXED_DURATION_MONTHS, SET_FLOATING_BASE_RATE, and SET_HAS_FIXED_PERIOD when a bank is selected', () => {
    const dispatch = vi.fn();
    render(<BankRatePicker form={baseForm} dispatch={dispatch} />);

    const bca3yr = BANK_RATES.find((b) => b.id === 'bca_3yr')!;
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bca_3yr' } });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FIXED_RATE', value: bca3yr.fixedRate });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FIXED_DURATION_MONTHS', value: bca3yr.fixedDurationMonths });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FLOATING_BASE_RATE', value: bca3yr.floatingRate });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_HAS_FIXED_PERIOD', value: true });
  });

  it('does not dispatch SET_HAS_FIXED_PERIOD when calculationMethod is fixed_only', () => {
    const dispatch = vi.fn();
    const form: MortgageFormState = { ...baseForm, calculationMethod: 'fixed_only' };
    render(<BankRatePicker form={form} dispatch={dispatch} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'btn_5yr' } });

    const hasPeriodCalls = dispatch.mock.calls.filter(
      ([action]) => action.type === 'SET_HAS_FIXED_PERIOD',
    );
    expect(hasPeriodCalls).toHaveLength(0);
  });

  it('does nothing when the placeholder option is selected', () => {
    const dispatch = vi.fn();
    render(<BankRatePicker form={baseForm} dispatch={dispatch} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
