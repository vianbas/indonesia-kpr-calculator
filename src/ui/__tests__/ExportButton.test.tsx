/**
 * Unit tests for ExportButton component.
 *
 * Covers:
 * - Download path uses buildPdfBlob + downloadBlob (not doc.save())
 * - Share path uses navigator.share when file-sharing is supported
 * - Share falls back to downloadBlob when navigator.canShare({ files }) is false
 * - AbortError from navigator.share does not show an error state
 * - Other errors during share fall back to downloadBlob (non-fatal)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ExportButton } from '../components/export/ExportButton';
import type { MortgageFormState } from '../../application/store/formTypes';
import type { MortgageSummary } from '../../domain/models/amortization.types';

// ─── Mock the export service dynamic import ───────────────────────────────────

const mockBlob = new Blob(['pdf'], { type: 'application/pdf' });
const mockFilename = 'SimulasiKPR_test.pdf';
const mockDownloadBlob = vi.fn();
const mockBuildPdfBlob = vi.fn().mockResolvedValue({ blob: mockBlob, filename: mockFilename });
const mockBuildMultiPdfBlob = vi.fn().mockResolvedValue({ blob: mockBlob, filename: 'PerbandinganKPR_test.pdf' });

vi.mock('../../infrastructure/pdf/exportService', () => ({
  buildPdfBlob:       async (...args: unknown[]) => mockBuildPdfBlob(...args),
  buildMultiPdfBlob:  async (...args: unknown[]) => mockBuildMultiPdfBlob(...args),
  exportToPdf:        vi.fn().mockResolvedValue(undefined),
  exportMultiScenarioPdf: vi.fn().mockResolvedValue(undefined),
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

const mockForm: MortgageFormState = {
  propertyPrice: '500000000', downPaymentMode: 'amount', downPaymentValue: '100000000',
  tenorYears: '10', tenorAdditionalMonths: '0', paymentMethod: 'annuity',
  startDate: '2024-01-01', calculationMethod: 'fixed_only',
  hasFixedPeriod: true, fixedRate: '7', fixedDurationMonths: '120',
  floatingBaseRate: '9', tiers: [],
  includeAdminFee: false, adminFeeAmount: '',
  includeKprFees: false, provisionFeePercent: '', appraisalFeeAmount: '',
  notaryFeePercent: '', bphtbPercent: '', ppnEnabled: false, ppnPercent: '',
  insuranceEnabled: false, lifeInsurancePremiumPercent: '', fireInsurancePremiumPercent: '',
  financingMode: 'conventional', syariahAkadType: 'murabahah',
  syariahMarginPercent: '', syariahUjrahPercent: '', syariahBankSharePercent: '',
  earlyRepaymentMode: 'none', extraMonthlyAmount: '', extraMonthlyStartMonth: '',
  extraMonthlyEndMonth: '', lumpSumAmount: '', lumpSumMonth: '',
};

const mockSummary: Partial<MortgageSummary> = {
  totalPrincipal: 400_000_000, totalInterest: 80_000_000, totalPayment: 480_000_000,
  effectiveAnnualRate: 0.07, installmentGroups: [], schedule: [],
  effectiveTenorMonths: 120, originalTenorMonths: 120, monthsSaved: 0,
  originalTotalInterest: 80_000_000, originalTotalPayment: 480_000_000,
  interestSaved: 0, interestSavedPercent: 0, adminFee: 0,
  downPayment: 100_000_000, provisionFee: 0, appraisalFee: 0, notaryFee: 0,
  bphtb: 0, ppnAmount: 0, lifeInsurance: 0, fireInsurance: 0, totalUpfrontCost: 0,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExportButton — download', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('calls buildPdfBlob then downloadBlob when download button is clicked', async () => {
    render(
      <ExportButton form={mockForm} summary={mockSummary as MortgageSummary} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /unduh simulasi kpr/i }));
    });

    expect(mockBuildPdfBlob).toHaveBeenCalledOnce();
    expect(mockDownloadBlob).toHaveBeenCalledWith(mockBlob, mockFilename);
  });

  it('shows error state when buildPdfBlob throws', async () => {
    mockBuildPdfBlob.mockRejectedValueOnce(new Error('jsPDF failed'));

    render(
      <ExportButton form={mockForm} summary={mockSummary as MortgageSummary} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /unduh simulasi kpr/i }));
    });

    expect(screen.getByText(/gagal membuat pdf/i)).toBeInTheDocument();
  });
});

describe('ExportButton — share', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete (navigator as unknown as Record<string, unknown>).share;
    delete (navigator as unknown as Record<string, unknown>).canShare;
  });

  it('calls navigator.share when file sharing is supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share',    { value: mockShare,    writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true });

    render(
      <ExportButton form={mockForm} summary={mockSummary as MortgageSummary} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bagikan simulasi kpr/i }));
    });

    expect(mockBuildPdfBlob).toHaveBeenCalledOnce();
    expect(mockShare).toHaveBeenCalledOnce();
    expect(mockDownloadBlob).not.toHaveBeenCalled();
  });

  it('falls back to downloadBlob when canShare({ files }) returns false', async () => {
    const mockShare  = vi.fn();
    const mockCanShare = vi.fn().mockReturnValue(false);
    Object.defineProperty(navigator, 'share',    { value: mockShare,    writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true });

    vi.useFakeTimers();

    render(
      <ExportButton form={mockForm} summary={mockSummary as MortgageSummary} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bagikan simulasi kpr/i }));
    });

    expect(mockShare).not.toHaveBeenCalled();
    expect(mockDownloadBlob).toHaveBeenCalledWith(mockBlob, mockFilename);
    expect(screen.getByText(/pdf diunduh/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('does not show error state when navigator.share throws AbortError', async () => {
    const abortError = new DOMException('User aborted', 'AbortError');
    const mockShare  = vi.fn().mockRejectedValue(abortError);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share',    { value: mockShare,    writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true });

    render(
      <ExportButton form={mockForm} summary={mockSummary as MortgageSummary} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bagikan simulasi kpr/i }));
    });

    expect(screen.queryByText(/gagal membuat pdf/i)).not.toBeInTheDocument();
  });

  it('falls back to downloadBlob when navigator.share throws non-abort error', async () => {
    const shareError = new Error('Network error');
    const mockShare  = vi.fn().mockRejectedValue(shareError);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share',    { value: mockShare,    writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true });

    vi.useFakeTimers();

    render(
      <ExportButton form={mockForm} summary={mockSummary as MortgageSummary} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bagikan simulasi kpr/i }));
    });

    expect(mockDownloadBlob).toHaveBeenCalledWith(mockBlob, mockFilename);
    expect(screen.queryByText(/gagal membuat pdf/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
