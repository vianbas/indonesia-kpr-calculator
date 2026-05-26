import { useState } from 'react';
import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { AffordabilityFormState } from '../../../application/store/affordabilityTypes';

interface Props {
  form: AffordabilityFormState;
  onChange: (key: keyof AffordabilityFormState, value: string) => void;
}

export function AffordabilityInputs({ form, onChange }: Props) {
  const [open, setOpen] = useState(true);

  const income1 = parseFloat(form.monthlyIncome) || 0;
  const income2 = parseFloat(form.spouseIncome) || 0;
  const totalIncome = income1 + income2;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-indigo-500">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Analisis Kemampuan Bayar
          </p>
          {!open && totalIncome > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              Penghasilan: {formatIDR(totalIncome)}/bln
            </p>
          )}
        </div>
        <span className="text-gray-400 text-xs select-none" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Penghasilan Bulanan"
              value={form.monthlyIncome}
              onChange={(v) => onChange('monthlyIncome', v)}
              type="number"
              prefix="Rp"
              placeholder="0"
              min="0"
              step="500000"
              hint={income1 > 0 ? formatIDR(income1) : 'Penghasilan pokok per bulan'}
            />
            <InputField
              label="Penghasilan Pasangan"
              value={form.spouseIncome}
              onChange={(v) => onChange('spouseIncome', v)}
              type="number"
              prefix="Rp"
              placeholder="0"
              min="0"
              step="500000"
              hint={income2 > 0 ? formatIDR(income2) : 'Opsional'}
            />
          </div>

          <InputField
            label="Cicilan / Hutang Lain per Bulan"
            value={form.existingMonthlyDebt}
            onChange={(v) => onChange('existingMonthlyDebt', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="100000"
            hint="KTA, kartu kredit, cicilan kendaraan, dll."
          />

          <InputField
            label="Pengeluaran Hidup Bulanan"
            value={form.monthlyLivingExpense}
            onChange={(v) => onChange('monthlyLivingExpense', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint="Makan, transportasi, kebutuhan rutin"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Minimum Surplus Bulanan"
              value={form.minMonthlySurplus}
              onChange={(v) => onChange('minMonthlySurplus', v)}
              type="number"
              prefix="Rp"
              placeholder="0"
              min="0"
              step="500000"
              hint="Cadangan minimum yang ingin dipertahankan"
            />
            <InputField
              label="Batas DSR"
              value={form.maxDSRPercent}
              onChange={(v) => onChange('maxDSRPercent', v)}
              type="number"
              suffix="%"
              placeholder="35"
              min="1"
              max="70"
              step="1"
              hint="Rasio cicilan / penghasilan maks."
            />
          </div>

          {totalIncome > 0 && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-700">
              Total penghasilan gabungan:{' '}
              <strong>{formatIDR(totalIncome)}</strong>/bulan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
