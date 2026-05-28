import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import { formatIDR, formatIDRCompact, formatPercent, formatTenor } from '../../../domain/utils/currency';
import type { MortgageSummary } from '../../../domain';

const AKAD_LABEL: Record<string, string> = {
  murabahah: 'Murabahah',
  musyarakah_mutanaqishah: 'Musyarakah Mutanaqishah',
};

interface Props {
  summary: MortgageSummary;
  onScrollToAmortization?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  badge?: { text: string; color: string };
}

function Metric({ label, value, sub, valueColor = 'text-gray-900', badge }: MetricProps) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-base font-bold leading-tight ${valueColor}`}>{value}</p>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SummaryCard({ summary, onScrollToAmortization }: Props) {
  const { t } = useTranslation();

  const {
    installmentGroups,
    totalPrincipal,
    totalInterest,
    totalPayment,
    adminFee,
    effectiveAnnualRate,
    effectiveTenorMonths,
    monthsSaved,
  } = summary;

  const isSyariah = summary.financingMode === 'syariah';
  const isMurabahah = summary.syariahAkadType === 'murabahah';

  const tenorMonths = effectiveTenorMonths;
  const finalBalance = summary.schedule[summary.schedule.length - 1]?.closingBalance ?? 0;
  const firstGroup = installmentGroups[0];
  const hasMultipleRates = installmentGroups.length > 1;

  const interestRatioPct =
    totalPrincipal > 0
      ? ((totalInterest / totalPrincipal) * 100).toFixed(1)
      : '0.0';

  const heroLabel = isSyariah
    ? isMurabahah
      ? t('syariah.summaryMonthlyInstallment')
      : t('results.firstInstallmentFixed')
    : hasMultipleRates
      ? firstGroup?.type === 'fixed'
        ? t('results.firstInstallmentFixed')
        : t('results.firstInstallmentFloat')
      : t('results.monthlyInstallment');

  const interestLabel = isSyariah
    ? isMurabahah
      ? t('syariah.summaryTotalMargin')
      : t('syariah.summaryTotalUjrah')
    : t('results.totalInterest');

  const loanAmountLabel = isSyariah
    ? t('syariah.summaryFinancingAmount')
    : t('results.loanAmount');

  return (
    <Card accent="green">
      <div className="space-y-4">
        {/* ── Syariah akad badge ──────────────────────────────────────────── */}
        {isSyariah && summary.syariahAkadType && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {AKAD_LABEL[summary.syariahAkadType] ?? summary.syariahAkadType}
            </span>
            <span className="text-xs text-gray-400">{t('syariah.modeSelector')}</span>
          </div>
        )}

        {/* ── Hero: first-period installment ─────────────────────────────── */}
        <div className={`rounded-xl px-5 py-4 text-white shadow-sm bg-gradient-to-br ${isSyariah ? 'from-emerald-600 to-emerald-800' : 'from-blue-600 to-blue-800'}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isSyariah ? 'text-emerald-200' : 'text-blue-200'}`}>
            {heroLabel}
          </p>
          <p className="text-3xl font-extrabold tracking-tight">
            {firstGroup ? formatIDR(firstGroup.installmentAmount) : '—'}
          </p>
          {!isSyariah && hasMultipleRates && installmentGroups[1] && (
            <p className={`text-xs mt-1.5 ${isSyariah ? 'text-emerald-200' : 'text-blue-200'}`}>
              {t('results.installmentChangeFrom', {
                month: installmentGroups[1].fromMonth,
                amount: formatIDR(installmentGroups[1].installmentAmount),
              })}
            </p>
          )}
          <p className={`text-xs mt-2 ${isSyariah ? 'text-emerald-300' : 'text-blue-300'}`}>
            {formatTenor(tenorMonths)} • {formatPercent(effectiveAnnualRate, 2, true)} {isSyariah ? (isMurabahah ? 'margin' : 'ujrah') : t('results.effective')}
            {monthsSaved > 0 && (
              <span className="ml-2 text-green-300 font-semibold">
                {t('results.monthsSaved', { count: monthsSaved })}
              </span>
            )}
          </p>
        </div>

        {/* ── Metric 1: Loan / Financing Amount ──────────────────────────── */}
        <Metric
          label={loanAmountLabel}
          value={formatIDRCompact(totalPrincipal)}
          sub={formatIDR(totalPrincipal)}
        />

        {/* ── Murabahah: show harga jual bank ────────────────────────────── */}
        {isSyariah && isMurabahah && summary.totalSalePrice !== undefined && (
          <Metric
            label={t('syariah.summaryTotalSalePrice')}
            value={formatIDRCompact(summary.totalSalePrice)}
            sub={formatIDR(summary.totalSalePrice)}
            valueColor="text-emerald-700"
          />
        )}

        {/* ── 2-column grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label={interestLabel}
            value={formatIDRCompact(totalInterest)}
            sub={t('results.interestRatio', { pct: interestRatioPct })}
            valueColor="text-orange-700"
          />

          <Metric
            label={t('results.totalPayment')}
            value={formatIDRCompact(totalPayment)}
            sub={
              adminFee > 0
                ? t('results.includesAdmin', { amount: formatIDRCompact(adminFee) })
                : t('results.principalPlusInterest')
            }
            valueColor="text-gray-900"
          />

          <Metric
            label={t('results.finalBalance')}
            value={finalBalance === 0 ? 'Rp 0' : formatIDRCompact(finalBalance)}
            sub={finalBalance === 0 ? t('results.paidOff') : t('results.remainingBalance')}
            valueColor={finalBalance === 0 ? 'text-green-700' : 'text-red-600'}
            badge={
              finalBalance === 0
                ? { text: t('results.paidOffBadge'), color: 'bg-green-100 text-green-700' }
                : { text: t('results.checkDataBadge'), color: 'bg-red-100 text-red-700' }
            }
          />

          <Metric
            label={t('results.effectiveRate')}
            value={formatPercent(effectiveAnnualRate)}
            sub={t('results.weightedAvg')}
          />
        </div>

        {/* ── Installment breakdown (if multiple periods) ─────────────────── */}
        {hasMultipleRates && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('results.installmentChanges')}
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {installmentGroups.map((group, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        group.type === 'fixed' ? 'bg-blue-500' : 'bg-indigo-400'
                      }`}
                    />
                    <span className="text-xs text-gray-600">
                      {t('results.month')} {group.fromMonth}–{group.toMonth}
                      <span className="ml-1.5 text-gray-400">
                        ({group.type === 'fixed' ? t('results.periodFixed') : t('results.periodVariable')}{' '}
                        {formatPercent(group.annualRate)})
                      </span>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {formatIDR(group.installmentAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── Jump-to-schedule shortcut ───────────────────────────────────── */}
        {onScrollToAmortization && (
          <button
            type="button"
            onClick={onScrollToAmortization}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
              isSyariah
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            {t('results.nextStepAmortTitle')}
          </button>
        )}
      </div>
    </Card>
  );
}
