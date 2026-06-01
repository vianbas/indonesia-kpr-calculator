import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import type { ScenarioForCsv } from '../../../infrastructure/csv/csvTypes';
import type { AffordabilityExportData } from '../../../infrastructure/pdf/exportService';

interface Props {
  /** All calculated scenarios to include (1–3). Empty → button disabled. */
  scenarios: ScenarioForCsv[];
  /** Optional affordability data; adds a risk-band column when present. */
  affordability?: AffordabilityExportData;
}

const CsvIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm4.75 6.75a.75.75 0 0 1 .75.75v4.19l1.22-1.22a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.22 1.22V9.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
  </svg>
);

const SpinnerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 animate-spin" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/**
 * Downloads scenario summary + amortization data as a single CSV. Works for one
 * scenario or a multi-scenario comparison. The heavy work is in a lazily
 * imported module so it stays out of the initial bundle.
 */
export function CsvExportButton({ scenarios, affordability }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const disabled = scenarios.length === 0;
  const isMulti = scenarios.length > 1;

  async function handleExport() {
    if (disabled) return;
    setStatus('loading');
    try {
      const { buildScenarioCsvBlob } = await import('../../../infrastructure/csv/csvExport');
      const { downloadBlob } = await import('../../../infrastructure/pdf/exportService');
      const { blob, filename } = buildScenarioCsvBlob(scenarios, affordability);
      downloadBlob(blob, filename);
      setStatus('idle');
    } catch (err) {
      console.error('CSV export failed:', err);
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="secondary"
        size="sm"
        className="sm:text-sm sm:px-4 sm:py-2 sm:gap-1.5"
        icon={status === 'loading' ? <SpinnerIcon /> : <CsvIcon />}
        onClick={handleExport}
        disabled={disabled || status === 'loading'}
        aria-label={isMulti ? t('export.downloadCsvAriaMulti') : t('export.downloadCsvAria')}
      >
        {status === 'loading' ? t('export.creating') : t('export.downloadCsv')}
      </Button>
      {status === 'error' && (
        <p className="text-xs text-red-600">
          {t('export.csvError')}{' '}
          <button className="underline hover:text-red-800" onClick={() => setStatus('idle')}>
            {t('export.retry')}
          </button>
        </p>
      )}
    </div>
  );
}
