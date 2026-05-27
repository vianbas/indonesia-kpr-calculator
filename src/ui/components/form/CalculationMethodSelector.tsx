import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import type { MortgageFormState, FormAction, CalculationMethod } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
}

export function CalculationMethodSelector({ form, dispatch }: Props) {
  const { t } = useTranslation();

  const OPTIONS: { method: CalculationMethod; label: string; description: string }[] = [
    {
      method: 'fixed_only',
      label: t('form.fixedOnly'),
      description: t('form.fixedOnlyDesc'),
    },
    {
      method: 'fixed_single_floating',
      label: t('form.fixedSingleFloat'),
      description: t('form.fixedSingleFloatDesc'),
    },
    {
      method: 'fixed_tiered_floating',
      label: t('form.fixedTieredFloat'),
      description: t('form.fixedTieredFloatDesc'),
    },
  ];

  return (
    <Card title={t('form.calcMethod')} accent="none">
      <div className="space-y-2">
        <div
          className="flex flex-col gap-2 sm:flex-row"
          role="group"
          aria-label={t('form.calcMethodSelectorAria')}
        >
          {OPTIONS.map(({ method, label }) => (
            <Button
              key={method}
              type="button"
              variant="bare"
              className={[
                'flex-1 rounded-lg border py-2.5 px-3 text-sm font-medium transition-colors text-center',
                form.calculationMethod === method
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50',
              ].join(' ')}
              onClick={() => dispatch({ type: 'SET_CALCULATION_METHOD', method })}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Description for active method */}
        <p className="text-xs text-gray-500">
          {OPTIONS.find((o) => o.method === form.calculationMethod)?.description}
        </p>
      </div>
    </Card>
  );
}
