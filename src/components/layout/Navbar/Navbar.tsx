import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CompanySelector } from '@/features/clients';

export function Navbar() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left section: Company selector (Filtro Global) */}
      <div className="flex items-center gap-3">
        <CompanySelector />
      </div>

      {/* Right section: Search, notifications, user */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Button variant="ghost" size="md" iconOnly>
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="md" iconOnly className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
        </Button>

        {/* User avatar */}
        <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-medium text-sm">U</span>
          </div>
        </button>
      </div>
    </header>
  );
}
