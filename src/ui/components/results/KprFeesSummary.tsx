import { Card } from '../common/Card';
import { formatIDR, formatIDRCompact } from '../../../domain/utils/currency';
import type { MortgageSummary } from '../../../domain';

interface Props {
  summary: MortgageSummary;
}

interface LineItemProps {
  label: string;
  amount: number;
  bold?: boolean;
  accent?: boolean;
}

function LineItem({ label, amount, bold, accent }: LineItemProps) {
  return (
    <div
      className={[
        'flex items-center justify-between px-4 py-2.5',
        accent ? 'bg-orange-50' : '',
      ].join(' ')}
    >
      <span
        className={[
          'text-sm',
          bold ? 'font-semibold text-gray-900' : 'text-gray-600',
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'text-sm tabular-nums',
          bold && accent ? 'font-bold text-orange-900' : bold ? 'font-semibold text-gray-900' : 'text-gray-700',
        ].join(' ')}
      >
        {formatIDR(amount)}
      </span>
    </div>
  );
}

export function KprFeesSummary({ summary }: Props) {
  const {
    downPayment, adminFee, provisionFee, appraisalFee,
    notaryFee, bphtb, ppnAmount, lifeInsurance, fireInsurance,
    totalUpfrontCost,
  } = summary;

  const hasBankFees = provisionFee > 0 || appraisalFee > 0 || adminFee > 0;
  const hasLegalFees = notaryFee > 0 || bphtb > 0;
  const hasTaxFees = ppnAmount > 0;
  const hasInsurance = lifeInsurance > 0 || fireInsurance > 0;
  const hasAnyFee = hasBankFees || hasLegalFees || hasTaxFees || hasInsurance;

  return (
    <Card accent="orange">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Dana Awal yang Dibutuhkan
            </p>
            <p className="text-2xl font-bold text-orange-900 mt-0.5">
              {formatIDRCompact(totalUpfrontCost)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formatIDR(totalUpfrontCost)}</p>
          </div>
          <span className="text-3xl select-none">🏠</span>
        </div>

        {/* Itemized breakdown */}
        <div className="rounded-xl border border-orange-100 overflow-hidden divide-y divide-orange-100">
          <LineItem label="Uang Muka (DP)" amount={downPayment} />

          {hasBankFees && (
            <>
              {adminFee > 0 && <LineItem label="Biaya Administrasi" amount={adminFee} />}
              {provisionFee > 0 && <LineItem label="Biaya Provisi (Bank)" amount={provisionFee} />}
              {appraisalFee > 0 && <LineItem label="Biaya Appraisal" amount={appraisalFee} />}
            </>
          )}

          {hasLegalFees && (
            <>
              {notaryFee > 0 && <LineItem label="Biaya Notaris / PPAT" amount={notaryFee} />}
              {bphtb > 0 && <LineItem label="BPHTB" amount={bphtb} />}
            </>
          )}

          {hasTaxFees && (
            <LineItem label="PPN (Pajak Pertambahan Nilai)" amount={ppnAmount} />
          )}

          {hasInsurance && (
            <>
              {lifeInsurance > 0 && (
                <LineItem label="Asuransi Jiwa KPR (estimasi)" amount={lifeInsurance} />
              )}
              {fireInsurance > 0 && (
                <LineItem label="Asuransi Kebakaran (estimasi)" amount={fireInsurance} />
              )}
            </>
          )}

          {!hasAnyFee && (
            <div className="px-4 py-2.5 text-sm text-gray-400 italic">
              Tidak ada biaya tambahan
            </div>
          )}
          <LineItem label="Total Dana Awal" amount={totalUpfrontCost} bold accent />
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Estimasi biaya. Nilai aktual dapat berbeda tergantung bank, notaris, dan kebijakan daerah.
        </p>
      </div>
    </Card>
  );
}
