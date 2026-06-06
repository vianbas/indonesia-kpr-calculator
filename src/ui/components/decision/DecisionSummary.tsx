import { useTranslation } from 'react-i18next';
import type { DecisionSummaryResult, DecisionFlag } from '../../../domain/calculators/decisionSummary';

interface Props {
  result: DecisionSummaryResult;
}

const VERDICT_STYLE = {
  safe:       { badge: 'bg-green-100 text-green-800',  border: 'border-green-200',  bg: 'bg-green-50' },
  watch:      { badge: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200', bg: 'bg-yellow-50' },
  risky:      { badge: 'bg-red-100 text-red-800',      border: 'border-red-200',    bg: 'bg-red-50' },
  incomplete: { badge: 'bg-gray-100 text-gray-600',    border: 'border-gray-200',   bg: 'bg-gray-50' },
} as const;

function FlagItem({ flag }: { flag: DecisionFlag }) {
  const { t } = useTranslation();

  const icon = flag.severity === 'critical'
    ? <span className="text-red-500 shrink-0 font-bold" aria-hidden="true">✗</span>
    : <span className="text-amber-500 shrink-0 font-bold" aria-hidden="true">!</span>;

  let text: string;
  switch (flag.type) {
    case 'dsr_over':
      text = t('decision.flagDsrOver', {
        dsr: (flag.dsrPct ?? 0).toFixed(1),
        max: (flag.maxDsrPct ?? 0).toFixed(0),
      });
      break;
    case 'negative_surplus':
      text = t('decision.flagNegativeSurplus');
      break;
    case 'rate_shock':
      text = t('decision.flagRateShock', { pct: flag.rateOffsetPct ?? 1 });
      break;
    case 'ltv_over':
      text = t('decision.flagLtvOver');
      break;
    case 'installment_jump':
      text = t('decision.flagInstallmentJump', { pct: Math.round(flag.jumpPct ?? 0) });
      break;
  }

  return (
    <li className="flex items-start gap-2 text-xs text-gray-700">
      {icon}
      <span>{text}</span>
    </li>
  );
}

export function DecisionSummary({ result }: Props) {
  const { t } = useTranslation();
  const style = VERDICT_STYLE[result.verdict];

  const verdictTextKey = {
    safe:       'decision.verdictSafe',
    watch:      'decision.verdictWatch',
    risky:      'decision.verdictRisky',
    incomplete: 'decision.verdictIncomplete',
  }[result.verdict];

  const badgeLabelKey = {
    safe:       'affordability.bandSafe',
    watch:      'affordability.bandWatch',
    risky:      'affordability.bandRisky',
    incomplete: 'decision.badgeIncomplete',
  }[result.verdict];

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} px-4 py-3.5`}
      data-testid="decision-summary"
    >
      {/* Header row: title + verdict badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t('decision.title')}
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
          {t(badgeLabelKey)}
        </span>
      </div>

      {/* Verdict headline */}
      <p className="text-sm font-medium text-gray-800 mb-2.5">{t(verdictTextKey)}</p>

      {/* Flags */}
      {result.flags.length > 0 && (
        <ul className="space-y-1.5 mb-2.5">
          {result.flags.map((flag, i) => (
            <FlagItem key={`${flag.type}-${i}`} flag={flag} />
          ))}
        </ul>
      )}

      {/* Best scenario recommendation */}
      {result.bestScenarioLabel && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5 mb-2.5">
          {t('decision.bestScenario', { label: result.bestScenarioLabel })}
        </p>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 leading-snug">{t('decision.disclaimer')}</p>
    </div>
  );
}
