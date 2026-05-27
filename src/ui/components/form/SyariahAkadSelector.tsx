import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import type { SyariahAkadType } from '../../../domain/models/mortgage.types';
import type { FormAction } from '../../../application/store/formTypes';

interface Props {
  akadType: SyariahAkadType;
  dispatch: React.Dispatch<FormAction>;
}

export function SyariahAkadSelector({ akadType, dispatch }: Props) {
  const { t } = useTranslation();

  const akads: Array<{ value: SyariahAkadType; label: string; desc: string }> = [
    { value: 'murabahah', label: t('syariah.akadMurabahah'), desc: t('syariah.akadMurabahahDesc') },
    { value: 'musyarakah_mutanaqishah', label: t('syariah.akadMmq'), desc: t('syariah.akadMmqDesc') },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{t('syariah.akadSelector')}</label>
      <div className="grid grid-cols-2 gap-2">
        {akads.map(({ value, label, desc }) => (
          <Button
            key={value}
            size="sm"
            variant="bare"
            type="button"
            onClick={() => dispatch({ type: 'SET_SYARIAH_AKAD_TYPE', akadType: value })}
            className={[
              'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-colors',
              akadType === value
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
            ].join(' ')}
          >
            <span className="text-xs font-semibold">{label}</span>
            <span className={`text-[11px] leading-tight ${akadType === value ? 'text-emerald-600' : 'text-gray-400'}`}>
              {desc}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
