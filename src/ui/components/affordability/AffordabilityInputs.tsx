import { useTranslation } from 'react-i18next';
import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { AffordabilityFormState } from '../../../application/store/affordabilityTypes';

interface Props {
  form: AffordabilityFormState;
  onChange: (key: keyof AffordabilityFormState, value: string) => void;
}

export function AffordabilityInputs({ form, onChange }: Props) {
  const { t } = useTranslation();

  const income1 = parseFloat(form.monthlyIncome) || 0;
  const income2 = parseFloat(form.spouseIncome) || 0;
  const totalIncome = income1 + income2;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label={t('affordability.monthlyIncome')}
          value={form.monthlyIncome}
          onChange={(v) => onChange('monthlyIncome', v)}
          type="number"
          prefix="Rp"
          placeholder="0"
          min="0"
          step="500000"
          hint={income1 > 0 ? formatIDR(income1) : t('affordability.monthlyIncomeHint')}
        />
        <InputField
          label={t('affordability.spouseIncome')}
          value={form.spouseIncome}
          onChange={(v) => onChange('spouseIncome', v)}
          type="number"
          prefix="Rp"
          placeholder="0"
          min="0"
          step="500000"
          hint={income2 > 0 ? formatIDR(income2) : t('affordability.spouseIncomeHint')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label={t('affordability.existingDebt')}
          value={form.existingMonthlyDebt}
          onChange={(v) => onChange('existingMonthlyDebt', v)}
          type="number"
          prefix="Rp"
          placeholder="0"
          min="0"
          step="100000"
          hint={t('affordability.existingDebtHint')}
        />
        <InputField
          label={t('affordability.livingExpense')}
          value={form.monthlyLivingExpense}
          onChange={(v) => onChange('monthlyLivingExpense', v)}
          type="number"
          prefix="Rp"
          placeholder="0"
          min="0"
          step="500000"
          hint={t('affordability.livingExpenseHint')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label={t('affordability.minSurplus')}
          value={form.minMonthlySurplus}
          onChange={(v) => onChange('minMonthlySurplus', v)}
          type="number"
          prefix="Rp"
          placeholder="0"
          min="0"
          step="500000"
          hint={t('affordability.minSurplusHint')}
        />
        <InputField
          label={t('affordability.maxDsr')}
          value={form.maxDSRPercent}
          onChange={(v) => onChange('maxDSRPercent', v)}
          type="number"
          suffix="%"
          placeholder="35"
          min="1"
          max="70"
          step="1"
          hint={t('affordability.maxDsrHint')}
        />
      </div>

      {totalIncome > 0 && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-700">
          {t('affordability.combinedIncomeLabel')}{' '}
          <strong>{formatIDR(totalIncome)}</strong>{t('affordability.perMonth')}
        </div>
      )}
    </div>
  );
}
