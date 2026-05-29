import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScenarioComparisonTable } from './ScenarioComparisonTable';
import { ChevronIcon } from '../common/ChevronIcon';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';
import type { AffordabilityExportData, RefinancingExportData } from '../../../infrastructure/pdf/exportService';

interface Props {
  scenarios: CalculatedScenario[];
  affordability?: AffordabilityExportData;
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

export function ScenarioComparisonPanel({ scenarios, affordability, refinancing }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleDownloadPdf(e: React.MouseEvent) {
    e.stopPropagation();
    setPdfStatus('loading');
    try {
      const svc = await import('../../../infrastructure/pdf/exportService');
      const { blob, filename } = await svc.buildMultiPdfBlob(scenarios, affordability, refinancing);
      svc.downloadBlob(blob, filename);
      setPdfStatus('idle');
    } catch {
      setPdfStatus('error');
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center bg-gray-50 hover:bg-gray-100 transition-colors">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
          aria-expanded={open}
        >
          <span>{t('scenarios.comparisonTitle')}</span>
          <ChevronIcon open={open} />
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={pdfStatus === 'loading'}
          title={t('export.downloadAria')}
          aria-label={t('export.downloadAria')}
          className="flex items-center gap-1.5 px-3 py-3 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 border-l border-gray-200 shrink-0"
        >
          {pdfStatus === 'loading' ? <SpinnerIcon /> : <DownloadIcon />}
          <span className="hidden sm:inline">{t('export.downloadMulti')}</span>
        </button>
      </div>

      {pdfStatus === 'error' && (
        <p className="px-4 py-1 text-xs text-red-600 bg-red-50">
          {t('export.error')}{' '}
          <button className="underline" onClick={() => setPdfStatus('idle')}>
            {t('export.retry')}
          </button>
        </p>
      )}

      {open && (
        <div className="p-4 bg-white">
          <ScenarioComparisonTable scenarios={scenarios} />
        </div>
      )}
    </div>
  );
}
