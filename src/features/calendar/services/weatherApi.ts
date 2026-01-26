/**
 * Weather API Service
 *
 * Integration with Open-Meteo API for weather forecasts and historical data.
 * Open-Meteo is a free, open-source weather API with no API key required.
 *
 * ## API Endpoints
 *
 * - **Forecast**: `api.open-meteo.com/v1/forecast` (today + 16 days max)
 * - **Archive**: `archive-api.open-meteo.com/v1/archive` (historical data)
 *
 * ## Features
 *
 * - Daily max/min temperatures
 * - Weather codes (WMO standard)
 * - Precipitation probability
 * - Automatic timezone handling (Europe/Madrid)
 *
 * ## Data Flow
 *
 * ```
 * fetchWeatherForDateRange()
 *     ↓
 * Splits request into historical + forecast
 *     ↓
 * fetchHistoricalWeather() + fetchWeatherForecast()
 *     ↓
 * Combines, deduplicates, sorts by date
 *     ↓
 * Returns WeatherForecast[]
 * ```
 *
 * @see https://open-meteo.com/en/docs
 * @module features/calendar/services/weatherApi
 */

import type { WeatherForecast } from '@/types';
import { getWeatherCondition } from '../config/weatherCodes';

// ============================================
// CONSTANTS
// ============================================

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
    precipitation_probability_max?: number[];
  };
}

/**
 * Fetches weather forecast from Open-Meteo API (for future dates)
 * @param lat Latitude
 * @param lng Longitude
 * @param days Number of forecast days (1-16, default 7)
 */
export async function fetchWeatherForecast(
  lat: number,
  lng: number,
  days: number = 7
): Promise<WeatherForecast[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max',
    timezone: 'Europe/Madrid',
    forecast_days: Math.min(Math.max(days, 1), 16).toString(),
  });

  const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  return data.daily.time.map((date, index) => {
    const weatherCode = data.daily.weathercode[index];
    const condition = getWeatherCondition(weatherCode);

    return {
      date,
      temperatureMax: data.daily.temperature_2m_max[index],
      temperatureMin: data.daily.temperature_2m_min[index],
      weatherCode,
      precipitationProbability: data.daily.precipitation_probability_max?.[index] ?? 0,
      description: condition.descriptionEs,
      icon: condition.icon,
      isHistorical: false,
    };
  });
}

/**
 * Fetches historical weather from Open-Meteo Archive API (for past dates)
 * @param lat Latitude
 * @param lng Longitude
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 */
export async function fetchHistoricalWeather(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<WeatherForecast[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: 'temperature_2m_max,temperature_2m_min,weathercode',
    timezone: 'Europe/Madrid',
    start_date: startDate,
    end_date: endDate,
  });

  const response = await fetch(`${OPEN_METEO_ARCHIVE_URL}?${params}`);

  if (!response.ok) {
    // Archive API may not have data for very recent dates
    if (response.status === 400) {
      console.warn('Historical weather not available for these dates');
      return [];
    }
    throw new Error(`Weather Archive API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  return data.daily.time.map((date, index) => {
    const weatherCode = data.daily.weathercode[index];
    const condition = getWeatherCondition(weatherCode);

    return {
      date,
      temperatureMax: data.daily.temperature_2m_max[index],
      temperatureMin: data.daily.temperature_2m_min[index],
      weatherCode,
      precipitationProbability: 0, // Historical data doesn't have probability
      description: condition.descriptionEs,
      icon: condition.icon,
      isHistorical: true,
    };
  });
}

/**
 * Fetches weather for a date range, combining historical and forecast data
 * @param lat Latitude
 * @param lng Longitude
 * @param startDate Start date
 * @param endDate End date
 */
export async function fetchWeatherForDateRange(
  lat: number,
  lng: number,
  startDate: Date,
  endDate: Date
): Promise<WeatherForecast[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startStr = startDate.toISOString().split('T')[0];

  const results: WeatherForecast[] = [];

  // Check if we need historical data (dates before today)
  if (startDate < today) {
    const historicalEndDate = endDate < today ? endDate : new Date(today.getTime() - 86400000);
    const historicalEndStr = historicalEndDate.toISOString().split('T')[0];

    try {
      const historical = await fetchHistoricalWeather(lat, lng, startStr, historicalEndStr);
      results.push(...historical);
    } catch (error) {
      console.warn('Failed to fetch historical weather:', error);
    }
  }

  // Check if we need forecast data (dates from today onwards)
  if (endDate >= today) {
    const forecastStartDate = startDate > today ? startDate : today;
    const daysFromToday = Math.ceil((endDate.getTime() - today.getTime()) / 86400000) + 1;

    try {
      const forecast = await fetchWeatherForecast(lat, lng, Math.min(daysFromToday, 16));
      // Filter forecast to only include dates we need
      const filteredForecast = forecast.filter(f => {
        const fDate = new Date(f.date);
        return fDate >= forecastStartDate && fDate <= endDate;
      });
      results.push(...filteredForecast);
    } catch (error) {
      console.warn('Failed to fetch forecast weather:', error);
    }
  }

  // Sort by date and remove duplicates (prefer historical over forecast)
  const uniqueResults = new Map<string, WeatherForecast>();
  results.forEach(w => {
    const existing = uniqueResults.get(w.date);
    // Prefer historical data over forecast
    if (!existing || w.isHistorical) {
      uniqueResults.set(w.date, w);
    }
  });

  return Array.from(uniqueResults.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetches weather for a specific date
 */
export async function fetchWeatherForDate(
  lat: number,
  lng: number,
  date: Date
): Promise<WeatherForecast | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateStr = date.toISOString().split('T')[0];

  if (date < today) {
    // Historical data
    const historical = await fetchHistoricalWeather(lat, lng, dateStr, dateStr);
    return historical[0] || null;
  } else {
    // Forecast data
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

    if (diffDays > 16) {
      return null; // Date out of forecast range
    }

    const forecasts = await fetchWeatherForecast(lat, lng, diffDays + 1);
    return forecasts.find(f => f.date === dateStr) || null;
  }
}
