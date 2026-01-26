/**
 * Calendar Page
 *
 * Main page for managing promotional campaigns across delivery platforms.
 * Displays a monthly calendar view with campaigns, events, and weather data.
 *
 * ## Features
 *
 * - Monthly calendar grid with campaigns displayed as colored bars
 * - Weather forecast integration (requires restaurant with coordinates)
 * - Calendar events (holidays, sports, commercial events)
 * - Campaign creation wizard (5 steps)
 * - Sidebar with mini calendar and filters
 *
 * ## Data Flow
 *
 * 1. Restaurants loaded from CRP Portal based on global filters
 * 2. First restaurant with coordinates used for weather
 * 3. Campaigns fetched for selected restaurants + month
 * 4. Events fetched from Supabase (calendar_events table)
 *
 * @module pages/calendar/CalendarPage
 */

import { useState, useCallback, useMemo } from 'react';
import { Calendar, CloudOff } from 'lucide-react';
import { Card, ToastContainer } from '@/components/ui';
import { DashboardFilters } from '@/features/dashboard';
import { useDashboardFiltersStore } from '@/stores/filtersStore';
import { useRestaurants } from '@/features/dashboard/hooks';
import { useToast } from '@/hooks/useToast';
import {
  CalendarView,
  CalendarSidebar,
  CampaignEditor,
  CampaignDetailModal,
  useCampaignsByMonth,
  useCalendarEventsByMonth,
  useWeatherByMonth,
  useCreateCampaign,
} from '@/features/calendar';
import type { PromotionalCampaignInput, PromotionalCampaign, CampaignPlatform, EventCategory, CalendarEvent } from '@/types';

