import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatIDR, formatPercent } from '../../../domain/utils/currency';
import { getRowHighlights } from '../../utils/highlightLogic';
import type { CellHighlight } from '../../utils/highlightLogic';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  scenarios: CalculatedScenario[];
}

interface RowDef {
  label: string;
  getValue: (s: CalculatedScenario) => string;
  getNumeric?: (s: CalculatedScenario) => number;
  isSection?: boolean;
  lowerIsBetter?: boolean;
  highlightEnabled?: boolean;
}

// ─── Styling helpers ──────────────────────────────────────────────────────────

function highlightClass(h: CellHighlight): string {
  if (h === 'best')  return 'bg-green-50 text-green-800 font-semibold';
  if (h === 'worst') return 'bg-red-50 text-red-700';
  return '';
}

// ─── Legend ───────────────────────────────────────────────────────────────────

interface LegendProps {
  scenarioCount: number;
  t: (key: string) => string;
}

function ComparisonLegend({ scenarioCount, t }: LegendProps) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2.5">
      <p className="text-xs font-semibold text-gray-700">{t('scenarios.legendTitle')}</p>
      <p className="text-xs text-gray-500 leading-relaxed">
        {t('scenarios.legendDesc')}
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: t('scenarios.legendBetter').replace(/^([^—]+)/, '<strong class="font-semibold">$1</strong>') }} />
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-200 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: t('scenarios.legendHigher').replace(/^([^—]+)/, '<strong class="font-semibold">$1</strong>') }} />
        </span>
        {scenarioCount > 2 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-300 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: t('scenarios.legendMidRange').replace(/^([^—]+)/, '<strong class="font-semibold">$1</strong>') }} />
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        {t('scenarios.legendFootnote')}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

