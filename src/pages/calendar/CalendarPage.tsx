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

import { useReducer, useCallback, useMemo, useEffect } from 'react';
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

// ============================================
// REDUCER
// ============================================

interface CalendarState {
  // Editor modal
  isEditorOpen: boolean;
  selectedDate: string | undefined;
  editingCampaign: PromotionalCampaign | null;
  // Detail modal
  detailModalDate: Date | null;
  detailModalCampaigns: PromotionalCampaign[];
  detailModalEvents: CalendarEvent[];
  // Calendar navigation
  currentMonth: { year: number; month: number };
  sidebarDate: Date;
  // Filters
  selectedPlatforms: CampaignPlatform[];
  selectedStatuses: string[];
  selectedEventCategories: EventCategory[];
  selectedRegion: string;
}

type CalendarAction =
  | { type: 'OPEN_EDITOR'; date?: string }
  | { type: 'CLOSE_EDITOR' }
  | { type: 'EDITOR_SAVED' }
  | { type: 'EDIT_CAMPAIGN'; campaign: PromotionalCampaign }
  | { type: 'DUPLICATE_CAMPAIGN'; startDate: string }
  | { type: 'OPEN_DETAIL'; date: Date; campaigns: PromotionalCampaign[]; events: CalendarEvent[] }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'REMOVE_CAMPAIGN_FROM_DETAIL'; campaignId: string }
  | { type: 'ADD_CAMPAIGN_FROM_DETAIL' }
  | { type: 'EDIT_FROM_DETAIL'; campaign: PromotionalCampaign }
  | { type: 'SET_MONTH'; year: number; month: number }
  | { type: 'SET_SIDEBAR_DATE'; date: Date }
  | { type: 'SET_PLATFORMS'; platforms: CampaignPlatform[] }
  | { type: 'SET_STATUSES'; statuses: string[] }
  | { type: 'SET_EVENT_CATEGORIES'; categories: EventCategory[] }
  | { type: 'SET_REGION'; region: string }
  | { type: 'SYNC_FROM_URL'; month?: { year: number; month: number }; platforms?: CampaignPlatform[]; categories?: EventCategory[]; statuses?: string[]; region?: string };

function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'OPEN_EDITOR':
      return { ...state, isEditorOpen: true, selectedDate: action.date, editingCampaign: null };

    case 'CLOSE_EDITOR':
      return { ...state, isEditorOpen: false, selectedDate: undefined, editingCampaign: null };

    case 'EDITOR_SAVED':
      return { ...state, isEditorOpen: false, selectedDate: undefined, editingCampaign: null };

    case 'EDIT_CAMPAIGN':
      return { ...state, isEditorOpen: true, editingCampaign: action.campaign, selectedDate: action.campaign.startDate };

    case 'DUPLICATE_CAMPAIGN':
      return { ...state, isEditorOpen: true, editingCampaign: null, selectedDate: action.startDate };

    case 'OPEN_DETAIL':
      return { ...state, detailModalDate: action.date, detailModalCampaigns: action.campaigns, detailModalEvents: action.events };

    case 'CLOSE_DETAIL':
      return { ...state, detailModalDate: null, detailModalCampaigns: [], detailModalEvents: [] };

    case 'REMOVE_CAMPAIGN_FROM_DETAIL':
      return { ...state, detailModalCampaigns: state.detailModalCampaigns.filter(c => c.id !== action.campaignId) };

    case 'ADD_CAMPAIGN_FROM_DETAIL':
      return {
        ...state,
        selectedDate: state.detailModalDate?.toISOString().split('T')[0],
        detailModalDate: null, detailModalCampaigns: [], detailModalEvents: [],
        isEditorOpen: true, editingCampaign: null,
      };

    case 'EDIT_FROM_DETAIL':
      return {
        ...state,
        editingCampaign: action.campaign,
        selectedDate: action.campaign.startDate,
        detailModalDate: null, detailModalCampaigns: [], detailModalEvents: [],
        isEditorOpen: true,
      };

    case 'SET_MONTH':
      return { ...state, currentMonth: { year: action.year, month: action.month }, sidebarDate: new Date(action.year, action.month - 1, 1) };

    case 'SET_SIDEBAR_DATE':
      return { ...state, sidebarDate: action.date, currentMonth: { year: action.date.getFullYear(), month: action.date.getMonth() + 1 } };

    case 'SET_PLATFORMS':
      return { ...state, selectedPlatforms: action.platforms };

    case 'SET_STATUSES':
      return { ...state, selectedStatuses: action.statuses };

    case 'SET_EVENT_CATEGORIES':
      return { ...state, selectedEventCategories: action.categories };

    case 'SET_REGION':
      return { ...state, selectedRegion: action.region };

    case 'SYNC_FROM_URL': {
      const next = { ...state };
      if (action.month) next.currentMonth = action.month;
      if (action.platforms) next.selectedPlatforms = action.platforms;
      if (action.categories) next.selectedEventCategories = action.categories;
      if (action.statuses) next.selectedStatuses = action.statuses;
      if (action.region) next.selectedRegion = action.region;
      return next;
    }

    default:
      return state;
  }
}

