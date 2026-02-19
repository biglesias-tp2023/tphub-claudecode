import { useState, useCallback, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { CalendarHeader, type CalendarViewType } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { CalendarWeek } from './CalendarWeek';
import { ShareCalendarModal } from './ShareCalendarModal';
import type { PromotionalCampaign, CalendarEvent, WeatherForecast, CampaignPlatform, EventCategory } from '@/types';

interface CalendarViewProps {
  campaigns: PromotionalCampaign[];
  events: CalendarEvent[];
  weatherForecasts?: WeatherForecast[];
  isLoading?: boolean;
  onNewCampaign: () => void;
  onCampaignClick: (campaign: PromotionalCampaign) => void;
  onDayClick?: (date: Date, campaigns: PromotionalCampaign[], events: CalendarEvent[]) => void;
  onMonthChange?: (year: number, month: number) => void;
  onEditCampaign?: (campaign: PromotionalCampaign) => void;
  onDeleteCampaign?: (campaign: PromotionalCampaign) => void;
  onDuplicateCampaign?: (campaign: PromotionalCampaign) => void;
  onCreateCampaignWithDates?: (startDate: string, endDate: string) => void;
  isClientMode?: boolean;
  // Filter state for sharing
  shareFilters?: {
    brandIds?: string[];
    restaurantIds?: string[];
    platformFilters?: CampaignPlatform[];
    categoryFilters?: EventCategory[];
    statusFilters?: string[];
    region?: string;
  };
}

export function CalendarView({
  campaigns,
  events,
  weatherForecasts = [],
  isLoading,
  onCampaignClick,
  onDayClick,
  onMonthChange,
  onEditCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  onCreateCampaignWithDates,
  isClientMode = false,
  shareFilters = {},
}: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [currentView, setCurrentView] = useState<CalendarViewType>('month');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Calculate week start (Monday) for share link
  const weekStart = useMemo(() => {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }, [year, month, day]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handlePrevPeriod = useCallback(() => {
    if (currentView === 'day') {
      const prevDay = new Date(year, month - 1, day - 1);
      setYear(prevDay.getFullYear());
      setMonth(prevDay.getMonth() + 1);
      setDay(prevDay.getDate());
      onMonthChange?.(prevDay.getFullYear(), prevDay.getMonth() + 1);
    } else if (currentView === '4days') {
      const prevDate = new Date(year, month - 1, day - 4);
      setYear(prevDate.getFullYear());
      setMonth(prevDate.getMonth() + 1);
      setDay(prevDate.getDate());
      onMonthChange?.(prevDate.getFullYear(), prevDate.getMonth() + 1);
    } else if (currentView === 'week') {
      const prevWeek = new Date(year, month - 1, day - 7);
      setYear(prevWeek.getFullYear());
      setMonth(prevWeek.getMonth() + 1);
      setDay(prevWeek.getDate());
      onMonthChange?.(prevWeek.getFullYear(), prevWeek.getMonth() + 1);
    } else {
      // month or agenda view
      if (month === 1) {
        setYear(y => y - 1);
        setMonth(12);
        onMonthChange?.(year - 1, 12);
      } else {
        setMonth(m => m - 1);
        onMonthChange?.(year, month - 1);
      }
    }
  }, [currentView, day, month, year, onMonthChange]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleNextPeriod = useCallback(() => {
    if (currentView === 'day') {
      const nextDay = new Date(year, month - 1, day + 1);
      setYear(nextDay.getFullYear());
      setMonth(nextDay.getMonth() + 1);
      setDay(nextDay.getDate());
      onMonthChange?.(nextDay.getFullYear(), nextDay.getMonth() + 1);
    } else if (currentView === '4days') {
      const nextDate = new Date(year, month - 1, day + 4);
      setYear(nextDate.getFullYear());
      setMonth(nextDate.getMonth() + 1);
      setDay(nextDate.getDate());
      onMonthChange?.(nextDate.getFullYear(), nextDate.getMonth() + 1);
    } else if (currentView === 'week') {
      const nextWeek = new Date(year, month - 1, day + 7);
      setYear(nextWeek.getFullYear());
      setMonth(nextWeek.getMonth() + 1);
      setDay(nextWeek.getDate());
      onMonthChange?.(nextWeek.getFullYear(), nextWeek.getMonth() + 1);
    } else {
      // month or agenda view
      if (month === 12) {
        setYear(y => y + 1);
        setMonth(1);
        onMonthChange?.(year + 1, 1);
      } else {
        setMonth(m => m + 1);
        onMonthChange?.(year, month + 1);
      }
    }
  }, [currentView, day, month, year, onMonthChange]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setDay(now.getDate());
    onMonthChange?.(now.getFullYear(), now.getMonth() + 1);
  }, [onMonthChange]);

  const handleViewChange = useCallback((view: CalendarViewType) => {
    setCurrentView(view);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Client mode banner */}
      {isClientMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-blue-700">
          <Eye className="w-4 h-4" />
          <span>Modo solo lectura - Vista de cliente</span>
        </div>
      )}

      <CalendarHeader
        year={year}
        month={month}
        day={day}
        currentView={currentView}
        onPrevPeriod={handlePrevPeriod}
        onNextPeriod={handleNextPeriod}
        onToday={handleToday}
        onViewChange={handleViewChange}
        onShare={() => setIsShareModalOpen(true)}
        isClientMode={isClientMode}
      />

      <div className="flex-1 mt-4 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        )}

        {/* Currently showing month view - other views can be added later */}
        {(currentView === 'month' || currentView === 'agenda') && (
          <CalendarGrid
            year={year}
            month={month}
            campaigns={campaigns}
            events={events}
            weatherForecasts={weatherForecasts}
            onCampaignClick={onCampaignClick}
            onDayClick={onDayClick}
          />
        )}

        {/* Week view */}
        {currentView === 'week' && (
          <CalendarWeek
            year={year}
            month={month}
            day={day}
            campaigns={campaigns}
            events={events}
            weatherForecasts={weatherForecasts}
            onCampaignClick={onCampaignClick}
            onDayClick={onDayClick}
            onEditCampaign={onEditCampaign}
            onDeleteCampaign={onDeleteCampaign}
            onDuplicateCampaign={onDuplicateCampaign}
            onCreateCampaign={onCreateCampaignWithDates}
            isClientMode={isClientMode}
          />
        )}

        {/* Placeholder for other views */}
        {(currentView === 'day' || currentView === '4days') && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Vista {currentView === 'day' ? 'de día' : 'de 4 días'} próximamente
          </div>
        )}
      </div>

      {/* Share modal */}
      <ShareCalendarModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        weekStart={weekStart}
        filters={shareFilters}
      />
    </div>
  );
}