export function ScenarioComparisonTable({ scenarios }: Props) {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  function cellTooltipText(h: CellHighlight, lowerIsBetter: boolean): string | null {
    if (h === 'best')  return lowerIsBetter ? t('scenarios.tooltipLowest') : t('scenarios.tooltipHighest');
    if (h === 'worst') return lowerIsBetter ? t('scenarios.tooltipHighest') : t('scenarios.tooltipLowest');
    return null;
  }

  const ROWS: RowDef[] = [
    { label: t('scenarios.sectionLoanInfo'), isSection: true, getValue: () => '' },
    {
      label: t('scenarios.rowLoanAmount'),
      getValue: (s) => formatIDR(s.summary.totalPrincipal),
    },
    {
      label: t('scenarios.rowTenorEffective'),
      getValue: (s) => t('scenarios.rowTenorMonths', { count: s.summary.effectiveTenorMonths }),
    },
    {
      label: t('scenarios.rowPaymentMethod'),
      getValue: (s) => (s.form.paymentMethod === 'annuity' ? t('scenarios.paymentAnnuity') : t('scenarios.paymentFlat')),
    },
    { label: t('scenarios.sectionResults'), isSection: true, getValue: () => '' },
    {
      label: t('scenarios.rowFirstInstallment'),
      getValue: (s) => formatIDR(s.summary.installmentGroups[0]?.installmentAmount ?? 0),
      getNumeric: (s) => s.summary.installmentGroups[0]?.installmentAmount ?? 0,
    },
    {
      label: t('scenarios.rowTotalInterest'),
      getValue: (s) => formatIDR(s.summary.totalInterest),
      getNumeric: (s) => s.summary.totalInterest,
    },
    {
      label: t('scenarios.rowTotalPayment'),
      getValue: (s) => formatIDR(s.summary.totalPayment),
      getNumeric: (s) => s.summary.totalPayment,
    },
    {
      label: t('scenarios.rowEffectiveRate'),
      getValue: (s) => formatPercent(s.summary.effectiveAnnualRate, 2, true),
      getNumeric: (s) => s.summary.effectiveAnnualRate,
    },
    {
      label: t('scenarios.rowMonthsSaved'),
      getValue: (s) => (s.summary.monthsSaved > 0 ? t('scenarios.rowTenorMonths', { count: s.summary.monthsSaved }) : '—'),
      getNumeric: (s) => s.summary.monthsSaved,
      lowerIsBetter: false,
    },
    {
      label: t('scenarios.rowInterestSaved'),
      getValue: (s) =>
        s.summary.interestSaved > 0
          ? `${formatIDR(s.summary.interestSaved)} (${s.summary.interestSavedPercent.toFixed(1)}%)`
          : '—',
      getNumeric: (s) => s.summary.interestSaved,
      lowerIsBetter: false,
    },
    { label: t('scenarios.sectionUpfront'), isSection: true, getValue: () => '' },
    {
      label: t('scenarios.rowDownPayment'),
      getValue: (s) => formatIDR(s.summary.downPayment),
      highlightEnabled: false,
    },
    {
      label: t('scenarios.rowProvision'),
      getValue: (s) => (s.summary.provisionFee > 0 ? formatIDR(s.summary.provisionFee) : '—'),
      getNumeric: (s) => s.summary.provisionFee,
    },
    {
      label: t('scenarios.rowAppraisal'),
      getValue: (s) => (s.summary.appraisalFee > 0 ? formatIDR(s.summary.appraisalFee) : '—'),
      getNumeric: (s) => s.summary.appraisalFee,
    },
    {
      label: t('scenarios.rowNotary'),
      getValue: (s) => (s.summary.notaryFee > 0 ? formatIDR(s.summary.notaryFee) : '—'),
      getNumeric: (s) => s.summary.notaryFee,
    },
    {
      label: t('scenarios.rowBphtb'),
      getValue: (s) => (s.summary.bphtb > 0 ? formatIDR(s.summary.bphtb) : '—'),
      getNumeric: (s) => s.summary.bphtb,
    },
    {
      label: t('scenarios.rowTotalUpfront'),
      getValue: (s) =>
        s.summary.totalUpfrontCost > 0 ? formatIDR(s.summary.totalUpfrontCost) : '—',
      getNumeric: (s) => s.summary.totalUpfrontCost,
    },
  ];

  return (
    <>
      {/* Tooltip — position:fixed escapes the panel's overflow:hidden */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded bg-gray-800 text-white text-xs whitespace-nowrap pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 bg-gray-50 text-gray-600 font-semibold text-xs w-40">
                {t('scenarios.metricHeader')}
              </th>
              {scenarios.map((s) => (
                <th
                  key={s.id}
                  className="text-right py-2 px-3 bg-gray-50 text-blue-800 font-semibold text-xs"
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => {
              if (row.isSection) {
                return (
                  <tr key={ri}>
                    <td
                      colSpan={scenarios.length + 1}
                      className="py-1.5 px-3 bg-blue-600 text-white text-xs font-semibold uppercase tracking-wide"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              const numericValues: (number | null)[] = row.getNumeric
                ? scenarios.map((s) => row.getNumeric!(s))
                : scenarios.map(() => null);

              const highlightEnabledForRow =
                row.highlightEnabled ?? row.getNumeric !== undefined;

              const highlights = getRowHighlights(
                numericValues,
                row.lowerIsBetter ?? true,
                highlightEnabledForRow,
              );

              const lowerIsBetter = row.lowerIsBetter ?? true;

              return (
                <tr key={ri} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 px-3 text-gray-700 font-medium bg-gray-50 text-xs">
                    {row.label}
                  </td>
                  {scenarios.map((s, si) => {
                    const h = highlights[si];
                    const tip = cellTooltipText(h, lowerIsBetter);
                    return (
                      <td
                        key={s.id}
                        className={[
                          'py-2.5 px-3 text-right tabular-nums text-gray-800',
                          highlightClass(h),
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onMouseEnter={
                          tip
                            ? (e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  text: tip,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 8,
                                });
                              }
                            : undefined
                        }
                        onMouseLeave={tip ? () => setTooltip(null) : undefined}
                      >
                        {row.getValue(s)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ComparisonLegend scenarioCount={scenarios.length} t={t} />
    </>
  );
}
