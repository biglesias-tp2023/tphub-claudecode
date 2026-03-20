/**
 * Weather Hooks
 *
 * React Query hooks for fetching weather data from Supabase.
 * Weather is pre-populated by a daily cron job (api/weather/sync)
 * and stored per city, mapped to business areas.
 *
 * @module features/calendar/hooks/useWeather
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_GC_LONG } from '@/constants/queryConfig';
import { fetchWeatherByAreaId } from '@/services/weather';
import { formatDate } from '@/utils/dateUtils';
import type { WeatherForecast } from '@/types';

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch weather for a month by business area.
 * Reads pre-fetched data from Supabase (no direct Open-Meteo calls).
 *
 * @param areaId - Business area ID (pk_id_business_area as string)
 * @param year - Calendar year
 * @param month - Calendar month (1-12)
 */
export function useWeatherByMonth(
  areaId: string | undefined,
  year: number,
  month: number
) {
  const startDate = formatDate(new Date(year, month - 1, 1));
  const endDate = formatDate(new Date(year, month, 0)); // Last day of month

  return useQuery({
    queryKey: queryKeys.weather.byArea(areaId!, year, month),
    queryFn: () => fetchWeatherByAreaId(areaId!, startDate, endDate),
    enabled: !!areaId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: QUERY_GC_LONG,
  });
}

// ============================================
// HELPERS (kept for backward compatibility)
// ============================================

/**
 * Helper to get weather for a specific date from forecast array
 */
export function getWeatherForDate(forecasts: WeatherForecast[], date: Date): WeatherForecast | undefined {
  const dateStr = date.toISOString().split('T')[0];
  return forecasts.find(f => f.date === dateStr);
}

/**
 * Helper to get today's weather
 */
export function getTodayWeather(forecasts: WeatherForecast[]): WeatherForecast | undefined {
  return getWeatherForDate(forecasts, new Date());
}

/**
 * Helper to get tomorrow's weather
 */
export function getTomorrowWeather(forecasts: WeatherForecast[]): WeatherForecast | undefined {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getWeatherForDate(forecasts, tomorrow);
}

/**
 * Helper to check if weather data is historical (actual) vs forecast
 */
export function isHistoricalWeather(weather: WeatherForecast): boolean {
  return weather.isHistorical === true;
}
