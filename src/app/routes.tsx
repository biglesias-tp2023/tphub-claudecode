import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout, AuthLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/common';
import { ControllingPage } from '@/pages/controlling';
import { ReputationPage } from '@/pages/reputation';
import { StrategicPage } from '@/pages/strategic';
import { CalendarPage } from '@/pages/calendar';
import { MapsPage } from '@/pages/maps';
import { LoginPage } from '@/pages/auth';
import { AdminPage } from '@/pages/admin/AdminPage';
import { AuditsPage } from '@/pages/audits';

// Placeholder pages - will be replaced with real implementations
// eslint-disable-next-line react-refresh/only-export-components
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-2">Esta página está en construcción</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  // Protected routes (require authentication)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/controlling" replace /> },
      { path: 'controlling', element: <ControllingPage /> },
      { path: 'operations', element: <PlaceholderPage title="Operaciones" /> },
      { path: 'clients', element: <PlaceholderPage title="Clientes" /> },
      { path: 'reputation', element: <ReputationPage /> },
      { path: 'strategic', element: <StrategicPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'audits', element: <AuditsPage /> },
      { path: 'maps', element: <MapsPage /> },
      { path: 'market', element: <PlaceholderPage title="Mercado" /> },
      { path: 'admin', element: <AdminPage /> },
    ],
  },
  // Public routes (no authentication required)
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
    ],
  },
  // 404
  { path: '*', element: <Navigate to="/controlling" replace /> },
]);
