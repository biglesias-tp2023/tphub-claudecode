import { useState, useEffect } from 'react';
import { Modal, Button, Spinner } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import { useAssignCompanies } from '../hooks/useUsers';
import type { Profile } from '@/types';

interface CompanyAssignerProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyAssigner({ profile, isOpen, onClose }: CompanyAssignerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();
  const { mutate: assignCompanies, isPending } = useAssignCompanies();

  // Initialize selected IDs when profile changes
  useEffect(() => {
    if (profile) {
      setSelectedIds(profile.assignedCompanyIds);
    }
  }, [profile]);

  const handleToggle = (companyId: string) => {
    setSelectedIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(companies.map((c) => c.id));
  };

  const handleSelectNone = () => {
    setSelectedIds([]);
  };

  const handleSave = () => {
    if (!profile) return;

    assignCompanies(
      { profileId: profile.id, companyIds: selectedIds },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  if (!profile) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar compañías">
      <div className="space-y-4">
        {/* User info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-900">
            {profile.fullName || profile.email.split('@')[0]}
          </div>
          <div className="text-sm text-gray-500">{profile.email}</div>
        </div>

        {/* Selection actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Seleccionar todas
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleSelectNone}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Ninguna
          </button>
        </div>

        {/* Company list */}
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {loadingCompanies ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : companies.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No hay compañías disponibles
            </div>
          ) : (
            companies.map((company) => (
              <label
                key={company.id}
                className={cn(
                  'flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50',
                  selectedIds.includes(company.id) && 'bg-blue-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(company.id)}
                  onChange={() => handleToggle(company.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex items-center gap-2">
                  {company.logoUrl && (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="h-6 w-6 rounded"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {company.name}
                  </span>
                </div>
              </label>
            ))
          )}
        </div>

        {/* Selection count */}
        <div className="text-sm text-gray-500">
          {selectedIds.length} de {companies.length} compañías seleccionadas
        </div>

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
