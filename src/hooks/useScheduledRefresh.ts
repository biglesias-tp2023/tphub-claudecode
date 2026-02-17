import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'tphub_last_data_refresh';
const TARGET_HOUR = 8; // 8:00 AM
const TIMEZONE = 'Europe/Madrid';

/**
 * Get current time in Madrid timezone
 */
function getMadridNow(): Date {
  const str = new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(str);
}

/**
 * Calculate milliseconds until next 8:00 AM Madrid time
 */
function msUntilNext8AM(): number {
  const now = getMadridNow();
  const target = new Date(now);
  target.setHours(TARGET_HOUR, 0, 0, 0);

  // If 8 AM already passed today, schedule for tomorrow
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

/**
 * Check if 8 AM Madrid has passed since the given timestamp
 */
function has8AMPassedSince(lastRefreshMs: number): boolean {
  const now = getMadridNow();
  const today8AM = new Date(now);
  today8AM.setHours(TARGET_HOUR, 0, 0, 0);

  return lastRefreshMs < today8AM.getTime() && now >= today8AM;
}

/**
 * Get last refresh timestamp from localStorage
 */
function getLastRefresh(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Persist refresh timestamp to localStorage
 */
function setLastRefresh(ts: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    // localStorage unavailable
  }
}

// Query keys that correspond to real Supabase data
const QUERY_KEYS_TO_INVALIDATE = ['crp-orders', 'hierarchy-data'];

/**
 * useScheduledRefresh
 *
 * Schedules automatic React Query cache invalidation at 8:00 AM Madrid time.
 * Also handles tab visibility: if the user returns to the tab after 8 AM passed,
 * it invalidates immediately.
 *
 * Persists last refresh timestamp in localStorage to detect stale data across sessions.
 */
export function useScheduledRefresh() {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const invalidateData = useCallback(() => {
    const now = Date.now();
    setLastRefresh(now);

    for (const key of QUERY_KEYS_TO_INVALIDATE) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  // Schedule timer for next 8 AM
  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const ms = msUntilNext8AM();
    timerRef.current = setTimeout(() => {
      invalidateData();
      // Re-schedule for the next day
      scheduleNext();
    }, ms);
  }, [invalidateData]);

  // On mount: schedule timer
  useEffect(() => {
    // Check if 8 AM passed since last refresh (e.g. app was closed overnight)
    const lastRefresh = getLastRefresh();
    if (lastRefresh > 0 && has8AMPassedSince(lastRefresh)) {
      invalidateData();
    }

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [invalidateData, scheduleNext]);

  // On tab visibility change: check if 8 AM passed while tab was hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const lastRefresh = getLastRefresh();
        if (lastRefresh > 0 && has8AMPassedSince(lastRefresh)) {
          invalidateData();
        }
        // Re-schedule in case timer drifted while tab was inactive
        scheduleNext();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [invalidateData, scheduleNext]);

  return {
    lastRefresh: getLastRefresh(),
    refreshNow: invalidateData,
  };
}
