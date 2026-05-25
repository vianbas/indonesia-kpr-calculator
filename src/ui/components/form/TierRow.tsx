import { InputField } from '../common/InputField';
import { Button } from '../common/Button';
import type { TierFormRow } from '../../../application/store/formTypes';

interface Props {
  tier: TierFormRow;
  index: number;
  totalTiers: number;
  fromMonth: number;
  tenorTotal: number;
  tierError?: string;
  onUpdate: (id: string, field: 'toMonth' | 'rate', value: string) => void;
  onRemove: (id: string) => void;
}

export function TierRow({
  tier,
  index,
  totalTiers,
  fromMonth,
  tenorTotal,
  tierError,
  onUpdate,
  onRemove,
}: Props) {
  const isLast = index === totalTiers - 1;
  const tierNumber = index + 1;
  const toMonthNum = parseInt(tier.toMonth) || 0;

  return (
    <div
      className={[
        'rounded-lg border p-3 space-y-3',
        tierError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50',
      ].join(' ')}
    >
      {/* Tier header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Tier {tierNumber}
        </span>
        {totalTiers > 1 && (
          <Button
            size="sm"
            variant="danger"
            type="button"
            onClick={() => onRemove(tier.id)}
            aria-label={`Hapus Tier ${tierNumber}`}
          >
            Hapus
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* From month — read-only */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Dari Bulan</span>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 leading-tight">
            <span>{fromMonth}</span>
            <span className="block text-xs text-gray-400 font-normal">
              Thn {Math.ceil(fromMonth / 12)}
            </span>
          </div>
        </div>

        {/* To month — editable for non-last; locked for last */}
        {isLast ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Sampai Bulan</span>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-700 font-medium leading-tight">
              <span>{tenorTotal} <span className="text-xs font-normal">(akhir)</span></span>
              <span className="block text-xs text-blue-400 font-normal">
                Thn {Math.ceil(tenorTotal / 12)}
              </span>
            </div>
          </div>
        ) : (
          <InputField
            label="Sampai Bulan"
            id={`tier-to-${tier.id}`}
            value={tier.toMonth}
            onChange={(v) => onUpdate(tier.id, 'toMonth', v)}
            type="number"
            min={String(fromMonth)}
            max={String(tenorTotal - 1)}
            placeholder={String(fromMonth + 11)}
            hint={toMonthNum > 0 ? `Thn ${Math.ceil(toMonthNum / 12)} · ${toMonthNum - fromMonth + 1} bln` : undefined}
          />
        )}

        {/* Rate */}
        <InputField
          label="Suku Bunga"
          id={`tier-rate-${tier.id}`}
          value={tier.rate}
          onChange={(v) => onUpdate(tier.id, 'rate', v)}
          type="number"
          suffix="% p.a."
          placeholder="9.00"
          min="0"
          max="100"
          step="0.25"
        />
      </div>

      {tierError && <p className="text-xs text-red-600">⚠ {tierError}</p>}
    </div>
  );
}
