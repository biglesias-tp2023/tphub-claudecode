import { useState, useEffect, useMemo } from 'react';
import { Shield, Crown, AlertTriangle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useUpdateRole } from '../hooks/useUsers';
import { useCurrentRole } from '@/stores/authStore';
import type { Profile, UserRole } from '@/types';
import { ROLE_HIERARCHY, ROLE_LABELS, ROLE_DESCRIPTIONS, canManageRole } from '@/types';

interface RoleEditorProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon?: React.ElementType;
  isProtected?: boolean;
}

const ALL_ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'owner',
    label: ROLE_LABELS.owner,
    description: ROLE_DESCRIPTIONS.owner,
    icon: Crown,
    isProtected: true,
  },
  {
    value: 'superadmin',
    label: ROLE_LABELS.superadmin,
    description: ROLE_DESCRIPTIONS.superadmin,
    icon: Shield,
  },
  {
    value: 'admin',
    label: ROLE_LABELS.admin,
    description: ROLE_DESCRIPTIONS.admin,
  },
  {
    value: 'manager',
    label: ROLE_LABELS.manager,
    description: ROLE_DESCRIPTIONS.manager,
  },
  {
    value: 'consultant',
    label: ROLE_LABELS.consultant,
    description: ROLE_DESCRIPTIONS.consultant,
  },
  {
    value: 'viewer',
    label: ROLE_LABELS.viewer,
    description: ROLE_DESCRIPTIONS.viewer,
  },
];

export function RoleEditor({ profile, isOpen, onClose }: RoleEditorProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('consultant');
  const { mutate: updateRole, isPending } = useUpdateRole();
  const currentUserRole = useCurrentRole();

  // Initialize selected role when profile changes
  useEffect(() => {
    if (profile) {
      setSelectedRole(profile.role);
    }
  }, [profile]);

  // Filter available roles based on current user's permissions
  const availableRoles = useMemo(() => {
    if (!currentUserRole || !profile) return [];

    // If target is owner, cannot change their role
    if (profile.role === 'owner') return [];

    // Filter roles based on hierarchy
    return ALL_ROLE_OPTIONS.filter((option) => {
      // Cannot assign owner role
      if (option.value === 'owner') return false;
      // Can only assign roles lower than your own
      return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[option.value];
    });
  }, [currentUserRole, profile]);

  // Check if current user can manage this profile
  const canManage = useMemo(() => {
    if (!currentUserRole || !profile) return false;
    return canManageRole(currentUserRole, profile.role);
  }, [currentUserRole, profile]);

  const handleSave = () => {
    if (!profile || !canManage) return;

    updateRole(
      { profileId: profile.id, role: selectedRole },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  if (!profile) return null;

  // Show warning if trying to edit owner
  const isTargetOwner = profile.role === 'owner';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar rol">
      <div className="space-y-4">
        {/* User info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-900">
              {profile.fullName || profile.email.split('@')[0]}
            </div>
            {profile.role === 'owner' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                <Crown className="w-3 h-3" />
                Owner
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{profile.email}</div>
          <div className="text-xs text-gray-400 mt-1">
            Rol actual: {ROLE_LABELS[profile.role]}
          </div>
        </div>

        {/* Owner protection warning */}
        {isTargetOwner && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                No se puede modificar el rol del Owner
              </p>
              <p className="text-sm text-amber-700 mt-1">
                El Owner es el propietario del sistema y su rol no puede ser cambiado.
              </p>
            </div>
          </div>
        )}

        {/* Cannot manage warning */}
        {!isTargetOwner && !canManage && (
          <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">
                No tienes permisos para cambiar el rol de este usuario.
              </p>
            </div>
          </div>
        )}

        {/* Role options */}
        {canManage && availableRoles.length > 0 && (
          <div className="space-y-2">
            {availableRoles.map((option) => {
              const Icon = option.icon;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-start p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedRole === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selectedRole === option.value}
                    onChange={() => setSelectedRole(option.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 mt-0.5"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {option.label}
                      </span>
                      {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Warning for elevated roles */}
        {canManage && (selectedRole === 'superadmin' || selectedRole === 'admin') && profile.role !== selectedRole && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              {selectedRole === 'superadmin'
                ? 'Los Superadmins tienen acceso total al sistema y pueden gestionar todos los usuarios excepto el Owner.'
                : 'Los Administradores tienen acceso completo a todas las compañías y pueden gestionar otros usuarios.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !canManage || selectedRole === profile.role}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
