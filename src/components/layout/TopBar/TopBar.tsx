import { Bell, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  return (
    <header
      className={cn(
        'h-16 bg-white border-b border-gray-200',
        'flex items-center justify-between px-4',
        'fixed top-0 left-0 right-0 z-40',
        className
      )}
    >
      {/* Left: Spacer for sidebar */}
      <div className="w-8" />

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Help */}
        <button
          className={cn(
            'p-2 rounded-lg text-gray-500',
            'hover:bg-gray-100 hover:text-gray-700',
            'transition-colors'
          )}
          title="Ayuda"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          className={cn(
            'p-2 rounded-lg text-gray-500 relative',
            'hover:bg-gray-100 hover:text-gray-700',
            'transition-colors'
          )}
          title="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
