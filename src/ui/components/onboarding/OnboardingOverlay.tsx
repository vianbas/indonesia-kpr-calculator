import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'kpr_onboarding_seen';

interface Props {
  onDismiss: () => void;
}

const STEPS = [
  { icon: '🏠', titleKey: 'onboarding.step1Title', descKey: 'onboarding.step1Desc' },
  { icon: '📝', titleKey: 'onboarding.step2Title', descKey: 'onboarding.step2Desc' },
  { icon: '📊', titleKey: 'onboarding.step3Title', descKey: 'onboarding.step3Desc' },
] as const;

export function OnboardingOverlay({ onDismiss }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // private browsing — ignore
    }
    onDismiss();
  }

  function handleNext() {
    if (isLast) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  }

  const { icon, titleKey, descKey } = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.ariaLabel')}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Step icon */}
        <div className="text-center text-5xl leading-none">{icon}</div>

        {/* Step content */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">{t(titleKey)}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{t(descKey)}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t('onboarding.goToStep', { n: i + 1 })}
              onClick={() => setStep(i)}
              className={[
                'w-2.5 h-2.5 rounded-full transition-colors',
                i === step ? 'bg-blue-600' : 'bg-gray-200 hover:bg-gray-300',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 px-1"
          >
            {t('onboarding.skip')}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
