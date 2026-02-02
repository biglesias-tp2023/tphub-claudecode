/**
 * Calendar Hooks
 *
 * React Query hooks for calendar data management.
 *
 * ## Campaigns (useCampaigns.ts)
 *
 * Currently uses localStorage for demo mode.
 * - `useCampaignsByMonth` - Fetch campaigns for month/restaurants
 * - `useCreateCampaign` - Create new campaign
 * - `useUpdateCampaign` - Update existing campaign
 * - `useDeleteCampaign` - Delete campaign
 *
 * ## Events (useCalendarEvents.ts)
 *
 * Fetches from Supabase `calendar_events` table.
 * - `useCalendarEventsByMonth` - Fetch events for a month
 *
 * ## Weather (useWeather.ts)
 *
 * Integrates with Open-Meteo API.
 * - `useWeatherByMonth` - Combined historical + forecast data
 * - `useWeatherByRestaurant` - 7-day forecast for restaurant
 *
 * @module features/calendar/hooks
 */

export * from './useCampaigns';
export * from './useCalendarEvents';
export * from './useWeather';
export * from './useProducts';
