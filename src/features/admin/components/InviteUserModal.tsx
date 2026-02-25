/**
 * InviteUserModal
 *
 * Modal for inviting external users (consultants) to TPHub.
 * Allows selecting role and pre-assigning companies with search and filters.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
import {
  X,
  Mail,
  UserPlus,
  Building2,
  AlertCircle,
  Check,
  Search,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useCreateInvitation } from '../hooks/useInvitations';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import { useCurrentRole } from '@/stores/authStore';
import type { UserRole, Company } from '@/types';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, getInvitableRoles } from '@/types';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon?: React.ElementType;
}

// Status tag styles
const statusConfig: Record<string, { text: string; bg: string }> = {
  'Cliente Activo': { text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'Onboarding': { text: 'text-amber-700', bg: 'bg-amber-50' },
  'Stand By': { text: 'text-gray-600', bg: 'bg-gray-100' },
  'PiP': { text: 'text-rose-700', bg: 'bg-rose-50' },
};

const statusLabels: Record<string, string> = {
  'Cliente Activo': 'Activo',
  'Onboarding': 'Onboarding',
  'Stand By': 'Stand By',
  'PiP': 'PiP',
};

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('consultant');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Company filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [kamFilters, setKamFilters] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();
  const createInvitation = useCreateInvitation();
  const currentUserRole = useCurrentRole();

  // Get available roles based on current user's permissions
  const availableRoles = useMemo((): RoleOption[] => {
    const invitableRoleValues = currentUserRole ? getInvitableRoles(currentUserRole) : [];

    return invitableRoleValues.map((roleValue) => ({
      value: roleValue,
      label: ROLE_LABELS[roleValue],
      description: ROLE_DESCRIPTIONS[roleValue],
      icon: roleValue === 'superadmin' ? Shield : undefined,
    }));
  }, [currentUserRole]);

  // Ensure selected role is valid when available roles change
  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.some((r) => r.value === role)) {
      // Default to consultant if available, otherwise first available role
      const defaultRole = availableRoles.find((r) => r.value === 'consultant')?.value || availableRoles[0].value;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole(defaultRole);
    }
  }, [availableRoles, role]);

  // Sort companies alphabetically
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
  }, [companies]);

  // Extract unique status values
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    companies.forEach((c) => {
      if (c.status) statuses.add(c.status);
    });
    return Array.from(statuses).sort();
  }, [companies]);

  // Extract unique KAM values
  const uniqueKams = useMemo(() => {
    const kams = new Set<string>();
    companies.forEach((c) => {
      if (c.keyAccountManager) kams.add(c.keyAccountManager);
    });
    return Array.from(kams).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [companies]);

  // Fuse.js for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(sortedCompanies, {
        keys: ['name', 'keyAccountManager'],
        threshold: 0.3,
      }),
    [sortedCompanies]
  );

  // Filter companies
  const filteredCompanies = useMemo(() => {
    let result = sortedCompanies;

    // Search filter
    if (searchQuery.trim()) {
      result = fuse.search(searchQuery).map((r) => r.item);
      result = [...result].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
    }

    // Status filter
    if (statusFilters.length > 0) {
      result = result.filter((c) => c.status && statusFilters.includes(c.status));
    }

    // KAM filter
    if (kamFilters.length > 0) {
      result = result.filter((c) => c.keyAccountManager && kamFilters.includes(c.keyAccountManager));
    }

    return result;
  }, [searchQuery, sortedCompanies, fuse, statusFilters, kamFilters]);

  // Reset form when modal closes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setRole('consultant');
      setSelectedCompanyIds([]);
      setNote('');
      setShowSuccess(false);
      setSearchQuery('');
      setStatusFilters([]);
      setKamFilters([]);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createInvitation.mutateAsync({
        email,
        role,
        assignedCompanyIds: selectedCompanyIds,
        invitationNote: note || undefined,
      });
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      // Error handled by mutation
    }
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredCompanies.map((c) => c.id);
    setSelectedCompanyIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  const handleClearSelection = () => {
    setSelectedCompanyIds([]);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Roles that need company assignment (not superadmin/admin who see everything)
  const needsCompanyAssignment = !['owner', 'superadmin', 'admin'].includes(role);
  const canSubmit = isValidEmail(email) && !createInvitation.isPending && (!needsCompanyAssignment || selectedCompanyIds.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <UserPlus className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Invitar usuario
              </h2>
              <p className="text-sm text-gray-500">
                Pre-registra un usuario con rol y accesos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success state */}
        {showSuccess ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Invitación creada
            </h3>
            <p className="text-gray-500">
              <strong>{email}</strong> ya puede acceder a TPHub con su cuenta de Google.
              Avísale que puede entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <InviteEmailStep email={email} onEmailChange={setEmail} />

              <InviteRoleStep
                role={role}
                onRoleChange={setRole}
                availableRoles={availableRoles}
              />

              {!['superadmin', 'admin'].includes(role) && (
                <InviteCompaniesStep
                  searchInputRef={searchInputRef}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filteredCompanies={filteredCompanies}
                  totalCompanies={companies.length}
                  selectedCompanyIds={selectedCompanyIds}
                  onToggleCompany={toggleCompany}
                  onSelectAll={handleSelectAll}
                  onClearSelection={handleClearSelection}
                  loadingCompanies={loadingCompanies}
                  uniqueStatuses={uniqueStatuses}
                  statusFilters={statusFilters}
                  onStatusFiltersChange={setStatusFilters}
                  uniqueKams={uniqueKams}
                  kamFilters={kamFilters}
                  onKamFiltersChange={setKamFilters}
                />
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nota (opcional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Mensaje para el nuevo usuario..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              {/* Error */}
              {createInvitation.error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    {createInvitation.error instanceof Error
                      ? createInvitation.error.message
                      : 'Error al crear la invitación'}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createInvitation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                isLoading={createInvitation.isPending}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Crear invitación
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================
// STEP SUB-COMPONENTS
// ============================================

function InviteEmailStep({ email, onEmailChange }: { email: string; onEmailChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Email *
      </label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="usuario@ejemplo.com"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        El usuario podrá acceder con su cuenta de Google
      </p>
    </div>
  );
}

function InviteRoleStep({
  role,
  onRoleChange,
  availableRoles,
}: {
  role: UserRole;
  onRoleChange: (r: UserRole) => void;
  availableRoles: RoleOption[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
      {availableRoles.length === 0 ? (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">No tienes permisos para invitar usuarios.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {availableRoles.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                  role === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => onRoleChange(option.value)}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    {Icon && <Icon className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InviteCompaniesStep({
  searchInputRef,
  searchQuery,
  onSearchChange,
  filteredCompanies,
  totalCompanies,
  selectedCompanyIds,
  onToggleCompany,
  onSelectAll,
  onClearSelection,
  loadingCompanies,
  uniqueStatuses,
  statusFilters,
  onStatusFiltersChange,
  uniqueKams,
  kamFilters,
  onKamFiltersChange,
}: {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filteredCompanies: Company[];
  totalCompanies: number;
  selectedCompanyIds: string[];
  onToggleCompany: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  loadingCompanies: boolean;
  uniqueStatuses: string[];
  statusFilters: string[];
  onStatusFiltersChange: (v: string[]) => void;
  uniqueKams: string[];
  kamFilters: string[];
  onKamFiltersChange: (v: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        <Building2 className="inline-block w-4 h-4 mr-1" />
        Compañías asignadas
      </label>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar compañía..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">
          {filteredCompanies.length} de {totalCompanies}
        </span>
        <div className="flex-1" />
        <FilterDropdown
          label="Status"
          options={uniqueStatuses}
          selected={statusFilters}
          onChange={onStatusFiltersChange}
          getOptionLabel={(s) => statusLabels[s] || s}
        />
        <FilterDropdown
          label="KAM"
          options={uniqueKams}
          selected={kamFilters}
          onChange={onKamFiltersChange}
          getOptionLabel={(k) => k.split(' ')[0]}
          getOptionTitle={(k) => k}
        />
      </div>

      {loadingCompanies ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          {searchQuery
            ? `No se encontraron compañías para "${searchQuery}"`
            : 'No hay compañías disponibles'}
        </p>
      ) : (
        <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto">
          {filteredCompanies.map((company) => (
            <CompanyItem
              key={company.id}
              company={company}
              isSelected={selectedCompanyIds.includes(company.id)}
              onToggle={() => onToggleCompany(company.id)}
            />
          ))}
        </div>
      )}

      {/* Selection actions */}
      <div className="flex items-center justify-between mt-2">
        <p className={cn('text-xs', selectedCompanyIds.length === 0 ? 'text-red-500 font-medium' : 'text-gray-500')}>
          {selectedCompanyIds.length === 0
            ? 'Debes asignar al menos una compañía'
            : `${selectedCompanyIds.length} compañía(s) seleccionada(s)`}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSelectAll} className="text-xs text-primary-600 hover:text-primary-700">
            Seleccionar todos
          </button>
          {selectedCompanyIds.length > 0 && (
            <button type="button" onClick={onClearSelection} className="text-xs text-gray-500 hover:text-gray-700">
              Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Company item component
function CompanyItem({
  company,
  isSelected,
  onToggle,
}: {
  company: Company;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const config = company.status ? statusConfig[company.status] : null;

  return (
    <label
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors',
        isSelected ? 'bg-primary-50/50' : 'hover:bg-gray-50'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold',
          isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
        )}
      >
        {company.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium truncate', isSelected && 'text-primary-700')}>
            {company.name}
          </span>
          {company.status && config && (
            <span
              className={cn(
                'text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded',
                config.text,
                config.bg
              )}
            >
              {statusLabels[company.status] || company.status}
            </span>
          )}
        </div>
        {company.keyAccountManager && (
          <p className="text-[10px] text-gray-400 italic truncate">
            {company.keyAccountManager}
          </p>
        )}
      </div>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="rounded text-primary-600 focus:ring-primary-500 shrink-0"
      />
    </label>
  );
}

// Filter dropdown component
function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  getOptionLabel,
  getOptionTitle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  getOptionLabel?: (option: string) => string;
  getOptionTitle?: (option: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  };

  const displayLabel =
    selected.length === 0
      ? label
      : selected.length === 1
      ? (getOptionLabel?.(selected[0]) || selected[0])
      : `${label} (${selected.length})`;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors',
          selected.length > 0
            ? 'bg-primary-50 text-primary-700 border border-primary-200'
            : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
        )}
      >
        <span className="max-w-[60px] truncate">{displayLabel}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 min-w-[120px] py-1 max-h-40 overflow-y-auto">
          {options.map((option) => {
            const isActive = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                title={getOptionTitle?.(option)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-50"
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded border flex items-center justify-center shrink-0',
                    isActive
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-gray-300 bg-white'
                  )}
                >
                  {isActive && <Check className="w-2 h-2" />}
                </div>
                <span className="truncate text-gray-700">
                  {getOptionLabel?.(option) || option}
                </span>
              </button>
            );
          })}
          {selected.length > 0 && (
            <>
              <div className="h-px bg-gray-100 my-1" />
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 text-left"
              >
                Limpiar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
