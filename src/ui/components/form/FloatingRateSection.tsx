import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { TierBuilder } from './TierBuilder';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
  fieldErrors: Record<string, string>;
}

export function FloatingRateSection({ form, dispatch, fieldErrors }: Props) {
  const { t } = useTranslation();

  if (form.calculationMethod === 'fixed_only') return null;

  const fixedEnd = form.hasFixedPeriod ? parseInt(form.fixedDurationMonths) || 0 : 0;
  const tenorTotal =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);
  const floatingStart = fixedEnd + 1;
  const hasFloatingPeriod = floatingStart <= tenorTotal;

  if (!hasFloatingPeriod && form.hasFixedPeriod) {
    return (
      <Card title={t('form.floatingRate')} accent="indigo">
        <p className="text-sm text-gray-500 italic">
          {t('form.floatingRateFull')}
        </p>
      </Card>
    );
  }

  // ── Fixed + Floating Tunggal ────────────────────────────────────────────────
  if (form.calculationMethod === 'fixed_single_floating') {
    return (
      <Card title={t('form.floatingRate')} accent="indigo">
        <InputField
          label={t('form.floatingRateLabel')}
          tooltip={t('form.tooltipFloatingRate')}
          value={form.floatingBaseRate}
          onChange={(v) => dispatch({ type: 'SET_FLOATING_BASE_RATE', value: v })}
          type="number"
          suffix="% p.a."
          placeholder="11.00"
          min="0"
          max="100"
          step="0.25"
          error={fieldErrors['floatingBaseRate']}
          hint={
            fixedEnd > 0
              ? t('form.floatingRateRangeHint', {
                  start: floatingStart,
                  yearStart: Math.ceil(floatingStart / 12),
                  end: tenorTotal,
                  yearEnd: Math.ceil(tenorTotal / 12),
                })
              : t('form.floatingRateFullHint', { count: tenorTotal })
          }
        />
      </Card>
    );
  }

  // ── Fixed + Floating Bertingkat ─────────────────────────────────────────────
  return (
    <Card title={t('form.floatingTiered')} accent="indigo">
      <div className="space-y-2">
        <p className="text-xs text-gray-600">
          {t('form.floatingTieredDesc')}
        </p>
        <TierBuilder form={form} dispatch={dispatch} fieldErrors={fieldErrors} />
      </div>

      {fieldErrors['floatingBaseRate'] && (
        <p className="text-xs text-red-600 mt-2">⚠ {fieldErrors['floatingBaseRate']}</p>
      )}
    </Card>
  );
}
