import { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '../common/Card';
import { formatIDR, formatPercent, monthToYear } from '../../../domain/utils/currency';
import type { AmortizationRow } from '../../../domain';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Flat list item — either a data row or a rate-change separator */
type TableItem =
  | { kind: 'data'; row: AmortizationRow }
  | { kind: 'separator'; newRate: number; interestType: 'fixed' | 'floating'; startMonth: number };

const DATA_ROW_HEIGHT = 44;
const SEPARATOR_HEIGHT = 30;

// ─── Preprocessing ────────────────────────────────────────────────────────────

/** Inserts separator items whenever the interest rate changes between rows. */
function buildTableItems(schedule: AmortizationRow[]): TableItem[] {
  const items: TableItem[] = [];
  for (let i = 0; i < schedule.length; i++) {
    const row = schedule[i];
    if (i > 0 && schedule[i - 1].annualRate !== row.annualRate) {
      items.push({
        kind: 'separator',
        newRate: row.annualRate,
        interestType: row.interestType,
        startMonth: row.month,
      });
    }
    items.push({ kind: 'data', row });
  }
  return items;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'month',   label: 'Bln',        align: 'text-center', width: 'w-12'  },
  { key: 'year',    label: 'Thn',        align: 'text-center', width: 'w-12'  },
  { key: 'rate',    label: 'Suku Bunga', align: 'text-center', width: 'w-24'  },
  { key: 'inst',    label: 'Cicilan',    align: 'text-right',  width: ''      },
  { key: 'princ',   label: 'Pokok',      align: 'text-right',  width: ''      },
  { key: 'int',     label: 'Bunga',      align: 'text-right',  width: ''      },
  { key: 'balance', label: 'Saldo Akhir',align: 'text-right',  width: ''      },
] as const;

const COL_SPAN = COLUMNS.length;

// ─── Summary footer data ──────────────────────────────────────────────────────

interface TableFooterProps {
  schedule: AmortizationRow[];
}

