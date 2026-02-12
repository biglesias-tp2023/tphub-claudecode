import { useState } from 'react';
import { Crown, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { Badge, Button, Modal } from '@/components/ui';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import { useCurrentRole } from '@/stores/authStore';
import { useDeleteUser } from '../hooks/useUsers';
import type { Profile, UserRole } from '@/types';
import { canManageRole, ROLE_LABELS as TYPE_ROLE_LABELS } from '@/types';
import { cn } from '@/utils/cn';

interface UserTableProps {
  users: Profile[];
  onEditCompanies: (profile: Profile) => void;
  onEditRole: (profile: Profile) => void;
}

interface DeleteConfirmModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const ROLE_LABELS: Record<UserRole, string> = TYPE_ROLE_LABELS;

const ROLE_COLORS: Record<UserRole, 'default' | 'success' | 'warning' | 'error'> = {
  owner: 'warning',
  superadmin: 'error',
  admin: 'error',
  manager: 'success',
  consultant: 'default',
  viewer: 'warning',
};

const ROLE_ICONS: Partial<Record<UserRole, React.ElementType>> = {
  owner: Crown,
  superadmin: Shield,
};

function DeleteConfirmModal({ profile, isOpen, onClose, onConfirm, isDeleting }: DeleteConfirmModalProps) {
  if (!profile) return null;

  const displayName = profile.fullName || profile.email.split('@')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar usuario">
      <div className="space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              ¿Estás seguro de eliminar a {displayName}?
            </p>
            <p className="text-sm text-red-700 mt-1">
              Esta acción no se puede deshacer. El usuario perderá acceso a TPHub.
            </p>
          </div>
        </div>

        {/* User info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-900">{displayName}</div>
          <div className="text-sm text-gray-500">{profile.email}</div>
          <div className="text-xs text-gray-400 mt-1">
            Rol: {TYPE_ROLE_LABELS[profile.role]}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar usuario'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function UserTable({ users, onEditCompanies, onEditRole }: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const { data: companies = [] } = useCompanies();
  const currentUserRole = useCurrentRole();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

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

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    deleteUser(userToDelete.id, {
      onSuccess: () => {
        setUserToDelete(null);
      },
    });
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
              filteredUsers.map((user) => {
                const RoleIcon = ROLE_ICONS[user.role];
                const isOwner = user.role === 'owner';
                const canManage = currentUserRole ? canManageRole(currentUserRole, user.role) : false;
                const hasAllAccess = ['owner', 'superadmin', 'admin'].includes(user.role);

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      'hover:bg-gray-50',
                      isOwner && 'bg-amber-50/50'
                    )}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 relative">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.fullName || user.email}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className={cn(
                              'h-10 w-10 rounded-full flex items-center justify-center',
                              isOwner ? 'bg-amber-100' : 'bg-gray-200'
                            )}>
                              <span className={cn(
                                'font-medium',
                                isOwner ? 'text-amber-700' : 'text-gray-500'
                              )}>
                                {(user.fullName || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {isOwner && (
                            <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {user.fullName || user.email.split('@')[0]}
                            </span>
                            {isOwner && (
                              <span className="text-[10px] font-semibold text-amber-600 uppercase">
                                Propietario
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={ROLE_COLORS[user.role]}>
                          {RoleIcon && <RoleIcon className="w-3 h-3 mr-1" />}
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {hasAllAccess ? (
                          <span className="text-gray-500 italic">(todas)</span>
                        ) : (
                          getCompanyNames(user.assignedCompanyIds)
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasAllAccess ? (
                        <span className="text-gray-400 text-xs mr-4">-</span>
                      ) : (
                        <button
                          onClick={() => onEditCompanies(user)}
                          className={cn(
                            'mr-4',
                            canManage
                              ? 'text-blue-600 hover:text-blue-900'
                              : 'text-gray-400 cursor-not-allowed'
                          )}
                          disabled={!canManage}
                        >
                          Compañías
                        </button>
                      )}
                      <button
                        onClick={() => onEditRole(user)}
                        className={cn(
                          'mr-4',
                          isOwner || !canManage
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                        disabled={isOwner || !canManage}
                        title={isOwner ? 'El rol del Owner no puede ser cambiado' : undefined}
                      >
                        Rol
                      </button>
                      <button
                        onClick={() => setUserToDelete(user)}
                        className={cn(
                          isOwner || !canManage
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-500 hover:text-red-700'
                        )}
                        disabled={isOwner || !canManage}
                        title={isOwner ? 'El Owner no puede ser eliminado' : undefined}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500">
        Mostrando {filteredUsers.length} de {users.length} usuarios
      </div>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        profile={userToDelete}
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
