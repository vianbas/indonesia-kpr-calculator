import { useTranslation } from 'react-i18next';
import { BANK_RATES, BANK_RATES_AS_OF } from '../../../data/bankRates';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
}

export function BankRatePicker({ form, dispatch }: Props) {
  const { t } = useTranslation();

  const currentId =
    BANK_RATES.find(
      (b) => b.fixedRate === form.fixedRate && b.floatingRate === form.floatingBaseRate,
    )?.id ?? '';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const entry = BANK_RATES.find((b) => b.id === e.target.value);
    if (!entry) return;

    dispatch({ type: 'SET_FIXED_RATE', value: entry.fixedRate });
    dispatch({ type: 'SET_FIXED_DURATION_MONTHS', value: entry.fixedDurationMonths });
    dispatch({ type: 'SET_FLOATING_BASE_RATE', value: entry.floatingRate });

    if (form.calculationMethod !== 'fixed_only') {
      dispatch({ type: 'SET_HAS_FIXED_PERIOD', value: true });
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="bank-rate-picker"
          className="text-sm font-medium text-amber-900 shrink-0"
        >
          {t('form.bankRatePickerLabel')}
        </label>
        <select
          id="bank-rate-picker"
          value={currentId}
          onChange={handleChange}
          className="flex-1 min-w-[200px] text-sm rounded-md border border-amber-300 bg-white px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">{t('form.bankRatePickerPlaceholder')}</option>
          {BANK_RATES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-amber-700">
        {t('form.bankRatePickerNote', { date: BANK_RATES_AS_OF })}
      </p>
    </div>
  );
}