export function CalendarPage() {
  const { restaurantIds } = useDashboardFiltersStore();
  const { toasts, closeToast, success } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [detailModalDate, setDetailModalDate] = useState<Date | null>(null);
  const [detailModalCampaigns, setDetailModalCampaigns] = useState<PromotionalCampaign[]>([]);
  const [detailModalEvents, setDetailModalEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Sidebar state
  const [sidebarDate, setSidebarDate] = useState(new Date());
  const [selectedPlatforms, setSelectedPlatforms] = useState<CampaignPlatform[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Event filters - all categories selected by default
  const [selectedEventCategories, setSelectedEventCategories] = useState<EventCategory[]>([
    'holiday', 'sports', 'entertainment', 'commercial'
  ]);
  const [selectedRegion, setSelectedRegion] = useState('ES');

  // Get restaurants based on filters (uses store internally)
  const { data: restaurants = [] } = useRestaurants();

  // Get the first selected restaurant or first in list
  const selectedRestaurant = restaurantIds.length > 0
    ? restaurants.find(r => restaurantIds.includes(r.id))
    : restaurants[0];

  // Fetch campaigns for current month
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaignsByMonth(
    restaurantIds.length > 0 ? restaurantIds : restaurants.map(r => r.id),
    currentMonth.year,
    currentMonth.month
  );

  // Fetch calendar events (passing region for localized events)
  const { data: calendarEvents = [] } = useCalendarEventsByMonth(
    currentMonth.year,
    currentMonth.month,
    selectedRegion.startsWith('ES-') ? 'ES' : selectedRegion // Use country code for API
  );

  // Fetch weather for selected restaurant (includes historical data for the month)
  const { data: weatherForecasts = [] } = useWeatherByMonth(
    selectedRestaurant,
    currentMonth.year,
    currentMonth.month
  );

  // Check if weather data is available (requires restaurant with coordinates)
  const hasRestaurantWithCoordinates = selectedRestaurant &&
    selectedRestaurant.latitude != null &&
    selectedRestaurant.longitude != null;
  const showWeatherUnavailableMessage = !hasRestaurantWithCoordinates;

  // Create campaign mutation
  const createCampaign = useCreateCampaign();

  // Filter campaigns based on sidebar filters
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      // Platform filter
      if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(campaign.platform)) {
        return false;
      }
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(campaign.status)) {
        return false;
      }
      return true;
    });
  }, [campaigns, selectedPlatforms, selectedStatuses]);

  // Filter events based on category and region
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      // Category filter
      if (selectedEventCategories.length > 0 && !selectedEventCategories.includes(event.category)) {
        return false;
      }
      // Region filter - show national events + regional events
      if (selectedRegion.startsWith('ES-')) {
        // If specific region selected, show national (ES) and that region's events
        const isNational = !event.regionCode || event.regionCode === null;
        const isMatchingRegion = event.regionCode === selectedRegion;
        return isNational || isMatchingRegion;
      }
      // If national selected, show all events without region code (national ones)
      return !event.regionCode || event.regionCode === null;
    });
  }, [calendarEvents, selectedEventCategories, selectedRegion]);

  const handleNewCampaign = useCallback(() => {
    setSelectedDate(undefined);
    setIsEditorOpen(true);
  }, []);

  const handleCampaignClick = useCallback((campaign: PromotionalCampaign) => {
    // Find the date and all campaigns for that date
    const dateStr = campaign.startDate;
    const campaignsForDate = filteredCampaigns.filter(c =>
      c.startDate <= dateStr && c.endDate >= dateStr
    );
    const eventsForDate = filteredEvents.filter(e => e.eventDate === dateStr);
    setDetailModalDate(new Date(dateStr));
    setDetailModalCampaigns(campaignsForDate);
    setDetailModalEvents(eventsForDate);
  }, [filteredCampaigns, filteredEvents]);

  const handleDayClick = useCallback((date: Date, dayCampaigns: PromotionalCampaign[], dayEvents: CalendarEvent[]) => {
    // Always show the modal with campaigns and events
    setDetailModalDate(date);
    setDetailModalCampaigns(dayCampaigns);
    setDetailModalEvents(dayEvents);
  }, []);

  const handleMonthChange = useCallback((year: number, month: number) => {
    setCurrentMonth({ year, month });
  }, []);

  const handleSidebarDateSelect = useCallback((date: Date) => {
    setSidebarDate(date);
    // Also update the main calendar view
    setCurrentMonth({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }, []);

  const handleSaveCampaign = useCallback(async (input: PromotionalCampaignInput) => {
    try {
      await createCampaign.mutateAsync(input);
      setIsEditorOpen(false);
      setSelectedDate(undefined);
      success('¡Campaña creada con éxito!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      // Show error to user - the error will be displayed in the editor
      throw error;
    }
  }, [createCampaign, success]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedDate(undefined);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalDate(null);
    setDetailModalCampaigns([]);
    setDetailModalEvents([]);
  }, []);

  const handleAddCampaignFromDetail = useCallback(() => {
    if (detailModalDate) {
      setSelectedDate(detailModalDate.toISOString().split('T')[0]);
      handleCloseDetailModal();
      setIsEditorOpen(true);
    }
  }, [detailModalDate, handleCloseDetailModal]);

  const handleEditCampaign = useCallback((campaign: PromotionalCampaign) => {
    // TODO: Implement edit campaign functionality
    console.log('Edit campaign:', campaign);
    handleCloseDetailModal();
  }, [handleCloseDetailModal]);

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendario de Campañas</h1>
            <p className="text-sm text-gray-500">
              Gestiona promociones y publicidad en todas las plataformas
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* Main content with sidebar */}
      <Card className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <CalendarSidebar
            selectedDate={sidebarDate}
            onDateSelect={handleSidebarDateSelect}
            onCreateClick={handleNewCampaign}
            selectedPlatforms={selectedPlatforms}
            onPlatformsChange={setSelectedPlatforms}
            selectedStatuses={selectedStatuses}
            onStatusesChange={setSelectedStatuses}
            selectedEventCategories={selectedEventCategories}
            onEventCategoriesChange={setSelectedEventCategories}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />

          {/* Calendar area */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            {/* Weather unavailable message */}
            {showWeatherUnavailableMessage && (
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                <CloudOff className="w-4 h-4" />
                <span>
                  Selecciona un establecimiento con coordenadas para ver el clima
                </span>
              </div>
            )}

            <CalendarView
              campaigns={filteredCampaigns}
              events={filteredEvents}
              weatherForecasts={weatherForecasts}
              isLoading={campaignsLoading}
              onNewCampaign={handleNewCampaign}
              onCampaignClick={handleCampaignClick}
              onDayClick={handleDayClick}
              onMonthChange={handleMonthChange}
            />
          </div>
        </div>
      </Card>

      {/* Campaign editor modal */}
      <CampaignEditor
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        onSave={handleSaveCampaign}
        restaurant={selectedRestaurant || null}
        upcomingEvents={filteredEvents}
        weatherForecasts={weatherForecasts}
        initialDate={selectedDate}
      />

      {/* Campaign detail modal */}
      <CampaignDetailModal
        isOpen={detailModalDate !== null}
        onClose={handleCloseDetailModal}
        date={detailModalDate}
        campaigns={detailModalCampaigns}
        events={detailModalEvents}
        onAddCampaign={handleAddCampaignFromDetail}
        onEditCampaign={handleEditCampaign}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
