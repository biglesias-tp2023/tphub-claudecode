/**
 * Calendar Feature
 *
 * Manages promotional campaigns, calendar events, and weather integration.
 *
 * ## Components
 *
 * - `CalendarView` - Main monthly calendar view
 * - `CalendarSidebar` - Mini calendar and filters
 * - `CampaignEditor` - Campaign creation wizard
 * - `CampaignDetailModal` - View campaign details
 *
 * ## Hooks
 *
 * - `useCampaignsByMonth` - Fetch campaigns for a month
 * - `useCreateCampaign` - Create new campaign
 * - `useCalendarEventsByMonth` - Fetch calendar events
 * - `useWeatherByMonth` - Fetch weather data
 *
 * ## Services
 *
 * - `weatherApi` - Open-Meteo API integration
 *
 * @module features/calendar
 */

export * from './components';
export * from './hooks';
export * from './config';
export * from './services';
