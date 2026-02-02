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

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  useDeleteCampaign,
  useUpdateCampaign,
} from '@/features/calendar';
import type { PromotionalCampaignInput, PromotionalCampaign, CampaignPlatform, EventCategory, CalendarEvent } from '@/types';

// Storage key for campaign editor state (must match CampaignEditor)
const CAMPAIGN_EDITOR_STORAGE_KEY = 'tphub_campaign_editor_state';

export function CalendarPage() {
  const [searchParams] = useSearchParams();
  const { restaurantIds } = useDashboardFiltersStore();
  const { toasts, closeToast, success } = useToast();

  // Check if there's saved editor state to auto-reopen the modal
  const [isEditorOpen, setIsEditorOpen] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CAMPAIGN_EDITOR_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Only restore if saved within the last hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        if (state.timestamp > oneHourAgo) {
          return true; // Auto-open modal if there's recent saved state
        }
      }
    } catch {
      // Ignore errors
    }
    return false;
  });
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [detailModalDate, setDetailModalDate] = useState<Date | null>(null);
  const [detailModalCampaigns, setDetailModalCampaigns] = useState<PromotionalCampaign[]>([]);
  const [detailModalEvents, setDetailModalEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Client mode from URL params (for shared links)
  const isClientMode = searchParams.get('mode') === 'client';

  // Handle URL params for shared links
  useEffect(() => {
    const weekStartParam = searchParams.get('weekStart');
    if (weekStartParam) {
      const date = new Date(weekStartParam);
      if (!isNaN(date.getTime())) {
        setCurrentMonth({ year: date.getFullYear(), month: date.getMonth() + 1 });
      }
    }

    // Parse platform filters from URL
    const platformsParam = searchParams.get('platforms');
    if (platformsParam) {
      const platforms = platformsParam.split(',').filter(p =>
        ['glovo', 'ubereats', 'justeat', 'google_ads'].includes(p)
      ) as CampaignPlatform[];
      if (platforms.length > 0) {
        setSelectedPlatforms(platforms);
      }
    }

    // Parse category filters from URL
    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      const categories = categoriesParam.split(',').filter(c =>
        ['holiday', 'sports', 'entertainment', 'commercial'].includes(c)
      ) as EventCategory[];
      if (categories.length > 0) {
        setSelectedEventCategories(categories);
      }
    }

    // Parse status filters from URL
    const statusesParam = searchParams.get('statuses');
    if (statusesParam) {
      const statuses = statusesParam.split(',').filter(s =>
        ['scheduled', 'active', 'completed', 'cancelled'].includes(s)
      );
      if (statuses.length > 0) {
        setSelectedStatuses(statuses);
      }
    }

    // Parse region from URL
    const regionParam = searchParams.get('region');
    if (regionParam) {
      setSelectedRegion(regionParam);
    }
  }, [searchParams]);

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

  // Campaign mutations
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();

  // State for editing campaign
  const [editingCampaign, setEditingCampaign] = useState<PromotionalCampaign | null>(null);

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
    // Sync sidebar mini calendar to show the same month
    setSidebarDate(new Date(year, month - 1, 1));
  }, []);

  const handleSidebarDateSelect = useCallback((date: Date) => {
    setSidebarDate(date);
    // Also update the main calendar view
    setCurrentMonth({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }, []);

  const handleSaveCampaign = useCallback(async (input: PromotionalCampaignInput) => {
    try {
      if (editingCampaign) {
        // Update existing campaign
        await updateCampaign.mutateAsync({
          id: editingCampaign.id,
          updates: input,
        });
        success('¡Campaña actualizada con éxito!');
      } else {
        // Create new campaign
        await createCampaign.mutateAsync(input);
        success('¡Campaña creada con éxito!');
      }
      setIsEditorOpen(false);
      setSelectedDate(undefined);
      setEditingCampaign(null);
    } catch (error) {
      console.error('Error saving campaign:', error);
      throw error;
    }
  }, [createCampaign, updateCampaign, editingCampaign, success]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedDate(undefined);
    setEditingCampaign(null);
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
    setEditingCampaign(campaign);
    setSelectedDate(campaign.startDate);
    handleCloseDetailModal();
    setIsEditorOpen(true);
  }, [handleCloseDetailModal]);

  const handleDeleteCampaign = useCallback(async (campaign: PromotionalCampaign) => {
    try {
      await deleteCampaign.mutateAsync(campaign.id);
      success('Campaña eliminada');
      // If deleting the last campaign for this day, close the modal
      if (detailModalCampaigns.length <= 1) {
        handleCloseDetailModal();
      } else {
        // Update the modal to remove the deleted campaign
        setDetailModalCampaigns(prev => prev.filter(c => c.id !== campaign.id));
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  }, [deleteCampaign, success, detailModalCampaigns.length, handleCloseDetailModal]);

  const handleDuplicateCampaign = useCallback((campaign: PromotionalCampaign) => {
    // Open editor with campaign data but as new (no id)
    setEditingCampaign(null);
    setSelectedDate(campaign.startDate);
    // Store campaign data for duplication (will be picked up by CampaignEditor)
    // For now, just open editor - full duplication would require passing campaign data
    setIsEditorOpen(true);
  }, []);

  const handleCreateCampaignWithDates = useCallback((startDate: string, _endDate: string) => {
    setSelectedDate(startDate);
    // Note: To prefill end date, CampaignEditor would need to accept it as prop
    // For now, we set the start date. End date available as _endDate if needed.
    void _endDate;
    setIsEditorOpen(true);
  }, []);

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

      {/* Filters - hide in client mode */}
      {!isClientMode && <DashboardFilters />}

      {/* Main content with sidebar */}
      <Card className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar - hide create button in client mode */}
          {!isClientMode && (
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
              campaigns={campaigns}
            />
          )}

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
              onEditCampaign={handleEditCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onDuplicateCampaign={handleDuplicateCampaign}
              onCreateCampaignWithDates={handleCreateCampaignWithDates}
              isClientMode={isClientMode}
              shareFilters={{
                restaurantIds,
                platformFilters: selectedPlatforms,
                categoryFilters: selectedEventCategories,
                statusFilters: selectedStatuses,
                region: selectedRegion,
              }}
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
        campaign={editingCampaign}
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
        onDeleteCampaign={handleDeleteCampaign}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
