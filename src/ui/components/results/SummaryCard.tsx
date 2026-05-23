import { Card } from '../common/Card';
import { formatIDR, formatIDRCompact, formatPercent, formatTenor } from '../../../domain/utils/currency';
import type { MortgageSummary } from '../../../domain';

interface Props {
  summary: MortgageSummary;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  badge?: { text: string; color: string };
}

function Metric({ label, value, sub, valueColor = 'text-gray-900', badge }: MetricProps) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3.5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-base font-bold leading-tight ${valueColor}`}>{value}</p>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SummaryCard({ summary }: Props) {
  const {
    installmentGroups,
    totalPrincipal,
    totalInterest,
    totalPayment,
    adminFee,
    effectiveAnnualRate,
    schedule,
  } = summary;

  const tenorMonths = schedule.length;
  const finalBalance = schedule[schedule.length - 1]?.closingBalance ?? 0;
  const firstGroup = installmentGroups[0];
  const hasMultipleRates = installmentGroups.length > 1;

  // Interest-to-principal ratio for the sub-label
  const interestRatioPct =
    totalPrincipal > 0
      ? ((totalInterest / totalPrincipal) * 100).toFixed(1)
      : '0.0';

  return (
    <Card accent="green">
      <div className="space-y-4">
        {/* ── Hero: first-period installment ─────────────────────────────── */}
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 px-5 py-4 text-white shadow-sm">
          <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">
            {hasMultipleRates
              ? `Cicilan Periode ${firstGroup?.type === 'fixed' ? 'Tetap' : 'Variabel'} Pertama`
              : 'Cicilan per Bulan'}
          </p>
          <p className="text-3xl font-extrabold tracking-tight">
            {firstGroup ? formatIDR(firstGroup.installmentAmount) : '—'}
          </p>
          {hasMultipleRates && installmentGroups[1] && (
            <p className="text-xs text-blue-200 mt-1.5">
              Berubah mulai Bulan {installmentGroups[1].fromMonth} →{' '}
              <strong className="text-white">
                {formatIDR(installmentGroups[1].installmentAmount)}
              </strong>
              /bln
            </p>
          )}
          <p className="text-xs text-blue-300 mt-2">
            {formatTenor(tenorMonths)} • {formatPercent(effectiveAnnualRate, 2, true)} efektif
          </p>
        </div>

        {/* ── Metric 1: Loan Amount ───────────────────────────────────────── */}
        <Metric
          label="Nilai Kredit (KPR)"
          value={formatIDRCompact(totalPrincipal)}
          sub={formatIDR(totalPrincipal)}
        />

        {/* ── 2-column grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Metric 2: Total Interest */}
          <Metric
            label="Total Bunga"
            value={formatIDRCompact(totalInterest)}
            sub={`${interestRatioPct}% dari pokok`}
            valueColor="text-orange-700"
          />

          {/* Metric 3: Total Payment */}
          <Metric
            label="Total Pembayaran"
            value={formatIDRCompact(totalPayment)}
            sub={
              adminFee > 0
                ? `Termasuk biaya admin ${formatIDRCompact(adminFee)}`
                : `Pokok + bunga`
            }
            valueColor="text-gray-900"
          />

          {/* Metric 4: Final Remaining Balance */}
          <Metric
            label="Saldo Akhir"
            value={finalBalance === 0 ? 'Rp 0' : formatIDRCompact(finalBalance)}
            sub={finalBalance === 0 ? 'Kredit lunas' : 'Sisa saldo'}
            valueColor={finalBalance === 0 ? 'text-green-700' : 'text-red-600'}
            badge={
              finalBalance === 0
                ? { text: 'Lunas', color: 'bg-green-100 text-green-700' }
                : { text: 'Cek data', color: 'bg-red-100 text-red-700' }
            }
          />

          {/* Metric 5: Effective Rate */}
          <Metric
            label="Suku Bunga Efektif"
            value={formatPercent(effectiveAnnualRate)}
            sub="Rata-rata tertimbang p.a."
          />
        </div>

        {/* ── Installment breakdown (if multiple periods) ─────────────────── */}
        {hasMultipleRates && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Perubahan Cicilan
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {installmentGroups.map((group, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        group.type === 'fixed' ? 'bg-blue-500' : 'bg-indigo-400'
                      }`}
                    />
                    <span className="text-xs text-gray-600">
                      Bln {group.fromMonth}–{group.toMonth}
                      <span className="ml-1.5 text-gray-400">
                        ({group.type === 'fixed' ? 'Tetap' : 'Variabel'}{' '}
                        {formatPercent(group.annualRate)})
                      </span>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {formatIDR(group.installmentAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
