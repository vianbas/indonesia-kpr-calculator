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
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Advance past the 300 ms debounce and flush all pending React state updates. */
async function waitForCalc() {
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
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

      // Hero heading in SummaryCard (fixed+floating schedule → "Tetap Pertama")
      expect(screen.getByText('Cicilan Periode Tetap Pertama')).toBeInTheDocument();
      // Metric labels unique to SummaryCard (not present in the form or table headers)
      expect(screen.getByText('Total Bunga')).toBeInTheDocument();
      expect(screen.getByText('Total Pembayaran')).toBeInTheDocument();
      // "Saldo Akhir" also appears as an amortization table column header — use getAllBy
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
      // Default: 24-month fixed period then floating → "Perubahan Cicilan" section
      expect(screen.getByText('Perubahan Cicilan')).toBeInTheDocument();
    });
  });

  // ─── Amortization table ────────────────────────────────────────────────────

  describe('amortization table', () => {
    it('renders the "Tabel Amortisasi" heading', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      expect(screen.getByText('Tabel Amortisasi')).toBeInTheDocument();
    });

    it('renders all seven column headers', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      // "Bln", "Thn", "Cicilan", "Pokok", "Bunga", "Saldo Akhir" are unique to AmortizationTable
      const uniqueCols = ['Bln', 'Thn', 'Cicilan', 'Pokok', 'Bunga', 'Saldo Akhir'];
      for (const col of uniqueCols) {
        expect(screen.getByRole('columnheader', { name: col })).toBeInTheDocument();
      }
      // "Suku Bunga" also appears in InstallmentGroups — assert at least one instance
      expect(
        screen.getAllByRole('columnheader', { name: 'Suku Bunga' }).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders the total footer row', async () => {
      render(<CalculatorPage />);
      await waitForCalc();
      // Footer text: "Total (N bulan)"
      expect(screen.getByText(/^Total \(/)).toBeInTheDocument();
    });

    it('renders individual data rows for a short schedule (≤24 months, SmallScheduleTable path)', async () => {
      const { container } = render(<CalculatorPage />);

      // Disable the fixed period so there is only a floating rate
      fireEvent.click(
        screen.getByRole('checkbox', { name: /suku bunga tetap/i }),
      );
      // Reduce tenor to 1 year (12 rows < VIRTUALIZE_THRESHOLD of 24)
      const tenorYearsInput = container.querySelector('#tenor-years') as HTMLInputElement;
      fireEvent.change(tenorYearsInput, { target: { value: '1' } });

      await waitForCalc();

      // thead row + 12 tbody rows + tfoot row = 14 total
      expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(13);
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
      // Debounce not yet advanced → summary is still null → ExportButton not rendered
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
      // Default mode is percent; placeholder is "20"
      fireEvent.change(screen.getByPlaceholderText('20'), { target: { value: '100' } });
      await waitForCalc();

      // Error appears both inline (next to DP input) and in ValidationErrorState panel
      expect(
        screen.getAllByText(/melebihi atau sama dengan harga properti/i).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('down payment: hint shows derived IDR amount as the user types a percent', () => {
      render(<CalculatorPage />);
      fireEvent.change(screen.getByPlaceholderText('20'), { target: { value: '25' } });
      // 25% of 500M = 125M → formatted as "Rp 125.000.000"
      expect(screen.getByText(/125\.000\.000/)).toBeInTheDocument();
    });
  });

  // ─── Tiered floating interest rate ────────────────────────────────────────

  describe('tiered floating interest rate', () => {
    it('shows TierBuilder with Tier 1 after switching to tiered mode', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Berjenjang \(Tiered\)/i }));
      expect(screen.getByText('Tier 1')).toBeInTheDocument();
    });

    it('auto-creates a single tier starting at month 25 (after fixed period)', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Berjenjang \(Tiered\)/i }));
      // fixedDurationMonths = "24" → floating starts at month 25
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('shows "Tambah Tier" button once at least one tier exists', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Berjenjang \(Tiered\)/i }));
      expect(screen.getByRole('button', { name: /Tambah Tier/i })).toBeInTheDocument();
    });

    it('produces calculation results with the auto-created tiered setup', async () => {
      render(<CalculatorPage />);
      // Reducer creates one tier covering months 25–120 at rate "11" (= floatingBaseRate)
      fireEvent.click(screen.getByRole('button', { name: /Berjenjang \(Tiered\)/i }));
      await waitForCalc();

      expect(screen.getByText('Tabel Amortisasi')).toBeInTheDocument();
      expect(screen.getByText('Tier 1')).toBeInTheDocument();
    });

    it('adds Tier 2 when user clicks "Tambah Tier"', () => {
      render(<CalculatorPage />);
      fireEvent.click(screen.getByRole('button', { name: /Berjenjang \(Tiered\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /Tambah Tier/i }));
      expect(screen.getByText('Tier 2')).toBeInTheDocument();
    });
  });
});
