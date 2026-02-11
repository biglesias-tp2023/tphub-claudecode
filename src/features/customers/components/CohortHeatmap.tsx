import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { CohortData } from '@/services/crp-portal';

interface CohortHeatmapProps {
  data: CohortData[];
  granularity: 'week' | 'month';
}

type ViewMode = 'period' | 'cumulative';

function getColorIntensity(value: number): string {
  if (value >= 80) return 'bg-primary-600 text-white';
  if (value >= 60) return 'bg-primary-500 text-white';
  if (value >= 40) return 'bg-primary-400 text-white';
  if (value >= 20) return 'bg-primary-300 text-gray-800';
  if (value >= 10) return 'bg-primary-200 text-gray-800';
  if (value > 0) return 'bg-primary-100 text-gray-700';
  return 'bg-gray-50 text-gray-400';
}

/**
 * Get the Monday of a given ISO week.
 */
function getDateOfISOWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function formatCohortLabel(cohortId: string, granularity: 'week' | 'month'): string {
  if (granularity === 'week') {
    // Format: 2026-W01 -> S01: 30/12/2025
    const match = cohortId.match(/(\d{4})-W(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const week = parseInt(match[2], 10);
      const monday = getDateOfISOWeek(week, year);
      const day = String(monday.getDate()).padStart(2, '0');
      const month = String(monday.getMonth() + 1).padStart(2, '0');
      const dateYear = monday.getFullYear();
      return `S${match[2]}: ${day}/${month}/${dateYear}`;
    }
    return cohortId;
  }
  // Format: 2026-01 -> Enero 2026
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const match = cohortId.match(/(\d{4})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    return `${months[monthIndex]} ${year}`;
  }
  return cohortId;
}

export function CohortHeatmap({ data, granularity }: CohortHeatmapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative');

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          No hay datos de cohortes disponibles
        </div>
      </div>
    );
  }

  const maxPeriods = Math.max(...data.map((c) => c.retention.length));
  const periodLabels = Array.from({ length: maxPeriods }, (_, i) => {
    if (i === 0) return granularity === 'week' ? 'S0' : 'M0';
    return granularity === 'week' ? `+${i}S` : `+${i}M`;
  });

  const tooltipText = viewMode === 'cumulative'
    ? '% de clientes que han vuelto al menos una vez hasta este período'
    : '% de clientes que compraron específicamente en este período';

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Toggle Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('cumulative')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                viewMode === 'cumulative'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Acumulado
            </button>
            <button
              onClick={() => setViewMode('period')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                viewMode === 'period'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Por período
            </button>
          </div>
          <span
            className="cursor-help text-gray-400"
            title={tooltipText}
          >
            <Info className="w-4 h-4" />
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs w-40">Cohorte</th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs w-16">Tam.</th>
              {periodLabels.map((label, i) => (
                <th key={i} className="text-center py-2.5 px-1 font-medium text-gray-500 text-xs w-14">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((cohort) => {
              const retentionData = viewMode === 'cumulative'
                ? cohort.cumulativeRetention
                : cohort.retention;

              return (
                <tr key={cohort.cohortId} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 px-4 font-medium text-gray-900 text-xs">
                    {formatCohortLabel(cohort.cohortId, granularity)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-600 text-xs tabular-nums">
                    {cohort.cohortSize}
                  </td>
                  {periodLabels.map((_, i) => {
                    const value = retentionData?.[i] ?? 0;
                    return (
                      <td key={i} className="py-1 px-1">
                        <div
                          className={cn(
                            'flex items-center justify-center h-8 rounded text-xs font-medium tabular-nums',
                            getColorIntensity(value)
                          )}
                        >
                          {value > 0 ? `${value.toFixed(0)}%` : '-'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 px-4 py-3 bg-gray-50/50 border-t border-gray-100">
        <span className="text-xs text-gray-500">Retención:</span>
        <div className="flex items-center gap-1">
          {[
            { label: '0%', color: 'bg-gray-50' },
            { label: '10%', color: 'bg-primary-100' },
            { label: '40%', color: 'bg-primary-300' },
            { label: '60%', color: 'bg-primary-500' },
            { label: '80%+', color: 'bg-primary-600' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-0.5">
              <div className={cn('w-4 h-4 rounded', item.color)} />
              <span className="text-[10px] text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
