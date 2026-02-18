import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { MainLayout, AuthLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/common';
import { LoginPage } from '@/pages/auth';
import { AdminPage } from '@/pages/admin/AdminPage';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

// Lazy load heavy pages with retry logic for chunk load errors after deploys
// Controlling: dashboard with charts and data
const ControllingPage = lazyWithRetry(() => import('@/pages/controlling').then(m => ({ default: m.ControllingPage })));
// Customers: large table with filtering
const CustomersPage = lazyWithRetry(() => import('@/pages/customers').then(m => ({ default: m.CustomersPage })));
// Reputation: reviews and ratings
const ReputationPage = lazyWithRetry(() => import('@/pages/reputation').then(m => ({ default: m.ReputationPage })));
// Maps: uses leaflet (~180KB)
const MapsPage = lazyWithRetry(() => import('@/pages/maps').then(m => ({ default: m.MapsPage })));
// Calendar: uses react-day-picker and complex scheduling logic
const CalendarPage = lazyWithRetry(() => import('@/pages/calendar').then(m => ({ default: m.CalendarPage })));
// Strategic: large page with charts and projections
const StrategicPage = lazyWithRetry(() => import('@/pages/strategic').then(m => ({ default: m.StrategicPage })));
// Heatmap: temporal pattern analysis
const HeatmapPage = lazyWithRetry(() => import('@/pages/heatmap').then(m => ({ default: m.HeatmapPage })));
// Audits: large pages with extensive forms
const AuditsPage = lazyWithRetry(() => import('@/pages/audits').then(m => ({ default: m.AuditsPage })));
const AuditDetailPage = lazyWithRetry(() => import('@/pages/audits').then(m => ({ default: m.AuditDetailPage })));
// Public shared pages
const SharedObjectivePage = lazyWithRetry(() => import('@/pages/shared/SharedObjectivePage'));

// Loading spinner for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Wrapper for lazy-loaded pages with Suspense
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

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
      { path: 'controlling', element: <LazyPage><ControllingPage /></LazyPage> },
      { path: 'customers', element: <LazyPage><CustomersPage /></LazyPage> },
      { path: 'operations', element: <PlaceholderPage title="Operaciones" /> },
      { path: 'clients', element: <PlaceholderPage title="Clientes" /> },
      { path: 'reputation', element: <LazyPage><ReputationPage /></LazyPage> },
      { path: 'strategic', element: <LazyPage><StrategicPage /></LazyPage> },
      { path: 'calendar', element: <LazyPage><CalendarPage /></LazyPage> },
      { path: 'compset', element: <PlaceholderPage title="Compset" /> },
      { path: 'heatmap', element: <LazyPage><HeatmapPage /></LazyPage> },
      { path: 'audits', element: <LazyPage><AuditsPage /></LazyPage> },
      { path: 'audits/:id', element: <LazyPage><AuditDetailPage /></LazyPage> },
      { path: 'maps', element: <LazyPage><MapsPage /></LazyPage> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'admin/users', element: <AdminPage /> },
      // Consultant portal - unified page
      { path: 'my-clients', element: <PlaceholderPage title="Mis Clientes" /> },
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
  // Shared objectives (public, no auth)
  {
    path: '/shared/:token',
    element: (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <SharedObjectivePage />
      </Suspense>
    ),
  },
  // 404
  { path: '*', element: <Navigate to="/controlling" replace /> },
]);