const CAL_SESSION_KEY = 'tphub-cal-state';

function createInitialState(): CalendarState {
  const now = new Date();
  let isEditorOpen = false;

  try {
    const saved = sessionStorage.getItem(CAMPAIGN_EDITOR_STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (state.timestamp > oneHourAgo) {
        isEditorOpen = true;
      }
    }
  } catch {
    // Ignore errors
  }

  // Restore persisted filters from sessionStorage
  let currentMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };
  let selectedPlatforms: CampaignPlatform[] = [];
  let selectedStatuses: string[] = [];
  let selectedEventCategories: EventCategory[] = ['holiday', 'sports', 'entertainment', 'commercial'];
  let selectedRegion = 'ES';

  try {
    const stored = sessionStorage.getItem(CAL_SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.currentMonth) currentMonth = parsed.currentMonth;
      if (parsed.selectedPlatforms) selectedPlatforms = parsed.selectedPlatforms;
      if (parsed.selectedStatuses) selectedStatuses = parsed.selectedStatuses;
      if (parsed.selectedEventCategories) selectedEventCategories = parsed.selectedEventCategories;
      if (parsed.selectedRegion) selectedRegion = parsed.selectedRegion;
    }
  } catch {
    // Ignore errors
  }

  return {
    isEditorOpen,
    selectedDate: undefined,
    editingCampaign: null,
    detailModalDate: null,
    detailModalCampaigns: [],
    detailModalEvents: [],
    currentMonth,
    sidebarDate: new Date(currentMonth.year, currentMonth.month - 1, 1),
    selectedPlatforms,
    selectedStatuses,
    selectedEventCategories,
    selectedRegion,
  };
}

// ============================================
// COMPONENT
// ============================================

