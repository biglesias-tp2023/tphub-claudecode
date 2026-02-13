import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, ClipboardList, Loader2, UserSearch, Rocket, BarChart3, ChevronDown, Check, ArrowLeft, X } from 'lucide-react';
import { Card, ToastContainer } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';
import { AuditCard, AuditCardSkeleton, DeleteAuditModal } from '@/features/audits/components';
import { AuditPreviewModal } from '@/features/audits/components/AuditPreviewModal';
import { useAuditsWithDetails, useAuditTypes, useCreateAudit, useDeleteAudit } from '@/features/audits/hooks';
import { AUDIT_STATUS_CONFIG, AUDIT_TYPE_CARDS, getAuditScopeLabel, calculateTotalScore, generateAuditNumber } from '@/features/audits/config';
import { MYSTERY_SHOPPER_SECTIONS } from '@/features/audits/config/mysteryShopperSchema';
import { fetchAuditWithDetailsById, fetchAuditTypeById, fetchAllProfiles } from '@/services/supabase-data';
import { fetchCrpCompanies, fetchCrpBrands, fetchCrpPortals, fetchCrpCompanyById } from '@/services/crp-portal';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { useProfile } from '@/stores/authStore';
import type { Portal } from '@/services/crp-portal';
import {
  type AuditExportData,
  type AuditExportSection,
  type AuditExportField,
} from '@/utils/export';
import type { AuditStatus, AuditWithDetails, AuditType, Profile, AuditTypeSlug } from '@/types';

// ============================================
// TYPES
// ============================================

interface AuditFilters {
  search: string;
  type: string | null;
  status: AuditStatus | null;
  consultantId: string | null;
}

// ============================================
// HELPERS
// ============================================

/**
 * Build export data from audit with details
 */
function buildAuditExportData(
  audit: AuditWithDetails,
  auditType: AuditType
): AuditExportData {
  const statusLabels: Record<AuditStatus, string> = {
    draft: 'Borrador',
    in_progress: 'En progreso',
    completed: 'Completada',
    delivered: 'Entregada',
  };

  // Use MYSTERY_SHOPPER_SECTIONS for mystery shopper audits (hardcoded schema with all fields)
  const isMysteryShopper = auditType.slug === 'mystery_shopper';
  const schemaSections = isMysteryShopper
    ? MYSTERY_SHOPPER_SECTIONS.map((s) => ({
        key: s.id,
        title: s.title,
        icon: undefined as string | undefined,
        fields: s.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type as string,
          maxScore: f.max,
          scoreLabels: undefined as string[] | undefined,
        })),
      }))
    : auditType.fieldSchema.sections;

  // Read-only fields that are stored on the audit record, not in desFieldData
  const readOnlyOverrides: Record<string, unknown> = {
    general_brand: audit.brand?.name,
    general_platform: audit.portal?.name,
    general_consultant: audit.desConsultant,
    general_kam: audit.desKamEvaluator,
  };

  const sections: AuditExportSection[] = schemaSections.map((section) => {
    const fields = section.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type as AuditExportField['type'],
      value: readOnlyOverrides[field.key] ?? audit.desFieldData?.[field.key] ?? null,
      maxScore: field.maxScore,
      scoreLabels: field.scoreLabels,
    }));

    // Include section suggestions if filled
    const suggestionsKey = `${section.key}_suggestions`;
    const suggestionsValue = audit.desFieldData?.[suggestionsKey];
    if (suggestionsValue && String(suggestionsValue).trim()) {
      fields.push({
        key: suggestionsKey,
        label: 'Comentarios adicionales',
        type: 'textarea' as const,
        value: suggestionsValue,
        maxScore: undefined,
        scoreLabels: undefined,
      });
    }

    return { title: section.title, icon: section.icon, fields };
  });

  const totalScore = calculateTotalScore(auditType, audit.desFieldData);

  return {
    auditNumber: audit.desAuditNumber,
    auditType: auditType.name,
    scope: getAuditScopeLabel(audit),
    status: statusLabels[audit.desStatus],
    completedAt: audit.tdCompletedAt,
    createdAt: audit.tdCreatedAt,
    createdBy: audit.createdByProfile?.fullName || 'Usuario',
    sections,
    totalScore: totalScore.maximum > 0 ? totalScore : undefined,
  };
}

