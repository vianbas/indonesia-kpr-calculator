import { useTranslation } from 'react-i18next';
import type { ValidationError } from '../../../domain';

// ─── Variant: form not yet complete ──────────────────────────────────────────

export function FormIncompleteState() {
  const { t } = useTranslation();

  const steps = [
    { step: '1', label: t('empty.step1') },
    { step: '2', label: t('empty.step2') },
    { step: '3', label: t('empty.step3') },
  ];

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-2">{t('empty.title')}</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
        {t('empty.description')}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 max-w-xs mx-auto text-center">
        {steps.map(({ step, label }) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              {step}
            </div>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Variant: validation errors present ──────────────────────────────────────

interface ValidationErrorStateProps {
  errors: ValidationError[];
}

export function ValidationErrorState({ errors }: ValidationErrorStateProps) {
  const { t } = useTranslation();

  const visible = errors.slice(0, 5);
  const hidden = errors.length - visible.length;

  return (
    <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-red-700 mb-3">
        {t('empty.errorCount', { count: errors.length })}
      </h3>
      <ul className="text-left space-y-1.5 max-w-sm mx-auto">
        {visible.map((err, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-red-600 bg-white rounded-lg px-3 py-2 border border-red-100">
            <span className="mt-0.5 shrink-0">•</span>
            <span>{err.message}</span>
          </li>
        ))}
        {hidden > 0 && (
          <li className="text-xs text-red-500 text-center pt-1">
            {t('empty.moreErrors', { count: hidden })}
          </li>
        )}
      </ul>
    </div>
  );
}

// ─── Variant: calculation failed unexpectedly ─────────────────────────────────

export function CalculationErrorState() {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
        <svg className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-orange-700 mb-1">{t('empty.calcError_title')}</h3>
      <p className="text-xs text-orange-600">
        {t('empty.calcError_desc')}
      </p>
    </div>
  );
}
