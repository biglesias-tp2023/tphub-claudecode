import { useMemo } from 'react';
import { CalendarDay } from './CalendarDay';
import type { PromotionalCampaign, CalendarEvent, WeatherForecast } from '@/types';

interface CalendarGridProps {
  year: number;
  month: number;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  weatherForecasts?: WeatherForecast[];
  onCampaignClick?: (campaign: PromotionalCampaign) => void;
  onDayClick?: (date: Date, campaigns: PromotionalCampaign[], events: CalendarEvent[]) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface CalendarDayData {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  weather?: WeatherForecast;
}

// Helper to format date as YYYY-MM-DD using local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CalendarGrid({
  year,
  month,
  campaigns,
  events,
  weatherForecasts = [],
  onCampaignClick,
  onDayClick,
}: CalendarGridProps) {
  // Create today's date at midnight in local timezone
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const todayStr = formatLocalDate(today);

  // Pre-calculate the date strings for all 42 grid cells
  const gridDateStrings = useMemo(() => {
    const dateStrings: string[] = [];

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    let dayOfWeek = firstDay.getDay();
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Previous month dates
    const prevMonthLastDay = new Date(year, month - 1, 0);
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 2, prevMonthLastDay.getDate() - i);
      dateStrings.push(formatLocalDate(date));
    }

    // Current month dates
    for (let day = 1; day <= lastDay.getDate(); day++) {
      dateStrings.push(formatLocalDate(new Date(year, month - 1, day)));
    }

    // Next month dates
    const remainingDays = 42 - dateStrings.length;
    for (let day = 1; day <= remainingDays; day++) {
      dateStrings.push(formatLocalDate(new Date(year, month, day)));
    }

    return dateStrings;
  }, [year, month]);

  // Pre-calculate Map<dateStr, PromotionalCampaign[]> for all grid dates
  const campaignsByDate = useMemo(() => {
    const map = new Map<string, PromotionalCampaign[]>();
    for (const dateStr of gridDateStrings) {
      const matching = campaigns.filter(
        c => c.startDate <= dateStr && c.endDate >= dateStr
      );
      map.set(dateStr, matching);
    }
    return map;
  }, [campaigns, gridDateStrings]);

  // Pre-calculate Map<dateStr, CalendarEvent[]> for all grid dates
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const dateStr of gridDateStrings) {
      const matching = events.filter(event => {
        if (event.endDate) {
          return event.eventDate <= dateStr && event.endDate >= dateStr;
        }
        return event.eventDate === dateStr;
      });
      map.set(dateStr, matching);
    }
    return map;
  }, [events, gridDateStrings]);

  // Pre-calculate Map<dateStr, WeatherForecast> for quick lookup
  const weatherByDate = useMemo(() => {
    const map = new Map<string, WeatherForecast>();
    for (const w of weatherForecasts) {
      map.set(w.date, w);
    }
    return map;
  }, [weatherForecasts]);

  const calendarDays = useMemo(() => {
    const days: CalendarDayData[] = [];

    // First day of the month
    const firstDay = new Date(year, month - 1, 1);
    // Last day of the month
    const lastDay = new Date(year, month, 0);

    // Start from Monday (adjust for Spanish calendar where week starts on Monday)
    let dayOfWeek = firstDay.getDay();
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to Monday=0

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month - 1, 0);
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 2, prevMonthLastDay.getDate() - i);
      const dateStr = formatLocalDate(date);

      days.push({
        date,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        campaigns: campaignsByDate.get(dateStr) ?? [],
        events: eventsByDate.get(dateStr) ?? [],
        weather: weatherByDate.get(dateStr),
      });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = formatLocalDate(date);

      days.push({
        date,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        campaigns: campaignsByDate.get(dateStr) ?? [],
        events: eventsByDate.get(dateStr) ?? [],
        weather: weatherByDate.get(dateStr),
      });
    }

    // Add days from next month to complete the grid (6 weeks)
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatLocalDate(date);

      days.push({
        date,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        campaigns: campaignsByDate.get(dateStr) ?? [],
        events: eventsByDate.get(dateStr) ?? [],
        weather: weatherByDate.get(dateStr),
      });
    }

    return days;
  }, [year, month, campaignsByDate, eventsByDate, weatherByDate, todayStr]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1">
        {calendarDays.map((dayData) => (
          <CalendarDay
            key={formatLocalDate(dayData.date)}
            date={dayData.date}
            isCurrentMonth={dayData.isCurrentMonth}
            isToday={dayData.isToday}
            campaigns={dayData.campaigns}
            events={dayData.events}
            weather={dayData.weather}
            onCampaignClick={onCampaignClick}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}

