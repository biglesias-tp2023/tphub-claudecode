/**
 * Weather Hooks
 *
 * React Query hooks for fetching weather forecasts and historical data.
 * Uses Open-Meteo API (free, no API key required).
 *
 * ## Data Sources
 *
 * - **Forecast**: `api.open-meteo.com/v1/forecast` (today + 16 days)
 * - **Historical**: `archive-api.open-meteo.com/v1/archive` (past dates)
 *
 * ## Requirements
 *
 * Weather hooks require a restaurant with valid coordinates:
 * - `restaurant.latitude` must be defined and not null
 * - `restaurant.longitude` must be defined and not null
 *
 * If coordinates are missing, the query is disabled and returns empty data.
 *
 * @module features/calendar/hooks/useWeather
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_GC_LONG } from '@/constants/queryConfig';
import { fetchWeatherForecast, fetchWeatherForDateRange } from '../services/weatherApi';
import type { WeatherForecast, Restaurant } from '@/types';

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch weather forecast by coordinates.
 *
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate
 * @param days - Number of forecast days (1-16, default 7)
 * @returns React Query result with WeatherForecast array
 *
 * @example
 * ```tsx
 * const { data: forecasts } = useWeatherByLocation(40.4168, -3.7038, 7);
 * ```
 */
export function useWeatherByLocation(lat: number | undefined, lng: number | undefined, days: number = 7) {
  return useQuery({
    queryKey: queryKeys.weather.byLocation(lat || 0, lng || 0),
    queryFn: () => fetchWeatherForecast(lat!, lng!, days),
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 4 * 60 * 60 * 1000, // 4 hours - weather cache
    gcTime: QUERY_GC_LONG,
    retry: 2,
  });
}

/**
 * Hook to fetch weather for a restaurant (forecast only - 7 days)
 */
export function useWeatherByRestaurant(restaurant: Restaurant | undefined) {
  const lat = restaurant?.latitude;
  const lng = restaurant?.longitude;

  return useQuery({
    queryKey: queryKeys.weather.byRestaurant(restaurant?.id || ''),
    queryFn: () => fetchWeatherForecast(lat!, lng!, 7),
    enabled: !!restaurant && lat !== undefined && lat !== null && lng !== undefined && lng !== null,
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    gcTime: QUERY_GC_LONG,
    retry: 2,
  });
}

/**
 * Hook to fetch weather for a month (combines historical + forecast data)
 * This is used for the calendar view to show weather for all days
 */
export function useWeatherByMonth(
  restaurant: Restaurant | undefined,
  year: number,
  month: number
) {
  const lat = restaurant?.latitude;
  const lng = restaurant?.longitude;

  // Calculate start and end of month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  return useQuery({
    queryKey: [...queryKeys.weather.byRestaurant(restaurant?.id || ''), 'month', year, month],
    queryFn: () => fetchWeatherForDateRange(lat!, lng!, startDate, endDate),
    enabled: !!restaurant && lat !== undefined && lat !== null && lng !== undefined && lng !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes - shorter for combined data
    gcTime: QUERY_GC_LONG,
    retry: 2,
  });
}

/**
 * Hook to fetch weather for a specific date range
 */
export function useWeatherByDateRange(
  restaurant: Restaurant | undefined,
  startDate: Date,
  endDate: Date
) {
  const lat = restaurant?.latitude;
  const lng = restaurant?.longitude;

  return useQuery({
    queryKey: [
      ...queryKeys.weather.byRestaurant(restaurant?.id || ''),
      'range',
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ],
    queryFn: () => fetchWeatherForDateRange(lat!, lng!, startDate, endDate),
    enabled: !!restaurant && lat !== undefined && lat !== null && lng !== undefined && lng !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: QUERY_GC_LONG,
    retry: 2,
  });
}

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
