/**
 * Calendar Events Hooks
 *
 * React Query hooks for fetching calendar events (holidays, sports, etc.)
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { supabase } from '@/services/supabase';
import type { CalendarEvent, DbCalendarEvent, EventCategory } from '@/types';

// ============================================
// MAPPERS
// ============================================

function mapDbEventToEvent(db: DbCalendarEvent): CalendarEvent {
  return {
    id: db.id,
    category: db.category as EventCategory,
    name: db.name,
    description: db.description,
    icon: db.icon,
    eventDate: db.event_date,
    endDate: db.end_date,
    countryCode: db.country_code,
    regionCode: db.region_code,
    isRecurring: db.is_recurring,
    recurrenceRule: db.recurrence_rule,
    source: db.source,
    externalId: db.external_id,
    createdAt: db.created_at,
  };
}

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

async function fetchEventsByMonth(
  year: number,
  month: number,
  countryCode: string = 'ES'
): Promise<CalendarEvent[]> {
  // Calculate first and last day of month
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('country_code', countryCode)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (error) throw new Error(`Error fetching calendar events: ${error.message}`);
  return (data as DbCalendarEvent[]).map(mapDbEventToEvent);
}

async function fetchEventsByDateRange(
  startDate: string,
  endDate: string,
  countryCode: string = 'ES'
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('country_code', countryCode)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  if (error) throw new Error(`Error fetching calendar events: ${error.message}`);
  return (data as DbCalendarEvent[]).map(mapDbEventToEvent);
}

async function fetchUpcomingEvents(
  countryCode: string = 'ES',
  limit: number = 5
): Promise<CalendarEvent[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('country_code', countryCode)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Error fetching upcoming events: ${error.message}`);
  return (data as DbCalendarEvent[]).map(mapDbEventToEvent);
}

async function fetchEventsByCategory(
  category: EventCategory,
  countryCode: string = 'ES'
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('country_code', countryCode)
    .eq('category', category)
    .order('event_date', { ascending: true });

  if (error) throw new Error(`Error fetching events by category: ${error.message}`);
  return (data as DbCalendarEvent[]).map(mapDbEventToEvent);
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch calendar events for a specific month
 */
export function useCalendarEventsByMonth(
  year: number,
  month: number,
  countryCode: string = 'ES'
) {
  return useQuery({
    queryKey: queryKeys.calendarEvents.byMonth(year, month, countryCode),
    queryFn: () => fetchEventsByMonth(year, month, countryCode),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - events don't change often
  });
}

/**
 * Hook to fetch calendar events in a date range
 */
export function useCalendarEventsByDateRange(
  startDate: string,
  endDate: string,
  countryCode: string = 'ES'
) {
  return useQuery({
    queryKey: queryKeys.calendarEvents.byDateRange(startDate, endDate),
    queryFn: () => fetchEventsByDateRange(startDate, endDate, countryCode),
    enabled: !!startDate && !!endDate,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to fetch upcoming events
 */
export function useUpcomingEvents(countryCode: string = 'ES', limit: number = 5) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['calendar-events', 'upcoming', countryCode, limit, today],
    queryFn: () => fetchUpcomingEvents(countryCode, limit),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to fetch events by category
 */
export function useCalendarEventsByCategory(
  category: EventCategory,
  countryCode: string = 'ES'
) {
  return useQuery({
    queryKey: ['calendar-events', 'category', category, countryCode],
    queryFn: () => fetchEventsByCategory(category, countryCode),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to check if a specific date has an event
 */
export function useIsEventDate(date: Date, events: CalendarEvent[]): CalendarEvent | undefined {
  const dateStr = date.toISOString().split('T')[0];
  return events.find(e => e.eventDate === dateStr);
}
