import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers';
import { router } from './routes';
import { useAuthStore } from '@/stores/authStore';
import { ChunkLoadErrorBoundary } from '@/components/common';
import { useScheduledRefresh } from '@/hooks/useScheduledRefresh';

/**
 * AuthInitializer - Handles authentication state initialization
 *
 * Responsibility: Single responsibility for checking and initializing auth session
 * on app mount. Follows the SRP (Single Responsibility Principle).
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkSession, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      checkSession();
    }
  }, [checkSession, isInitialized]);

  return <>{children}</>;
}

/**
 * ScheduledRefreshManager - Handles automatic data refresh at 8 AM Madrid time
 */
function ScheduledRefreshManager({ children }: { children: React.ReactNode }) {
  useScheduledRefresh();
  return <>{children}</>;
}

/**
 * App - Root application component
 *
 * Composes providers and router following the Composition pattern.
 * Each provider has a single responsibility (SRP):
 * - AppProviders: External library providers (React Query)
 * - AuthInitializer: Authentication state
 * - ScheduledRefreshManager: Daily data refresh at 8 AM
 * - RouterProvider: Routing
 */
export function App() {
  return (
    <ChunkLoadErrorBoundary>
      <AppProviders>
        <AuthInitializer>
          <ScheduledRefreshManager>
            <RouterProvider router={router} />
          </ScheduledRefreshManager>
        </AuthInitializer>
      </AppProviders>
    </ChunkLoadErrorBoundary>
  );
}
