import { useTranslation } from 'react-i18next';
import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { RefinancingFormState } from '../../../application/store/refinancingTypes';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  form: RefinancingFormState;
  onChange: (key: keyof RefinancingFormState, value: string) => void;
  activeScenario: CalculatedScenario | null;
  onPrefill: () => void;
}

export function RefinancingInputs({ form, onChange, activeScenario, onPrefill }: Props) {
  const { t } = useTranslation();

  const balance = parseFloat(form.remainingBalance) || 0;
  const switchingCost =
    balance * ((parseFloat(form.provisionFeePercent) || 0) / 100) +
    (parseFloat(form.appraisalFeeIDR) || 0) +
    (parseFloat(form.adminFeeIDR) || 0);

  return (
    <div className="space-y-4">
      {/* Pre-fill row */}
      {activeScenario && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {t('refinancing.autoFillDesc')}
          </p>
          <button
            type="button"
            onClick={onPrefill}
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
          >
            {t('refinancing.autoFillBtn')}
          </button>
        </div>
      )}

      {/* Syariah note */}
      {activeScenario?.summary.financingMode === 'syariah' && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {t('syariah.refinancingNote')}
        </p>
      )}

      {/* Current loan */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('refinancing.currentLoan')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField
            label={t('refinancing.remainingBalance')}
            value={form.remainingBalance}
            onChange={(v) => onChange('remainingBalance', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="1000000"
            hint={balance > 0 ? formatIDR(balance) : t('refinancing.remainingBalanceHint')}
          />
          <InputField
            label={t('refinancing.currentRate')}
            value={form.currentAnnualRatePercent}
            onChange={(v) => onChange('currentAnnualRatePercent', v)}
            type="number"
            suffix="%"
            placeholder="0"
            min="0"
            max="30"
            step="0.25"
            hint={t('refinancing.currentRateHint')}
          />
          <InputField
            label={t('refinancing.remainingTenor')}
            value={form.remainingMonths}
            onChange={(v) => onChange('remainingMonths', v)}
            type="number"
            suffix={t('form.tenorMonths').toLowerCase()}
            placeholder="0"
            min="1"
            step="1"
            hint={t('refinancing.remainingTenorHint')}
          />
        </div>
      </div>

      {/* New offer */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('refinancing.newOffer')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label={t('refinancing.newRate')}
            value={form.newAnnualRatePercent}
            onChange={(v) => onChange('newAnnualRatePercent', v)}
            type="number"
            suffix="%"
            placeholder="0"
            min="0"
            max="30"
            step="0.25"
            hint={t('refinancing.newRateHint')}
          />
          <InputField
            label={t('refinancing.newTenor')}
            value={form.newTenorMonths}
            onChange={(v) => onChange('newTenorMonths', v)}
            type="number"
            suffix={t('form.tenorMonths').toLowerCase()}
            placeholder="0"
            min="1"
            step="1"
            hint={t('refinancing.newTenorHint')}
          />
        </div>
      </div>

      {/* Switching costs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t('refinancing.switchingCost')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField
            label={t('refinancing.switchingProvision')}
            value={form.provisionFeePercent}
            onChange={(v) => onChange('provisionFeePercent', v)}
            type="number"
            suffix="%"
            placeholder="1"
            min="0"
            max="10"
            step="0.25"
            hint={t('refinancing.switchingProvisionHint')}
          />
          <InputField
            label={t('refinancing.switchingAppraisal')}
            value={form.appraisalFeeIDR}
            onChange={(v) => onChange('appraisalFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint={t('refinancing.switchingAppraisalHint')}
          />
          <InputField
            label={t('refinancing.switchingAdmin')}
            value={form.adminFeeIDR}
            onChange={(v) => onChange('adminFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="100000"
            hint={t('refinancing.switchingAdminHint')}
          />
        </div>
      </div>

      {switchingCost > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          {t('refinancing.totalSwitchingCostLabel')}{' '}
          <strong>{formatIDR(switchingCost)}</strong>
        </div>
      )}
    </div>
  );
}
