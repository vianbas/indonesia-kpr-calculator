import { useTranslation } from 'react-i18next';

interface Props {
  onScrollToAffordability: () => void;
  onScrollToRefinancing: () => void;
  onScrollToAmortization: () => void;
}

export function NextStepActions({ onScrollToAffordability, onScrollToRefinancing, onScrollToAmortization }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
        {t('results.nextStep')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ActionButton
          onClick={onScrollToAffordability}
          title={t('results.nextStepAffordTitle')}
          description={t('results.nextStepAffordDesc')}
          color="blue"
        />
        <ActionButton
          onClick={onScrollToRefinancing}
          title={t('results.nextStepRefiTitle')}
          description={t('results.nextStepRefiDesc')}
          color="indigo"
        />
        <ActionButton
          onClick={onScrollToAmortization}
          title={t('results.nextStepAmortTitle')}
          description={t('results.nextStepAmortDesc')}
          color="gray"
        />
      </div>
    </div>
  );
}

// ─── Internal sub-component ───────────────────────────────────────────────────

interface ActionButtonProps {
  onClick: () => void;
  title: string;
  description: string;
  color: 'blue' | 'indigo' | 'gray';
}

const COLOR_MAP = {
  blue:   { border: 'border-blue-200',   bg: 'bg-white hover:bg-blue-50',   title: 'text-blue-800',   arrow: 'text-blue-400' },
  indigo: { border: 'border-indigo-200', bg: 'bg-white hover:bg-indigo-50', title: 'text-indigo-800', arrow: 'text-indigo-400' },
  gray:   { border: 'border-gray-200',   bg: 'bg-white hover:bg-gray-50',   title: 'text-gray-800',   arrow: 'text-gray-400' },
};

function ActionButton({ onClick, title, description, color }: ActionButtonProps) {
  const c = COLOR_MAP[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col gap-1 text-left rounded-lg border p-3 transition-colors
        ${c.border} ${c.bg}
      `}
    >
      <span className={`flex items-center justify-between text-sm font-semibold ${c.title}`}>
        {title}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 shrink-0 ml-1 ${c.arrow}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <span className="text-xs text-gray-500 leading-snug">{description}</span>
    </button>
  );
}
