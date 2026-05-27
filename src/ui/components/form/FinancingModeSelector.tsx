import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import type { FinancingMode } from '../../../domain/models/mortgage.types';
import type { FormAction } from '../../../application/store/formTypes';

interface Props {
  financingMode: FinancingMode;
  dispatch: React.Dispatch<FormAction>;
}

export function FinancingModeSelector({ financingMode, dispatch }: Props) {
  const { t } = useTranslation();

  const modes: FinancingMode[] = ['conventional', 'syariah'];

  return (
    <div className="flex rounded-xl border border-gray-300 overflow-hidden shadow-sm" role="group" aria-label={t('syariah.modeSelector')}>
      {modes.map((mode) => (
        <Button
          key={mode}
          size="sm"
          variant="bare"
          type="button"
          onClick={() => dispatch({ type: 'SET_FINANCING_MODE', mode })}
          className={[
            'flex-1 rounded-none border-0 py-2.5 text-sm font-semibold transition-colors',
            financingMode === mode
              ? mode === 'syariah'
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {mode === 'conventional' ? t('syariah.modeConventional') : t('syariah.modeSyariah')}
        </Button>
      ))}
    </div>
  );
}
