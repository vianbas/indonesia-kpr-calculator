import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { Button } from '../common/Button';
import { TierBuilder } from './TierBuilder';
import type { MortgageFormState, FormAction, FloatingMode } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
  fieldErrors: Record<string, string>;
}

export function FloatingRateSection({ form, dispatch, fieldErrors }: Props) {
  const fixedEnd = form.hasFixedPeriod ? parseInt(form.fixedDurationMonths) || 0 : 0;
  const tenorTotal =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);
  const floatingStart = fixedEnd + 1;
  const hasFloatingPeriod = floatingStart <= tenorTotal;

  // When entire loan is fixed, this section is informational only
  if (!hasFloatingPeriod && form.hasFixedPeriod) {
    return (
      <Card title="Suku Bunga Variabel" accent="indigo">
        <p className="text-sm text-gray-500 italic">
          Tenor penuh dicakup oleh periode suku bunga tetap.
          Periode variabel tidak diperlukan.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Suku Bunga Variabel" accent="indigo">
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
          {([
            { mode: 'base' as FloatingMode, label: 'Satu Suku Bunga' },
            { mode: 'tiered' as FloatingMode, label: 'Berjenjang (Tiered)' },
          ] as const).map(({ mode, label }) => (
            <Button
              key={mode}
              type="button"
              variant="bare"
              className={[
                'flex-1 rounded-none border-0 py-2',
                form.floatingMode === mode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50',
              ].join(' ')}
              onClick={() => dispatch({ type: 'SET_FLOATING_MODE', mode })}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Mode-specific content */}
        {form.floatingMode === 'base' ? (
          <div className="space-y-3">
            <InputField
              label="Suku Bunga Variabel"
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
                  ? `Berlaku mulai Bulan ${floatingStart} hingga Bulan ${tenorTotal}`
                  : `Berlaku selama ${tenorTotal} bulan penuh`
              }
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Atur suku bunga berbeda untuk setiap periode setelah masa tetap berakhir
              </p>
            </div>
            <TierBuilder form={form} dispatch={dispatch} fieldErrors={fieldErrors} />
          </div>
        )}

        {/* Cross-field error: no rate defined */}
        {fieldErrors['floatingBaseRate'] && form.floatingMode === 'tiered' && (
          <p className="text-xs text-red-600">⚠ {fieldErrors['floatingBaseRate']}</p>
        )}
      </div>
    </Card>
  );
}
