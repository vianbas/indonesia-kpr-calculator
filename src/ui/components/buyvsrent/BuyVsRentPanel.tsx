import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InputField } from '../common/InputField';
import { ChevronIcon } from '../common/ChevronIcon';
import { formatIDR, formatIDRCompact } from '../../../domain/utils/currency';
import type { BuyVsRentFormState } from '../../../application/store/buyVsRentTypes';
import type { BuyVsRentResult } from '../../../domain/calculators/buyVsRent';

interface Props {
  form: BuyVsRentFormState;
  onChange: (key: keyof BuyVsRentFormState, value: string) => void;
  result: BuyVsRentResult | null;
}

const REC_STYLE: Record<BuyVsRentResult['recommendation'], string> = {
  buy: 'bg-green-100 text-green-800',
  rent: 'bg-blue-100 text-blue-800',
  close: 'bg-gray-100 text-gray-700',
};

function Stat({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function BuyVsRentPanel({ form, onChange, result }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const breakEvenText = (() => {
    if (!result) return '';
    if (result.breakEvenMonth === null) return t('buyVsRent.noBreakEven');
    const years = Math.floor(result.breakEvenMonth / 12);
    const months = result.breakEvenMonth % 12;
    return t('buyVsRent.breakEvenAfter', { years, months });
  })();

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        aria-expanded={open}
      >
        <span>{t('buyVsRent.title')}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="bg-white">
          {/* Inputs */}
          <div className="p-4 border-b border-gray-100 space-y-4">
            <p className="text-xs text-gray-500">{t('buyVsRent.intro')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label={t('buyVsRent.monthlyRent')}
                value={form.monthlyRent}
                onChange={(v) => onChange('monthlyRent', v)}
                type="number"
                prefix="Rp"
                placeholder="0"
                min="0"
                step="500000"
                hint={t('buyVsRent.monthlyRentHint')}
              />
              <InputField
                label={t('buyVsRent.horizon')}
                value={form.horizonYears}
                onChange={(v) => onChange('horizonYears', v)}
                type="number"
                suffix={t('buyVsRent.years')}
                placeholder="10"
                min="1"
                max="30"
                step="1"
                hint={t('buyVsRent.horizonHint')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InputField
                label={t('buyVsRent.rentGrowth')}
                value={form.rentGrowthPercent}
                onChange={(v) => onChange('rentGrowthPercent', v)}
                type="number"
                suffix="%"
                placeholder="5"
                min="0"
                max="30"
                step="0.5"
                hint={t('buyVsRent.perYear')}
              />
              <InputField
                label={t('buyVsRent.appreciation')}
                value={form.appreciationPercent}
                onChange={(v) => onChange('appreciationPercent', v)}
                type="number"
                suffix="%"
                placeholder="5"
                min="0"
                max="30"
                step="0.5"
                hint={t('buyVsRent.perYear')}
              />
              <InputField
                label={t('buyVsRent.investmentReturn')}
                value={form.investmentReturnPercent}
                onChange={(v) => onChange('investmentReturnPercent', v)}
                type="number"
                suffix="%"
                placeholder="4"
                min="0"
                max="30"
                step="0.5"
                hint={t('buyVsRent.perYear')}
              />
            </div>
          </div>

          {/* Result */}
          <div className="p-4">
            {result ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${REC_STYLE[result.recommendation]}`}>
                    {t(`buyVsRent.rec_${result.recommendation}`)}
                  </span>
                  <span className="text-xs text-gray-500">{breakEvenText}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat
                    label={t('buyVsRent.buyerWealth')}
                    value={formatIDRCompact(result.finalBuyerWealth)}
                    sub={formatIDR(result.finalBuyerWealth)}
                    color="text-green-700"
                  />
                  <Stat
                    label={t('buyVsRent.renterWealth')}
                    value={formatIDRCompact(result.finalRenterWealth)}
                    sub={formatIDR(result.finalRenterWealth)}
                    color="text-blue-700"
                  />
                </div>
                <Stat
                  label={t('buyVsRent.homeValueAtHorizon')}
                  value={formatIDRCompact(result.finalHomeValue)}
                  sub={formatIDR(result.finalHomeValue)}
                />
                <p className="text-[11px] text-gray-400 leading-snug">{t('buyVsRent.disclaimer')}</p>
              </div>
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">{t('buyVsRent.promptFill')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
