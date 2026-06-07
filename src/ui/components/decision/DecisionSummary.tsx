import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecisionSummaryResult, DecisionFlag } from '../../../domain/calculators/decisionSummary';
import { formatIDR } from '../../../domain/utils/currency';

interface Props {
  result: DecisionSummaryResult;
  onScrollToAffordability?: () => void;
  onComputeSandbox?: (extraIncome: number) => DecisionSummaryResult | null;
}

const VERDICT_STYLE = {
  safe:       { badge: 'bg-green-100 text-green-800',  border: 'border-green-200',  bg: 'bg-green-50' },
  watch:      { badge: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200', bg: 'bg-yellow-50' },
  risky:      { badge: 'bg-red-100 text-red-800',      border: 'border-red-200',    bg: 'bg-red-50' },
  incomplete: { badge: 'bg-gray-100 text-gray-600',    border: 'border-gray-200',   bg: 'bg-gray-50' },
} as const;

const BADGE_LABEL_KEY: Record<string, string> = {
  safe:       'affordability.bandSafe',
  watch:      'affordability.bandWatch',
  risky:      'affordability.bandRisky',
  incomplete: 'decision.badgeIncomplete',
};

function FlagItem({ flag }: { flag: DecisionFlag }) {
  const { t } = useTranslation();

  const icon = flag.severity === 'critical'
    ? <span className="text-red-500 shrink-0 font-bold mt-0.5" aria-hidden="true">✗</span>
    : <span className="text-amber-500 shrink-0 font-bold mt-0.5" aria-hidden="true">!</span>;

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
    <li className="text-xs text-gray-700">
      <div className="flex items-start gap-2">
        {icon}
        <span>{text}</span>
      </div>
      {flag.suggestions.length > 0 && (
        <ul className="mt-1 ml-5 space-y-0.5">
          {flag.suggestions.map((sug, i) => {
            let sugText: string;
            switch (sug.type) {
              case 'add_dp':
                sugText = t('decision.suggestAddDp', { amount: formatIDR(sug.amountIDR ?? 0) });
                break;
              case 'add_income':
                sugText = t('decision.suggestAddIncome', { amount: formatIDR(sug.amountIDR ?? 0) });
                break;
              case 'reduce_loan':
                sugText = t('decision.suggestReduceLoan', { amount: formatIDR(sug.amountIDR ?? 0) });
                break;
              case 'extend_fixed':
                sugText = t('decision.suggestExtendFixed');
                break;
            }
            return (
              <li key={i} className="text-[11px] text-blue-700 flex gap-1">
                <span aria-hidden="true">→</span>
                <span>{sugText}</span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function DecisionSummary({ result, onScrollToAffordability, onComputeSandbox }: Props) {
  const { t } = useTranslation();
  const style = VERDICT_STYLE[result.verdict];

  const verdictTextKey = {
    safe:       'decision.verdictSafe',
    watch:      'decision.verdictWatch',
    risky:      'decision.verdictRisky',
    incomplete: 'decision.verdictIncomplete',
  }[result.verdict];

  const badgeLabelKey = BADGE_LABEL_KEY[result.verdict];

  // What-if sandbox state
  const [sandboxIncome, setSandboxIncome] = useState('');
  const sandboxExtra = parseFloat(sandboxIncome) || 0;
  const sandboxResult = useMemo(
    () => sandboxExtra > 0 && onComputeSandbox ? onComputeSandbox(sandboxExtra) : null,
    [sandboxExtra, onComputeSandbox],
  );
  const showSandbox = (result.verdict === 'risky' || result.verdict === 'watch') && !!onComputeSandbox;

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

      {/* Scroll-to-affordability CTA (incomplete state only) */}
      {result.verdict === 'incomplete' && onScrollToAffordability && (
        <button
          type="button"
          onClick={onScrollToAffordability}
          className="mb-2.5 text-xs font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          {t('decision.enterIncome')}
        </button>
      )}

      {/* Flags */}
      {result.flags.length > 0 && (
        <ul className="space-y-2 mb-2.5">
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

      {/* What-if income sandbox */}
      {showSandbox && (
        <div className="mt-1 mb-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5" data-testid="decision-sandbox">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('decision.sandboxTitle')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-600 shrink-0">
              {t('decision.sandboxLabel')}
            </label>
            <div className="relative min-w-[130px] flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">Rp</span>
              <input
                type="number"
                min="0"
                step="500000"
                value={sandboxIncome}
                onChange={(e) => setSandboxIncome(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="0"
                aria-label={t('decision.sandboxLabel')}
                data-testid="sandbox-income-input"
              />
            </div>
            {sandboxResult && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${VERDICT_STYLE[sandboxResult.verdict].badge}`} data-testid="sandbox-verdict-badge">
                {t('decision.sandboxResult')} {t(BADGE_LABEL_KEY[sandboxResult.verdict])}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 leading-snug">{t('decision.disclaimer')}</p>
    </div>
  );
}
