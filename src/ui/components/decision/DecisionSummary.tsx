import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecisionSummaryResult, DecisionFlag } from '../../../domain/calculators/decisionSummary';
import type { AffordabilityResult } from '../../../domain/calculators/affordability';
import { formatIDR } from '../../../domain/utils/currency';

interface Props {
  result: DecisionSummaryResult;
  activeAffordability?: AffordabilityResult;
  /** maxDSR as a decimal (e.g. 0.35) from the affordability form — used for the gauge tick. */
  maxDSR?: number;
  onScrollToAffordability?: () => void;
  onComputeSandbox?: (extraIncome: number, extraDP: number, tenorDeltaMonths: number) => DecisionSummaryResult | null;
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

const GAUGE_BAR_COLOR: Record<string, string> = {
  safe:  'bg-green-500',
  watch: 'bg-yellow-400',
  risky: 'bg-red-500',
};

function FlagItem({ flag }: { flag: DecisionFlag }) {
  const { t } = useTranslation();

  const icon = flag.severity === 'critical'
    ? <span className="text-red-500 shrink-0 font-bold mt-0.5" aria-hidden="true">✗</span>
    : <span className="text-amber-500 shrink-0 font-bold mt-0.5" aria-hidden="true">!</span>;

  let text: string;
  switch (flag.type) {
    case 'dsr_over':
      text = t('decision.flagDsrOver', { dsr: (flag.dsrPct ?? 0).toFixed(1), max: (flag.maxDsrPct ?? 0).toFixed(0) });
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

function DsrGauge({ affordability, verdict, maxDSR }: {
  affordability: AffordabilityResult;
  verdict: string;
  maxDSR: number;
}) {
  const { t } = useTranslation();
  const dsrPct = affordability.dsrAtHighest * 100;
  const scale = maxDSR * 100 * 1.5;
  const fillPct = Math.min(100, (dsrPct / scale) * 100);
  const limitPct = Math.min(100, ((maxDSR * 100) / scale) * 100);
  const barColor = GAUGE_BAR_COLOR[verdict] ?? 'bg-gray-400';

  return (
    <div className="mb-2.5" data-testid="dsr-gauge">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-500">
          {t('decision.dsrGaugeLabel')} <span className="font-semibold text-gray-700">{dsrPct.toFixed(1)}%</span>
        </span>
        <span className="text-[11px] text-gray-400">{t('decision.dsrGaugeMax', { pct: (maxDSR * 100).toFixed(0) })}</span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden" role="progressbar"
        aria-valuenow={Math.round(dsrPct)} aria-valuemin={0} aria-valuemax={Math.round(maxDSR * 100)}>
        <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${fillPct}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-gray-500 opacity-60"
          style={{ left: `${limitPct}%` }} aria-hidden="true" />
      </div>
    </div>
  );
}

function RpInput({ value, onChange, label, testId }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  testId: string;
}) {
  return (
    <div className="relative w-full">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">Rp</span>
      <input
        type="number"
        min="0"
        step="500000"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        placeholder="0"
        aria-label={label}
        data-testid={testId}
      />
    </div>
  );
}

export function DecisionSummary({ result, activeAffordability, maxDSR = 0.35, onScrollToAffordability, onComputeSandbox }: Props) {
  const { t } = useTranslation();
  const style = VERDICT_STYLE[result.verdict];

  const verdictTextKey = {
    safe:       'decision.verdictSafe',
    watch:      'decision.verdictWatch',
    risky:      'decision.verdictRisky',
    incomplete: 'decision.verdictIncomplete',
  }[result.verdict];

  const badgeLabelKey = BADGE_LABEL_KEY[result.verdict];

  // Auto-populate sandbox from flag suggestions
  const addIncomeFlag = result.flags.find((f) => f.suggestions.some((s) => s.type === 'add_income'));
  const addDpFlag = result.flags.find((f) => f.suggestions.some((s) => s.type === 'add_dp'));
  const suggestedIncome = addIncomeFlag?.suggestions.find((s) => s.type === 'add_income')?.amountIDR ?? 0;
  const suggestedDp = addDpFlag?.suggestions.find((s) => s.type === 'add_dp')?.amountIDR ?? 0;

  const defaultIncome = suggestedIncome > 0 ? String(suggestedIncome) : '';
  const defaultDp = suggestedDp > 0 ? String(suggestedDp) : '';

  const [sandboxIncome, setSandboxIncome] = useState(() => defaultIncome);
  const [sandboxDp, setSandboxDp] = useState(() => defaultDp);
  const [sandboxTenor, setSandboxTenor] = useState('');

  const sandboxExtraIncome = parseFloat(sandboxIncome) || 0;
  const sandboxExtraDp = parseFloat(sandboxDp) || 0;
  const sandboxTenorDelta = parseInt(sandboxTenor) || 0;

  const sandboxResult = useMemo(
    () => (sandboxExtraIncome > 0 || sandboxExtraDp > 0 || sandboxTenorDelta > 0) && onComputeSandbox
      ? onComputeSandbox(sandboxExtraIncome, sandboxExtraDp, sandboxTenorDelta)
      : null,
    [sandboxExtraIncome, sandboxExtraDp, sandboxTenorDelta, onComputeSandbox],
  );

  const showSandbox = (result.verdict === 'risky' || result.verdict === 'watch') && !!onComputeSandbox;

  const sandboxDirty = sandboxIncome !== defaultIncome || sandboxDp !== defaultDp || sandboxTenor !== '';

  function resetSandbox() {
    setSandboxIncome(defaultIncome);
    setSandboxDp(defaultDp);
    setSandboxTenor('');
  }

  const showMinIncome =
    activeAffordability &&
    (result.verdict === 'risky' || result.verdict === 'watch') &&
    activeAffordability.minRecommendedIncome > activeAffordability.totalIncome;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} px-4 py-3.5`} data-testid="decision-summary">
      {/* Header row: title + verdict badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('decision.title')}</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
          {t(badgeLabelKey)}
        </span>
      </div>

      {/* Verdict headline */}
      <p className="text-sm font-medium text-gray-800 mb-2.5">{t(verdictTextKey)}</p>

      {/* DSR gauge */}
      {activeAffordability && result.verdict !== 'incomplete' && (
        <DsrGauge affordability={activeAffordability} verdict={result.verdict} maxDSR={maxDSR} />
      )}

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
          {result.flags.map((flag, i) => <FlagItem key={`${flag.type}-${i}`} flag={flag} />)}
        </ul>
      )}

      {/* Min recommended income callout */}
      {showMinIncome && (
        <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1.5 mb-2.5"
          data-testid="min-income-callout">
          {t('decision.minIncomeLabel', { amount: formatIDR(activeAffordability!.minRecommendedIncome) })}
        </p>
      )}

      {/* Best scenario recommendation */}
      {result.bestScenarioLabel && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5 mb-2.5">
          {t('decision.bestScenario', { label: result.bestScenarioLabel })}
        </p>
      )}

      {/* What-if sandbox — full-width divider + compact vertical layout */}
      {showSandbox && (
        <>
          <div className="border-t border-gray-200/70 -mx-4 mb-2.5" aria-hidden="true" />
          <div className="mb-2.5" data-testid="decision-sandbox">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                {t('decision.sandboxTitle')}
              </p>
              {sandboxDirty && (
                <button
                  type="button"
                  onClick={resetSandbox}
                  className="text-[11px] text-gray-400 hover:text-gray-600 underline underline-offset-1 transition-colors"
                  data-testid="sandbox-reset"
                >
                  {t('decision.sandboxReset')}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {/* Income row */}
              <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                <span className="text-xs text-gray-500 xs:w-36 shrink-0">{t('decision.sandboxLabel')}</span>
                <RpInput value={sandboxIncome} onChange={setSandboxIncome}
                  label={t('decision.sandboxLabel')} testId="sandbox-income-input" />
              </div>
              {/* DP row */}
              <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                <span className="text-xs text-gray-500 xs:w-36 shrink-0">{t('decision.sandboxLabelDp')}</span>
                <RpInput value={sandboxDp} onChange={setSandboxDp}
                  label={t('decision.sandboxLabelDp')} testId="sandbox-dp-input" />
              </div>
              {/* Tenor row */}
              <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                <span className="text-xs text-gray-500 xs:w-36 shrink-0">{t('decision.sandboxLabelTenor')}</span>
                <input
                  type="number"
                  min="0"
                  step="12"
                  value={sandboxTenor}
                  onChange={(e) => setSandboxTenor(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded px-2 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="0"
                  aria-label={t('decision.sandboxLabelTenor')}
                  data-testid="sandbox-tenor-input"
                />
              </div>
            </div>

            {/* Result badge — smooth colour transition */}
            {sandboxResult && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">{t('decision.sandboxResult')}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors duration-200 ${VERDICT_STYLE[sandboxResult.verdict].badge}`}
                  data-testid="sandbox-verdict-badge"
                >
                  {t(BADGE_LABEL_KEY[sandboxResult.verdict])}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400 leading-snug">{t('decision.disclaimer')}</p>
    </div>
  );
}
