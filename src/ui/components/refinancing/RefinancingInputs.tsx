import { InputField } from '../common/InputField';
import { formatIDR } from '../../../domain/utils/currency';
import type { RefinancingFormState } from '../../../application/store/refinancingTypes';
import type { CalculatedScenario } from '../../../application/store/scenarioTypes';

interface Props {
  form: RefinancingFormState;
  onChange: (key: keyof RefinancingFormState, value: string) => void;
  /** Active calculated scenario, used for the pre-fill button. */
  activeScenario: CalculatedScenario | null;
  onPrefill: () => void;
}

export function RefinancingInputs({ form, onChange, activeScenario, onPrefill }: Props) {
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
            Isi otomatis dari hasil simulasi aktif
          </p>
          <button
            type="button"
            onClick={onPrefill}
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
          >
            Isi dari Skenario
          </button>
        </div>
      )}

      {/* Current loan */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Kondisi KPR Saat Ini
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField
            label="Sisa Pokok Hutang"
            value={form.remainingBalance}
            onChange={(v) => onChange('remainingBalance', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="1000000"
            hint={balance > 0 ? formatIDR(balance) : 'Saldo pokok yang tersisa'}
          />
          <InputField
            label="Suku Bunga Saat Ini"
            value={form.currentAnnualRatePercent}
            onChange={(v) => onChange('currentAnnualRatePercent', v)}
            type="number"
            suffix="%"
            placeholder="0"
            min="0"
            max="30"
            step="0.25"
            hint="Bunga floating yang berlaku sekarang"
          />
          <InputField
            label="Sisa Tenor"
            value={form.remainingMonths}
            onChange={(v) => onChange('remainingMonths', v)}
            type="number"
            suffix="bulan"
            placeholder="0"
            min="1"
            step="1"
            hint="Bulan cicilan yang tersisa"
          />
        </div>
      </div>

      {/* New offer */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Penawaran Bank Baru
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Suku Bunga Baru"
            value={form.newAnnualRatePercent}
            onChange={(v) => onChange('newAnnualRatePercent', v)}
            type="number"
            suffix="%"
            placeholder="0"
            min="0"
            max="30"
            step="0.25"
            hint="Suku bunga yang ditawarkan bank tujuan"
          />
          <InputField
            label="Tenor Baru"
            value={form.newTenorMonths}
            onChange={(v) => onChange('newTenorMonths', v)}
            type="number"
            suffix="bulan"
            placeholder="0"
            min="1"
            step="1"
            hint="Tenor yang disepakati dengan bank baru"
          />
        </div>
      </div>

      {/* Switching costs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Biaya Pindah Bank
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputField
            label="Provisi / Penalty"
            value={form.provisionFeePercent}
            onChange={(v) => onChange('provisionFeePercent', v)}
            type="number"
            suffix="%"
            placeholder="1"
            min="0"
            max="10"
            step="0.25"
            hint="Dari sisa pokok (biasa 1–3%)"
          />
          <InputField
            label="Biaya Appraisal"
            value={form.appraisalFeeIDR}
            onChange={(v) => onChange('appraisalFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="500000"
            hint="Biaya penilaian properti"
          />
          <InputField
            label="Biaya Admin"
            value={form.adminFeeIDR}
            onChange={(v) => onChange('adminFeeIDR', v)}
            type="number"
            prefix="Rp"
            placeholder="0"
            min="0"
            step="100000"
            hint="Biaya administrasi bank baru"
          />
        </div>
      </div>

      {switchingCost > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          Total biaya pindah bank:{' '}
          <strong>{formatIDR(switchingCost)}</strong>
        </div>
      )}
    </div>
  );
}
