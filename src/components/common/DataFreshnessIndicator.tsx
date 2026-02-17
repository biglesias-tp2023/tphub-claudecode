import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { cn } from '@/utils/cn';

const STORAGE_KEY = 'tphub_last_data_refresh';

/**
 * Format a timestamp as relative time in Spanish
 */
function formatRelativeTime(ts: number): string {
  if (ts === 0) return '';

  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 30) return 'Ahora mismo';
  if (diffMin < 1) return 'Hace unos segundos';
  if (diffMin === 1) return 'Hace 1 min';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHour === 1) return 'Hace 1 hora';
  if (diffHour < 24) return `Hace ${diffHour} h`;
  return 'Hace más de 1 día';
}

/**
 * DataFreshnessIndicator
 *
 * Shows relative time since last data refresh and a manual refresh button.
 * Reads timestamp from localStorage, updates display every 30s.
 */
export function DataFreshnessIndicator() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ['crp-orders'] }) + useIsFetching({ queryKey: ['hierarchy-data'] });
  const [lastRefresh, setLastRefresh] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(lastRefresh));

  // Update relative time every 30 seconds
  useEffect(() => {
    const update = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const ts = stored ? parseInt(stored, 10) : 0;
        setLastRefresh(ts);
        setRelativeTime(formatRelativeTime(ts));
      } catch {
        // ignore
      }
    };

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // ignore
    }
    setLastRefresh(now);
    setRelativeTime('Ahora mismo');

    queryClient.invalidateQueries({ queryKey: ['crp-orders'] });
    queryClient.invalidateQueries({ queryKey: ['hierarchy-data'] });
  }, [queryClient]);

  const isLoading = isFetching > 0;

  if (lastRefresh === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400">{relativeTime}</span>
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className={cn(
          'p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600',
          isLoading && 'cursor-not-allowed'
        )}
        title="Actualizar datos"
      >
        <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
      </button>
    </div>
  );
}
