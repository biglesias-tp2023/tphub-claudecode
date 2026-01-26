import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { useIsAdmin } from '@/stores/authStore';
import { useUsers, UserTable, CompanyAssigner, RoleEditor } from '@/features/admin';
import type { Profile } from '@/types';

export function AdminPage() {
  const isAdmin = useIsAdmin();
  const { data: users = [], isLoading, error } = useUsers();
  const [editingCompanies, setEditingCompanies] = useState<Profile | null>(null);
  const [editingRole, setEditingRole] = useState<Profile | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-500 mt-1">
          Gestión de usuarios y asignación de compañías
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          <div className="text-sm text-gray-500">Usuarios totales</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {users.filter((u) => u.role === 'admin').length}
          </div>
          <div className="text-sm text-gray-500">Administradores</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {users.filter((u) => u.role === 'consultant').length}
          </div>
          <div className="text-sm text-gray-500">Consultores</div>
        </div>
      </div>

      {/* User table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
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
    </div>
  );
}
