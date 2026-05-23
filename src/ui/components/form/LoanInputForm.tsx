import { BasicInfoSection } from './BasicInfoSection';
import { FixedRateSection } from './FixedRateSection';
import { FloatingRateSection } from './FloatingRateSection';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';
import type { ValidationError } from '../../../domain';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
}

/**
 * Field paths that are rendered inline next to their input.
 * Any error whose field starts with one of these prefixes is suppressed
 * from the global error list to avoid double-display.
 * Keep in sync with field paths produced by mortgage.validator.ts.
 */
const INLINE_FIELD_PREFIXES = [
  'principalAmount',
  'tenorMonths',
  'fixedPeriod.annualRate',
  'fixedPeriod.durationMonths',
] as const;

export function LoanInputForm({ form, dispatch, errors, fieldErrors }: Props) {
  const globalErrors = errors.filter(
    (e) => !INLINE_FIELD_PREFIXES.some((prefix) => e.field.startsWith(prefix)),
  );

  return (
    <div className="space-y-4">
      <BasicInfoSection form={form} dispatch={dispatch} fieldErrors={fieldErrors} />
      <FixedRateSection form={form} dispatch={dispatch} fieldErrors={fieldErrors} />
      <FloatingRateSection form={form} dispatch={dispatch} fieldErrors={fieldErrors} />

      {/* Cross-field errors not tied to a specific inline input */}
      {globalErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
          <p className="text-sm font-semibold text-red-700">Perlu diperbaiki:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {globalErrors.map((err, i) => (
              <li key={i} className="text-sm text-red-600">
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
