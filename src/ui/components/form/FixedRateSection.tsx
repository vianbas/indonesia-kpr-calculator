import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
  fieldErrors: Record<string, string>;
}

export function FixedRateSection({ form, dispatch, fieldErrors }: Props) {
  const { t } = useTranslation();
  const isFlat = form.paymentMethod === 'flat';
  const cardTitle = isFlat ? t('form.flatRateTitle') : t('form.fixedRate');

  const tenorTotal =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);
  const fixedEnd = parseInt(form.fixedDurationMonths) || 0;

  // ── Fixed Only: full tenor is fixed — only show the rate field ──────────────
  if (form.calculationMethod === 'fixed_only') {
    return (
      <Card title={cardTitle} accent="blue">
        <InputField
          label={t('form.fixedRateLabel')}
          value={form.fixedRate}
          onChange={(v) => dispatch({ type: 'SET_FIXED_RATE', value: v })}
          type="number"
          suffix="% p.a."
          placeholder="7.50"
          min="0"
          max="100"
          step="0.25"
          error={fieldErrors['fixedPeriod.annualRate']}
          hint={tenorTotal > 0 ? t('form.fixedRateFullHint', { count: tenorTotal }) : undefined}
        />
      </Card>
    );
  }

  // ── Fixed + Floating: show toggle and both rate/duration fields ─────────────
  const fixedEndMonth = fixedEnd > 0 ? t('form.fixedUntilMonth', { month: fixedEnd }) : '';

  return (
    <Card title={t('form.fixedRate')} accent="blue">
      <div className="space-y-4">
        {/* Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.hasFixedPeriod}
              onChange={(e) => dispatch({ type: 'SET_HAS_FIXED_PERIOD', value: e.target.checked })}
            />
            <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {form.hasFixedPeriod ? t('form.fixedRateActive') : t('form.fixedRateInactive')}
          </span>
        </label>

        {form.hasFixedPeriod && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label={t('form.fixedRateLabel')}
                value={form.fixedRate}
                onChange={(v) => dispatch({ type: 'SET_FIXED_RATE', value: v })}
                type="number"
                suffix="% p.a."
                placeholder="7.50"
                min="0"
                max="100"
                step="0.25"
                error={fieldErrors['fixedPeriod.annualRate']}
              />
              <InputField
                label={t('form.fixedDuration')}
                value={form.fixedDurationMonths}
                onChange={(v) => dispatch({ type: 'SET_FIXED_DURATION_MONTHS', value: v })}
                type="number"
                suffix={t('form.tenorMonths')}
                placeholder="24"
                min="1"
                max={String(Math.max(1, tenorTotal - 1))}
                error={fieldErrors['fixedPeriod.durationMonths']}
                hint={fixedEndMonth}
              />
            </div>

            {fixedEnd > 0 && fixedEnd < tenorTotal && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700 space-y-0.5">
                <p>
                  <strong>{t('form.fixedPeriodInfo1', { end: fixedEnd, rate: form.fixedRate })}</strong>
                </p>
                <p>
                  {t('form.fixedPeriodInfo2', { start: fixedEnd + 1, end: tenorTotal })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
