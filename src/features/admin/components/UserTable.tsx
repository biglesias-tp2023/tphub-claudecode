import { useState } from 'react';
import { Badge } from '@/components/ui';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import type { Profile, UserRole } from '@/types';

interface UserTableProps {
  users: Profile[];
  onEditCompanies: (profile: Profile) => void;
  onEditRole: (profile: Profile) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  consultant: 'Consultor',
  viewer: 'Visualizador',
};

const ROLE_COLORS: Record<UserRole, 'default' | 'success' | 'warning' | 'error'> = {
  admin: 'error',
  consultant: 'default',
  viewer: 'warning',
};

export function UserTable({ users, onEditCompanies, onEditRole }: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: companies = [] } = useCompanies();

  // Filter users by search term
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Get company names for a user's assigned company IDs
  const getCompanyNames = (companyIds: string[]): string => {
    if (companyIds.length === 0) return '(ninguna)';
    const names = companyIds
      .map((id) => companies.find((c) => c.id === id)?.name)
      .filter(Boolean);
    if (names.length === 0) return '(ninguna)';
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compañías asignadas
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  {searchTerm
                    ? 'No se encontraron usuarios'
                    : 'No hay usuarios registrados'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName || user.email}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {(user.fullName || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName || user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant={ROLE_COLORS[user.role]}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {user.role === 'admin' ? (
                        <span className="text-gray-500 italic">(todas)</span>
                      ) : (
                        getCompanyNames(user.assignedCompanyIds)
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEditCompanies(user)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      disabled={user.role === 'admin'}
                    >
                      Compañías
                    </button>
                    <button
                      onClick={() => onEditRole(user)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Rol
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500">
        Mostrando {filteredUsers.length} de {users.length} usuarios
      </div>
    </div>
  );
}
