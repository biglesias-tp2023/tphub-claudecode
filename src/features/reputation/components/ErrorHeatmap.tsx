import { cn } from '@/utils/cn';
import type { HeatmapCell } from '../hooks/useReputationData';

interface ErrorHeatmapProps {
  data: HeatmapCell[];
  className?: string;
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 10); // 10h to 23h

function getHeatColor(count: number): string {
  if (count === 0) return 'bg-gray-100';
  if (count === 1) return 'bg-yellow-300';
  if (count === 2) return 'bg-orange-400';
  return 'bg-red-500';
}

function getHeatTextColor(count: number): string {
  if (count === 0) return 'text-transparent';
  if (count <= 2) return 'text-gray-800';
  return 'text-white';
}

export function ErrorHeatmap({ data, className }: ErrorHeatmapProps) {
  // Create a lookup map for quick access
  const cellMap = new Map<string, number>();
  data.forEach((cell) => {
    cellMap.set(`${cell.day}-${cell.hour}`, cell.count);
  });

  const getCount = (day: number, hour: number) =>
    cellMap.get(`${day}-${hour}`) || 0;

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Mapa de Calor - Errores por Hora
        </h3>
        <p className="text-sm text-gray-500">
          Distribución de errores por día y hora
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header with days */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div /> {/* Empty corner cell */}
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-600 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid with hours */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-right text-sm text-gray-500 pr-2 py-2">
                {hour}h
              </div>
              {DAYS.map((_, dayIndex) => {
                const count = getCount(dayIndex, hour);
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={cn(
                      'aspect-[2/1] rounded flex items-center justify-center text-sm font-medium transition-colors',
                      getHeatColor(count),
                      getHeatTextColor(count)
                    )}
                    title={count > 0 ? `${count} error${count > 1 ? 'es' : ''}` : 'Sin errores'}
                  >
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
            <span>Menos</span>
            <div className="flex gap-1">
              <div className="w-6 h-4 rounded bg-gray-100" />
              <div className="w-6 h-4 rounded bg-yellow-300" />
              <div className="w-6 h-4 rounded bg-orange-400" />
              <div className="w-6 h-4 rounded bg-red-500" />
            </div>
            <span>Más</span>
          </div>
        </div>
      </div>
    </div>
  );
}
