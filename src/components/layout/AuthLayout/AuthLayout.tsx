import { Outlet } from 'react-router-dom';
import { Ripple } from '@/components/ui/Ripple';

/**
 * AuthLayout - Layout component for authentication pages
 *
 * SOLID Principles applied:
 * - SRP (Single Responsibility): Only handles layout structure for auth pages
 * - OCP (Open/Closed): Extensible via Outlet for different auth pages (login, register, etc.)
 * - DIP (Dependency Inversion): Depends on abstract Outlet, not concrete page components
 *
 * Features:
 * - Dark blue gradient background
 * - Interactive Ripple effect (Aceternity UI inspired)
 * - Responsive centered content area
 * - ThinkPaladar branding in header
 */
export function AuthLayout() {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)',
      }}
    >
      {/* Interactive Ripple Effect */}
      <Ripple />

      {/* Light glow effect in upper left */}
      <div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, transparent 70%)',
        }}
      />

      {/* Content container - pointer-events-none allows hover to pass through to Ripple */}
      <div className="relative z-10 min-h-screen flex flex-col pointer-events-none">
        {/* Header with logo */}
        <header className="py-6 px-8 pointer-events-auto">
          <div className="flex items-center gap-2">
            {/* Logo icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              className="text-white"
            >
              <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.2"/>
              <path
                d="M8 12h6v2H8v-2zm0 4h10v2H8v-2zm0 4h6v2H8v-2z"
                fill="currentColor"
              />
              <path
                d="M20 10v12l4-6-4-6z"
                fill="currentColor"
              />
            </svg>
            <span className="text-xl font-semibold text-white tracking-tight">
              thinkpaladar
            </span>
          </div>
        </header>

        {/* Main content - centered (pointer-events-none to allow Ripple hover) */}
        <main className="flex-1 flex items-center justify-center px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
