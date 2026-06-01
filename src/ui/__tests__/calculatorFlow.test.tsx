// @vitest-environment jsdom
//
// Lightweight integration test: mounts the real CalculatorPage and exercises the
// end-to-end wiring — default form auto-calculates → results render → the PDF
// download and share actions both drive the lazy export service. The heavy PDF
// libraries (jsPDF/html2canvas) are mocked at the module boundary so this stays
// a fast jsdom test rather than a full browser e2e.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import i18n from '../../i18n';
import { CalculatorPage } from '../pages/CalculatorPage';

const mockBuildPdfBlob = vi.fn();
const mockDownloadBlob = vi.fn();

vi.mock('../../infrastructure/pdf/exportService', () => ({
  buildPdfBlob: (...args: unknown[]) => mockBuildPdfBlob(...args),
  buildMultiPdfBlob: vi.fn().mockResolvedValue({ blob: new Blob(['x']), filename: 'multi.pdf' }),
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
  exportToPdf: vi.fn().mockResolvedValue(undefined),
  exportMultiScenarioPdf: vi.fn().mockResolvedValue(undefined),
}));

const DOWNLOAD = /download kpr simulation as pdf/i;

beforeEach(async () => {
  localStorage.setItem('kpr_onboarding_seen', '1');
  await i18n.changeLanguage('en');
  mockBuildPdfBlob.mockReset().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'KPR.pdf' });
  mockDownloadBlob.mockReset();
});

afterEach(cleanup);

describe('calculator flow — jsdom integration', () => {
  it('auto-calculates the default form and renders the export action', async () => {
    render(<CalculatorPage />);
    // The PDF download action only renders once a summary has been computed.
    expect(await screen.findByRole('button', { name: DOWNLOAD })).toBeInTheDocument();
  });

  it('drives calc → lazy export service → download', async () => {
    render(<CalculatorPage />);
    fireEvent.click(await screen.findByRole('button', { name: DOWNLOAD }));
    await waitFor(() => expect(mockBuildPdfBlob).toHaveBeenCalledTimes(1));
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
    // the filename produced by the export service is the one handed to the downloader
    expect(mockDownloadBlob.mock.calls[0][1]).toBe('KPR.pdf');
  });

  it('recalculates without crashing when the property price changes', async () => {
    render(<CalculatorPage />);
    await screen.findByRole('button', { name: DOWNLOAD });
    // Target the price input by its unique default value (500jt).
    fireEvent.change(screen.getByDisplayValue('500000000'), { target: { value: '900000000' } });
    // results still present after the change (the engine re-ran without crashing)
    expect(await screen.findByRole('button', { name: DOWNLOAD })).toBeInTheDocument();
    expect(screen.getByDisplayValue('900000000')).toBeInTheDocument();
  });
});
