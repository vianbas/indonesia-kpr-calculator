import { useState } from 'react';
import { Button } from '../common/Button';
import type { MortgageFormState } from '../../../application/store/formTypes';
import type { MortgageSummary } from '../../../domain/models/amortization.types';
import type { AffordabilityExportData } from '../../../infrastructure/pdf/exportService';

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
  /** When provided, a section D (affordability) is included in the PDF. */
  affordability?: AffordabilityExportData;
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

const ShareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474l6.733-3.367A2.5 2.5 0 0 1 13 4.5Z" />
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

export function ExportButton({ form, summary, scenarios = [], affordability }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sharing' | 'error'>('idle');

  const isMulti = scenarios.length >= 2;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function handleExport() {
    setStatus('loading');
    try {
      const svc = await import('../../../infrastructure/pdf/exportService');
      if (isMulti) {
        await svc.exportMultiScenarioPdf(scenarios, affordability);
      } else {
        await svc.exportToPdf(form, summary, affordability);
      }
      setStatus('idle');
    } catch (err) {
      console.error('PDF export failed:', err);
      setStatus('error');
    }
  }

  async function handleShare() {
    setStatus('sharing');
    try {
      const svc = await import('../../../infrastructure/pdf/exportService');
      let blob: Blob;
      let filename: string;

      if (isMulti) {
        ({ blob, filename } = await svc.buildMultiPdfBlob(scenarios, affordability));
      } else {
        ({ blob, filename } = await svc.buildPdfBlob(form, summary, affordability));
      }

      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: isMulti ? 'Perbandingan KPR' : 'Simulasi KPR',
          files: [file],
        });
      } else {
        // Files not supported — fall back to URL download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      setStatus('idle');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User dismissed the native share sheet — not an error
        setStatus('idle');
        return;
      }
      console.error('PDF share failed:', err);
      setStatus('error');
    }
  }

  const isBusy = status === 'loading' || status === 'sharing';

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {canShare && (
          <Button
            variant="secondary"
            size="md"
            icon={status === 'sharing' ? <SpinnerIcon /> : <ShareIcon />}
            onClick={handleShare}
            disabled={isBusy}
            aria-label={
              isMulti
                ? 'Bagikan PDF perbandingan skenario'
                : 'Bagikan simulasi KPR sebagai PDF'
            }
          >
            {status === 'sharing' ? 'Membuat PDF…' : 'Bagikan PDF'}
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          icon={status === 'loading' ? <SpinnerIcon /> : <DownloadIcon />}
          onClick={handleExport}
          disabled={isBusy}
          aria-label={
            isMulti
              ? 'Unduh perbandingan skenario sebagai PDF'
              : 'Unduh simulasi KPR sebagai PDF'
          }
        >
          {status === 'loading' ? 'Membuat PDF…' : isMulti ? 'Unduh PDF Perbandingan' : 'Unduh PDF'}
        </Button>
      </div>

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
