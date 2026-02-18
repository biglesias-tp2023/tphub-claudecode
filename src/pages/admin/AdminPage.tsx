import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPlus, Users, Mail, Clock, Crown, Shield } from 'lucide-react';
import { Spinner, Button } from '@/components/ui';
import { useIsAdmin, useCanInviteUsers } from '@/stores/authStore';
import {
  useUsers,
  UserTable,
  CompanyAssigner,
  RoleEditor,
  InviteUserModal,
  PendingInvitations,
  usePendingInvitations,
} from '@/features/admin';
import type { Profile } from '@/types';

type TabId = 'users' | 'invitations';

export function AdminPage() {
  const isAdmin = useIsAdmin();
  const canInvite = useCanInviteUsers();
  const { data: users = [], isLoading, error } = useUsers();
  const { data: pendingInvitations = [] } = usePendingInvitations();
  const [editingCompanies, setEditingCompanies] = useState<Profile | null>(null);
  const [editingRole, setEditingRole] = useState<Profile | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('users');

  // Count users by role
  const ownerCount = users.filter((u) => u.role === 'owner').length;
  const superadminCount = users.filter((u) => u.role === 'superadmin').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const managerCount = users.filter((u) => u.role === 'manager').length;
  const consultantCount = users.filter((u) => u.role === 'consultant').length;

  // Redirect non-admins to dashboard
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 font-medium">Error al cargar usuarios</p>
          <p className="text-gray-500 text-sm mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'users' as TabId,
      label: 'Usuarios',
      icon: Users,
      count: users.length,
    },
    {
      id: 'invitations' as TabId,
      label: 'Invitaciones',
      icon: Mail,
      count: pendingInvitations.length,
      badge: pendingInvitations.length > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
          <p className="text-gray-500 mt-1">
            Gestión de usuarios y asignación de compañías
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar usuario
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              <div className="text-sm text-gray-500">Usuarios totales</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{ownerCount + superadminCount}</div>
              <div className="text-sm text-gray-500">Owner + Super</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{adminCount}</div>
              <div className="text-sm text-gray-500">Administradores</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{managerCount}</div>
              <div className="text-sm text-gray-500">Managers</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{consultantCount}</div>
              <div className="text-sm text-gray-500">Consultores</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {pendingInvitations.length}
              </div>
              <div className="text-sm text-gray-500">Invitaciones</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Tab headers */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && tab.count > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'users' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Usuarios registrados
              </h2>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <UserTable
                  users={users}
                  onEditCompanies={setEditingCompanies}
                  onEditRole={setEditingRole}
                />
              )}
            </>
          )}

          {activeTab === 'invitations' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Invitaciones
                </h2>
              </div>
              <PendingInvitations showAll />
            </>
          )}

        </div>
      </div>

      {/* Modals */}
      <CompanyAssigner
        profile={editingCompanies}
        isOpen={!!editingCompanies}
        onClose={() => setEditingCompanies(null)}
      />
      <RoleEditor
        profile={editingRole}
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
      />
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
