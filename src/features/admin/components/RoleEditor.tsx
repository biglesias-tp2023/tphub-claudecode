import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useUpdateRole } from '../hooks/useUsers';
import type { Profile, UserRole } from '@/types';

interface RoleEditorProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Acceso completo a todas las compañías y gestión de usuarios',
  },
  {
    value: 'consultant',
    label: 'Consultor',
    description: 'Acceso a compañías asignadas con todos los dashboards',
  },
  {
    value: 'viewer',
    label: 'Visualizador',
    description: 'Acceso de solo lectura a compañías asignadas',
  },
];

export function RoleEditor({ profile, isOpen, onClose }: RoleEditorProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('consultant');
  const { mutate: updateRole, isPending } = useUpdateRole();

  // Initialize selected role when profile changes
  useEffect(() => {
    if (profile) {
      setSelectedRole(profile.role);
    }
  }, [profile]);

  const handleSave = () => {
    if (!profile) return;

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar rol">
      <div className="space-y-4">
        {/* User info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-900">
            {profile.fullName || profile.email.split('@')[0]}
          </div>
          <div className="text-sm text-gray-500">{profile.email}</div>
        </div>

        {/* Role options */}
        <div className="space-y-2">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex items-start p-3 rounded-lg border cursor-pointer transition-colors',
                selectedRole === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={selectedRole === option.value}
                onChange={() => setSelectedRole(option.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">
                  {option.label}
                </div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Warning for admin role */}
        {selectedRole === 'admin' && profile.role !== 'admin' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Los administradores tienen acceso completo a todas las compañías y
              pueden gestionar otros usuarios.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
