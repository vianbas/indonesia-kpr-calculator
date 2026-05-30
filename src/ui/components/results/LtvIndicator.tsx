import { useTranslation } from 'react-i18next';
import type { MortgageFormState } from '../../../application/store/formTypes';
import { deriveLoanValuation } from '../../../application/converters/formToInput';
import { assessLtv, type HomeOrder } from '../../../domain/calculators/ltv';
import { formatIDR } from '../../../domain/utils/currency';

interface Props {
  form: MortgageFormState;
}

const ORDER_KEY: Record<HomeOrder, string> = {
  first: 'ltv.homeFirst',
  second: 'ltv.homeSecond',
  third_plus: 'ltv.homeThird',
};

/**
 * Advisory loan-to-value indicator: shows the loan's LTV and whether the down
 * payment clears reference BI-style caps for 1st / 2nd / 3rd-home tiers. Derived
 * from the form (not the summary, whose downPayment is only set when the KPR-fees
 * section is enabled). Renders nothing when the form can't yet form a valid loan.
 */
export function LtvIndicator({ form }: Props) {
  const { t } = useTranslation();

  const valuation = deriveLoanValuation(form);
  if (!valuation) return null;

  const assessment = assessLtv({
    propertyValue: valuation.propertyPrice,
    downPayment: valuation.downPayment,
    financingMode: form.financingMode,
  });
  if (!assessment) return null;

  const ltvPct = assessment.ltv * 100;
  const dpPct = assessment.downPaymentRatio * 100;
  // Headline risk: does the DP fail even the most lenient (first-home) cap?
  const exceedsAll = !assessment.tiers[0].withinCap;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5" data-testid="ltv-indicator">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('ltv.title')}</p>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            exceedsAll ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {t('ltv.ratioBadge', { pct: ltvPct.toFixed(0) })}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-2.5">
        {t('ltv.dpSummary', { pct: dpPct.toFixed(1), amount: formatIDR(assessment.downPayment) })}
      </p>

      <ul className="space-y-1.5">
        {assessment.tiers.map((tier) => (
          <li key={tier.order} className="flex items-center justify-between text-xs gap-2">
            <span className="flex items-center gap-1.5 text-gray-600 min-w-0">
              <span className={tier.withinCap ? 'text-green-600' : 'text-red-500'} aria-hidden="true">
                {tier.withinCap ? '✓' : '✗'}
              </span>
              <span className="truncate">{t(ORDER_KEY[tier.order])}</span>
              <span className="text-gray-400 shrink-0">
                ({t('ltv.capLabel', { pct: (tier.maxLtv * 100).toFixed(0) })})
              </span>
            </span>
            <span className={`font-medium shrink-0 ${tier.withinCap ? 'text-gray-500' : 'text-red-600'}`}>
              {tier.withinCap ? t('ltv.ok') : t('ltv.needMore', { amount: formatIDR(tier.shortfall) })}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-gray-400 mt-2.5 leading-snug">{t('ltv.disclaimer')}</p>
    </div>
  );
}
