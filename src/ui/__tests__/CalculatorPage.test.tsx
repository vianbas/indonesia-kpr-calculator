/**
 * Frontend integration tests for CalculatorPage.
 *
 * Renders the full page with the real hook, reducer, converter, validator, and
 * calculation engine. Only the PDF dynamic import is stubbed to keep jsPDF out
 * of the jsdom environment.
 *
 * Timing: useMortgageCalculator debounces recalculation by 300 ms.
 * Tests use vi.useFakeTimers() + waitForCalc() to control this.
 * fireEvent is used for all interactions (synchronous, no fake-timer deadlock).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { CalculatorPage } from '../pages/CalculatorPage';

// Stub the dynamically-imported PDF service (avoids pulling jsPDF into jsdom)
vi.mock('../../infrastructure/pdf/exportService', () => ({
  exportToPdf: vi.fn().mockResolvedValue(undefined),
  exportMultiScenarioPdf: vi.fn().mockResolvedValue(undefined),
  buildPdfBlob: vi.fn().mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'test.pdf' }),
  buildMultiPdfBlob: vi.fn().mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), filename: 'test.pdf' }),
  downloadBlob: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Advance past the 300 ms debounce and flush all pending React state updates. */
async function waitForCalc() {
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
}

/** Click the amortization collapse toggle to expand the table. */
function expandAmortization() {
  fireEvent.click(screen.getByRole('button', { name: /Tampilkan/i }));
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('CalculatorPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // ─── Empty / initial state ─────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders without throwing', () => {
      expect(() => render(<CalculatorPage />)).not.toThrow();
    });

    it('shows FormIncompleteState guidance before the debounce fires', () => {
      render(<CalculatorPage />);
      expect(screen.getByText('Simulasi KPR')).toBeInTheDocument();
      expect(screen.getByText(/Lengkapi formulir/i)).toBeInTheDocument();
    });

    it('renders all three form section headings', () => {
      render(<CalculatorPage />);
      expect(screen.getByRole('heading', { name: 'Informasi Kredit' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Suku Bunga Tetap/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Suku Bunga Variabel/i })).toBeInTheDocument();
    });

    it('does not render the PDF export button before calculation', () => {
      render(<CalculatorPage />);
      expect(
        screen.queryByRole('button', { name: /Unduh simulasi KPR/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ─── Simulation summary ────────────────────────────────────────────────────

  describe('simulation summary', () => {
    it('appears after the 300 ms debounce with the default valid form', async () => {
      render(<CalculatorPage />);
      await waitForCalc();

      expect(screen.getByText('Cicilan Periode Tetap Pertama')).toBeInTheDocument();
      expect(screen.getByText('Total Bunga')).toBeInTheDocument();
      expect(screen.getByText('Total Pembayaran')).toBeInTheDocument();
      expect(screen.getAllByText('Saldo Akhir').length).toBeGreaterThanOrEqual(1);
    });

    it('shows "Lunas" badge when the loan is fully repaid', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByText('Lunas')).toBeInTheDocument();
    });

    it('shows the effective annual rate metric', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByText('Suku Bunga Efektif')).toBeInTheDocument();
    });

    it('shows installment-change breakdown for fixed + floating schedules', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByText('Perubahan Cicilan')).toBeInTheDocument();
    });
  });

  // ─── Next-step actions (discoverability) ──────────────────────────────────

  describe('NextStepActions', () => {
    it('renders "Langkah Berikutnya" section after a successful calculation', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByText('Langkah Berikutnya')).toBeInTheDocument();
    });

    it('renders "Cek Kemampuan Bayar" CTA', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByRole('button', { name: /Cek Kemampuan Bayar/i })).toBeInTheDocument();
    });

    it('renders "Simulasi Refinancing" CTA', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByRole('button', { name: /Simulasi Refinancing/i })).toBeInTheDocument();
    });

    it('renders "Lihat Detail Angsuran" CTA', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      // Appears in both SummaryCard shortcut and NextStepActions
      expect(screen.getAllByRole('button', { name: /Lihat Detail Angsuran/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('does not render NextStepActions before calculation completes', () => {
      render(<CalculatorPage />);
      // debounce not advanced — no summary yet
      expect(screen.queryByText('Langkah Berikutnya')).not.toBeInTheDocument();
    });

    it('"Simulasi Refinancing" CTA does not throw when clicked', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /Simulasi Refinancing/i })),
      ).not.toThrow();
    });
  });

  // ─── Amortization table collapse ──────────────────────────────────────────

  describe('amortization table', () => {
    it('shows "Tabel Amortisasi" heading (in collapse toggle) after calculation', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByText('Tabel Amortisasi')).toBeInTheDocument();
    });

    it('is collapsed by default — column headers are not visible', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      // Column headers live inside the table; should not be present when collapsed
      expect(screen.queryByRole('columnheader', { name: 'Bulan' })).not.toBeInTheDocument();
    });

    it('shows "Tampilkan" toggle button when collapsed', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByRole('button', { name: /Tampilkan/i })).toBeInTheDocument();
    });

    it('expands and shows column headers when toggle is clicked', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expandAmortization();
      const uniqueCols = ['Bulan', 'Tahun', 'Cicilan', 'Pokok', 'Bunga'];
      for (const col of uniqueCols) {
        expect(screen.getByRole('columnheader', { name: col })).toBeInTheDocument();
      }
      expect(
        screen.getAllByRole('columnheader', { name: 'Suku Bunga' }).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders all seven column headers after expanding', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expandAmortization();
      const uniqueCols = ['Bulan', 'Tahun', 'Cicilan', 'Pokok', 'Bunga', 'Saldo Akhir'];
      for (const col of uniqueCols) {
        expect(screen.getByRole('columnheader', { name: col })).toBeInTheDocument();
      }
      expect(
        screen.getAllByRole('columnheader', { name: 'Suku Bunga' }).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders the total footer row after expanding', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expandAmortization();
      expect(screen.getByText(/^Total \(/)).toBeInTheDocument();
    });

    it('renders individual data rows for a short schedule after expanding (≤24 months, SmallScheduleTable path)', async () => {
      const { container } = render(<CalculatorPage />);

      fireEvent.click(
        screen.getByRole('checkbox', { name: /suku bunga tetap/i }),
      );
      const tenorYearsInput = container.querySelector('#tenor-years') as HTMLInputElement;
      fireEvent.change(tenorYearsInput, { target: { value: '1' } });

      await waitForCalc();
      expandAmortization();

      // thead row + 12 tbody rows + tfoot row = 14 total
      expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(13);
    });

    it('collapses again when toggle is clicked a second time', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      // Expand
      expandAmortization();
      expect(screen.getByRole('columnheader', { name: 'Bulan' })).toBeInTheDocument();
      // Collapse again
      fireEvent.click(screen.getByRole('button', { name: /Sembunyikan/i }));
      expect(screen.queryByRole('columnheader', { name: 'Bulan' })).not.toBeInTheDocument();
    });
  });

  // ─── PDF export button ─────────────────────────────────────────────────────

  describe('PDF export button', () => {
    it('is visible and enabled after a successful calculation', async () => {
      render(<CalculatorPage />);
      await waitForCalc();

      const btn = screen.getByRole('button', { name: /Unduh simulasi KPR/i });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    it('is absent before the first calculation completes', () => {
      render(<CalculatorPage />);
      expect(
        screen.queryByRole('button', { name: /Unduh simulasi KPR/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ─── User input interactions ───────────────────────────────────────────────

  describe('user input interactions', () => {
    it('property price: user can input a value and see a new calculation', async () => {
      render(<CalculatorPage />);
      await waitForCalc();

      fireEvent.change(screen.getByLabelText('Harga Properti'), {
        target: { value: '800000000' },
      });
      await waitForCalc();

      // After recalculation, the collapse toggle heading is still visible
      expect(screen.getByText('Tabel Amortisasi')).toBeInTheDocument();
    });

    it('property price: clearing the field returns to FormIncompleteState', async () => {
      render(<CalculatorPage />);
      await waitForCalc();

      fireEvent.change(screen.getByLabelText('Harga Properti'), { target: { value: '' } });
      await waitForCalc();

      expect(screen.getByText('Simulasi KPR')).toBeInTheDocument();
      expect(screen.queryByText('Tabel Amortisasi')).not.toBeInTheDocument();
    });

    it('down payment: shows inline error when DP equals 100% of property price', async () => {
      render(<CalculatorPage />);
      fireEvent.change(screen.getByPlaceholderText('20'), { target: { value: '100' } });
      await waitForCalc();

      expect(
        screen.getAllByText(/melebihi atau sama dengan harga properti/i).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('down payment: hint shows derived IDR amount as the user types a percent', () => {
      render(<CalculatorPage />);
      fireEvent.change(screen.getByPlaceholderText('20'), { target: { value: '25' } });
      expect(screen.getByText(/125\.000\.000/)).toBeInTheDocument();
    });
  });

  // ─── Tiered floating interest rate ────────────────────────────────────────

  describe('tiered floating interest rate', () => {
    it('shows TierBuilder with Tier 1 after switching to Fixed + Floating Bertingkat', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Fixed \+ Floating Bertingkat/i }));
      expect(screen.getByText('Tier 1')).toBeInTheDocument();
    });

    it('auto-creates a single tier starting at month 25 (after fixed period)', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Fixed \+ Floating Bertingkat/i }));
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('shows "Tambah Tier" button once at least one tier exists', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Fixed \+ Floating Bertingkat/i }));
      expect(screen.getByRole('button', { name: /Tambah Tier/i })).toBeInTheDocument();
    });

    it('produces calculation results with the auto-created tiered setup', async () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Fixed \+ Floating Bertingkat/i }));
      await waitForCalc();

      expect(screen.getByText('Tabel Amortisasi')).toBeInTheDocument();
      expect(screen.getByText('Tier 1')).toBeInTheDocument();
    });

    it('adds Tier 2 when user clicks "Tambah Tier"', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Fixed \+ Floating Bertingkat/i }));
      fireEvent.click(screen.getByRole('button', { name: /Tambah Tier/i }));
      expect(screen.getByText('Tier 2')).toBeInTheDocument();
    });
  });
});
