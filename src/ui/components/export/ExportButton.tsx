import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import type { MortgageFormState } from '../../../application/store/formTypes';
import type { MortgageSummary } from '../../../domain/models/amortization.types';
import type { AffordabilityExportData, RefinancingExportData } from '../../../infrastructure/pdf/exportService';

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
  /** When provided, a refinancing section is included in the PDF. */
  refinancing?: RefinancingExportData;
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

export function ExportButton({ form, summary, scenarios = [], affordability, refinancing }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'sharing' | 'downloaded' | 'error'>('idle');

  const isMulti = scenarios.length >= 2;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function handleExport() {
    setStatus('loading');
    try {
      const svc = await import('../../../infrastructure/pdf/exportService');
      let blob: Blob;
      let filename: string;
      if (isMulti) {
        ({ blob, filename } = await svc.buildMultiPdfBlob(scenarios, affordability, refinancing));
      } else {
        ({ blob, filename } = await svc.buildPdfBlob(form, summary, affordability, refinancing));
      }
      svc.downloadBlob(blob, filename);
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
        ({ blob, filename } = await svc.buildMultiPdfBlob(scenarios, affordability, refinancing));
      } else {
        ({ blob, filename } = await svc.buildPdfBlob(form, summary, affordability, refinancing));
      }

      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: isMulti ? t('export.shareTitle') : t('export.shareTitleOne'),
            files: [file],
          });
          setStatus('idle');
        } catch (shareErr) {
          if (shareErr instanceof DOMException && shareErr.name === 'AbortError') {
            setStatus('idle');
            return;
          }
          // navigator.share failed after blob was generated — fall back to download
          svc.downloadBlob(blob, filename);
          setStatus('downloaded');
          setTimeout(() => setStatus('idle'), 4000);
        }
      } else {
        // File sharing not supported on this browser — fall back to download
        svc.downloadBlob(blob, filename);
        setStatus('downloaded');
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch (err) {
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
            aria-label={isMulti ? t('export.shareAria') : t('export.shareAriaOne')}
          >
            {status === 'sharing' ? t('export.creating') : t('export.share')}
          </Button>
        )}
        <Button
          variant="primary"
          size="md"
          icon={status === 'loading' ? <SpinnerIcon /> : <DownloadIcon />}
          onClick={handleExport}
          disabled={isBusy}
          aria-label={isMulti ? t('export.downloadAria') : t('export.downloadAriaOne')}
        >
          {status === 'loading' ? t('export.creating') : isMulti ? t('export.downloadMulti') : t('export.download')}
        </Button>
      </div>

      {status === 'downloaded' && (
        <p className="text-xs text-green-600">
          {t('export.downloadedFallback')}
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-600">
          {t('export.error')}{' '}
          <button
            className="underline hover:text-red-800"
            onClick={() => setStatus('idle')}
          >
            {t('export.retry')}
          </button>
        </p>
      )}
    </div>
  );
}
