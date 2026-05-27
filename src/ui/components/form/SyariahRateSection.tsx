import { useTranslation } from 'react-i18next';
import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { SyariahAkadSelector } from './SyariahAkadSelector';
import { calculateAnnuityInstallment } from '../../../domain/calculators/annuity';
import { formatIDR } from '../../../domain/utils/currency';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
}

function computePreview(form: MortgageFormState) {
  const propertyPrice = parseFloat(form.propertyPrice) || 0;
  const dpRaw = parseFloat(form.downPaymentValue) || 0;
  const dp = form.downPaymentMode === 'percent' ? propertyPrice * (dpRaw / 100) : dpRaw;
  const financing = Math.max(0, propertyPrice - dp);

  const tenorYears = parseInt(form.tenorYears) || 0;
  const tenorExtra = parseInt(form.tenorAdditionalMonths) || 0;
  const tenorMonths = tenorYears * 12 + tenorExtra;

  if (financing <= 0 || tenorMonths <= 0) return null;

  if (form.syariahAkadType === 'murabahah') {
    const marginRate = (parseFloat(form.syariahMarginPercent) || 0) / 100;
    const totalMargin = Math.round(financing * marginRate * (tenorMonths / 12));
    const totalSalePrice = financing + totalMargin;
    const monthlyInstallment = Math.round(totalSalePrice / tenorMonths);
    return { kind: 'murabahah' as const, financing, totalMargin, totalSalePrice, monthlyInstallment };
  } else {
    const ujrahRate = (parseFloat(form.syariahUjrahPercent) || 0) / 100;
    const monthlyInstallment = ujrahRate > 0
      ? calculateAnnuityInstallment(financing, ujrahRate, tenorMonths)
      : Math.round(financing / tenorMonths);
    const totalUjrah = Math.round(monthlyInstallment * tenorMonths - financing);
    return { kind: 'mmq' as const, financing, totalUjrah, monthlyInstallment };
  }
}

export function SyariahRateSection({ form, dispatch }: Props) {
  const { t } = useTranslation();
  const preview = computePreview(form);

  return (
    <Card title={t('syariah.akadSelector')} accent="green">
      <div className="space-y-4">
        <SyariahAkadSelector akadType={form.syariahAkadType} dispatch={dispatch} />

        {form.syariahAkadType === 'murabahah' ? (
          <InputField
            label={t('syariah.marginRate')}
            value={form.syariahMarginPercent}
            onChange={(v) => dispatch({ type: 'SET_SYARIAH_MARGIN_PERCENT', value: v })}
            type="number"
            suffix="%"
            placeholder="8"
            min="0"
            step="0.25"
          />
        ) : (
          <div className="space-y-3">
            <InputField
              label={t('syariah.ujrahRate')}
              value={form.syariahUjrahPercent}
              onChange={(v) => dispatch({ type: 'SET_SYARIAH_UJRAH_PERCENT', value: v })}
              type="number"
              suffix="%"
              placeholder="8"
              min="0"
              step="0.25"
            />
            <InputField
              label={t('syariah.bankSharePercent')}
              value={form.syariahBankSharePercent}
              onChange={(v) => dispatch({ type: 'SET_SYARIAH_BANK_SHARE_PERCENT', value: v })}
              type="number"
              suffix="%"
              placeholder="80"
              min="1"
              max="99"
              hint={t('syariah.bankSharePercentHint')}
            />
          </div>
        )}

        {/* Live preview */}
        {preview && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              {t('syariah.previewTitle')}
            </p>
            <div className="space-y-1">
              <PreviewRow label={t('syariah.previewFinancingAmount')} value={formatIDR(preview.financing)} />
              {preview.kind === 'murabahah' ? (
                <>
                  <PreviewRow label={t('syariah.previewTotalMargin')} value={formatIDR(preview.totalMargin)} />
                  <PreviewRow label={t('syariah.previewTotalSalePrice')} value={formatIDR(preview.totalSalePrice)} bold />
                  <PreviewRow label={t('syariah.previewMonthlyInstallment')} value={formatIDR(preview.monthlyInstallment)} bold accent />
                </>
              ) : (
                <>
                  <PreviewRow label={t('syariah.previewTotalUjrah')} value={formatIDR(preview.totalUjrah)} />
                  <PreviewRow label={t('syariah.previewFirstInstallment')} value={formatIDR(preview.monthlyInstallment)} bold accent />
                </>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-gray-400 leading-snug">
          {t('syariah.disclaimer')}
        </p>
      </div>
    </Card>
  );
}

interface PreviewRowProps {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}

function PreviewRow({ label, value, bold, accent }: PreviewRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-emerald-700">{label}</span>
      <span className={`text-xs tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${accent ? 'text-emerald-800' : 'text-emerald-700'}`}>
        {value}
      </span>
    </div>
  );
}
