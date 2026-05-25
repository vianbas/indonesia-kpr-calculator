import { useState } from 'react';
import { Button } from '../common/Button';
import type { MortgageFormState } from '../../../application/store/formTypes';
import type { MortgageSummary } from '../../../domain/models/amortization.types';

interface ScenarioExportItem {
  label: string;
  form: MortgageFormState;
  summary: MortgageSummary;
}

interface Props {
  form: MortgageFormState;
  summary: MortgageSummary;
  /** When ≥ 2 items, exports a multi-scenario comparison PDF instead of single. */
  scenarios?: ScenarioExportItem[];
}

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className="w-4 h-4 animate-spin"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export function ExportButton({ form, summary, scenarios = [] }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const isMulti = scenarios.length >= 2;

  async function handleExport() {
    setStatus('loading');
    try {
      const svc = await import('../../../infrastructure/pdf/exportService');
      if (isMulti) {
        await svc.exportMultiScenarioPdf(scenarios);
      } else {
        await svc.exportToPdf(form, summary);
      }
      setStatus('idle');
    } catch (err) {
      console.error('PDF export failed:', err);
      setStatus('error');
    }
  }

  const isLoading = status === 'loading';

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="primary"
        size="md"
        icon={isLoading ? <SpinnerIcon /> : <DownloadIcon />}
        onClick={handleExport}
        disabled={isLoading}
        aria-label={
          isMulti
            ? 'Unduh perbandingan skenario sebagai PDF'
            : 'Unduh simulasi KPR sebagai PDF'
        }
      >
        {isLoading ? 'Membuat PDF…' : isMulti ? 'Unduh PDF Perbandingan' : 'Unduh PDF'}
      </Button>

      {status === 'error' && (
        <p className="text-xs text-red-600">
          Gagal membuat PDF.{' '}
          <button
            className="underline hover:text-red-800"
            onClick={() => setStatus('idle')}
          >
            Coba lagi
          </button>
        </p>
      )}
    </div>
  );
}
