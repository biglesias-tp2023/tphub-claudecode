import { Outlet } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Sidebar } from '../Sidebar';
import { useUIStore } from '@/stores/uiStore';

export function MainLayout() {
  const { isSidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar - fixed left, full height */}
      <Sidebar />

      {/* Main content area - offset by sidebar */}
      <main
        className={cn(
          'min-h-screen transition-[padding-left] duration-300 ease-out',
          isSidebarCollapsed ? 'pl-[72px]' : 'pl-[260px]'
        )}
      >
        <div className="p-3">
          <div className="bg-white rounded-2xl shadow-sm min-h-[calc(100vh-24px)] p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
