import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDateRangeFromPreset } from '@/utils/formatters';
import type { ChannelId, DateRange, DatePreset, UserRole } from '@/types';

// ============================================
// ROLES SIN RESTRICCIÓN DE COMPAÑÍAS
// ============================================
const UNRESTRICTED_ROLES: UserRole[] = ['owner', 'superadmin', 'admin'];

/**
 * Check if a role has unrestricted access to all companies.
 */
export function isUnrestrictedRole(role: UserRole | undefined): boolean {
  return !!role && UNRESTRICTED_ROLES.includes(role);
}

// ============================================
// GLOBAL FILTERS STORE (Navbar - Compañías)
// ============================================
interface GlobalFiltersState {
  // Compañías seleccionadas (vacío = todas para admins)
  companyIds: string[];

  // Compañías asignadas al usuario (del perfil). Vacío = sin restricción.
  _assignedCompanyIds: string[];
  // Rol del usuario
  _userRole: UserRole | undefined;
  // Flag: ya se inicializó desde el perfil
  _initialized: boolean;

  // Actions
  setCompanyIds: (ids: string[]) => void;
  addCompanyId: (id: string) => void;
  removeCompanyId: (id: string) => void;
  toggleCompanyId: (id: string) => void;
  selectAllCompanies: () => void;
  clearCompanies: () => void;

  // Inicialización desde perfil de usuario
  initializeFromProfile: (assignedCompanyIds: string[], role: UserRole) => void;
  resetOnLogout: () => void;
}

export const useGlobalFiltersStore = create<GlobalFiltersState>()(
  persist(
    (set, get) => ({
      companyIds: [],
      _assignedCompanyIds: [],
      _userRole: undefined,
      _initialized: false,

      setCompanyIds: (ids) => {
        const { _assignedCompanyIds, _userRole } = get();
        // Usuarios restringidos solo pueden seleccionar compañías asignadas
        if (!isUnrestrictedRole(_userRole) && _assignedCompanyIds.length > 0) {
          const allowed = new Set(_assignedCompanyIds);
          const filtered = ids.filter((id) => allowed.has(id));
          set({ companyIds: filtered });
        } else {
          set({ companyIds: ids });
        }
      },

      addCompanyId: (id) => {
        const { companyIds, _assignedCompanyIds, _userRole } = get();
        // Bloquear si no es una compañía asignada (para usuarios restringidos)
        if (!isUnrestrictedRole(_userRole) && _assignedCompanyIds.length > 0 && !_assignedCompanyIds.includes(id)) {
          return;
        }
        if (!companyIds.includes(id)) {
          set({ companyIds: [...companyIds, id] });
        }
      },

      removeCompanyId: (id) => {
        const { companyIds } = get();
        set({ companyIds: companyIds.filter((cid) => cid !== id) });
      },

      toggleCompanyId: (id) => {
        const { companyIds, _assignedCompanyIds, _userRole } = get();
        if (companyIds.includes(id)) {
          set({ companyIds: companyIds.filter((cid) => cid !== id) });
        } else {
          // Bloquear si no es una compañía asignada (para usuarios restringidos)
          if (!isUnrestrictedRole(_userRole) && _assignedCompanyIds.length > 0 && !_assignedCompanyIds.includes(id)) {
            return;
          }
          set({ companyIds: [...companyIds, id] });
        }
      },

      selectAllCompanies: () => {
        const { _assignedCompanyIds, _userRole } = get();
        // Para usuarios restringidos, "todas" = sus compañías asignadas
        if (!isUnrestrictedRole(_userRole) && _assignedCompanyIds.length > 0) {
          set({ companyIds: _assignedCompanyIds });
        } else {
          set({ companyIds: [] }); // Vacío = todas para admins
        }
      },

      clearCompanies: () => {
        const { _assignedCompanyIds, _userRole } = get();
        // Para usuarios restringidos, no se puede deseleccionar todo
        if (!isUnrestrictedRole(_userRole) && _assignedCompanyIds.length > 0) {
          set({ companyIds: _assignedCompanyIds });
        } else {
          set({ companyIds: [] });
        }
      },

      initializeFromProfile: (assignedCompanyIds, role) => {
        const isRestricted = !isUnrestrictedRole(role);

        if (isRestricted && assignedCompanyIds.length > 0) {
          // Usuario restringido: forzar sus compañías asignadas
          set({
            companyIds: assignedCompanyIds,
            _assignedCompanyIds: assignedCompanyIds,
            _userRole: role,
            _initialized: true,
          });
        } else {
          // Admin/owner: mantener selección actual (o vacío = todas)
          set({
            _assignedCompanyIds: assignedCompanyIds,
            _userRole: role,
            _initialized: true,
          });
        }
      },

      resetOnLogout: () => {
        set({
          companyIds: [],
          _assignedCompanyIds: [],
          _userRole: undefined,
          _initialized: false,
        });
      },
    }),
    {
      name: 'tphub-global-filters',
      partialize: (state) => ({
        // Solo persistir companyIds, no el estado interno
        companyIds: state.companyIds,
      }),
    }
  )
);

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
      setDateRangeWithPreset: (range, preset) => {
        if (import.meta.env.DEV) {
          console.log('[FiltersStore] setDateRangeWithPreset:', {
            preset,
            start: range.start.toISOString(),
            end: range.end.toISOString(),
          });
        }
        set({
          datePreset: preset,
          dateRange: range,
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
              console.warn('[FiltersStore] Invalid localStorage structure, using defaults');
              return null;
            }

            // Validate and sanitize channelIds
            if (parsed.state.channelIds) {
              const validChannels = ['glovo', 'ubereats', 'justeat'];
              if (!Array.isArray(parsed.state.channelIds)) {
                console.warn('[FiltersStore] Invalid channelIds, resetting to empty array');
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
                console.log('[FiltersStore] Migrated legacy preset:', parsed.state.datePreset, '→', migratedPreset);
                parsed.state.datePreset = migratedPreset;
                // Recalculate date range for migrated preset
                parsed.state.dateRange = getDateRangeFromPreset(migratedPreset);
              }
            }

            // Convert date strings back to Date objects
            if (parsed.state?.dateRange?.start && parsed.state?.dateRange?.end) {
              const start = new Date(parsed.state.dateRange.start);
              const end = new Date(parsed.state.dateRange.end);

              // Validate dates are valid
              if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.warn('[FiltersStore] Invalid date range, using defaults');
                delete parsed.state.dateRange;
              } else {
                parsed.state.dateRange = { start, end };
              }
            } else {
              // If dateRange is missing or invalid, use default
              delete parsed.state?.dateRange;
            }
            return parsed;
          } catch (error) {
            // If parsing fails, return null to use defaults
            console.warn('[FiltersStore] Failed to parse localStorage:', error);
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

