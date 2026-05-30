import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InputField } from '../common/InputField';
import { ChevronIcon } from '../common/ChevronIcon';
import { formatIDR, formatIDRCompact, formatTenor } from '../../../domain/utils/currency';
import type { FlppFormState } from '../../../application/store/flppTypes';
import type { FlppResult } from '../../../domain/calculators/flpp';

interface Props {
  form: FlppFormState;
  onChange: <K extends keyof FlppFormState>(key: K, value: FlppFormState[K]) => void;
  result: FlppResult | null;
  /** First-period installment of the active scenario, for savings comparison. */
  currentInstallment: number | null;
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      <span className={ok ? 'text-green-600' : 'text-red-500'} aria-hidden="true">
        {ok ? '✓' : '✗'}
      </span>
      <span className={ok ? 'text-gray-600' : 'text-red-600'}>{label}</span>
    </li>
  );
}

export function FlppPanel({ form, onChange, result, currentInstallment }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const savings =
    result && currentInstallment !== null
      ? currentInstallment - result.subsidizedInstallment
      : null;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        aria-expanded={open}
      >
        <span>{t('flpp.title')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white">
          {/* Inputs */}
          <div className="p-4 border-b border-gray-100 space-y-4">
            <p className="text-xs text-gray-500">{t('flpp.intro')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InputField
                label={t('flpp.monthlyIncome')}
                value={form.monthlyIncome}
                onChange={(v) => onChange('monthlyIncome', v)}
                type="number"
                prefix="Rp"
                placeholder="0"
                min="0"
                step="500000"
                hint={t('flpp.monthlyIncomeHint')}
              />
              <InputField
                label={t('flpp.priceCap')}
                value={form.priceCapIDR}
                onChange={(v) => onChange('priceCapIDR', v)}
                type="number"
                prefix="Rp"
                placeholder="0"
                min="0"
                step="5000000"
                hint={t('flpp.capHint')}
              />
              <InputField
                label={t('flpp.incomeCap')}
                value={form.incomeCapIDR}
                onChange={(v) => onChange('incomeCapIDR', v)}
                type="number"
                prefix="Rp"
                placeholder="0"
                min="0"
                step="500000"
                hint={t('flpp.capHint')}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFirstHome}
                onChange={(e) => onChange('isFirstHome', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              {t('flpp.firstHome')}
            </label>
          </div>

          {/* Result */}
          <div className="p-4">
            {result ? (
              <div className="space-y-3">
                <span
                  className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                    result.eligibility.eligible ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {t(result.eligibility.eligible ? 'flpp.eligible' : 'flpp.notEligible')}
                </span>

                <ul className="space-y-1.5">
                  <CheckRow ok={result.eligibility.priceOk} label={t('flpp.checkPrice', { cap: formatIDRCompact(Number(form.priceCapIDR) || 0) })} />
                  <CheckRow ok={result.eligibility.incomeOk} label={t('flpp.checkIncome', { cap: formatIDRCompact(Number(form.incomeCapIDR) || 0) })} />
                  <CheckRow ok={result.eligibility.firstHomeOk} label={t('flpp.checkFirstHome')} />
                  <CheckRow ok={result.eligibility.tenorOk} label={t('flpp.checkTenor', { tenor: formatTenor(result.subsidizedTenorMonths) })} />
                </ul>

                <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {t('flpp.subsidizedInstallment')}
                  </p>
                  <p className="text-base font-bold text-green-700">{formatIDR(result.subsidizedInstallment)}</p>
                  {savings !== null && savings > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">
                      {t('flpp.savesVsCurrent', { amount: formatIDR(savings) })}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {t('flpp.totalInterestLabel', { amount: formatIDR(result.subsidizedTotalInterest) })}
                  </p>
                </div>

                <p className="text-[11px] text-gray-400 leading-snug">{t('flpp.disclaimer')}</p>
              </div>
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">{t('flpp.promptFill')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
