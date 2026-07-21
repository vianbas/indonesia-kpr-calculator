import { useTranslation } from 'react-i18next';
import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { OverCreditFormState } from '../../../application/store/overCreditTypes';

interface Props {
  form: OverCreditFormState;
  onChange: <K extends keyof OverCreditFormState>(key: K, value: OverCreditFormState[K]) => void;
}

export function OverCreditInputs({ form, onChange }: Props) {
  const { t } = useTranslation();
  const dp = parseFloat(form.buyerDownPayment) || 0;

  return (
    <div className="space-y-4">
      {/* The Deal */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('overCredit.dealSection')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label={t('overCredit.agreedPrice')}
            value={form.agreedPrice}
            onChange={(v) => onChange('agreedPrice', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={t('overCredit.agreedPriceHint')}
          />
          <InputField
            label={t('overCredit.sellerRemaining')}
            value={form.sellerRemainingPrincipal}
            onChange={(v) => onChange('sellerRemainingPrincipal', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={t('overCredit.sellerRemainingHint')}
          />
          <InputField
            label={t('overCredit.appraisalValue')}
            value={form.appraisalValue}
            onChange={(v) => onChange('appraisalValue', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={t('overCredit.appraisalValueHint')}
          />
          <InputField
            label={t('overCredit.buyerDp')}
            value={form.buyerDownPayment}
            onChange={(v) => onChange('buyerDownPayment', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="10000000"
            hint={dp > 0 ? formatIDR(dp) : t('overCredit.buyerDpHint')}
          />
        </div>
      </div>

      {/* Your New KPR */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('overCredit.newLoanSection')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label={t('overCredit.newRate')}
            value={form.newAnnualRatePercent}
            onChange={(v) => onChange('newAnnualRatePercent', v)}
            type="number"
            suffix="%"
            placeholder="0"
            min="0"
            max="30"
            step="0.25"
            hint={t('overCredit.newRateHint')}
          />
          <InputField
            label={t('overCredit.newTenor')}
            value={form.newTenorMonths}
            onChange={(v) => onChange('newTenorMonths', v)}
            type="number"
            suffix={t('form.tenorMonths').toLowerCase()}
            placeholder="0"
            min="1"
            step="1"
            hint={t('overCredit.newTenorHint')}
          />
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.isSameBank}
            onChange={(e) => onChange('isSameBank', e.target.checked)}
          />
          <span>
            <span className="font-medium text-gray-700">{t('overCredit.sameBankLabel')}</span>
            <span className="block text-gray-400">{t('overCredit.sameBankHint')}</span>
          </span>
        </label>
      </div>

      {/* Process Costs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('overCredit.costSection')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField
            label={t('overCredit.provision')}
            value={form.provisionFeePercent}
            onChange={(v) => onChange('provisionFeePercent', v)}
            type="number"
            suffix="%"
            placeholder="1"
            min="0"
            max="10"
            step="0.25"
            hint={t('overCredit.provisionHint')}
          />
          <InputField
            label={t('overCredit.appraisalFee')}
            value={form.appraisalFeeIDR}
            onChange={(v) => onChange('appraisalFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.appraisalFeeHint')}
          />
          <InputField
            label={t('overCredit.notary')}
            value={form.notaryFeeIDR}
            onChange={(v) => onChange('notaryFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.notaryHint')}
          />
          <InputField
            label={t('overCredit.balikNama')}
            value={form.balikNamaFeeIDR}
            onChange={(v) => onChange('balikNamaFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.balikNamaHint')}
          />
          <InputField
            label={t('overCredit.insurance')}
            value={form.insuranceIDR}
            onChange={(v) => onChange('insuranceIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('overCredit.insuranceHint')}
          />
          {!form.isSameBank && (
            <InputField
              label={t('overCredit.oldPenalty')}
              value={form.oldBankPenaltyPercent}
              onChange={(v) => onChange('oldBankPenaltyPercent', v)}
              type="number"
              suffix="%"
              placeholder="0"
              min="0"
              max="10"
              step="0.25"
              hint={t('overCredit.oldPenaltyHint')}
            />
          )}
          <InputField
            label={t('overCredit.npoptkp')}
            value={form.npoptkp}
            onChange={(v) => onChange('npoptkp', v)}
            type="number"
            prefix="Rp"
            placeholder="60000000"
            min="0"
            step="10000000"
            hint={t('overCredit.npoptkpHint')}
          />
        </div>
      </div>
    </div>
  );
}