export function CalendarPage() {
  const [searchParams] = useSearchParams();
  const { restaurantIds } = useDashboardFiltersStore();
  const { toasts, closeToast, success } = useToast();

  const [state, dispatch] = useReducer(calendarReducer, null, createInitialState);

  // Persist calendar filters to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(CAL_SESSION_KEY, JSON.stringify({
        currentMonth: state.currentMonth,
        selectedPlatforms: state.selectedPlatforms,
        selectedStatuses: state.selectedStatuses,
        selectedEventCategories: state.selectedEventCategories,
        selectedRegion: state.selectedRegion,
      }));
    } catch {
      // quota exceeded — ignore
    }
  }, [state.currentMonth, state.selectedPlatforms, state.selectedStatuses, state.selectedEventCategories, state.selectedRegion]);

  // Client mode from URL params (for shared links)
  const isClientMode = searchParams.get('mode') === 'client';

  // Handle URL params for shared links
  useEffect(() => {
    let month: { year: number; month: number } | undefined;
    let platforms: CampaignPlatform[] | undefined;
    let categories: EventCategory[] | undefined;
    let statuses: string[] | undefined;
    let region: string | undefined;

    const weekStartParam = searchParams.get('weekStart');
    if (weekStartParam) {
      const date = new Date(weekStartParam);
      if (!isNaN(date.getTime())) {
        month = { year: date.getFullYear(), month: date.getMonth() + 1 };
      }
    }

    const platformsParam = searchParams.get('platforms');
    if (platformsParam) {
      const parsed = platformsParam.split(',').filter(p =>
        ['glovo', 'ubereats', 'justeat', 'google_ads'].includes(p)
      ) as CampaignPlatform[];
      if (parsed.length > 0) platforms = parsed;
    }

    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      const parsed = categoriesParam.split(',').filter(c =>
        ['holiday', 'sports', 'entertainment', 'commercial'].includes(c)
      ) as EventCategory[];
      if (parsed.length > 0) categories = parsed;
    }

    const statusesParam = searchParams.get('statuses');
    if (statusesParam) {
      const parsed = statusesParam.split(',').filter(s =>
        ['scheduled', 'active', 'completed', 'cancelled'].includes(s)
      );
      if (parsed.length > 0) statuses = parsed;
    }

    const regionParam = searchParams.get('region');
    if (regionParam) region = regionParam;

    if (month || platforms || categories || statuses || region) {
      dispatch({ type: 'SYNC_FROM_URL', month, platforms, categories, statuses, region });
    }
  }, [searchParams]);

  // Get restaurants based on filters (uses store internally)
  const { data: restaurants = [] } = useRestaurants();

  // Get the first selected restaurant or first in list
  const selectedRestaurant = restaurantIds.length > 0
    ? restaurants.find(r => restaurantIds.includes(r.id))
    : restaurants[0];

  // Fetch campaigns for current month
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaignsByMonth(
    restaurantIds.length > 0 ? restaurantIds : restaurants.map(r => r.id),
    state.currentMonth.year,
    state.currentMonth.month
  );

  // Fetch calendar events (passing region for localized events)
  const { data: calendarEvents = [] } = useCalendarEventsByMonth(
    state.currentMonth.year,
    state.currentMonth.month,
    state.selectedRegion.startsWith('ES-') ? 'ES' : state.selectedRegion
  );

  // Fetch weather for selected restaurant (includes historical data for the month)
  const { data: weatherForecasts = [] } = useWeatherByMonth(
    selectedRestaurant,
    state.currentMonth.year,
    state.currentMonth.month
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

  // Filter campaigns based on sidebar filters
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      if (state.selectedPlatforms.length > 0 && !state.selectedPlatforms.includes(campaign.platform)) {
        return false;
      }
      if (state.selectedStatuses.length > 0 && !state.selectedStatuses.includes(campaign.status)) {
        return false;
      }
      return true;
    });
  }, [campaigns, state.selectedPlatforms, state.selectedStatuses]);

  // Filter events based on category and region
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      if (state.selectedEventCategories.length > 0 && !state.selectedEventCategories.includes(event.category)) {
        return false;
      }
      if (state.selectedRegion.startsWith('ES-')) {
        const isNational = !event.regionCode || event.regionCode === null;
        const isMatchingRegion = event.regionCode === state.selectedRegion;
        return isNational || isMatchingRegion;
      }
      return !event.regionCode || event.regionCode === null;
    });
  }, [calendarEvents, state.selectedEventCategories, state.selectedRegion]);

  const handleNewCampaign = useCallback(() => {
    dispatch({ type: 'OPEN_EDITOR' });
  }, []);

  const handleCampaignClick = useCallback((campaign: PromotionalCampaign) => {
    const dateStr = campaign.startDate;
    const campaignsForDate = filteredCampaigns.filter(c =>
      c.startDate <= dateStr && c.endDate >= dateStr
    );
    const eventsForDate = filteredEvents.filter(e => e.eventDate === dateStr);
    dispatch({ type: 'OPEN_DETAIL', date: new Date(dateStr), campaigns: campaignsForDate, events: eventsForDate });
  }, [filteredCampaigns, filteredEvents]);

  const handleDayClick = useCallback((date: Date, dayCampaigns: PromotionalCampaign[], dayEvents: CalendarEvent[]) => {
    dispatch({ type: 'OPEN_DETAIL', date, campaigns: dayCampaigns, events: dayEvents });
  }, []);

  const handleMonthChange = useCallback((year: number, month: number) => {
    dispatch({ type: 'SET_MONTH', year, month });
  }, []);

  const handleSidebarDateSelect = useCallback((date: Date) => {
    dispatch({ type: 'SET_SIDEBAR_DATE', date });
  }, []);

  const handleSaveCampaign = useCallback(async (input: PromotionalCampaignInput) => {
    try {
      if (state.editingCampaign) {
        await updateCampaign.mutateAsync({
          id: state.editingCampaign.id,
          updates: input,
        });
        success('¡Campaña actualizada con éxito!');
      } else {
        await createCampaign.mutateAsync(input);
        success('¡Campaña creada con éxito!');
      }
      dispatch({ type: 'EDITOR_SAVED' });
    } catch (error) {
      console.error('Error saving campaign:', error);
      throw error;
    }
  }, [createCampaign, updateCampaign, state.editingCampaign, success]);

  const handleCloseEditor = useCallback(() => {
    dispatch({ type: 'CLOSE_EDITOR' });
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL' });
  }, []);

  const handleAddCampaignFromDetail = useCallback(() => {
    if (state.detailModalDate) {
      dispatch({ type: 'ADD_CAMPAIGN_FROM_DETAIL' });
    }
  }, [state.detailModalDate]);

  const handleEditCampaign = useCallback((campaign: PromotionalCampaign) => {
    dispatch({ type: 'EDIT_FROM_DETAIL', campaign });
  }, []);

  const handleDeleteCampaign = useCallback(async (campaign: PromotionalCampaign) => {
    try {
      await deleteCampaign.mutateAsync(campaign.id);
      success('Campaña eliminada');
      if (state.detailModalCampaigns.length <= 1) {
        dispatch({ type: 'CLOSE_DETAIL' });
      } else {
        dispatch({ type: 'REMOVE_CAMPAIGN_FROM_DETAIL', campaignId: campaign.id });
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  }, [deleteCampaign, success, state.detailModalCampaigns.length]);

  const handleDuplicateCampaign = useCallback((campaign: PromotionalCampaign) => {
    dispatch({ type: 'DUPLICATE_CAMPAIGN', startDate: campaign.startDate });
  }, []);

  const handleCreateCampaignWithDates = useCallback((startDate: string, _endDate: string) => {
    void _endDate;
    dispatch({ type: 'OPEN_EDITOR', date: startDate });
  }, []);

  const handlePlatformsChange = useCallback((platforms: CampaignPlatform[]) => {
    dispatch({ type: 'SET_PLATFORMS', platforms });
  }, []);

  const handleStatusesChange = useCallback((statuses: string[]) => {
    dispatch({ type: 'SET_STATUSES', statuses });
  }, []);

  const handleEventCategoriesChange = useCallback((categories: EventCategory[]) => {
    dispatch({ type: 'SET_EVENT_CATEGORIES', categories });
  }, []);

  const handleRegionChange = useCallback((region: string) => {
    dispatch({ type: 'SET_REGION', region });
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
              selectedDate={state.sidebarDate}
              onDateSelect={handleSidebarDateSelect}
              onCreateClick={handleNewCampaign}
              selectedPlatforms={state.selectedPlatforms}
              onPlatformsChange={handlePlatformsChange}
              selectedStatuses={state.selectedStatuses}
              onStatusesChange={handleStatusesChange}
              selectedEventCategories={state.selectedEventCategories}
              onEventCategoriesChange={handleEventCategoriesChange}
              selectedRegion={state.selectedRegion}
              onRegionChange={handleRegionChange}
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
                platformFilters: state.selectedPlatforms,
                categoryFilters: state.selectedEventCategories,
                statusFilters: state.selectedStatuses,
                region: state.selectedRegion,
              }}
            />
          </div>
        </div>
      </Card>

      {/* Campaign editor modal */}
      <CampaignEditor
        isOpen={state.isEditorOpen}
        onClose={handleCloseEditor}
        onSave={handleSaveCampaign}
        restaurant={selectedRestaurant || null}
        upcomingEvents={filteredEvents}
        weatherForecasts={weatherForecasts}
        initialDate={state.selectedDate}
        campaign={state.editingCampaign}
      />

      {/* Campaign detail modal */}
      <CampaignDetailModal
        isOpen={state.detailModalDate !== null}
        onClose={handleCloseDetailModal}
        date={state.detailModalDate}
        campaigns={state.detailModalCampaigns}
        events={state.detailModalEvents}
        onAddCampaign={handleAddCampaignFromDetail}
        onEditCampaign={handleEditCampaign}
        onDeleteCampaign={handleDeleteCampaign}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
