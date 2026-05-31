import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import type { MortgageFormState, FormAction, EarlyRepaymentMode } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
}

function isPositiveNumber(v: string): boolean {
  const n = parseFloat(v);
  return v.trim() !== '' && Number.isFinite(n) && n > 0;
}

function isPositiveInt(v: string): boolean {
  const n = parseInt(v, 10);
  return v.trim() !== '' && Number.isFinite(n) && n >= 1 && String(n) === v.trim();
}

export function EarlyRepaymentSection({ form, dispatch }: Props) {
  const { t } = useTranslation();

  const MODE_OPTIONS: { value: EarlyRepaymentMode; label: string; desc: string }[] = [
    { value: 'none',          label: t('form.erModeNone'),  desc: t('form.erModeNoneDesc') },
    { value: 'extra_monthly', label: t('form.erModeExtra'), desc: t('form.erModeExtraDesc') },
    { value: 'lump_sum',      label: t('form.erModeLump'),  desc: t('form.erModeLumpDesc') },
    { value: 'both',          label: t('form.erModeBoth'),  desc: t('form.erModeBothDesc') },
  ];

  const { earlyRepaymentMode } = form;
  const showExtra = earlyRepaymentMode === 'extra_monthly' || earlyRepaymentMode === 'both';
  const showLump  = earlyRepaymentMode === 'lump_sum'      || earlyRepaymentMode === 'both';

  const extraAmountErr  = showExtra && form.extraMonthlyAmount !== '' && !isPositiveNumber(form.extraMonthlyAmount)
    ? t('form.erErrPositive') : '';
  const extraStartErr   = showExtra && form.extraMonthlyStartMonth !== '' && !isPositiveInt(form.extraMonthlyStartMonth)
    ? t('form.erErrStartMonth') : '';
  const extraEndRaw = parseInt(form.extraMonthlyEndMonth);
  const extraStartRaw = parseInt(form.extraMonthlyStartMonth) || 1;
  const extraEndErr     = showExtra && form.extraMonthlyEndMonth !== ''
    ? !isPositiveInt(form.extraMonthlyEndMonth)
      ? t('form.erErrEndMonth')
      : extraEndRaw < extraStartRaw
      ? t('form.erErrEndBeforeStart', { start: extraStartRaw })
      : ''
    : '';

  return (
    <Card title={t('form.earlyRepayment')} subtitle={t('form.earlyRepaymentSubtitle')} tooltip={t('form.tooltipEarlyRepayment')}>
      <div className="space-y-4">

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => dispatch({ type: 'SET_EARLY_REPAYMENT_MODE', mode: opt.value })}
              className={[
                'rounded-lg border px-3 py-2.5 text-left transition-colors',
                earlyRepaymentMode === opt.value
                  ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <p className={`text-xs font-semibold ${earlyRepaymentMode === opt.value ? 'text-teal-800' : 'text-gray-800'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Extra monthly payment fields */}
        {showExtra && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
              {t('form.extraMonthly')}
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('form.extraMonthlyAmount')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.extraMonthlyAmount}
                onChange={(e) => dispatch({ type: 'SET_EXTRA_MONTHLY_AMOUNT', value: e.target.value })}
                placeholder="cth: 500000"
                className={[
                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                  extraAmountErr
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-teal-400',
                ].join(' ')}
              />
              {extraAmountErr && <p className="mt-1 text-xs text-red-600">{extraAmountErr}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('form.extraMonthlyStart')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.extraMonthlyStartMonth}
                  onChange={(e) => dispatch({ type: 'SET_EXTRA_MONTHLY_START_MONTH', value: e.target.value })}
                  placeholder="1"
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                    extraStartErr
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-teal-400',
                  ].join(' ')}
                />
                {extraStartErr && <p className="mt-1 text-xs text-red-600">{extraStartErr}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('form.extraMonthlyEnd')}{' '}
                  <span className="text-gray-400">{t('form.extraMonthlyEndOptional')}</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.extraMonthlyEndMonth}
                  onChange={(e) => dispatch({ type: 'SET_EXTRA_MONTHLY_END_MONTH', value: e.target.value })}
                  placeholder="opsional"
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                    extraEndErr
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-teal-400',
                  ].join(' ')}
                />
                {extraEndErr && <p className="mt-1 text-xs text-red-600">{extraEndErr}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Lump sum list — one or more one-time prepayments */}
        {showLump && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
              {t('form.lumpSum')}
            </p>

            {form.lumpSums.length === 0 && (
              <p className="text-xs text-gray-500">{t('form.lumpSumEmpty')}</p>
            )}

            {form.lumpSums.map((row, i) => {
              const amountErr = row.amount !== '' && !isPositiveNumber(row.amount);
              const monthErr = row.month !== '' && !isPositiveInt(row.month);
              return (
                <div key={row.id} className="rounded-md border border-teal-100 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">{t('form.lumpSumN', { n: i + 1 })}</span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'REMOVE_LUMP_SUM', id: row.id })}
                      className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
                      aria-label={t('form.lumpSumRemoveAria', { n: i + 1 })}
                    >
                      {t('form.tierRemove')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('form.lumpSumAmount')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.amount}
                        onChange={(e) => dispatch({ type: 'UPDATE_LUMP_SUM', id: row.id, field: 'amount', value: e.target.value })}
                        placeholder="cth: 50000000"
                        className={[
                          'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                          amountErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-teal-400',
                        ].join(' ')}
                      />
                      {amountErr && <p className="mt-1 text-xs text-red-600">{t('form.erErrPositive')}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('form.lumpSumMonth')}</label>
                      <input
                        type="number"
                        min="1"
                        value={row.month}
                        onChange={(e) => dispatch({ type: 'UPDATE_LUMP_SUM', id: row.id, field: 'month', value: e.target.value })}
                        placeholder="cth: 24"
                        className={[
                          'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                          monthErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-teal-400',
                        ].join(' ')}
                      />
                      {monthErr && <p className="mt-1 text-xs text-red-600">{t('form.erErrLumpMonth')}</p>}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => dispatch({ type: 'ADD_LUMP_SUM' })}
              className="text-xs font-medium text-teal-700 hover:text-teal-900 underline underline-offset-2"
            >
              {t('form.lumpSumAdd')}
            </button>
          </div>
        )}

        {earlyRepaymentMode !== 'none' && (
          <p className="text-xs text-gray-400 leading-relaxed">
            {t('form.erDisclaimer')}
          </p>
        )}
      </div>
    </Card>
  );
}
