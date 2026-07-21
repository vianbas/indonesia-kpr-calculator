import { useTranslation } from 'react-i18next';
import { formatIDR, formatIDRCompact } from '../../../domain/utils/currency';
import type { OverCreditResult } from '../../../domain/calculators/overCredit';

interface Props {
  result: OverCreditResult;
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-b-0">
      <div>
        <p className="text-xs font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <p className="text-sm font-semibold text-right tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

export function OverCreditResultCard({ result }: Props) {
  const { t } = useTranslation();
  const ltvPct = (result.effectiveLtv * 100).toFixed(0);
  const ltvOver = result.flags.includes('ltv_over_guardrail');

  return (
    <div className="space-y-4">
      {/* Hero: cash upfront */}
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-center">
        <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
          {t('overCredit.cashUpfront')}
        </p>
        <p className="mt-1 text-2xl font-bold text-green-800 tabular-nums">
          {formatIDR(result.buyerCashUpfront)}
        </p>
        <p className="text-xs text-green-600">{t('overCredit.cashUpfrontSub')}</p>
      </div>

      {/* Warnings */}
      {result.flags.includes('appraisal_shortfall') && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          {t('overCredit.warnAppraisalShortfall', { amount: formatIDR(result.appraisalShortfall) })}
        </p>
      )}
      {ltvOver && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          {t('overCredit.warnLtvOver')}
        </p>
      )}
      {result.flags.includes('seller_negative_equity') && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {t('overCredit.warnNegativeEquity')}
        </p>
      )}
      {result.flags.includes('penalty_maybe_applies') && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          {t('overCredit.warnPenaltyMaybe')}
        </p>
      )}

      {/* New installment */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">{t('overCredit.resultTitle')}</p>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-0.5">{t('overCredit.newInstallment')}</p>
          <p className="text-lg font-bold text-gray-800 tabular-nums">
            {formatIDRCompact(result.newMonthlyPayment)}
          </p>
          <p className="text-xs text-gray-400">{t('overCredit.perMonth')}</p>
        </div>
        <div className="px-4">
          <MetricRow label={t('overCredit.newLoanAmount')} value={formatIDR(result.newLoanAmount)} sub={t('overCredit.newLoanAmountSub')} />
          <MetricRow label={t('overCredit.sellerEquity')} value={formatIDR(result.sellerEquity)} sub={t('overCredit.sellerEquitySub')} />
          <MetricRow label={t('overCredit.totalInterest')} value={formatIDR(result.newTotalInterest)} />
          <MetricRow label={t('overCredit.totalPayment')} value={formatIDR(result.newTotalPayment)} />
          <MetricRow
            label={t('overCredit.ltvLabel')}
            value={`${ltvPct}%`}
            sub={ltvOver ? t('overCredit.warnLtvOver') : undefined}
          />
          <MetricRow label={t('overCredit.totalCostAcquisition')} value={formatIDR(result.totalCostOfAcquisition)} sub={t('overCredit.totalCostAcquisitionSub')} />
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-700">{t('overCredit.costBreakdown')}</p>
        </div>
        <div className="px-4">
          <MetricRow label={t('overCredit.provision')} value={formatIDR(result.provisionFee)} />
          <MetricRow label={t('overCredit.npoptkp')} value={`BPHTB ${formatIDR(result.bphtb)}`} />
          <MetricRow label={t('overCredit.oldPenalty')} value={formatIDR(result.oldBankPenalty)} sub={t('overCredit.penaltyNote')} />
          <MetricRow label={t('overCredit.costSection')} value={formatIDR(result.totalProcessCost)} />
        </div>
      </div>
    </div>
  );
}
