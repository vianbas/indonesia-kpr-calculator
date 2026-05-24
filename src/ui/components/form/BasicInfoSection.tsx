import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { SelectField } from '../common/SelectField';
import { Button } from '../common/Button';
import { formatIDR } from '../../../domain/utils/currency';
import type { PaymentMethod } from '../../../domain/models/mortgage.types';
import type { MortgageFormState, FormAction, DownPaymentMode } from '../../../application/store/formTypes';
import type { SelectOption } from '../common/SelectField';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
  fieldErrors: Record<string, string>;
}

const paymentMethodOptions: SelectOption<PaymentMethod>[] = [
  { value: 'annuity', label: 'Anuitas — Cicilan tetap per bulan' },
  { value: 'flat', label: 'Flat — Pokok tetap per bulan' },
];

export function BasicInfoSection({ form, dispatch, fieldErrors }: Props) {
  const propertyPrice = parseFloat(form.propertyPrice) || 0;
  const dpRaw = parseFloat(form.downPaymentValue) || 0;
  const downPayment =
    form.downPaymentMode === 'percent' ? propertyPrice * (dpRaw / 100) : dpRaw;
  const principalAmount = Math.max(0, propertyPrice - downPayment);
  const tenorTotal =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);

  // Safe percentage — only shown when propertyPrice > 0 to avoid Infinity
  const dpPercentLabel =
    propertyPrice > 0
      ? ` (${((downPayment / propertyPrice) * 100).toFixed(1)}%)`
      : '';

  return (
    <Card title="Informasi Kredit" accent="blue">
      <div className="space-y-4">
        {/* Property price */}
        <InputField
          label="Harga Properti"
          value={form.propertyPrice}
          onChange={(v) => dispatch({ type: 'SET_PROPERTY_PRICE', value: v })}
          type="number"
          prefix="Rp"
          placeholder="500000000"
          min="1"
          error={fieldErrors['principalAmount']}
          hint={propertyPrice > 0 ? formatIDR(propertyPrice) : undefined}
        />

        {/* Down payment row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Uang Muka</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-medium">
              {(['percent', 'amount'] as DownPaymentMode[]).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant="bare"
                  type="button"
                  onClick={() => dispatch({ type: 'SET_DOWN_PAYMENT_MODE', mode })}
                  className={[
                    'rounded-none border-0',
                    form.downPaymentMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {mode === 'percent' ? '%' : 'Rp'}
                </Button>
              ))}
            </div>
          </div>
          <InputField
            label=""
            id="down-payment-value"
            value={form.downPaymentValue}
            onChange={(v) => dispatch({ type: 'SET_DOWN_PAYMENT_VALUE', value: v })}
            type="number"
            prefix={form.downPaymentMode === 'amount' ? 'Rp' : undefined}
            suffix={form.downPaymentMode === 'percent' ? '%' : undefined}
            placeholder={form.downPaymentMode === 'percent' ? '20' : '100000000'}
            min="0"
            step={form.downPaymentMode === 'percent' ? '0.5' : '1000000'}
            error={fieldErrors['downPaymentValue']}
            hint={
              !fieldErrors['downPaymentValue'] && downPayment > 0
                ? `Setara ${formatIDR(downPayment)}${form.downPaymentMode === 'amount' ? dpPercentLabel : ''}`
                : undefined
            }
          />
        </div>

        {/* Derived loan amount — read-only */}
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">Nilai Kredit (KPR)</span>
          <span className="text-base font-bold text-blue-900">
            {principalAmount > 0 ? formatIDR(principalAmount) : '—'}
          </span>
        </div>

        {/* Tenor */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Jangka Waktu (Tenor)</label>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label=""
              id="tenor-years"
              value={form.tenorYears}
              onChange={(v) => dispatch({ type: 'SET_TENOR_YEARS', value: v })}
              type="number"
              suffix="Tahun"
              placeholder="10"
              min="0"
              max="30"
            />
            <InputField
              label=""
              id="tenor-months"
              value={form.tenorAdditionalMonths}
              onChange={(v) => dispatch({ type: 'SET_TENOR_ADDITIONAL_MONTHS', value: v })}
              type="number"
              suffix="Bulan"
              placeholder="0"
              min="0"
              max="11"
            />
          </div>
          {tenorTotal > 0 && (
            <p className="text-xs text-gray-500">Total: {tenorTotal} bulan</p>
          )}
        </div>

        {/* Payment method — generic SelectField eliminates the type cast */}
        <SelectField<PaymentMethod>
          label="Metode Perhitungan"
          value={form.paymentMethod}
          onChange={(v) => dispatch({ type: 'SET_PAYMENT_METHOD', method: v })}
          options={paymentMethodOptions}
          hint={
            form.paymentMethod === 'annuity'
              ? 'Cicilan bulanan tetap; komposisi pokok/bunga berubah tiap bulan'
              : 'Pokok tetap; bunga dihitung dari pokok awal (cicilan lebih tinggi)'
          }
        />

        {/* Start date */}
        <InputField
          label="Tanggal Pencairan"
          value={form.startDate}
          onChange={(v) => dispatch({ type: 'SET_START_DATE', value: v })}
          type="date"
          min="1900-01-01"
        />

        {/* Admin fee */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.includeAdminFee}
              onChange={(e) => dispatch({ type: 'SET_INCLUDE_ADMIN_FEE', value: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Sertakan Biaya Administrasi</span>
          </label>
          {form.includeAdminFee && (
            <InputField
              label=""
              id="admin-fee"
              value={form.adminFeeAmount}
              onChange={(v) => dispatch({ type: 'SET_ADMIN_FEE_AMOUNT', value: v })}
              type="number"
              prefix="Rp"
              placeholder="0"
              min="0"
              step="100000"
              hint="Biaya admin dibayar satu kali saat pencairan"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
