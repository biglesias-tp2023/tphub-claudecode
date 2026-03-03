import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { getDateRangeFromPreset } from '@/utils/formatters';
import type { ChannelId, DateRange, DatePreset } from '@/types';

// ============================================
// DASHBOARD FILTERS STORE (Por página)
// ============================================
const defaultDateRange = getDateRangeFromPreset('last_7_days');

// Migrate legacy preset values to new format
function migrateLegacyPreset(preset: string): DatePreset {
  const legacyToNew: Record<string, DatePreset> = {
    'today': 'last_7_days',
    'yesterday': 'last_7_days',
    '7d': 'last_7_days',
    '30d': 'last_30_days',
    '90d': 'last_12_weeks',
    'year': 'last_12_months',
  };
  return legacyToNew[preset] || (preset as DatePreset);
}

interface DashboardFiltersState {
  // Filtros múltiples (vacío = todos)
  brandIds: string[];
  areaIds: string[];
  restaurantIds: string[];
  channelIds: ChannelId[];

  // Fechas
  dateRange: DateRange;
  datePreset: DatePreset;

  // Actions - Marcas
  setBrandIds: (ids: string[]) => void;
  toggleBrandId: (id: string) => void;
  clearBrands: () => void;

  // Actions - Áreas
  setAreaIds: (ids: string[]) => void;
  toggleAreaId: (id: string) => void;
  clearAreas: () => void;

  // Actions - Restaurantes
  setRestaurantIds: (ids: string[]) => void;
  toggleRestaurantId: (id: string) => void;
  clearRestaurants: () => void;

  // Actions - Canales
  setChannelIds: (ids: ChannelId[]) => void;
  toggleChannelId: (id: ChannelId) => void;
  clearChannels: () => void;

  // Actions - Fechas
  setDateRange: (range: DateRange) => void;
  setDatePreset: (preset: DatePreset) => void;
  setDateRangeWithPreset: (range: DateRange, preset: DatePreset) => void;

  // Reset
  resetDashboardFilters: () => void;
  resetHierarchyFromBrand: () => void;    // Reset Área y Restaurante
  resetHierarchyFromArea: () => void;     // Reset solo Restaurante
}

