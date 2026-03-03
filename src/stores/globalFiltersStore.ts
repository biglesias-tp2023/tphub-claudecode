import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types';

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

/**
 * Filter company IDs to only include those the user is allowed to access.
 * Unrestricted roles (owner/superadmin/admin) pass through all IDs unchanged.
 * Restricted roles only keep IDs present in their assigned list.
 */
function filterAllowedCompanyIds(
  ids: string[],
  role: UserRole | undefined,
  assignedIds: string[],
): string[] {
  if (isUnrestrictedRole(role) || assignedIds.length === 0) return ids;
  const allowed = new Set(assignedIds);
  return ids.filter((id) => allowed.has(id));
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
        set({ companyIds: filterAllowedCompanyIds(ids, _userRole, _assignedCompanyIds) });
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
        const { _initialized, companyIds } = get();

        // Ya inicializado en esta sesión — solo actualizar metadata
        if (_initialized) {
          set({ _assignedCompanyIds: assignedCompanyIds, _userRole: role });
          return;
        }

        const isRestricted = !isUnrestrictedRole(role);

        if (isRestricted && assignedCompanyIds.length > 0) {
          // Validar selección existente (puede venir de persist hydration)
          const validExisting = filterAllowedCompanyIds(companyIds, role, assignedCompanyIds);

          set({
            companyIds: validExisting.length > 0 ? validExisting : assignedCompanyIds,
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
// SELECTOR HOOKS
// ============================================

/** Select only companyIds from global filters. */
export const useCompanyIds = () => useGlobalFiltersStore((s) => s.companyIds);
