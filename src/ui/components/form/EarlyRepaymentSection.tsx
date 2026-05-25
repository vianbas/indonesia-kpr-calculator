import { Card } from '../common/Card';
import type { MortgageFormState, FormAction, EarlyRepaymentMode } from '../../../application/store/formTypes';

interface Props {
  form: MortgageFormState;
  dispatch: React.Dispatch<FormAction>;
}

const MODE_OPTIONS: { value: EarlyRepaymentMode; label: string; desc: string }[] = [
  { value: 'none',          label: 'Tidak ada',          desc: 'Jadwal angsuran standar' },
  { value: 'extra_monthly', label: 'Tambahan per bulan', desc: 'Bayar ekstra setiap bulan' },
  { value: 'lump_sum',      label: 'Pelunasan sekaligus', desc: 'Satu kali bayar ekstra' },
  { value: 'both',          label: 'Keduanya',           desc: 'Ekstra bulanan + sekaligus' },
];

function isPositiveNumber(v: string): boolean {
  const n = parseFloat(v);
  return v.trim() !== '' && Number.isFinite(n) && n > 0;
}

function isPositiveInt(v: string): boolean {
  const n = parseInt(v, 10);
  return v.trim() !== '' && Number.isFinite(n) && n >= 1 && String(n) === v.trim();
}

export function EarlyRepaymentSection({ form, dispatch }: Props) {
  const { earlyRepaymentMode } = form;
  const showExtra = earlyRepaymentMode === 'extra_monthly' || earlyRepaymentMode === 'both';
  const showLump  = earlyRepaymentMode === 'lump_sum'      || earlyRepaymentMode === 'both';

  // Inline validation — only surface an error when the field has a value but it's invalid
  const extraAmountErr  = showExtra && form.extraMonthlyAmount !== '' && !isPositiveNumber(form.extraMonthlyAmount)
    ? 'Masukkan jumlah lebih dari 0' : '';
  const extraStartErr   = showExtra && form.extraMonthlyStartMonth !== '' && !isPositiveInt(form.extraMonthlyStartMonth)
    ? 'Bulan mulai harus bilangan ≥ 1' : '';
  const extraEndErr     = showExtra && form.extraMonthlyEndMonth !== '' && !isPositiveInt(form.extraMonthlyEndMonth)
    ? 'Bulan berakhir harus bilangan ≥ 1' : '';
  const lumpAmountErr   = showLump  && form.lumpSumAmount !== ''      && !isPositiveNumber(form.lumpSumAmount)
    ? 'Masukkan jumlah lebih dari 0' : '';
  const lumpMonthErr    = showLump  && form.lumpSumMonth !== ''       && !isPositiveInt(form.lumpSumMonth)
    ? 'Bulan harus bilangan ≥ 1' : '';

  return (
    <Card title="Pelunasan Dipercepat" subtitle="Opsional — simulasikan pembayaran ekstra untuk mempercepat lunas">
      <div className="space-y-4">

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => dispatch({ type: 'SET_EARLY_REPAYMENT_MODE', mode: opt.value })}
              className={[
                'rounded-lg border px-3 py-2.5 text-left transition-colors',
                earlyRepaymentMode === opt.value
                  ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <p className={`text-xs font-semibold ${earlyRepaymentMode === opt.value ? 'text-teal-800' : 'text-gray-800'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Extra monthly payment fields */}
        {showExtra && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
              Tambahan per Bulan
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Jumlah Ekstra (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.extraMonthlyAmount}
                onChange={(e) => dispatch({ type: 'SET_EXTRA_MONTHLY_AMOUNT', value: e.target.value })}
                placeholder="cth: 500000"
                className={[
                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                  extraAmountErr
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-teal-400',
                ].join(' ')}
              />
              {extraAmountErr && <p className="mt-1 text-xs text-red-600">{extraAmountErr}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mulai Bulan ke-
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.extraMonthlyStartMonth}
                  onChange={(e) => dispatch({ type: 'SET_EXTRA_MONTHLY_START_MONTH', value: e.target.value })}
                  placeholder="1"
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                    extraStartErr
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-teal-400',
                  ].join(' ')}
                />
                {extraStartErr && <p className="mt-1 text-xs text-red-600">{extraStartErr}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Berakhir Bulan ke- <span className="text-gray-400">(kosong = sampai lunas)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.extraMonthlyEndMonth}
                  onChange={(e) => dispatch({ type: 'SET_EXTRA_MONTHLY_END_MONTH', value: e.target.value })}
                  placeholder="opsional"
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                    extraEndErr
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-teal-400',
                  ].join(' ')}
                />
                {extraEndErr && <p className="mt-1 text-xs text-red-600">{extraEndErr}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Lump sum fields */}
        {showLump && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
              Pelunasan Sekaligus
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Jumlah Bayar Ekstra (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.lumpSumAmount}
                onChange={(e) => dispatch({ type: 'SET_LUMP_SUM_AMOUNT', value: e.target.value })}
                placeholder="cth: 50000000"
                className={[
                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                  lumpAmountErr
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-teal-400',
                ].join(' ')}
              />
              {lumpAmountErr && <p className="mt-1 text-xs text-red-600">{lumpAmountErr}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Di Bulan ke-
              </label>
              <input
                type="number"
                min="1"
                value={form.lumpSumMonth}
                onChange={(e) => dispatch({ type: 'SET_LUMP_SUM_MONTH', value: e.target.value })}
                placeholder="cth: 24"
                className={[
                  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                  lumpMonthErr
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-teal-400',
                ].join(' ')}
              />
              {lumpMonthErr && <p className="mt-1 text-xs text-red-600">{lumpMonthErr}</p>}
            </div>
          </div>
        )}

        {earlyRepaymentMode !== 'none' && (
          <p className="text-xs text-gray-400 leading-relaxed">
            Pembayaran ekstra mengurangi saldo pokok dan memperpendek tenor. Cicilan bulanan
            tidak berubah kecuali suku bunga berubah di batas periode.
          </p>
        )}
      </div>
    </Card>
  );
}
