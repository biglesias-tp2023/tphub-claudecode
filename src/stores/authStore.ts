import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/services/supabase';
import { fetchCurrentProfile } from '@/services/supabase-data';
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
 * - isDevMode: Development bypass flag
 *
 * Actions:
 * - login: Email/password authentication
 * - loginWithGoogle: OAuth with Google
 * - logout: Sign out user
 * - checkSession: Verify existing session and load profile
 * - clearError: Reset error state
 * - devLogin: Development-only bypass
 * - refreshProfile: Reload profile from Supabase
 */

// Check if dev auth bypass is enabled
const isDevBypass = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

// Mock user for development
const createDevUser = (email: string): User => ({
  id: 'dev-user-001',
  email: email || 'dev@thinkpaladar.com',
  name: email ? email.split('@')[0] : 'Dev User',
  avatarUrl: undefined,
  role: 'admin',
  assignedCompanyIds: [],
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
});

// Mock profile for development
const createDevProfile = (): Profile => ({
  id: 'dev-user-001',
  email: 'dev@thinkpaladar.com',
  fullName: 'Dev User',
  avatarUrl: null,
  role: 'admin',
  assignedCompanyIds: [], // Admin sees all
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isDevMode: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
  devLogin: (email?: string) => void;
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
      isDevMode: isDevBypass,

      // Dev login - bypass authentication
      devLogin: (email?: string) => {
        if (!isDevBypass) {
          set({ error: 'Modo desarrollo no está habilitado' });
          return;
        }
        const devUser = createDevUser(email || 'dev@thinkpaladar.com');
        const devProfile = createDevProfile();
        set({
          user: devUser,
          profile: devProfile,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
          error: null,
        });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        // Dev mode bypass
        if (isDevBypass) {
          const devUser = createDevUser(email);
          const devProfile = createDevProfile();
          set({
            user: devUser,
            profile: devProfile,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
          return;
        }

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
                // Restrict to thinkpaladar.com domain
                hd: 'thinkpaladar.com',
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
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Error al cerrar sesión',
            isLoading: false,
          });
        }
      },

      checkSession: async () => {
        set({ isLoading: true });

        try {
          const { data: { session } } = await supabase.auth.getSession();

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
    useAuthStore.getState().logout();
  } else if (event === 'SIGNED_IN' && session) {
    useAuthStore.getState().checkSession();
  }
});

// Selector hooks for convenience
export const useUser = () => useAuthStore((state) => state.user);
export const useProfile = () => useAuthStore((state) => state.profile);
export const useIsAdmin = () => useAuthStore((state) => state.profile?.role === 'admin');
export const useAssignedCompanyIds = () =>
  useAuthStore((state) => state.profile?.assignedCompanyIds || []);
