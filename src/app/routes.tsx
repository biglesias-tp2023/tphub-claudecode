import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom';
import { Suspense } from 'react';
import { MainLayout, AuthLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/common';
import { LoginPage } from '@/pages/auth';
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
// Compset: competitive set analysis
const CompsetPage = lazyWithRetry(() => import('@/pages/compset').then(m => ({ default: m.CompsetPage })));
// Calculator: delivery margin calculator
const CalculatorPage = lazyWithRetry(() => import('@/pages/calculator').then(m => ({ default: m.CalculatorPage })));
// Audits: large pages with extensive forms
const AuditsPage = lazyWithRetry(() => import('@/pages/audits').then(m => ({ default: m.AuditsPage })));
const AuditDetailPage = lazyWithRetry(() => import('@/pages/audits').then(m => ({ default: m.AuditDetailPage })));
// Marketing: advertising analytics
const MarketingPage = lazyWithRetry(() => import('@/pages/marketing').then(m => ({ default: m.MarketingPage })));
// My Clients: alert preferences per company
const MyClientsPage = lazyWithRetry(() => import('@/pages/my-clients').then(m => ({ default: m.MyClientsPage })));
// Admin: user management (admin-only)
const AdminPage = lazyWithRetry(() => import('@/pages/admin/AdminPage').then(m => ({ default: m.AdminPage })));
// Public shared pages
const SharedObjectivePage = lazyWithRetry(() => import('@/pages/shared/SharedObjectivePage').then(m => ({ default: m.SharedObjectivePage })));

// Loading spinner for lazy-loaded pages
// eslint-disable-next-line react-refresh/only-export-components
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Wrapper for lazy-loaded pages with Suspense
// eslint-disable-next-line react-refresh/only-export-components
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// Route-level error element — catches errors React Router intercepts before
// they reach ChunkLoadErrorBoundary (which sits above RouterProvider)
// eslint-disable-next-line react-refresh/only-export-components
function RouteErrorFallback() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : '';
  const isChunk =
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module');

  if (isChunk) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nueva versión disponible
          </h2>
          <p className="text-gray-500 mb-6">
            Se ha publicado una actualización de TPHub. Recarga la página para continuar.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Algo salió mal</h2>
        <p className="text-gray-500 mb-6">Ha ocurrido un error inesperado.</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
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
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Navigate to="/controlling" replace /> },
      { path: 'controlling', element: <LazyPage><ControllingPage /></LazyPage> },
      { path: 'customers', element: <LazyPage><CustomersPage /></LazyPage> },
      { path: 'operations', element: <PlaceholderPage title="Operaciones" /> },
      { path: 'clients', element: <PlaceholderPage title="Clientes" /> },
      { path: 'reputation', element: <LazyPage><ReputationPage /></LazyPage> },
      { path: 'strategic', element: <LazyPage><StrategicPage /></LazyPage> },
      { path: 'calendar', element: <LazyPage><CalendarPage /></LazyPage> },
      { path: 'compset', element: <LazyPage><CompsetPage /></LazyPage> },
      { path: 'calculator', element: <LazyPage><CalculatorPage /></LazyPage> },
      { path: 'heatmap', element: <LazyPage><HeatmapPage /></LazyPage> },
      { path: 'audits', element: <LazyPage><AuditsPage /></LazyPage> },
      { path: 'audits/:id', element: <LazyPage><AuditDetailPage /></LazyPage> },
      { path: 'marketing', element: <LazyPage><MarketingPage /></LazyPage> },
      { path: 'maps', element: <LazyPage><MapsPage /></LazyPage> },
      { path: 'admin', element: <LazyPage><AdminPage /></LazyPage> },
      { path: 'admin/users', element: <LazyPage><AdminPage /></LazyPage> },
      // Consultant portal - unified page
      { path: 'my-clients', element: <LazyPage><MyClientsPage /></LazyPage> },
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