export const useDashboardFiltersStore = create<DashboardFiltersState>()(
  persist(
    (set) => ({
      brandIds: [],
      areaIds: [],
      restaurantIds: [],
      channelIds: [],
      dateRange: defaultDateRange,
      datePreset: 'last_7_days',

      // Marcas
      setBrandIds: (ids) => set({ brandIds: ids }),
      toggleBrandId: (id) => set((state) => ({
        brandIds: state.brandIds.includes(id)
          ? state.brandIds.filter((bid) => bid !== id)
          : [...state.brandIds, id],
      })),
      clearBrands: () => set({ brandIds: [] }),

      // Áreas
      setAreaIds: (ids) => set({ areaIds: ids }),
      toggleAreaId: (id) => set((state) => ({
        areaIds: state.areaIds.includes(id)
          ? state.areaIds.filter((aid) => aid !== id)
          : [...state.areaIds, id],
      })),
      clearAreas: () => set({ areaIds: [] }),

      // Restaurantes
      setRestaurantIds: (ids) => set({ restaurantIds: ids }),
      toggleRestaurantId: (id) => set((state) => ({
        restaurantIds: state.restaurantIds.includes(id)
          ? state.restaurantIds.filter((rid) => rid !== id)
          : [...state.restaurantIds, id],
      })),
      clearRestaurants: () => set({ restaurantIds: [] }),

      // Canales
      setChannelIds: (ids) => set({ channelIds: ids }),
      toggleChannelId: (id) => set((state) => ({
        channelIds: state.channelIds.includes(id)
          ? state.channelIds.filter((cid) => cid !== id)
          : [...state.channelIds, id],
      })),
      clearChannels: () => set({ channelIds: [] }),

      // Fechas
      setDateRange: (range) => set({ dateRange: range, datePreset: 'custom' }),
      setDatePreset: (preset) => {
        const newRange = getDateRangeFromPreset(preset);
        set({ datePreset: preset, dateRange: newRange });
      },
      setDateRangeWithPreset: (range, preset) => set({ datePreset: preset, dateRange: range }),

      // Reset jerárquico (cuando cambia Compañía)
      resetDashboardFilters: () => set({
        brandIds: [],
        areaIds: [],
        restaurantIds: [],
        // channelIds y dateRange NO se resetean
      }),

      // Reset cuando cambia Marca
      resetHierarchyFromBrand: () => set({
        areaIds: [],
        restaurantIds: [],
      }),

      // Reset cuando cambia Área
      resetHierarchyFromArea: () => set({
        restaurantIds: [],
      }),
    }),
    {
      name: 'tphub-dashboard-filters',
      partialize: (state) => ({
        // Solo persistir Canal y Fecha (el resto se resetea con Compañía)
        channelIds: state.channelIds,
        datePreset: state.datePreset,
        dateRange: state.dateRange,
      }),
      // Custom storage to handle Date serialization/deserialization and legacy migration
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const parsed = JSON.parse(str);

            // Validate basic structure
            if (!parsed || typeof parsed !== 'object' || !parsed.state) {
              if (import.meta.env.DEV) console.warn('[FiltersStore] Invalid localStorage structure, using defaults');
              return null;
            }

            // Validate and sanitize channelIds
            if (parsed.state.channelIds) {
              const validChannels = ['glovo', 'ubereats', 'justeat'];
              if (!Array.isArray(parsed.state.channelIds)) {
                if (import.meta.env.DEV) console.warn('[FiltersStore] Invalid channelIds, resetting to empty array');
                parsed.state.channelIds = [];
              } else {
                // Filter out invalid channel IDs
                parsed.state.channelIds = parsed.state.channelIds.filter(
                  (ch: unknown): ch is ChannelId =>
                    typeof ch === 'string' && validChannels.includes(ch)
                );
              }
            }

            // Migrate legacy preset values (e.g., '30d' → 'last_30_days')
            if (parsed.state?.datePreset) {
              const migratedPreset = migrateLegacyPreset(parsed.state.datePreset);
              if (migratedPreset !== parsed.state.datePreset) {
                console.debug('[FiltersStore] Migrated legacy preset:', parsed.state.datePreset, '→', migratedPreset);
                parsed.state.datePreset = migratedPreset;
                // Recalculate date range for migrated preset
                parsed.state.dateRange = getDateRangeFromPreset(migratedPreset);
              }
            }

            // Always recalculate dateRange from preset on hydration
            // (prevents stale dates when user returns on a different day)
            if (parsed.state?.datePreset && parsed.state.datePreset !== 'custom') {
              parsed.state.dateRange = getDateRangeFromPreset(parsed.state.datePreset);
            } else if (parsed.state?.dateRange?.start && parsed.state?.dateRange?.end) {
              // Custom range: convert date strings back to Date objects
              const start = new Date(parsed.state.dateRange.start);
              const end = new Date(parsed.state.dateRange.end);

              if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                if (import.meta.env.DEV) console.warn('[FiltersStore] Invalid date range, using defaults');
                delete parsed.state.dateRange;
              } else {
                parsed.state.dateRange = { start, end };
              }
            } else {
              delete parsed.state?.dateRange;
            }
            return parsed;
          } catch (error) {
            // If parsing fails, return null to use defaults
            if (import.meta.env.DEV) console.warn('[FiltersStore] Failed to parse localStorage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

// ============================================
// SELECTOR HOOKS (prevent unnecessary re-renders)
// ============================================

/** Select only brandIds from dashboard filters. */
export const useBrandIds = () => useDashboardFiltersStore((s) => s.brandIds);

/** Select only areaIds from dashboard filters. */
export const useAreaIds = () => useDashboardFiltersStore((s) => s.areaIds);

/** Select only channelIds from dashboard filters. */
export const useChannelIds = () => useDashboardFiltersStore((s) => s.channelIds);

/** Select date range and preset from dashboard filters. */
export const useDateFilters = () =>
  useDashboardFiltersStore(useShallow((s) => ({ dateRange: s.dateRange, datePreset: s.datePreset })));
