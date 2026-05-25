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
  // Fixed Only: no floating period — entire section is hidden
  if (form.calculationMethod === 'fixed_only') return null;

  const fixedEnd = form.hasFixedPeriod ? parseInt(form.fixedDurationMonths) || 0 : 0;
  const tenorTotal =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);
  const floatingStart = fixedEnd + 1;
  const hasFloatingPeriod = floatingStart <= tenorTotal;

  // When entire loan is covered by fixed period, show informational placeholder
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

  // ── Fixed + Floating Tunggal ────────────────────────────────────────────────
  if (form.calculationMethod === 'fixed_single_floating') {
    return (
      <Card title="Suku Bunga Variabel" accent="indigo">
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
              ? `Berlaku mulai Bulan ${floatingStart} (Thn ${Math.ceil(floatingStart / 12)}) hingga Bulan ${tenorTotal} (Thn ${Math.ceil(tenorTotal / 12)})`
              : `Berlaku selama ${tenorTotal} bulan penuh`
          }
        />
      </Card>
    );
  }

  // ── Fixed + Floating Bertingkat ─────────────────────────────────────────────
  return (
    <Card title="Suku Bunga Variabel (Berjenjang)" accent="indigo">
      <div className="space-y-2">
        <p className="text-xs text-gray-600">
          Atur suku bunga berbeda untuk setiap periode setelah masa tetap berakhir
        </p>
        <TierBuilder form={form} dispatch={dispatch} fieldErrors={fieldErrors} />
      </div>

      {/* Cross-field tier error */}
      {fieldErrors['floatingBaseRate'] && (
        <p className="text-xs text-red-600 mt-2">⚠ {fieldErrors['floatingBaseRate']}</p>
      )}
    </Card>
  );
}
