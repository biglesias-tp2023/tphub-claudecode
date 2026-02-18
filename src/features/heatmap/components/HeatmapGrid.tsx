import { useState, useCallback, useRef } from 'react';
import { scaleSequential } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import type { HeatmapMatrix, HeatmapMetric, HeatmapCell } from '../types';

// ============================================
// CONSTANTS
// ============================================

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKEND_INDICES = new Set([5, 6]);

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const METRIC_LABELS: Record<HeatmapMetric, string> = {
  revenue: 'Ventas',
  orders: '# Pedidos',
  avgTicket: 'Ticket Medio',
};

// ============================================
// HELPERS
// ============================================

function getCellValue(cell: HeatmapCell, metric: HeatmapMetric): number {
  return cell[metric];
}

function formatValue(value: number, metric: HeatmapMetric): string {
  if (value === 0) return '';
  switch (metric) {
    case 'revenue':
    case 'avgTicket':
      return formatCurrency(value);
    case 'orders':
      return formatNumber(value);
  }
}

function formatTooltipValue(value: number, metric: HeatmapMetric): string {
  switch (metric) {
    case 'revenue':
    case 'avgTicket':
      return formatCurrency(value);
    case 'orders':
      return formatNumber(value);
  }
}

// ============================================
// TOOLTIP
// ============================================

interface TooltipData {
  cell: HeatmapCell;
  x: number;
  y: number;
}

function Tooltip({ cell, x, y }: TooltipData) {
  return (
    <div
      className="fixed z-50 pointer-events-none bg-gray-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-medium mb-1">
        {DAY_LABELS[cell.dayOfWeek]} {HOUR_LABELS[cell.hour]}
      </p>
      <div className="space-y-0.5">
        <p>Ventas: {formatTooltipValue(cell.revenue, 'revenue')}</p>
        <p># Pedidos: {formatTooltipValue(cell.orders, 'orders')}</p>
        <p>Ticket Medio: {formatTooltipValue(cell.avgTicket, 'avgTicket')}</p>
      </div>
    </div>
  );
}

// ============================================
// LEGEND
// ============================================

function Legend() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span>Menos</span>
      <div
        className="w-24 h-3 rounded"
        style={{
          background: 'linear-gradient(to right, #e8f4fa, #095789)',
        }}
      />
      <span>Más</span>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

interface HeatmapGridProps {
  data: HeatmapMatrix;
  metric: HeatmapMetric;
}

export function HeatmapGrid({ data, metric }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Compute max value for the selected metric
  let maxValue = 0;
  for (let h = 0; h < 24; h++) {
    for (let d = 0; d < 7; d++) {
      const val = getCellValue(data[h][d], metric);
      if (val > maxValue) maxValue = val;
    }
  }

  // Check if there's any data at all
  const hasData = maxValue > 0;

  // D3 color scale: primary-50 → primary-600
  const colorScale = scaleSequential()
    .domain([0, maxValue || 1])
    .interpolator(interpolateRgb('#e8f4fa', '#095789'));

  const handleMouseMove = useCallback(
    (cell: HeatmapCell, e: React.MouseEvent) => {
      if (cell.orders === 0) {
        setTooltip(null);
        return;
      }
      setTooltip({ cell, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No hay datos para el periodo seleccionado
      </div>
    );
  }

  return (
    <div ref={tableRef}>
      {/* Header: title + legend */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">
          {METRIC_LABELS[metric]} por hora y día
        </h3>
        <Legend />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-14 text-xs font-medium text-gray-400 text-right pr-2 pb-2" />
              {DAY_LABELS.map((label, i) => (
                <th
                  key={label}
                  className={`text-xs font-medium pb-2 text-center ${
                    WEEKEND_INDICES.has(i) ? 'text-primary-600' : 'text-gray-500'
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOUR_LABELS.map((hourLabel, hour) => (
              <tr key={hour}>
                <td className="text-xs text-gray-400 text-right pr-2 py-0 whitespace-nowrap font-mono">
                  {hourLabel}
                </td>
                {Array.from({ length: 7 }, (_, dow) => {
                  const cell = data[hour][dow];
                  const value = getCellValue(cell, metric);
                  const normalizedValue = maxValue > 0 ? value / maxValue : 0;
                  const bgColor = value > 0 ? colorScale(value) : '#ffffff';
                  const textColor = normalizedValue > 0.55 ? '#ffffff' : '#374151';

                  return (
                    <td
                      key={dow}
                      className="p-0 border border-gray-100"
                      onMouseMove={(e) => handleMouseMove(cell, e)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div
                        className="flex items-center justify-center h-8 min-w-[80px] text-[11px] tabular-nums transition-colors cursor-default"
                        style={{ backgroundColor: bgColor, color: textColor }}
                      >
                        {formatValue(value, metric)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && <Tooltip {...tooltip} />}
    </div>
  );
}
