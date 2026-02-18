/**
 * Entity Scope Selector
 *
 * Cascading selector for Company → Brand → Address
 * Used to associate entities with CRP Portal companies/brands/addresses.
 *
 * Shared component used by:
 * - features/audits (AuditEditor)
 * - features/strategic (StrategicObjectiveEditor)
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Store, MapPin, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  fetchCrpCompanies,
  fetchCrpBrands,
  fetchCrpRestaurants,
} from '@/services/crp-portal';
import { useAuthStore } from '@/stores/authStore';
import { isUnrestrictedRole } from '@/stores/filtersStore';

export interface EntityScopeSelectorProps {
  companyId: string | null;
  brandId: string | null;
  addressId: string | null;
  onCompanyChange: (companyId: string | null) => void;
  onBrandChange: (brandId: string | null) => void;
  onAddressChange: (addressId: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  /** Label for the summary section (default: "Alcance de la selección") */
  summaryLabel?: string;
}

export function EntityScopeSelector({
  companyId,
  brandId,
  addressId,
  onCompanyChange,
  onBrandChange,
  onAddressChange,
  required = false,
  disabled = false,
  summaryLabel = 'Alcance de la selección',
}: EntityScopeSelectorProps) {
  // Fetch companies
  const { data: allCompanies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['crp', 'companies'],
    queryFn: fetchCrpCompanies,
    staleTime: 5 * 60 * 1000,
  });

  // Filter by assigned companies for restricted users
  const profile = useAuthStore((s) => s.profile);
  const companies = useMemo(() => {
    if (isUnrestrictedRole(profile?.role)) return allCompanies;
    const assigned = profile?.assignedCompanyIds;
    if (!assigned || assigned.length === 0) return [];
    const allowedSet = new Set(assigned);
    return allCompanies.filter((c) => allowedSet.has(c.id));
  }, [allCompanies, profile?.role, profile?.assignedCompanyIds]);

  // Fetch brands when company is selected
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['crp', 'brands', companyId],
    queryFn: () => fetchCrpBrands(companyId ? [companyId] : undefined),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch addresses when company is selected
  const { data: allAddresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['crp', 'restaurants', companyId],
    queryFn: () => fetchCrpRestaurants({ companyIds: companyId ? [companyId] : undefined }),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  // Show all addresses for the company
  // Note: Many addresses in CRP Portal don't have pfk_id_store set correctly,
  // so we don't filter by brand - we show all company addresses
  const addresses = allAddresses;

  // Reset dependent selections when parent changes
  useEffect(() => {
    if (!companyId) {
      onBrandChange(null);
      onAddressChange(null);
    }
  }, [companyId, onBrandChange, onAddressChange]);

  useEffect(() => {
    if (!brandId) {
      onAddressChange(null);
    }
  }, [brandId, onAddressChange]);

  // Get selected entities for display
  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedAddress = addresses.find((a) => a.id === addressId);

  return (
    <div className="space-y-4">
      {/* Company Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Compañía {required && <span className="text-red-500">*</span>}
        </label>
        <Dropdown
          icon={<Building2 className="w-4 h-4" />}
          placeholder="Seleccionar compañía"
          value={selectedCompany?.name || null}
          options={companies}
          isLoading={companiesLoading}
          disabled={disabled}
          onChange={(company) => {
            onCompanyChange(company?.id || null);
          }}
          getOptionLabel={(c) => c.name}
          getOptionValue={(c) => c.id}
        />
      </div>

      {/* Brand Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Marca
        </label>
        <Dropdown
          icon={<Store className="w-4 h-4" />}
          placeholder={companyId ? 'Seleccionar marca' : 'Primero selecciona una compañía'}
          value={selectedBrand?.name || null}
          options={brands}
          isLoading={brandsLoading}
          disabled={disabled || !companyId}
          onChange={(brand) => {
            onBrandChange(brand?.id || null);
          }}
          getOptionLabel={(b) => b.name}
          getOptionValue={(b) => b.id}
        />
      </div>

      {/* Address Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Dirección
        </label>
        <Dropdown
          icon={<MapPin className="w-4 h-4" />}
          placeholder={companyId ? 'Seleccionar dirección' : 'Primero selecciona una compañía'}
          value={addressId === 'all' ? 'Todas las direcciones' : selectedAddress?.name || null}
          options={addresses}
          isLoading={addressesLoading}
          disabled={disabled || !companyId}
          onChange={(address) => {
            onAddressChange(address?.id || null);
          }}
          getOptionLabel={(a) => a.name}
          getOptionValue={(a) => a.id}
          showAllOption={addresses.length > 1}
          allOptionLabel="Todas las direcciones"
          onSelectAll={() => onAddressChange('all')}
          isAllSelected={addressId === 'all'}
        />
      </div>

      {/* Summary */}
      {(selectedCompany || selectedBrand || selectedAddress || addressId === 'all') && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">{summaryLabel}</p>
          <div className="space-y-1 text-sm">
            {selectedCompany && (
              <div className="flex items-center gap-2 text-gray-700">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>{selectedCompany.name}</span>
              </div>
            )}
            {selectedBrand && (
              <div className="flex items-center gap-2 text-gray-700 pl-4">
                <Store className="w-3.5 h-3.5 text-gray-400" />
                <span>{selectedBrand.name}</span>
              </div>
            )}
            {addressId === 'all' ? (
              <div className="flex items-center gap-2 text-gray-700 pl-4">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium">Todas las direcciones ({addresses.length})</span>
              </div>
            ) : selectedAddress && (
              <div className="flex items-center gap-2 text-gray-700 pl-4">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{selectedAddress.name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// DROPDOWN COMPONENT (Internal)
// ============================================

interface DropdownProps<T> {
  icon: React.ReactNode;
  placeholder: string;
  value: string | null;
  options: T[];
  isLoading: boolean;
  disabled: boolean;
  onChange: (option: T | null) => void;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
  /** Show "Select All" option at the top */
  showAllOption?: boolean;
  /** Label for the "All" option */
  allOptionLabel?: string;
  /** Callback when "All" is selected */
  onSelectAll?: () => void;
  /** Whether "All" is currently selected */
  isAllSelected?: boolean;
}

function Dropdown<T>({
  icon,
  placeholder,
  value,
  options,
  isLoading,
  disabled,
  onChange,
  getOptionLabel,
  getOptionValue,
  showAllOption = false,
  allOptionLabel = 'Todos',
  onSelectAll,
  isAllSelected = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) =>
      getOptionLabel(opt).toLowerCase().includes(searchLower)
    );
  }, [options, search, getOptionLabel]);

  const handleSelect = (option: T | null) => {
    onChange(option);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors',
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-gray-400',
          isOpen && 'border-primary-500 ring-1 ring-primary-500'
        )}
      >
        <span className="text-gray-400">{icon}</span>
        <span className={cn('flex-1 truncate', !value && 'text-gray-400')}>
          {isLoading ? 'Cargando...' : value || placeholder}
        </span>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary-500"
                autoFocus
              />
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {/* "All" option */}
              {showAllOption && onSelectAll && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectAll();
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-gray-50 border-b border-gray-100',
                    isAllSelected && 'bg-primary-50 text-primary-700'
                  )}
                >
                  <span className="flex-1">{allOptionLabel}</span>
                  {isAllSelected && <Check className="w-4 h-4 text-primary-500" />}
                </button>
              )}

              {/* Clear option */}
              {value && !isAllSelected && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                >
                  Limpiar selección
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const label = getOptionLabel(option);
                  const optionValue = getOptionValue(option);
                  const isSelected = value === label;

                  return (
                    <button
                      key={optionValue}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                        isSelected && 'bg-primary-50 text-primary-700'
                      )}
                    >
                      <span className="flex-1 truncate">{label}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Backward compatibility alias
export { EntityScopeSelector as AuditScopeSelector };
export type { EntityScopeSelectorProps as AuditScopeSelectorProps };
