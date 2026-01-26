import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDateRangeFromPreset } from '@/utils/formatters';
import type { ChannelId, DateRange, DatePreset } from '@/types';

// ============================================
// GLOBAL FILTERS STORE (Navbar - Compañías)
// ============================================
interface GlobalFiltersState {
  // Compañías seleccionadas (vacío = todas)
  companyIds: string[];

  // Actions
  setCompanyIds: (ids: string[]) => void;
  addCompanyId: (id: string) => void;
  removeCompanyId: (id: string) => void;
  toggleCompanyId: (id: string) => void;
  selectAllCompanies: () => void;
  clearCompanies: () => void;
}

export const useGlobalFiltersStore = create<GlobalFiltersState>()(
  persist(
    (set, get) => ({
      companyIds: [],

      setCompanyIds: (ids) => set({ companyIds: ids }),

      addCompanyId: (id) => {
        const { companyIds } = get();
        if (!companyIds.includes(id)) {
          set({ companyIds: [...companyIds, id] });
        }
      },

      removeCompanyId: (id) => {
        const { companyIds } = get();
        set({ companyIds: companyIds.filter((cid) => cid !== id) });
      },

      toggleCompanyId: (id) => {
        const { companyIds } = get();
        if (companyIds.includes(id)) {
          set({ companyIds: companyIds.filter((cid) => cid !== id) });
        } else {
          set({ companyIds: [...companyIds, id] });
        }
      },

      selectAllCompanies: () => set({ companyIds: [] }), // Vacío = todas

      clearCompanies: () => set({ companyIds: [] }),
    }),
    {
      name: 'tphub-global-filters',
    }
  )
);

// ============================================
// DASHBOARD FILTERS STORE (Por página)
// ============================================
const defaultDateRange = getDateRangeFromPreset('30d');

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
      datePreset: '30d',

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
      setDateRange: (range) => {
        if (import.meta.env.DEV) {
          console.log('[FiltersStore] setDateRange:', {
            start: range.start.toISOString(),
            end: range.end.toISOString(),
          });
        }
        set({ dateRange: range, datePreset: 'custom' });
      },
      setDatePreset: (preset) => {
        const newRange = getDateRangeFromPreset(preset);
        if (import.meta.env.DEV) {
          console.log('[FiltersStore] setDatePreset:', {
            preset,
            start: newRange.start.toISOString(),
            end: newRange.end.toISOString(),
          });
        }
        set({
          datePreset: preset,
          dateRange: newRange,
        });
      },

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
      }),
    }
  )
);

