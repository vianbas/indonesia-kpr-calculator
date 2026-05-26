import { Card } from '../common/Card';
import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { MortgageFormState, FormAction } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
}

function parse(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

export function KprFeesSection({ form, dispatch }: Props) {
  const propertyPrice = parse(form.propertyPrice);
  const dpRaw = parse(form.downPaymentValue);
  const downPayment =
    form.downPaymentMode === 'percent' ? propertyPrice * (dpRaw / 100) : dpRaw;
  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const tenorMonths =
    (parseInt(form.tenorYears) || 0) * 12 + (parseInt(form.tenorAdditionalMonths) || 0);
  const tenorYears = tenorMonths / 12;

  // ── Live previews ─────────────────────────────────────────────────────────
  const provisionFee = Math.round((parse(form.provisionFeePercent) / 100) * loanAmount);
  const appraisalFee = parse(form.appraisalFeeAmount);
  const notaryFee = Math.round((parse(form.notaryFeePercent) / 100) * propertyPrice);
  const bphtb = Math.round((parse(form.bphtbPercent) / 100) * propertyPrice);

  const ppnAmount = form.ppnEnabled
    ? Math.round((parse(form.ppnPercent) / 100) * propertyPrice)
    : 0;

  const lifeInsurance =
    form.insuranceEnabled && tenorYears > 0
      ? Math.round((parse(form.lifeInsurancePremiumPercent) / 100) * loanAmount * tenorYears)
      : 0;

  const fireInsurance =
    form.insuranceEnabled && tenorYears > 0
      ? Math.round((parse(form.fireInsurancePremiumPercent) / 100) * propertyPrice * tenorYears)
      : 0;

  const totalFees =
    provisionFee + appraisalFee + notaryFee + bphtb + ppnAmount + lifeInsurance + fireInsurance;
  const totalUpfront = downPayment + totalFees;

  return (
    <Card title="Biaya Akad (Cash-to-Close)" accent="orange">
      <div className="space-y-5">
        {/* Master toggle */}
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
          <div className="space-y-5">

            {/* ── Group 1: Bank fees ────────────────────────────────────── */}
            <div>
              <GroupLabel>Biaya Bank</GroupLabel>
              <div className="space-y-3">
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
              </div>
            </div>

            {/* ── Group 2: Legal fees ───────────────────────────────────── */}
            <div>
              <GroupLabel>Biaya Legal</GroupLabel>
              <div className="space-y-3">
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
              </div>
            </div>

            {/* ── Group 3: PPN ──────────────────────────────────────────── */}
            <div>
              <GroupLabel>Pajak Properti</GroupLabel>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ppnEnabled}
                    onChange={(e) => dispatch({ type: 'SET_PPN_ENABLED', value: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    Sertakan PPN (properti baru dari developer)
                  </span>
                </label>

                {form.ppnEnabled && (
                  <InputField
                    label="PPN"
                    value={form.ppnPercent}
                    onChange={(v) => dispatch({ type: 'SET_PPN_PERCENT', value: v })}
                    type="number"
                    suffix="%"
                    placeholder="11"
                    min="0"
                    max="20"
                    step="0.5"
                    hint={
                      propertyPrice > 0 && ppnAmount > 0
                        ? `≈ ${formatIDR(ppnAmount)} dari harga properti`
                        : '% dari harga properti (default 11%)'
                    }
                  />
                )}
              </div>
            </div>

            {/* ── Group 4: Insurance ────────────────────────────────────── */}
            <div>
              <GroupLabel>Asuransi KPR</GroupLabel>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.insuranceEnabled}
                    onChange={(e) =>
                      dispatch({ type: 'SET_INSURANCE_ENABLED', value: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    Sertakan estimasi premi asuransi jiwa & kebakaran
                  </span>
                </label>

                {form.insuranceEnabled && (
                  <div className="space-y-3">
                    <InputField
                      label="Premi Asuransi Jiwa (per tahun)"
                      value={form.lifeInsurancePremiumPercent}
                      onChange={(v) =>
                        dispatch({ type: 'SET_LIFE_INSURANCE_PREMIUM_PERCENT', value: v })
                      }
                      type="number"
                      suffix="%/thn"
                      placeholder="0.2"
                      min="0"
                      max="5"
                      step="0.05"
                      hint={
                        loanAmount > 0 && lifeInsurance > 0
                          ? `≈ ${formatIDR(lifeInsurance)} untuk ${tenorYears.toFixed(1)} thn`
                          : '% dari nilai kredit per tahun'
                      }
                    />
                    <InputField
                      label="Premi Asuransi Kebakaran (per tahun)"
                      value={form.fireInsurancePremiumPercent}
                      onChange={(v) =>
                        dispatch({ type: 'SET_FIRE_INSURANCE_PREMIUM_PERCENT', value: v })
                      }
                      type="number"
                      suffix="%/thn"
                      placeholder="0.075"
                      min="0"
                      max="2"
                      step="0.025"
                      hint={
                        propertyPrice > 0 && fireInsurance > 0
                          ? `≈ ${formatIDR(fireInsurance)} untuk ${tenorYears.toFixed(1)} thn`
                          : '% dari nilai properti per tahun'
                      }
                    />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Estimasi premi dibayar di muka untuk seluruh tenor. Nilai aktual
                      ditentukan oleh perusahaan asuransi bank.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Live summary strip ─────────────────────────────────────── */}
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
