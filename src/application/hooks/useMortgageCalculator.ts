import { useReducer, useEffect, useState, useMemo, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import { captureError } from '../../lib/sentry';
import { formReducer, createDefaultFormState } from '../store/formReducer';
import { formToMortgageInput } from '../converters/formToInput';
import { validateMortgageInput } from '../../domain/validators/mortgage.validator';
import {
  generateAmortizationSchedule,
  calculateMortgageSummary,
} from '../../domain/calculators/amortization';
import type { MortgageSummary, ValidationError } from '../../domain';
import type { MortgageFormState, FormAction } from '../store/formTypes';

export interface MortgageCalculatorState {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
  summary: MortgageSummary | null;
  errors: ValidationError[];
  /** Field path → first error message, for inline display */
  fieldErrors: Record<string, string>;
  /** True when summary is available and up to date */
  isReady: boolean;
  /** True when the engine threw unexpectedly (distinct from validation errors) */
  isCalcError: boolean;
}

export function useMortgageCalculator(initialState?: MortgageFormState): MortgageCalculatorState {
  // Lazy initializer: date is captured at mount time, not at module-import time
  const [form, dispatch] = useReducer(
    formReducer,
    undefined,
    () => initialState ?? createDefaultFormState(),
  );
  const [summary, setSummary] = useState<MortgageSummary | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isCalcError, setIsCalcError] = useState(false);

  const recalculate = useCallback(() => {
    const { input, conversionErrors } = formToMortgageInput(form);

    if (input === null) {
      setSummary(null);
      setErrors(conversionErrors);
      setIsCalcError(false);
      return;
    }

    const validation = validateMortgageInput(input);
    setErrors(validation.errors);

    if (!validation.valid) {
      setSummary(null);
      setIsCalcError(false);
      return;
    }

    try {
      Sentry.startSpan({ name: 'kpr.calculation', op: 'calculate' }, () => {
        const schedule = generateAmortizationSchedule(input);
        const result = calculateMortgageSummary(input, schedule);
        setSummary(result);
        setIsCalcError(false);
      });
    } catch (err) {
      const tenorMonths =
        (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);
      const tenorBucket =
        tenorMonths < 120 ? 'short' : tenorMonths <= 240 ? 'medium' : 'long';
      captureError(err, { feature: 'calculation', tenorBucket });
      console.error('[KPR] Calculation error:', err);
      setSummary(null);
      setIsCalcError(true);
    }
  }, [form]);

  // Debounce: wait 300ms after last keystroke before recalculating
  useEffect(() => {
    const timer = setTimeout(recalculate, 300);
    return () => clearTimeout(timer);
  }, [recalculate]);

  // Stable object — only a new reference when errors array changes
  const fieldErrors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const err of errors) {
      if (!map[err.field]) {
        map[err.field] = err.message;
      }
    }
    return map;
  }, [errors]);

  // Derived — always equals summary !== null; no separate state needed
  const isReady = summary !== null;

  return { form, dispatch, summary, errors, fieldErrors, isReady, isCalcError };
}
