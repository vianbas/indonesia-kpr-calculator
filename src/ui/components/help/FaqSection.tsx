import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';

const FAQ_KEYS = [
  'annuity',
  'flat',
  'fixedFloating',
  'downPayment',
  'bphtb',
  'earlyRepayment',
  'syariah',
  'accuracy',
] as const;

type FaqKey = (typeof FAQ_KEYS)[number];

export function FaqSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<FaqKey | null>(null);

  return (
    <Card title={t('faq.title')}>
      <div className="divide-y divide-gray-100">
        {FAQ_KEYS.map((key) => {
          const isOpen = open === key;
          return (
            <div key={key}>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                onClick={() => setOpen(isOpen ? null : key)}
                aria-expanded={isOpen}
              >
                <span className="text-sm font-medium text-gray-800">{t(`faq.${key}Q`)}</span>
                <svg
                  className={[
                    'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200',
                    isOpen ? 'rotate-180' : '',
                  ].join(' ')}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isOpen && (
                <p className="pb-4 text-sm text-gray-600 leading-relaxed">
                  {t(`faq.${key}A`)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
