import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  PieChart,
  Truck,
  UsersRound,
  Star,
  Target,
  Calendar,
  ClipboardCheck,
  Calculator,
  Crosshair,
  Grid3X3,
  Map,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  LogOut,
  ChevronDown,
  HelpCircle,
  UserPlus,
  Building2,
  Bell,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useIsAdmin, useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/constants/routes';
import { CompanySelector } from '@/features/clients';
import { InviteUserModal } from '@/features/admin/components/InviteUserModal';
import { AlertsModal } from '@/features/my-clients/components/AlertsModal';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  tag?: { text: string; color: 'green' | 'gray' | 'orange' };
}

const navItems: NavItem[] = [
  { label: 'Controlling', icon: PieChart, to: ROUTES.CONTROLLING },
  { label: 'Auditorías', icon: ClipboardCheck, to: ROUTES.AUDITS },
  { label: 'Objetivos', icon: Target, to: ROUTES.STRATEGIC, tag: { text: 'New!', color: 'green' } },
  { label: 'Heatmap', icon: Grid3X3, to: ROUTES.HEATMAP, tag: { text: 'New!', color: 'green' } },
  { label: 'Reputación', icon: Star, to: ROUTES.REPUTATION, tag: { text: 'New!', color: 'green' } },
  { label: 'Publicidad', icon: Megaphone, to: ROUTES.MARKETING, tag: { text: 'New!', color: 'green' } },
  { label: 'Compset', icon: Crosshair, to: ROUTES.COMPSET, tag: { text: 'Beta', color: 'orange' } },
  { label: 'Calculadora', icon: Calculator, to: ROUTES.CALCULATOR, tag: { text: 'New!', color: 'green' } },
  { label: 'Calendario', icon: Calendar, to: ROUTES.CALENDAR, tag: { text: 'Beta', color: 'orange' } },
  { label: 'Clientes', icon: UsersRound, to: ROUTES.CUSTOMERS, tag: { text: 'Beta', color: 'orange' } },
  { label: 'Operaciones', icon: Truck, to: ROUTES.OPERATIONS, tag: { text: 'Soon!', color: 'gray' } },
  { label: 'Mapas', icon: Map, to: ROUTES.MAPS, tag: { text: 'Soon!', color: 'gray' } },
];

export function Sidebar() {
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
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

  // Get user initials
  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  const handleNavigate = (path: string) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  const handleInvite = () => {
    setIsUserMenuOpen(false);
    setShowInviteModal(true);
  };

  const handleAlerts = () => {
    setIsUserMenuOpen(false);
    setShowAlertsModal(true);
  };

  return (
    <>
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
              'relative w-11 h-11 rounded-lg flex items-center justify-center shrink-0',
              'transition-colors duration-150',
              isSidebarCollapsed
                ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                : 'hover:bg-gray-100'
            )}
            title={isSidebarCollapsed ? 'Abrir barra lateral' : 'Cerrar barra lateral'}
          >
            {/* Brand Pictogram - visible when not hovered */}
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                'transition-opacity duration-150',
                isToggleHovered ? 'opacity-0' : 'opacity-100'
              )}
            >
              <img
                src="/images/logo/icon.svg"
                alt="ThinkPaladar"
                className="w-9 h-9"
              />
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

          {/* Brand Logo - only when expanded */}
          {!isSidebarCollapsed && (
            <img
              src="/images/logo/logo.png"
              alt="ThinkPaladar"
              className="ml-1 h-8 w-auto"
            />
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
            {navItems.map((item) => (
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
                  {!isSidebarCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {item.tag && (
                        <span className={cn(
                          'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                          item.tag.color === 'green'
                            ? 'bg-emerald-50 text-emerald-600'
                            : item.tag.color === 'orange'
                            ? 'bg-amber-50 text-accent-400'
                            : 'bg-gray-100 text-gray-400'
                        )}>
                          {item.tag.text}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section - User */}
        <div className="mt-auto border-t border-gray-100">
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
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'Usuario'}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className={cn(
                    'w-9 h-9 rounded-full bg-primary-600',
                    'flex items-center justify-center shrink-0',
                    'text-sm font-medium text-white'
                  )}
                >
                  {getInitials()}
                </div>
              )}
              {!isSidebarCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getInitials()}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      ThinkPaladar SL
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
                  'absolute bottom-full mb-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden',
                  isSidebarCollapsed ? 'left-full ml-2 w-72' : 'left-3 right-3 w-auto',
                  'animate-in fade-in zoom-in-95 duration-150'
                )}
              >
                {/* Email row */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                </div>

                {/* Invite teammates */}
                <div className="py-1">
                  <button
                    onClick={handleInvite}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-gray-400" />
                    <span>Añadir compañeros de equipo</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* My stuff */}
                <div className="py-1">
                  <button
                    onClick={() => handleNavigate('/my-clients')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>Mis clientes</span>
                  </button>
                  <button
                    onClick={handleAlerts}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span>Alertas</span>
                  </button>
                </div>

                {/* Admin section */}
                {isAdmin && (
                  <>
                    <div className="border-t border-gray-100" />
                    <div className="py-1">
                      <button
                        onClick={() => handleNavigate('/admin')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span>Administración</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Help & Logout */}
                <div className="py-1">
                  <button
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <span>Ayuda</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-gray-400" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Alerts Modal */}
      <AlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
      />
    </>
  );
}
