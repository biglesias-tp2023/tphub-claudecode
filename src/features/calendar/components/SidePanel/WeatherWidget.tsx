import { Cloud, CloudOff, Sun } from 'lucide-react';
import { cn } from '@/utils/cn';
import { resolveIcon } from '@/utils/iconResolver';
import type { WeatherForecast } from '@/types';

interface WeatherWidgetProps {
  forecasts: WeatherForecast[];
  isLoading?: boolean;
  error?: string;
}

function WeatherDay({ forecast, isToday }: { forecast: WeatherForecast; isToday: boolean }) {
  /* eslint-disable react-hooks/static-components */
  const Icon = resolveIcon(forecast.icon, Cloud);
  const date = new Date(forecast.date);
  const dayName = isToday
    ? 'Hoy'
    : date.toLocaleDateString('es-ES', { weekday: 'short' });

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        isToday && 'bg-primary-50'
      )}
    >
      <Icon
        className={cn(
          'w-8 h-8 shrink-0',
          isToday ? 'text-primary-600' : 'text-gray-400'
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            isToday ? 'text-primary-900' : 'text-gray-700'
          )}>
            {dayName}
          </span>
          <span className="text-xs text-gray-400">
            {date.getDate()}/{date.getMonth() + 1}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{forecast.description}</p>
      </div>
      <div className="text-right">
        <p className={cn(
          'text-sm font-semibold',
          isToday ? 'text-primary-700' : 'text-gray-900'
        )}>
          {Math.round(forecast.temperatureMax)}
        </p>
        <p className="text-xs text-gray-400">
          {Math.round(forecast.temperatureMin)}
        </p>
      </div>
    </div>
  );
  /* eslint-enable react-hooks/static-components */
}

export function WeatherWidget({ forecasts, isLoading, error }: WeatherWidgetProps) {
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Tiempo</h3>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CloudOff className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Tiempo</h3>
        </div>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!forecasts.length) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Tiempo</h3>
        </div>
        <p className="text-sm text-gray-500">
          Selecciona un restaurante para ver el pronostico
        </p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-medium text-gray-700">Pronostico</h3>
      </div>

      <div className="space-y-1">
        {forecasts.slice(0, 7).map(forecast => (
          <WeatherDay
            key={forecast.date}
            forecast={forecast}
            isToday={forecast.date === todayStr}
          />
        ))}
      </div>
    </div>
  );
}
