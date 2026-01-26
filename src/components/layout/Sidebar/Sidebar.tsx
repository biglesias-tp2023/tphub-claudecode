import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  PieChart,
  Truck,
  Users,
  Star,
  ClipboardList,
  Calendar,
  ClipboardCheck,
  Map,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  LogOut,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useIsAdmin, useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';
import { CompanySelector } from '@/features/clients';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
}

const navItems: NavItem[] = [
  { label: 'Controlling', icon: PieChart, to: ROUTES.CONTROLLING },
  { label: 'Operaciones', icon: Truck, to: ROUTES.OPERATIONS },
  { label: 'Clientes', icon: Users, to: ROUTES.CLIENTS },
  { label: 'Reputación', icon: Star, to: ROUTES.REPUTATION },
  { label: 'Estrategia', icon: ClipboardList, to: ROUTES.STRATEGIC },
  { label: 'Calendario', icon: Calendar, to: ROUTES.CALENDAR },
  { label: 'Auditorías', icon: ClipboardCheck, to: ROUTES.AUDITS },
  { label: 'Mapas', icon: Map, to: ROUTES.MAPS },
  { label: 'Mercado', icon: TrendingUp, to: ROUTES.MARKET },
];

export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const isAdmin = useIsAdmin();
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build nav items dynamically based on user role
  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ label: 'Admin', icon: Settings, to: ROUTES.ADMIN }] : []),
  ];

  // Get user initials
  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 bg-white flex flex-col z-30',
        'border-r border-gray-200',
        'transition-[width] duration-300 ease-out',
        isSidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Header with Toggle Control */}
      <div className="flex items-center h-14 px-3">
        {/* Toggle Control - OpenAI style */}
        <button
          onClick={toggleSidebar}
          onMouseEnter={() => setIsToggleHovered(true)}
          onMouseLeave={() => setIsToggleHovered(false)}
          className={cn(
            'relative w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            'transition-colors duration-150',
            isSidebarCollapsed
              ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              : 'hover:bg-gray-100'
          )}
          title={isSidebarCollapsed ? 'Abrir barra lateral' : 'Cerrar barra lateral'}
        >
          {/* Brand Logo - visible when not hovered (both states) */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-primary-600 rounded-lg',
              'transition-opacity duration-150',
              isToggleHovered ? 'opacity-0' : 'opacity-100'
            )}
          >
            <span className="text-white font-bold text-sm">TP</span>
          </div>
          {/* Toggle Icon - visible on hover */}
          {isSidebarCollapsed ? (
            <PanelLeftOpen
              className={cn(
                'w-5 h-5 text-gray-500',
                'transition-opacity duration-150',
                isToggleHovered ? 'opacity-100' : 'opacity-0'
              )}
            />
          ) : (
            <PanelLeftClose
              className={cn(
                'w-5 h-5 text-gray-500',
                'transition-opacity duration-150',
                isToggleHovered ? 'opacity-100' : 'opacity-0'
              )}
            />
          )}
        </button>

        {/* Brand Name - only when expanded */}
        {!isSidebarCollapsed && (
          <span className="ml-2.5 text-lg font-bold text-gray-900">TPHub</span>
        )}
      </div>

      {/* Company Selector */}
      <div className="px-3 pb-3">
        <CompanySelector collapsed={isSidebarCollapsed} />
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mx-3" />

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {allNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'transition-colors duration-150',
                    'hover:bg-gray-100',
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-medium'
                      : 'text-gray-600',
                    isSidebarCollapsed && 'justify-center px-2'
                  )
                }
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section - Help & User */}
      <div className="mt-auto border-t border-gray-100">
        {/* Help link */}
        {!isSidebarCollapsed && (
          <div className="px-3 py-2">
            <button
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm">Ayuda</span>
            </button>
          </div>
        )}

        {/* User Menu */}
        <div ref={userMenuRef} className="relative px-3 py-3">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={cn(
              'flex items-center gap-3 w-full rounded-lg transition-colors',
              isSidebarCollapsed ? 'justify-center p-2' : 'px-3 py-2',
              'hover:bg-gray-100',
              isUserMenuOpen && 'bg-gray-100'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-9 h-9 rounded-full bg-primary-100',
                'flex items-center justify-center shrink-0',
                'text-sm font-medium text-primary-700'
              )}
            >
              {getInitials()}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform shrink-0',
                    isUserMenuOpen && 'rotate-180'
                  )}
                />
              </>
            )}
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              className={cn(
                'absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl border border-gray-200 shadow-lg',
                'animate-in fade-in zoom-in-95 duration-150'
              )}
            >
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                    'text-sm text-red-600 hover:bg-red-50 transition-colors'
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
    </aside>
  );
}
