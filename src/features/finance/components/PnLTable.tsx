import { memo, useRef, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import type { PnLDisplayFormat, PnLData, PnLLineId, PnLCellData } from '../types';
import { PNL_LINES, PNL_SECTIONS } from '../types';

interface PnLTableProps {
  data: PnLData;
  displayFormat: PnLDisplayFormat;
}

// ============================================
// HELPERS
// ============================================

/** Traffic-light color for % change */
function changeColor(pctChange: number | null): string {
  if (pctChange == null) return 'text-gray-400';
  if (pctChange > 5) return 'text-emerald-600';
  if (pctChange < -5) return 'text-red-500';
  return 'text-amber-500';
}

/** Arrow character for change direction */
function changeArrow(pctChange: number | null): string {
  if (pctChange == null) return '';
  if (pctChange > 0) return '▲';
  if (pctChange < 0) return '▼';
  return '–';
}

/** Format a cell value depending on whether it's a % line */
function formatValue(value: number, isPercentage: boolean): string {
  if (isPercentage) return formatPercentage(value, 1, false);
  return formatCurrency(value);
}

/** Render cell content based on display format */
function CellContent({
  cell,
  isPercentage,
  displayFormat,
  isSubtraction,
}: {
  cell: PnLCellData;
  isPercentage: boolean;
  displayFormat: PnLDisplayFormat;
  isSubtraction: boolean;
}) {
  const displayValue = isSubtraction && cell.value !== 0 ? -Math.abs(cell.value) : cell.value;

  if (displayFormat === 'absolute') {
    return (
      <span className="tabular-nums">
        {formatValue(displayValue, isPercentage)}
      </span>
    );
  }

  if (displayFormat === 'relative') {
    if (isPercentage) {
      return (
        <span className="tabular-nums">
          {formatPercentage(cell.value, 1, false)}
        </span>
      );
    }
    return (
      <span className="tabular-nums">
        {formatPercentage(cell.pctOfGmv, 1, false)}
      </span>
    );
  }

  // Combined
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-sm">
        {formatValue(displayValue, isPercentage)}
      </span>
      <div className="flex items-center gap-1">
        {!isPercentage && cell.pctOfGmv !== 0 && (
          <span className="text-[10px] text-gray-400 tabular-nums">
            {formatPercentage(cell.pctOfGmv, 1, false)}
          </span>
        )}
        {cell.pctChange != null && (
          <span className={cn('text-[10px] tabular-nums', changeColor(cell.pctChange))}>
            {changeArrow(cell.pctChange)} {Math.abs(cell.pctChange).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export const PnLTable = memo(function PnLTable({ data, displayFormat }: PnLTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    check();
    el.addEventListener('scroll', check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [data]);

  if (data.periods.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        No hay datos para el período seleccionado
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Scroll shadows */}
      {canScrollLeft && (
        <div className="absolute left-[200px] top-0 bottom-0 w-4 bg-gradient-to-r from-black/5 to-transparent z-10 pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-black/5 to-transparent z-10 pointer-events-none" />
      )}

      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[200px] min-w-[200px]">
                Partida
              </th>
              {data.periodLabels.map((label, i) => (
                <th
                  key={data.periods[i]}
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PNL_SECTIONS.map((section) => {
              const linesInSection = PNL_LINES.filter((l) => l.section === section.id);
              return (
                <SectionBlock
                  key={section.id}
                  sectionLabel={section.label}
                  lines={linesInSection}
                  data={data}
                  displayFormat={displayFormat}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ============================================
// SECTION BLOCK
// ============================================

function SectionBlock({
  sectionLabel,
  lines,
  data,
  displayFormat,
}: {
  sectionLabel: string;
  lines: typeof PNL_LINES;
  data: PnLData;
  displayFormat: PnLDisplayFormat;
}) {
  return (
    <>
      {/* Section header row */}
      <tr className="bg-gray-50/50">
        <td
          colSpan={data.periods.length + 1}
          className="sticky left-0 z-20 bg-gray-50/50 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
        >
          {sectionLabel}
        </td>
      </tr>
      {/* Line item rows */}
      {lines.map((line) => (
        <LineRow
          key={line.id}
          line={line}
          data={data}
          displayFormat={displayFormat}
        />
      ))}
    </>
  );
}

// ============================================
// LINE ROW
// ============================================

function LineRow({
  line,
  data,
  displayFormat,
}: {
  line: (typeof PNL_LINES)[number];
  data: PnLData;
  displayFormat: PnLDisplayFormat;
}) {
  const isResult = line.section === 'resultado';
  return (
    <tr
      className={cn(
        'border-b border-gray-100 transition-colors hover:bg-gray-50/50',
        isResult && 'bg-primary-50/30 font-medium'
      )}
    >
      <td
        className={cn(
          'sticky left-0 z-20 px-4 py-2.5 text-sm whitespace-nowrap',
          isResult ? 'bg-primary-50/30 text-gray-900 font-semibold' : 'bg-white text-gray-700',
          line.isSubtraction && !isResult && 'pl-8'
        )}
      >
        {line.isSubtraction && !isResult && (
          <span className="text-gray-400 mr-1">−</span>
        )}
        {line.label}
      </td>
      {data.periods.map((period) => {
        const cell = data.byPeriod[period]?.[line.id as PnLLineId];
        if (!cell) return <td key={period} />;
        return (
          <td
            key={period}
            className={cn(
              'px-4 py-2.5 text-right',
              isResult && 'font-medium'
            )}
          >
            <CellContent
              cell={cell}
              isPercentage={line.isPercentage}
              displayFormat={displayFormat}
              isSubtraction={line.isSubtraction}
            />
          </td>
        );
      })}
    </tr>
  );
}
