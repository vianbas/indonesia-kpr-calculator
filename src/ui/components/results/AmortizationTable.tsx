import { useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '../common/Card';
import { formatIDR, formatPercent, monthToYear } from '../../../domain/utils/currency';
import type { AmortizationRow } from '../../../domain';

// ─── Types ────────────────────────────────────────────────────────────────────

type TableItem =
  | { kind: 'data'; row: AmortizationRow }
  | { kind: 'separator'; newRate: number; interestType: 'fixed' | 'floating'; startMonth: number };

const DATA_ROW_HEIGHT = 44;
const SEPARATOR_HEIGHT = 30;

// ─── Preprocessing ────────────────────────────────────────────────────────────

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

// ─── Column definition type ───────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  align: string;
  width: string;
}

// ─── Summary footer ───────────────────────────────────────────────────────────

interface TableFooterProps {
  schedule: AmortizationRow[];
  showExtra: boolean;
  totalLabel: string;
}

function TableFooter({ schedule, showExtra, totalLabel }: TableFooterProps) {
  const totalPrincipal = schedule.reduce((s, r) => s + r.principal, 0);
  const totalInterest  = schedule.reduce((s, r) => s + r.interest, 0);
  const totalPayment   = schedule.reduce((s, r) => s + r.installment + r.extraPayment, 0);
  const totalExtra     = schedule.reduce((s, r) => s + r.extraPayment, 0);

  return (
    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
      <tr>
        <td colSpan={3} className="py-2.5 px-3 text-xs font-bold text-blue-800">
          {totalLabel}
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
        {showExtra && (
          <td className="py-2.5 px-3 text-right text-xs font-bold text-teal-700 tabular-nums">
            {formatIDR(totalExtra)}
          </td>
        )}
      </tr>
    </tfoot>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  schedule: AmortizationRow[];
}

const VIRTUALIZE_THRESHOLD = 24;

export function AmortizationTable({ schedule }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const showExtra = schedule.some((r) => r.extraPayment > 0);

  const BASE_COLUMNS: ColDef[] = [
    { key: 'month',   label: t('results.amortColMonth'),  align: 'text-center', width: 'w-12'  },
    { key: 'year',    label: t('results.amortColYear'),   align: 'text-center', width: 'w-12'  },
    { key: 'rate',    label: t('results.amortColRate'),   align: 'text-center', width: 'w-24'  },
    { key: 'inst',    label: t('results.amortColInst'),   align: 'text-right',  width: ''      },
    { key: 'princ',   label: t('results.amortColPrinc'),  align: 'text-right',  width: ''      },
    { key: 'int',     label: t('results.amortColInt'),    align: 'text-right',  width: ''      },
    { key: 'balance', label: t('results.amortColBalance'),align: 'text-right',  width: ''      },
  ];

  const EXTRA_COLUMN: ColDef = { key: 'extra', label: t('results.amortColExtra'), align: 'text-right', width: '' };
  const COLUMNS = showExtra ? [...BASE_COLUMNS, EXTRA_COLUMN] : BASE_COLUMNS;
  const COL_SPAN = COLUMNS.length;

  const totalLabel = t('results.amortTotal', { count: schedule.length });

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

  const topPadding    = virtualItems.length > 0 ? Math.max(0, virtualItems[0].start) : 0;
  const bottomPadding = virtualItems.length > 0
    ? Math.max(0, totalVirtualSize - virtualItems[virtualItems.length - 1].end)
    : 0;

  const useVirtualMode = schedule.length > VIRTUALIZE_THRESHOLD;

  if (!useVirtualMode) {
    return (
      <SmallScheduleTable
        schedule={schedule}
        tableItems={tableItems}
        showExtra={showExtra}
        COL_SPAN={COL_SPAN}
        COLUMNS={COLUMNS}
        totalLabel={totalLabel}
        t={t}
      />
    );
  }

  return (
    <Card
      title={t('results.amortizationTitle')}
      subtitle={t('results.amortSubtitleVirtual', { count: schedule.length })}
    >
      <ColumnLegend showExtra={showExtra} t={t} />

      <div
        ref={containerRef}
        className="overflow-auto border border-gray-200 rounded-lg"
        style={{ height: Math.min(520, schedule.length * DATA_ROW_HEIGHT + 80) }}
      >
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <TableHead COLUMNS={COLUMNS} />
          <tbody>
            {topPadding > 0 && (
              <tr aria-hidden="true">
                <td colSpan={COL_SPAN} style={{ height: topPadding, padding: 0 }} />
              </tr>
            )}

            {virtualItems.map((vRow) => {
              const item = tableItems[vRow.index];
              if (!item) return null;

              if (item.kind === 'separator') {
                return <SeparatorRow key={`sep-${item.startMonth}`} item={item} COL_SPAN={COL_SPAN} t={t} />;
              }

              return (
                <DataRow
                  key={`row-${item.row.month}`}
                  row={item.row}
                  isEven={vRow.index % 2 === 0}
                  showExtra={showExtra}
                />
              );
            })}

            {bottomPadding > 0 && (
              <tr aria-hidden="true">
                <td colSpan={COL_SPAN} style={{ height: bottomPadding, padding: 0 }} />
              </tr>
            )}
          </tbody>
          <TableFooter schedule={schedule} showExtra={showExtra} totalLabel={totalLabel} />
        </table>
      </div>
    </Card>
  );
}

// ─── Non-virtualized fallback (≤ 24 rows) ────────────────────────────────────

interface SmallScheduleProps {
  schedule: AmortizationRow[];
  tableItems: TableItem[];
  showExtra: boolean;
  COL_SPAN: number;
  COLUMNS: ColDef[];
  totalLabel: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function SmallScheduleTable({ schedule, tableItems, showExtra, COL_SPAN, COLUMNS, totalLabel, t }: SmallScheduleProps) {
  return (
    <Card
      title={t('results.amortizationTitle')}
      subtitle={t('results.amortSubtitle', { count: schedule.length })}
    >
      <ColumnLegend showExtra={showExtra} t={t} />
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <TableHead COLUMNS={COLUMNS} />
          <tbody>
            {tableItems.map((item, i) => {
              if (item.kind === 'separator') {
                return <SeparatorRow key={`sep-${item.startMonth}`} item={item} COL_SPAN={COL_SPAN} t={t} />;
              }
              return <DataRow key={`row-${item.row.month}`} row={item.row} isEven={i % 2 === 0} showExtra={showExtra} />;
            })}
          </tbody>
          <TableFooter schedule={schedule} showExtra={showExtra} totalLabel={totalLabel} />
        </table>
      </div>
    </Card>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

interface TableHeadProps {
  COLUMNS: ColDef[];
}

function TableHead({ COLUMNS }: TableHeadProps) {
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
  showExtra: boolean;
}

function DataRow({ row, isEven, showExtra }: DataRowProps) {
  const isFinal = row.closingBalance === 0;
  const year = monthToYear(row.month);

  const baseClass = [
    'border-t border-gray-100 transition-colors',
    isFinal               ? 'bg-green-50'
    : row.extraPayment > 0 ? 'bg-teal-50/50'
    : isEven              ? 'bg-white'
                          : 'bg-gray-50/60',
  ].join(' ');

  return (
    <tr className={baseClass} style={{ height: DATA_ROW_HEIGHT }}>
      <td className="py-2 px-3 text-center font-medium text-gray-700 tabular-nums">
        {row.month}
      </td>
      <td className="py-2 px-3 text-center text-gray-500 tabular-nums">
        {year}
      </td>
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
      <td className="py-2 px-3 text-right font-semibold text-gray-900 tabular-nums">
        {formatIDR(row.installment)}
      </td>
      <td className="py-2 px-3 text-right text-blue-700 tabular-nums">
        {formatIDR(row.principal)}
      </td>
      <td className="py-2 px-3 text-right text-orange-600 tabular-nums">
        {formatIDR(row.interest)}
      </td>
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
      {showExtra && (
        <td className="py-2 px-3 text-right text-teal-700 tabular-nums">
          {row.extraPayment > 0 ? formatIDR(row.extraPayment) : '—'}
        </td>
      )}
    </tr>
  );
}

interface SeparatorRowProps {
  item: Extract<TableItem, { kind: 'separator' }>;
  COL_SPAN: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function SeparatorRow({ item, COL_SPAN, t }: SeparatorRowProps) {
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
            {t('results.amortRateChange', {
              month: item.startMonth,
              rate: formatPercent(item.newRate, 2, true),
              type: item.interestType === 'fixed'
                ? t('results.periodFixed')
                : t('results.periodVariable'),
            })}
          </span>
        </div>
      </td>
    </tr>
  );
}

interface ColumnLegendProps {
  showExtra: boolean;
  t: (key: string) => string;
}

function ColumnLegend({ showExtra, t }: ColumnLegendProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300" />
        {t('results.amortLegendPrincipal')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-100 border border-orange-300" />
        {t('results.amortLegendInterest')}
      </span>
      {showExtra && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-teal-100 border border-teal-300" />
          {t('results.amortLegendExtra')}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300" />
        {t('results.amortLegendFinal')}
      </span>
    </div>
  );
}
