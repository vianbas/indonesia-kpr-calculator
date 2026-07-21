import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { OverCreditInputs } from './OverCreditInputs';
import { OverCreditResultCard } from './OverCreditResultCard';
import { ChevronIcon } from '../common/ChevronIcon';
import type { OverCreditFormState } from '../../../application/store/overCreditTypes';
import type { OverCreditResult } from '../../../domain/calculators/overCredit';

interface Props {
  form: OverCreditFormState;
  onChange: <K extends keyof OverCreditFormState>(key: K, value: OverCreditFormState[K]) => void;
  result: OverCreditResult | null;
}

export function OverCreditPanel({ form, onChange, result }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        id={`${panelId}-btn`}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        data-jump-toggle
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>{t('overCredit.title')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white" id={panelId} role="region" aria-labelledby={`${panelId}-btn`}>
          <div className="p-4 border-b border-gray-100">
            <OverCreditInputs form={form} onChange={onChange} />
          </div>

          <div className="p-4">
            {result ? (
              <OverCreditResultCard result={result} />
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">{t('overCredit.promptFill')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
