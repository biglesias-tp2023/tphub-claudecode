import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/services/supabase';
import { fetchCurrentProfile } from '@/services/supabase-data';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { SESSION_CHECK_TIMEOUT_MS } from '@/constants/timeouts';
import type { User, Profile } from '@/types';

/**
 * AuthStore - Global authentication state management
 *
 * State:
 * - user: Current authenticated user or null
 * - profile: User's profile from Supabase (includes assigned companies)
 * - isAuthenticated: Boolean flag for auth status
 * - isLoading: Loading state during auth operations
 * - isInitialized: True after first session check (prevents flash)
 * - error: Current error message if any
 *
 * Actions:
 * - login: Email/password authentication
 * - loginWithGoogle: OAuth with Google
 * - logout: Sign out user
 * - checkSession: Verify existing session and load profile
 * - clearError: Reset error state
 * - refreshProfile: Reload profile from Supabase
 */

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

/**
 * Helper to convert Profile to User format for backward compatibility
 */
function profileToUser(profile: Profile, authCreatedAt?: string): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.fullName || profile.email.split('@')[0],
    avatarUrl: profile.avatarUrl || undefined,
    role: profile.role,
    assignedCompanyIds: profile.assignedCompanyIds,
    createdAt: authCreatedAt || profile.createdAt,
    lastLoginAt: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Fetch profile from Supabase
            const profile = await fetchCurrentProfile();

            if (profile) {
              const user = profileToUser(profile, data.user.created_at);
              set({
                user,
                profile,
                isAuthenticated: true,
                isLoading: false,
              });
              // Initialize company filters from profile
              useGlobalFiltersStore.getState().initializeFromProfile(
                profile.assignedCompanyIds,
                profile.role
              );
            } else {
              // Profile doesn't exist yet (trigger should have created it)
              // Create a fallback user
              const user: User = {
                id: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.name || email.split('@')[0],
                avatarUrl: data.user.user_metadata?.avatar_url,
                role: 'consultant',
                assignedCompanyIds: [],
                createdAt: data.user.created_at,
                lastLoginAt: new Date().toISOString(),
              };

              set({
                user,
                profile: null,
                isAuthenticated: true,
                isLoading: false,
              });
            }
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Error al iniciar sesión',
            isLoading: false,
          });
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              queryParams: {
                // Force account selector and consent screen
                prompt: 'select_account consent',
                access_type: 'offline',
              },
            },
          });

          if (error) throw error;

          // The callback will be handled in checkSession after redirect
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Error con Google',
            isLoading: false,
          });
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Error signing out:', error);
        } finally {
          // Always clear state, even if signOut fails
          localStorage.clear();
          sessionStorage.clear();
          useGlobalFiltersStore.getState().resetOnLogout();

          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkSession: async () => {
        set({ isLoading: true });

        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout verificando sesión')), SESSION_CHECK_TIMEOUT_MS)
          );
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

          if (session?.user) {
            // Fetch profile from Supabase
            const profile = await fetchCurrentProfile();

            if (profile) {
              const user = profileToUser(profile, session.user.created_at);
              set({
                user,
                profile,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
              });
              // Initialize company filters from profile
              useGlobalFiltersStore.getState().initializeFromProfile(
                profile.assignedCompanyIds,
                profile.role
              );
            } else {
              // Profile doesn't exist yet
              const user: User = {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
                avatarUrl: session.user.user_metadata?.avatar_url,
                role: 'consultant',
                assignedCompanyIds: [],
                createdAt: session.user.created_at,
                lastLoginAt: new Date().toISOString(),
              };

              set({
                user,
                profile: null,
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true,
              });
            }
          } else {
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Error verificando sesión',
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      refreshProfile: async () => {
        try {
          const profile = await fetchCurrentProfile();
          if (profile) {
            const { user } = get();
            if (user) {
              set({
                profile,
                user: profileToUser(profile, user.createdAt),
              });
            }
          }
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tphub-auth',
      partialize: (state) => ({
        // Only persist minimal info, Supabase manages the real session
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Listener for auth state changes in Supabase
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Only clear local state — do NOT call logout() to avoid infinite loop
    // (logout -> signOut -> SIGNED_OUT event -> logout -> ...)
    localStorage.clear();
    sessionStorage.clear();
    useGlobalFiltersStore.getState().resetOnLogout();
    useAuthStore.setState({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  } else if (event === 'SIGNED_IN' && session) {
    // Solo ejecutar si aún no se ha inicializado (evita re-init en token refresh)
    if (!useAuthStore.getState().isInitialized) {
      useAuthStore.getState().checkSession();
    }
  }
});

// Selector hooks for convenience
export const useUser = () => useAuthStore((state) => state.user);
export const useProfile = () => useAuthStore((state) => state.profile);

// Role-based selectors
export const useIsOwner = () => useAuthStore((state) => state.profile?.role === 'owner');
export const useIsSuperadmin = () => useAuthStore((state) => state.profile?.role === 'superadmin');
export const useIsAdmin = () => useAuthStore((state) =>
  state.profile?.role === 'admin' ||
  state.profile?.role === 'superadmin' ||
  state.profile?.role === 'owner'
);
export const useIsManager = () => useAuthStore((state) => state.profile?.role === 'manager');

/**
 * Check if current user can manage other users (Owner, Superadmin, or Admin)
 */
export const useCanManageUsers = () => useAuthStore((state) =>
  state.profile?.role === 'owner' ||
  state.profile?.role === 'superadmin' ||
  state.profile?.role === 'admin'
);

/**
 * Check if current user can invite other users
 */
export const useCanInviteUsers = () => useAuthStore((state) =>
  state.profile?.role === 'owner' ||
  state.profile?.role === 'superadmin' ||
  state.profile?.role === 'admin'
);

export const useAssignedCompanyIds = () =>
  useAuthStore((state) => state.profile?.assignedCompanyIds || []);

/**
 * Get current user's role
 */
export const useCurrentRole = () => useAuthStore((state) => state.profile?.role);
