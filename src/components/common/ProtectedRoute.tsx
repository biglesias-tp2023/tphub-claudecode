import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui';

/**
 * ProtectedRoute - Route guard for authenticated-only pages
 *
 * SOLID Principles applied:
 * - SRP (Single Responsibility): Only handles route protection logic
 * - OCP (Open/Closed): Wraps any children without modification
 * - LSP (Liskov Substitution): Can wrap any React component
 * - DIP (Dependency Inversion): Depends on useAuthStore abstraction
 *
 * Behavior:
 * 1. Shows loading spinner while checking authentication
 * 2. Redirects to /login if not authenticated (preserves original destination)
 * 3. Renders children if authenticated
 *
 * State handling:
 * - isInitialized: Prevents flash of content before auth check
 * - isLoading: Shows spinner during async operations
 * - isAuthenticated: Final auth status
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore();

  // Show loading spinner while checking auth
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
