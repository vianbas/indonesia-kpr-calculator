import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
}

function parsePercent(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseAmount(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function KprFeesSection({ form, dispatch }: Props) {
  const propertyPrice = parseFloat(form.propertyPrice) || 0;
  const dpRaw = parseFloat(form.downPaymentValue) || 0;
  const downPayment =
    form.downPaymentMode === 'percent' ? propertyPrice * (dpRaw / 100) : dpRaw;
  const loanAmount = Math.max(0, propertyPrice - downPayment);

  const provisionFee = Math.round((parsePercent(form.provisionFeePercent) / 100) * loanAmount);
  const appraisalFee = parseAmount(form.appraisalFeeAmount);
  const notaryFee = Math.round((parsePercent(form.notaryFeePercent) / 100) * propertyPrice);
  const bphtb = Math.round((parsePercent(form.bphtbPercent) / 100) * propertyPrice);
  const totalFees = provisionFee + appraisalFee + notaryFee + bphtb;
  const totalUpfront = downPayment + totalFees;

  return (
    <Card title="Biaya Pembelian" accent="orange">
      <div className="space-y-4">
        {/* Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.includeKprFees}
            onChange={(e) => dispatch({ type: 'SET_INCLUDE_KPR_FEES', value: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Hitung biaya pengadaan KPR
          </span>
        </label>

        {form.includeKprFees && (
          <div className="space-y-4">
            {/* Provisi */}
            <InputField
              label="Biaya Provisi"
              value={form.provisionFeePercent}
              onChange={(v) => dispatch({ type: 'SET_PROVISION_FEE_PERCENT', value: v })}
              type="number"
              suffix="%"
              placeholder="1"
              min="0"
              step="0.1"
              hint={
                loanAmount > 0 && provisionFee > 0
                  ? `≈ ${formatIDR(provisionFee)} dari nilai kredit`
                  : '% dari nilai kredit'
              }
            />

            {/* Appraisal */}
            <InputField
              label="Biaya Appraisal"
              value={form.appraisalFeeAmount}
              onChange={(v) => dispatch({ type: 'SET_APPRAISAL_FEE_AMOUNT', value: v })}
              type="number"
              prefix="Rp"
              placeholder="0"
              min="0"
              step="500000"
              hint="Biaya penilaian properti, bayar sekali"
            />

            {/* Notaris / PPAT */}
            <InputField
              label="Biaya Notaris / PPAT"
              value={form.notaryFeePercent}
              onChange={(v) => dispatch({ type: 'SET_NOTARY_FEE_PERCENT', value: v })}
              type="number"
              suffix="%"
              placeholder="0.75"
              min="0"
              step="0.05"
              hint={
                propertyPrice > 0 && notaryFee > 0
                  ? `≈ ${formatIDR(notaryFee)} dari harga properti`
                  : '% dari harga properti'
              }
            />

            {/* BPHTB */}
            <InputField
              label="BPHTB"
              value={form.bphtbPercent}
              onChange={(v) => dispatch({ type: 'SET_BPHTB_PERCENT', value: v })}
              type="number"
              suffix="%"
              placeholder="5"
              min="0"
              step="0.5"
              hint={
                propertyPrice > 0 && bphtb > 0
                  ? `≈ ${formatIDR(bphtb)} dari harga properti`
                  : '% dari harga properti (default 5%)'
              }
            />

            {/* Summary strip */}
            {(loanAmount > 0 || propertyPrice > 0) && (
              <div className="rounded-lg border border-orange-100 bg-orange-50 divide-y divide-orange-100 text-xs">
                <div className="flex items-center justify-between px-3 py-2 text-gray-500">
                  <span>Total biaya tambahan</span>
                  <span className="font-semibold text-gray-700">{formatIDR(totalFees)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-semibold text-orange-800">Total dana awal (DP + Biaya)</span>
                  <span className="font-bold text-orange-900">{formatIDR(totalUpfront)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