function TableFooter({ schedule }: TableFooterProps) {
  const totalPrincipal = schedule.reduce((s, r) => s + r.principal, 0);
  const totalInterest  = schedule.reduce((s, r) => s + r.interest, 0);
  const totalPayment   = schedule.reduce((s, r) => s + r.installment, 0);

  return (
    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
      <tr>
        <td colSpan={3} className="py-2.5 px-3 text-xs font-bold text-blue-800">
          Total ({schedule.length} bulan)
        </td>
        <td className="py-2.5 px-3 text-right text-xs font-bold text-blue-900 tabular-nums">
          {formatIDR(totalPayment)}
        </td>
        <td className="py-2.5 px-3 text-right text-xs font-bold text-blue-700 tabular-nums">
          {formatIDR(totalPrincipal)}
        </td>
        <td className="py-2.5 px-3 text-right text-xs font-bold text-orange-700 tabular-nums">
          {formatIDR(totalInterest)}
        </td>
        <td className="py-2.5 px-3 text-right text-xs font-semibold text-green-700 tabular-nums">
          {formatIDR(schedule[schedule.length - 1]?.closingBalance ?? 0)}
        </td>
      </tr>
    </tfoot>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  schedule: AmortizationRow[];
}

// How many rows to show before switching to "virtualized + scrollable" mode
const VIRTUALIZE_THRESHOLD = 24;

export function AmortizationTable({ schedule }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pre-process once per schedule change
  const tableItems = useMemo(() => buildTableItems(schedule), [schedule]);

  const estimateSize = useCallback(
    (index: number) =>
      tableItems[index]?.kind === 'separator' ? SEPARATOR_HEIGHT : DATA_ROW_HEIGHT,
    [tableItems],
  );

  const virtualizer = useVirtualizer({
    count: tableItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalVirtualSize = virtualizer.getTotalSize();

  // Spacer heights — keep the total scrollable area correct
  const topPadding    = virtualItems.length > 0 ? Math.max(0, virtualItems[0].start) : 0;
  const bottomPadding = virtualItems.length > 0
    ? Math.max(0, totalVirtualSize - virtualItems[virtualItems.length - 1].end)
    : 0;

  const useVirtualMode = schedule.length > VIRTUALIZE_THRESHOLD;

  // For small schedules, skip virtualization entirely — simpler DOM
  if (!useVirtualMode) {
    return (
      <SmallScheduleTable
        schedule={schedule}
        tableItems={tableItems}
      />
    );
  }

  return (
    <Card
      title="Tabel Amortisasi"
      subtitle={`${schedule.length} bulan — scroll untuk lihat semua. Baris dioptimasi dengan virtualisasi.`}
    >
      {/* Column legend */}
      <ColumnLegend />

      {/* Scrollable + virtualized table */}
      <div
        ref={containerRef}
        className="overflow-auto border border-gray-200 rounded-lg"
        style={{ height: Math.min(520, schedule.length * DATA_ROW_HEIGHT + 80) }}
      >
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <TableHead />
          <tbody>
            {/* Top spacer */}
            {topPadding > 0 && (
              <tr aria-hidden="true">
                <td colSpan={COL_SPAN} style={{ height: topPadding, padding: 0 }} />
              </tr>
            )}

            {/* Visible virtual rows */}
            {virtualItems.map((vRow) => {
              const item = tableItems[vRow.index];
              if (!item) return null;

              if (item.kind === 'separator') {
                return <SeparatorRow key={`sep-${item.startMonth}`} item={item} />;
              }

              return (
                <DataRow
                  key={`row-${item.row.month}`}
                  row={item.row}
                  isEven={vRow.index % 2 === 0}
                />
              );
            })}

            {/* Bottom spacer */}
            {bottomPadding > 0 && (
              <tr aria-hidden="true">
                <td colSpan={COL_SPAN} style={{ height: bottomPadding, padding: 0 }} />
              </tr>
            )}
          </tbody>
          <TableFooter schedule={schedule} />
        </table>
      </div>
    </Card>
  );
}

// ─── Non-virtualized fallback (≤ 24 rows) ────────────────────────────────────

interface SmallScheduleProps {
  schedule: AmortizationRow[];
  tableItems: TableItem[];
}

function SmallScheduleTable({ schedule, tableItems }: SmallScheduleProps) {
  return (
    <Card
      title="Tabel Amortisasi"
      subtitle={`${schedule.length} bulan`}
    >
      <ColumnLegend />
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <TableHead />
          <tbody>
            {tableItems.map((item, i) => {
              if (item.kind === 'separator') {
                return <SeparatorRow key={`sep-${item.startMonth}`} item={item} />;
              }
              return <DataRow key={`row-${item.row.month}`} row={item.row} isEven={i % 2 === 0} />;
            })}
          </tbody>
          <TableFooter schedule={schedule} />
        </table>
      </div>
    </Card>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function TableHead() {
  return (
    <thead className="sticky top-0 z-10 bg-gray-100 shadow-sm">
      <tr>
        {COLUMNS.map((col) => (
          <th
            key={col.key}
            className={[
              'py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap',
              col.align,
              col.width,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

interface DataRowProps {
  row: AmortizationRow;
  isEven: boolean;
}

function DataRow({ row, isEven }: DataRowProps) {
  const isFinal = row.closingBalance === 0;
  const year = monthToYear(row.month);

  const baseClass = [
    'border-t border-gray-100 transition-colors',
    isFinal    ? 'bg-green-50'
    : isEven   ? 'bg-white'
               : 'bg-gray-50/60',
  ].join(' ');

  return (
    <tr className={baseClass} style={{ height: DATA_ROW_HEIGHT }}>
      {/* Month */}
      <td className="py-2 px-3 text-center font-medium text-gray-700 tabular-nums">
        {row.month}
      </td>

      {/* Year */}
      <td className="py-2 px-3 text-center text-gray-500 tabular-nums">
        {year}
      </td>

      {/* Interest rate */}
      <td className="py-2 px-3 text-center">
        <span
          className={[
            'inline-flex px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums',
            row.interestType === 'fixed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-indigo-100 text-indigo-700',
          ].join(' ')}
        >
          {formatPercent(row.annualRate)}
        </span>
      </td>

      {/* Installment */}
      <td className="py-2 px-3 text-right font-semibold text-gray-900 tabular-nums">
        {formatIDR(row.installment)}
      </td>

      {/* Principal */}
      <td className="py-2 px-3 text-right text-blue-700 tabular-nums">
        {formatIDR(row.principal)}
      </td>

      {/* Interest */}
      <td className="py-2 px-3 text-right text-orange-600 tabular-nums">
        {formatIDR(row.interest)}
      </td>

      {/* Remaining balance */}
      <td className={`py-2 px-3 text-right tabular-nums font-medium ${isFinal ? 'text-green-700' : 'text-gray-700'}`}>
        {isFinal ? (
          <span className="inline-flex items-center gap-1">
            <span>Rp 0</span>
            <span className="text-green-600 text-xs">✓</span>
          </span>
        ) : (
          formatIDR(row.closingBalance)
        )}
      </td>
    </tr>
  );
}

interface SeparatorRowProps {
  item: Extract<TableItem, { kind: 'separator' }>;
}

function SeparatorRow({ item }: SeparatorRowProps) {
  return (
    <tr
      className={item.interestType === 'fixed' ? 'bg-blue-50' : 'bg-indigo-50'}
      style={{ height: SEPARATOR_HEIGHT }}
    >
      <td colSpan={COL_SPAN} className="px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
              item.interestType === 'fixed' ? 'bg-blue-500' : 'bg-indigo-500'
            }`}
          />
          <span
            className={`font-semibold ${
              item.interestType === 'fixed' ? 'text-blue-700' : 'text-indigo-700'
            }`}
          >
            Suku bunga berubah mulai Bulan {item.startMonth} →{' '}
            {formatPercent(item.newRate, 2, true)} (
            {item.interestType === 'fixed' ? 'Tetap' : 'Variabel'})
          </span>
        </div>
      </td>
    </tr>
  );
}

function ColumnLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300" />
        Pokok — pengurangan saldo utang
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-100 border border-orange-300" />
        Bunga — biaya pinjaman
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300" />
        Bulan terakhir / lunas
      </span>
    </div>
  );
}
