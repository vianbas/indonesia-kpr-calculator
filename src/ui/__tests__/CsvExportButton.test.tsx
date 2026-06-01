// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { CsvExportButton } from '../components/export/CsvExportButton';
import type { ScenarioForCsv } from '../../infrastructure/csv/csvTypes';
import type { MortgageFormState } from '../../application/store/formTypes';
import type { MortgageSummary } from '../../domain/models/amortization.types';

// ─── Mock the lazily imported modules ─────────────────────────────────────────

const mockBuildScenarioCsvBlob = vi.fn().mockReturnValue({ blob: new Blob(['csv']), filename: 'SimulasiKPR_2026-06-01.csv' });
const mockDownloadBlob = vi.fn();

vi.mock('../../infrastructure/csv/csvExport', () => ({
  buildScenarioCsvBlob: (...args: unknown[]) => mockBuildScenarioCsvBlob(...args),
}));
vi.mock('../../infrastructure/pdf/exportService', () => ({
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}));

// ─── Fixture ────────────────────────────────────────────────────────────────

function makeScenario(label: string): ScenarioForCsv {
  return {
    label,
    form: {} as MortgageFormState,
    summary: { schedule: [], installmentGroups: [] } as unknown as MortgageSummary,
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockBuildScenarioCsvBlob.mockClear();
  mockDownloadBlob.mockClear();
});
afterEach(cleanup);

describe('CsvExportButton', () => {
  it('is disabled when there are no calculated scenarios', () => {
    render(<CsvExportButton scenarios={[]} />);
    expect(screen.getByRole('button', { name: /download .* as csv/i })).toBeDisabled();
  });

  it('is enabled with a single scenario and renders the CSV label', () => {
    render(<CsvExportButton scenarios={[makeScenario('Skenario 1')]} />);
    expect(screen.getByRole('button', { name: /download .* as csv/i })).not.toBeDisabled();
    expect(screen.getByText(/download csv/i)).toBeInTheDocument();
  });

  it('builds a CSV blob and triggers a download on click', async () => {
    render(<CsvExportButton scenarios={[makeScenario('Skenario 1'), makeScenario('Skenario 2')]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download .* as csv/i }));
    });
    await waitFor(() => expect(mockBuildScenarioCsvBlob).toHaveBeenCalledOnce());
    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'SimulasiKPR_2026-06-01.csv');
  });

  it('shows an error state when the builder throws', async () => {
    mockBuildScenarioCsvBlob.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    render(<CsvExportButton scenarios={[makeScenario('Skenario 1')]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download .* as csv/i }));
    });
    expect(await screen.findByText(/failed to generate csv/i)).toBeInTheDocument();
  });
});
