import { useState, useRef, useEffect } from 'react';
import { Bell, HelpCircle, LogOut, User, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { user, logout } = useAuthStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  // Get user initials
  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div ref={menuRef} className="relative ml-2">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={cn(
              'flex items-center gap-2 p-1.5 rounded-lg',
              'hover:bg-gray-100 transition-colors',
              isUserMenuOpen && 'bg-gray-100'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-full bg-primary-100',
                'flex items-center justify-center',
                'text-sm font-medium text-primary-700'
              )}
            >
              {getInitials()}
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-500 transition-transform',
                isUserMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              className={cn(
                'absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl',
                'animate-in fade-in zoom-in-95 duration-150'
              )}
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>

              {/* Menu items */}
              <div className="p-2">
                <button
                  onClick={() => setIsUserMenuOpen(false)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                    'text-sm text-gray-700 hover:bg-gray-50 transition-colors'
                  )}
                >
                  <User className="w-4 h-4" />
                  <span>Mi perfil</span>
                </button>

                <button
                  onClick={handleLogout}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                    'text-sm text-error-600 hover:bg-error-50 transition-colors'
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
