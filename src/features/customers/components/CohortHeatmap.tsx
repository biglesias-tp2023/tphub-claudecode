import { cn } from '@/utils/cn';
import type { CohortData } from '@/services/crp-portal';

interface CohortHeatmapProps {
  data: CohortData[];
  granularity: 'week' | 'month';
}

function getColorIntensity(value: number): string {
  if (value >= 80) return 'bg-primary-600 text-white';
  if (value >= 60) return 'bg-primary-500 text-white';
  if (value >= 40) return 'bg-primary-400 text-white';
  if (value >= 20) return 'bg-primary-300 text-gray-800';
  if (value >= 10) return 'bg-primary-200 text-gray-800';
  if (value > 0) return 'bg-primary-100 text-gray-700';
  return 'bg-gray-50 text-gray-400';
}

function formatCohortLabel(cohortId: string, granularity: 'week' | 'month'): string {
  if (granularity === 'week') {
    // Format: 2026-W01 -> S01
    const match = cohortId.match(/\d{4}-W(\d{2})/);
    return match ? `S${match[1]}` : cohortId;
  }
  // Format: 2026-01 -> Ene
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const match = cohortId.match(/\d{4}-(\d{2})/);
  if (match) {
    const monthIndex = parseInt(match[1], 10) - 1;
    return months[monthIndex] || cohortId;
  }
  return cohortId;
}

export function CohortHeatmap({ data, granularity }: CohortHeatmapProps) {
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

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs w-24">Cohorte</th>
              <th className="text-right py-2.5 px-2 font-medium text-gray-500 text-xs w-16">Tam.</th>
              {periodLabels.map((label, i) => (
                <th key={i} className="text-center py-2.5 px-1 font-medium text-gray-500 text-xs w-14">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((cohort) => (
              <tr key={cohort.cohortId} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2 px-4 font-medium text-gray-900 text-xs">
                  {formatCohortLabel(cohort.cohortId, granularity)}
                </td>
                <td className="py-2 px-2 text-right text-gray-600 text-xs tabular-nums">
                  {cohort.cohortSize}
                </td>
                {periodLabels.map((_, i) => {
                  const value = cohort.retention[i] ?? 0;
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
            ))}
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
