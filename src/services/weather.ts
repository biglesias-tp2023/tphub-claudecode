/**
 * Weather Data Service
 *
 * Fetches weather data from Supabase (pre-populated by cron job).
 * Weather is stored per city (weather_locations) and mapped to
 * business areas via weather_area_mapping.
 *
 * @module services/weather
 */

import { supabase } from './supabase';
import { getWeatherCondition } from '@/features/calendar/config/weatherCodes';
import type { WeatherForecast } from '@/types';

// ============================================
// TYPES
// ============================================

interface DbWeatherDaily {
  date: string;
  temperature_max: number;
  temperature_min: number;
  weather_code: number;
  precipitation_probability: number;
  is_forecast: boolean;
}

interface DbWeatherAreaMapping {
  location_id: string;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Fetches weather data for a business area within a date range.
 * Resolves area_id → location_id via weather_area_mapping, then
 * queries weather_daily for that location.
 */
export async function fetchWeatherByAreaId(
  areaId: string,
  startDate: string,
  endDate: string
): Promise<WeatherForecast[]> {
  // Step 1: Resolve area → location
  const { data: mapping, error: mappingError } = await supabase
    .from('weather_area_mapping')
    .select('location_id')
    .eq('area_id', areaId)
    .single();

  if (mappingError || !mapping) {
    // Area not mapped to any location — return empty
    return [];
  }

  const { location_id } = mapping as DbWeatherAreaMapping;

  // Step 2: Fetch weather for location + date range
  const { data, error } = await supabase
    .from('weather_daily')
    .select('date, temperature_max, temperature_min, weather_code, precipitation_probability, is_forecast')
    .eq('location_id', location_id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error || !data) {
    return [];
  }

  // Step 3: Map to WeatherForecast
  return (data as DbWeatherDaily[]).map((row) => {
    const condition = getWeatherCondition(row.weather_code);
    return {
      date: row.date,
      temperatureMax: Number(row.temperature_max),
      temperatureMin: Number(row.temperature_min),
      weatherCode: row.weather_code,
      precipitationProbability: row.precipitation_probability ?? 0,
      description: condition.descriptionEs,
      icon: condition.icon,
      isHistorical: !row.is_forecast,
    };
  });
}