// Platform options are now fetched from the database via fetchCrpPortals

// ============================================
// DROPDOWN COMPONENT (for selectors)
// ============================================

interface SimpleDropdownProps<T> {
  placeholder: string;
  value: T | null;
  options: T[];
  isLoading?: boolean;
  disabled?: boolean;
  onChange: (option: T | null) => void;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
}

function SimpleDropdown<T>({
  placeholder,
  value,
  options,
  isLoading = false,
  disabled = false,
  onChange,
  getOptionLabel,
  getOptionValue,
}: SimpleDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) =>
      getOptionLabel(opt).toLowerCase().includes(searchLower)
    );
  }, [options, search, getOptionLabel]);

  const selectedLabel = value ? getOptionLabel(value) : null;

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
        <span className={cn('flex-1 truncate', !selectedLabel && 'text-gray-400')}>
          {isLoading ? 'Cargando...' : selectedLabel || placeholder}
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
            {options.length > 5 && (
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
            )}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const label = getOptionLabel(option);
                  const optionValue = getOptionValue(option);
                  const isSelected = value ? getOptionValue(value) === optionValue : false;

                  return (
                    <button
                      key={optionValue}
                      type="button"
                      onClick={() => {
                        onChange(option);
                        setIsOpen(false);
                        setSearch('');
                      }}
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

// ============================================
// TYPE CARD ICON COMPONENT
// ============================================

function TypeCardIcon({ slug, className }: { slug: string; className?: string }) {
  switch (slug) {
    case 'mystery_shopper':
      return <UserSearch className={className} />;
    case 'onboarding':
      return <Rocket className={className} />;
    case 'google_ads':
      return <BarChart3 className={className} />;
    default:
      return <ClipboardList className={className} />;
  }
}

// ============================================
// NEW AUDIT MODAL
// ============================================

interface NewAuditModalProps {
  open: boolean;
  onClose: () => void;
  onError: (message: string) => void;
}

function NewAuditModal({ open, onClose, onError }: NewAuditModalProps) {
  const navigate = useNavigate();
  const { data: auditTypes = [], isLoading: auditTypesLoading } = useAuditTypes();
  const createAudit = useCreateAudit();

  // Global filters and current user profile
  const globalCompanyIds = useGlobalFiltersStore((s) => s.companyIds);
  const currentUserProfile = useProfile();

  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedTypeSlug, setSelectedTypeSlug] = useState<AuditTypeSlug | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; keyAccountManager?: string | null } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string; companyId: string } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Portal | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState<Profile | null>(null);
  const [kamName, setKamName] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['crp', 'companies'],
    queryFn: fetchCrpCompanies,
    enabled: open && step === 'form',
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all brands (stores) for all companies
  const { data: allBrands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['crp', 'brands', 'all'],
    queryFn: () => fetchCrpBrands(),
    enabled: open && step === 'form',
    staleTime: 5 * 60 * 1000,
  });

  // Fetch portals from database
  const { data: portals = [], isLoading: portalsLoading } = useQuery({
    queryKey: ['crp', 'portals'],
    queryFn: fetchCrpPortals,
    enabled: open && step === 'form',
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all profiles for consultant selection
  const { data: fetchedProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: fetchAllProfiles,
    enabled: open && step === 'form',
    staleTime: 5 * 60 * 1000,
  });

  // Ensure profiles always include at least the current user as fallback
  const profiles = useMemo(() => {
    if (fetchedProfiles.length > 0) {
      return fetchedProfiles;
    }
    // Fallback: if no profiles loaded, use current user
    if (currentUserProfile) {
      return [currentUserProfile];
    }
    return [];
  }, [fetchedProfiles, currentUserProfile]);

  // Filter companies based on global filter
  const availableCompanies = useMemo(() => {
    if (globalCompanyIds.length === 0) {
      // Empty = all companies
      return companies;
    }
    return companies.filter((c) => globalCompanyIds.includes(c.id));
  }, [companies, globalCompanyIds]);

  // Lock company selector if only one company selected globally
  const isCompanyLocked = globalCompanyIds.length === 1;
  const lockedCompany = useMemo(() => {
    if (!isCompanyLocked) return null;
    return companies.find((c) => c.id === globalCompanyIds[0]) || null;
  }, [isCompanyLocked, companies, globalCompanyIds]);

  // Filter brands by selected company
  const filteredBrands = useMemo(() => {
    if (!selectedCompany) return [];
    return allBrands
      .filter((b) => b.companyId === selectedCompany.id)
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        companyId: brand.companyId,
        displayName: brand.name,
      }));
  }, [allBrands, selectedCompany]);

  // Check if brand should be auto-locked (only 1 brand for company)
  const isBrandAutoLocked = filteredBrands.length === 1;

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('type');
      setSelectedTypeSlug(null);
      setSelectedCompany(null);
      setSelectedBrand(null);
      setSelectedPlatform(null);
      setSelectedConsultant(null);
      setKamName('');
    }
  }, [open]);

  // Auto-set locked company when entering form step
  useEffect(() => {
    if (open && step === 'form' && lockedCompany && !selectedCompany) {
      setSelectedCompany({ id: lockedCompany.id, name: lockedCompany.name, keyAccountManager: lockedCompany.keyAccountManager });
    }
  }, [open, step, lockedCompany, selectedCompany]);

  // Auto-select brand if company has only one brand
  useEffect(() => {
    if (isBrandAutoLocked && filteredBrands.length === 1 && !selectedBrand) {
      setSelectedBrand(filteredBrands[0]);
    }
  }, [isBrandAutoLocked, filteredBrands, selectedBrand]);

  // Fetch KAM from company when company changes
  useEffect(() => {
    async function fetchKamFromCompany() {
      if (selectedCompany?.id) {
        try {
          const companyDetails = await fetchCrpCompanyById(selectedCompany.id);
          if (companyDetails?.keyAccountManager) {
            setKamName(companyDetails.keyAccountManager);
          } else {
            setKamName('');
          }
        } catch {
          setKamName('');
        }
      } else {
        setKamName('');
      }
    }
    fetchKamFromCompany();
  }, [selectedCompany?.id]);

  const handleTypeSelect = (slug: AuditTypeSlug) => {
    // Only Mystery Shopper is active for now
    if (slug !== 'mystery_shopper') return;
    setSelectedTypeSlug(slug);
    setStep('form');
  };

  const handleBack = () => {
    setStep('type');
    setSelectedCompany(null);
    setSelectedBrand(null);
    setSelectedPlatform(null);
    setSelectedConsultant(null);
    setKamName('');
  };

  const handleCreate = async () => {
    if (!selectedTypeSlug || !selectedCompany || !selectedBrand || !selectedPlatform || !selectedConsultant) {
      onError('Por favor completa todos los campos requeridos');
      return;
    }

    // Find the audit type ID by slug
    const auditType = auditTypes.find((t) => t.slug === selectedTypeSlug);
    if (!auditType) {
      onError(`Tipo de auditoría "${selectedTypeSlug}" no encontrado. Recarga la página e intenta de nuevo.`);
      return;
    }

    setIsCreating(true);
    try {
      // Generate audit number: MS-YYYYMMDD-BrandName
      const auditNumber = generateAuditNumber(selectedTypeSlug, selectedBrand.name);

      const newAudit = await createAudit.mutateAsync({
        pfkIdAuditType: auditType.id,
        pfkIdCompany: selectedCompany.id,
        pfkIdStore: selectedBrand.id,
        pfkIdPortal: selectedPlatform.id,
        desConsultant: selectedConsultant.fullName || selectedConsultant.email,
        desKamEvaluator: kamName ?? undefined,
        desAuditNumber: auditNumber,
        desFieldData: {
          general_brand: selectedBrand.name,
          general_platform: selectedPlatform.name,
        },
      });

      onClose();
      // Navigate to the audit detail page using new field name
      navigate(`/audits/${newAudit.pkIdAudit}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear la auditoría';
      onError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = selectedCompany && selectedBrand && selectedPlatform && selectedConsultant;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button - floating top-right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-100 hover:scale-110 transition-all"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {step === 'form' && (
            <Button variant="ghost" size="sm" iconOnly onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'type' ? 'Nueva Auditoría' : 'Mystery Shopper'}
          </h2>
        </div>

        {step === 'type' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona el tipo de auditoría:
            </p>

            {/* Type Cards Grid */}
            <div className="grid grid-cols-3 gap-3">
              {AUDIT_TYPE_CARDS.map((typeCard) => (
                <button
                  key={typeCard.slug}
                  type="button"
                  onClick={() => handleTypeSelect(typeCard.slug as AuditTypeSlug)}
                  disabled={!typeCard.isActive}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-xl border-2 text-center transition-all',
                    typeCard.isActive
                      ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                      typeCard.bgColor
                    )}
                  >
                    <TypeCardIcon slug={typeCard.slug} className={cn('w-6 h-6', typeCard.color)} />
                  </div>
                  <p className="font-medium text-gray-900 text-sm mb-1">{typeCard.name}</p>
                  <p className="text-xs text-gray-500 mb-2 leading-tight">{typeCard.description}</p>
                  {typeCard.isActive ? (
                    <span className="text-xs text-green-600 font-medium">Listo</span>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">Próximamente</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Company Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Compañía <span className="text-red-500">*</span>
              </label>
              {isCompanyLocked && lockedCompany ? (
                <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                  {lockedCompany.name}
                </div>
              ) : (
                <SimpleDropdown
                  placeholder="Seleccionar compañía"
                  value={selectedCompany}
                  options={availableCompanies.map((c) => ({ id: c.id, name: c.name }))}
                  isLoading={companiesLoading}
                  onChange={(company) => {
                    setSelectedCompany(company);
                    // Reset brand when company changes
                    setSelectedBrand(null);
                  }}
                  getOptionLabel={(c) => c.name}
                  getOptionValue={(c) => c.id}
                />
              )}
            </div>

            {/* Brand/Store Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Marca <span className="text-red-500">*</span>
              </label>
              {isBrandAutoLocked && selectedBrand ? (
                <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                  {selectedBrand.name}
                </div>
              ) : (
                <SimpleDropdown
                  placeholder={selectedCompany ? 'Seleccionar marca' : 'Primero selecciona una compañía'}
                  value={selectedBrand}
                  options={filteredBrands}
                  isLoading={brandsLoading}
                  disabled={!selectedCompany}
                  onChange={setSelectedBrand}
                  getOptionLabel={(b) => b.name}
                  getOptionValue={(b) => b.id}
                />
              )}
            </div>

            {/* Platform Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Plataforma <span className="text-red-500">*</span>
              </label>
              <SimpleDropdown
                placeholder="Seleccionar plataforma"
                value={selectedPlatform}
                options={portals}
                isLoading={portalsLoading}
                onChange={setSelectedPlatform}
                getOptionLabel={(p) => p.name}
                getOptionValue={(p) => p.id}
              />
            </div>

            {/* Consultant Selector (single-select) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Consultor que gestiona la cuenta <span className="text-red-500">*</span>
              </label>
              <SimpleDropdown
                placeholder="Seleccionar consultor"
                value={selectedConsultant}
                options={profiles}
                isLoading={profilesLoading}
                onChange={setSelectedConsultant}
                getOptionLabel={(p) => p.fullName || p.email}
                getOptionValue={(p) => p.id}
              />
            </div>

            {/* KAM Evaluator (auto-filled from company) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                KAM evaluador
              </label>
              <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                {kamName || <span className="text-gray-400">Se cargará de la compañía</span>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!isFormValid || isCreating || auditTypesLoading}
                className="gap-2"
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Auditoría
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
  onCreateClick: () => void;
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-6">
        <ClipboardList className="w-8 h-8 text-primary-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        No hay auditorías todavía
      </h2>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
        Crea tu primera auditoría para comenzar a evaluar el rendimiento de tus clientes.
      </p>
      <Button onClick={onCreateClick} className="gap-2">
        <Plus className="w-4 h-4" />
        Nueva auditoría
      </Button>
    </div>
  );
}

// ============================================
// FILTER BAR
// ============================================

interface FilterBarProps {
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  auditTypes: Array<{ id: string; name: string; slug: string }>;
  consultants: Profile[];
}

function FilterBar({ filters, onFiltersChange, auditTypes, consultants }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
      </div>

      {/* Type filter */}
      <div className="relative">
        <select
          value={filters.type || ''}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || null })}
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          <option value="">Tipo: Todos</option>
          {auditTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Status filter */}
      <div className="relative">
        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, status: (e.target.value as AuditStatus) || null })
          }
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          <option value="">Estado: Todos</option>
          {Object.entries(AUDIT_STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Consultant filter */}
      <div className="relative">
        <select
          value={filters.consultantId || ''}
          onChange={(e) =>
            onFiltersChange({ ...filters, consultantId: e.target.value || null })
          }
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        >
          <option value="">Consultor: Todos</option>
          {consultants.map((consultant) => (
            <option key={consultant.id} value={consultant.id}>
              {consultant.fullName || consultant.email}
            </option>
          ))}
        </select>
        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ============================================
// AUDITS LIST
// ============================================

interface AuditsListProps {
  audits: AuditWithDetails[];
  isLoading: boolean;
  onEdit: (auditId: string) => void;
  onPreview?: (auditId: string) => void;
  onDelete?: (auditId: string, auditNumber: string) => void;
}

function AuditsList({
  audits,
  isLoading,
  onEdit,
  onPreview,
  onDelete,
}: AuditsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <AuditCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">No se encontraron auditorías con los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {audits.map((audit) => (
        <AuditCard
          key={audit.pkIdAudit}
          audit={audit}
          onEdit={onEdit}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export function AuditsPage() {
  // Toast notifications
  const { toasts, closeToast, success: showSuccess, error: showError } = useToast();

  // State
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    type: null,
    status: null,
    consultantId: null,
  });
  const [isNewAuditModalOpen, setIsNewAuditModalOpen] = useState(false);

  // Preview modal state
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    data: AuditExportData | null;
    companyId: string | null;
    auditNumber: string;
  }>({ open: false, data: null, companyId: null, auditNumber: '' });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    auditId: string;
    auditNumber: string;
  }>({ open: false, auditId: '', auditNumber: '' });

  // Data
  const { data: audits = [], isLoading: auditsLoading } = useAuditsWithDetails();
  const deleteAudit = useDeleteAudit();
  const { data: auditTypes = [] } = useAuditTypes();

  // Fetch profiles for consultant filter
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: fetchAllProfiles,
    staleTime: 5 * 60 * 1000,
  });

  // Global company filter
  const globalCompanyIds = useGlobalFiltersStore((s) => s.companyIds);

  // Filter audits
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      // Global company filter (empty = all companies)
      if (globalCompanyIds.length > 0) {
        if (!audit.pfkIdCompany || !globalCompanyIds.includes(audit.pfkIdCompany)) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesNumber = audit.desAuditNumber.toLowerCase().includes(searchLower);
        const matchesType = audit.auditType?.name.toLowerCase().includes(searchLower);
        const matchesScope =
          audit.company?.name.toLowerCase().includes(searchLower) ||
          audit.brand?.name.toLowerCase().includes(searchLower);
        const matchesConsultant = audit.desConsultant?.toLowerCase().includes(searchLower);

        if (!matchesNumber && !matchesType && !matchesScope && !matchesConsultant) {
          return false;
        }
      }

      // Type filter
      if (filters.type && audit.pfkIdAuditType !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status && audit.desStatus !== filters.status) {
        return false;
      }

      // Consultant filter (now filtering by consultant name text)
      if (filters.consultantId) {
        const consultantProfile = profiles.find((p) => p.id === filters.consultantId);
        const consultantName = consultantProfile?.fullName || consultantProfile?.email || '';
        if (audit.desConsultant !== consultantName) {
          return false;
        }
      }

      return true;
    });
  }, [audits, filters, profiles, globalCompanyIds]);

  // Navigation
  const navigate = useNavigate();

  // Handlers
  const handleEditAudit = useCallback((auditId: string) => {
    navigate(`/audits/${auditId}`);
  }, [navigate]);

  const handlePreview = useCallback(async (auditId: string) => {
    try {
      const audit = await fetchAuditWithDetailsById(auditId);
      if (!audit) return;
      const auditType = await fetchAuditTypeById(audit.pfkIdAuditType);
      if (!auditType) return;
      const data = buildAuditExportData(audit, auditType);
      setPreviewModal({
        open: true,
        data,
        companyId: audit.pfkIdCompany || audit.brand?.companyId || null,
        auditNumber: audit.desAuditNumber || '',
      });
    } catch (error) {
      console.error('Error loading preview data:', error);
    }
  }, []);

  const closePreviewModal = useCallback(() => {
    setPreviewModal({ open: false, data: null, companyId: null, auditNumber: '' });
  }, []);

  const handleToast = useCallback((message: string, type: 'success' | 'error') => {
    if (type === 'success') showSuccess(message);
    else showError(message);
  }, [showSuccess, showError]);

  const handleDeleteClick = useCallback((auditId: string, auditNumber: string) => {
    setDeleteModal({ open: true, auditId, auditNumber });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    await deleteAudit.mutateAsync(deleteModal.auditId);
    showSuccess('Auditoría eliminada correctamente');
  }, [deleteAudit, deleteModal.auditId, showSuccess]);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ open: false, auditId: '', auditNumber: '' });
  }, []);

  const hasAudits = audits.length > 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Auditorías</h1>
        <Button onClick={() => setIsNewAuditModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva auditoría
        </Button>
      </div>

      {/* Content */}
      {!hasAudits && !auditsLoading ? (
        <Card padding="none" className="border-gray-100">
          <EmptyState onCreateClick={() => setIsNewAuditModalOpen(true)} />
        </Card>
      ) : (
        <Card padding="md" className="border-gray-100">
          {/* Filters */}
          <div className="mb-6">
            <FilterBar
              filters={filters}
              onFiltersChange={setFilters}
              auditTypes={auditTypes}
              consultants={profiles}
            />
          </div>

          {/* Audits List */}
          <AuditsList
            audits={filteredAudits}
            isLoading={auditsLoading}
            onEdit={handleEditAudit}
            onPreview={handlePreview}
            onDelete={handleDeleteClick}
          />
        </Card>
      )}

      {/* New Audit Modal */}
      <NewAuditModal
        open={isNewAuditModalOpen}
        onClose={() => setIsNewAuditModalOpen(false)}
        onError={showError}
      />

      {/* Delete Audit Modal */}
      <DeleteAuditModal
        open={deleteModal.open}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        auditNumber={deleteModal.auditNumber}
      />

      {/* Unified Preview Modal */}
      <AuditPreviewModal
        open={previewModal.open}
        onClose={closePreviewModal}
        exportData={previewModal.data}
        companyId={previewModal.companyId}
        auditNumber={previewModal.auditNumber}
        onToast={handleToast}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
