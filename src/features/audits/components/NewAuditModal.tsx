import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ClipboardList, UserSearch, Rocket, BarChart3, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { SimpleDropdown } from './SimpleDropdown';
import { useAuditTypes, useCreateAudit } from '@/features/audits/hooks';
import { AUDIT_TYPE_CARDS, generateAuditNumber } from '@/features/audits/config';
import { fetchCrpCompanies, fetchCrpBrands, fetchCrpPortals } from '@/services/crp-portal';
import { fetchAllProfiles } from '@/services/supabase-data';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { useProfile } from '@/stores/authStore';
import type { Portal } from '@/services/crp-portal';
import type { AuditTypeSlug, Profile } from '@/types';

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

export interface NewAuditModalProps {
  open: boolean;
  onClose: () => void;
  onError: (message: string) => void;
}

export function NewAuditModal({ open, onClose, onError }: NewAuditModalProps) {
  const navigate = useNavigate();
  const profile = useProfile();
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

  const isOnboarding = selectedTypeSlug === 'onboarding';

  // KAM evaluador = logged-in user who creates the audit (mystery_shopper only)
  useEffect(() => {
    if (isOnboarding) return;
    if (profile?.fullName) {
      setKamName(profile.fullName);
    } else if (profile?.email) {
      setKamName(profile.email.split('@')[0]);
    } else {
      setKamName('');
    }
  }, [profile?.fullName, profile?.email, isOnboarding]);

  // Onboarding: auto-select consultant matching company's KAM
  useEffect(() => {
    if (!isOnboarding || !selectedCompany?.keyAccountManager || profiles.length === 0) return;
    const kamNameLower = selectedCompany.keyAccountManager.toLowerCase();
    const match = profiles.find(
      (p) => p.fullName?.toLowerCase() === kamNameLower || p.email?.toLowerCase().startsWith(kamNameLower.split(' ')[0])
    );
    if (match) {
      setSelectedConsultant(match);
    }
  }, [isOnboarding, selectedCompany?.keyAccountManager, profiles]);

  const handleTypeSelect = (slug: AuditTypeSlug) => {
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
    if (!selectedTypeSlug || !selectedCompany || !selectedBrand || !selectedConsultant) {
      onError('Por favor completa todos los campos requeridos');
      return;
    }
    if (!isOnboarding && !selectedPlatform) {
      onError('Por favor selecciona una plataforma');
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
      const auditNumber = generateAuditNumber(selectedTypeSlug, selectedBrand.name);

      const newAudit = await createAudit.mutateAsync({
        pfkIdAuditType: auditType.id,
        pfkIdCompany: selectedCompany.id,
        pfkIdStore: selectedBrand.id,
        pfkIdPortal: isOnboarding ? undefined : selectedPlatform!.id,
        desConsultant: selectedConsultant.fullName || selectedConsultant.email,
        desKamEvaluator: isOnboarding ? undefined : (kamName ?? undefined),
        desAuditNumber: auditNumber,
        desFieldData: isOnboarding
          ? {}
          : {
              general_brand: selectedBrand.name,
              general_platform: selectedPlatform!.name,
            },
      });

      onClose();
      navigate(`/audits/${newAudit.pkIdAudit}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear la auditoría';
      onError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = isOnboarding
    ? !!(selectedCompany && selectedBrand && selectedConsultant)
    : !!(selectedCompany && selectedBrand && selectedPlatform && selectedConsultant);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Close button - floating top-right, above overflow container */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-100 hover:scale-110 transition-all"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Scrollable content */}
        <div className="p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {step === 'form' && (
            <Button variant="ghost" size="sm" iconOnly onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'type' ? 'Nueva Auditoría' : (selectedTypeSlug === 'onboarding' ? 'Onboarding' : 'Mystery Shopper')}
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
                  options={availableCompanies.map((c) => ({ id: c.id, name: c.name, keyAccountManager: c.keyAccountManager }))}
                  isLoading={companiesLoading}
                  onChange={(company) => {
                    setSelectedCompany(company);
                    // Reset brand and consultant when company changes
                    setSelectedBrand(null);
                    if (isOnboarding) setSelectedConsultant(null);
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

            {/* Platform Selector (not for onboarding) */}
            {!isOnboarding && (
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
            )}

            {/* Consultant Selector (single-select) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Consultor que gestiona la cuenta <span className="text-red-500">*</span>
              </label>
              {isOnboarding && selectedConsultant ? (
                <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                  {selectedConsultant.fullName || selectedConsultant.email}
                </div>
              ) : (
              <SimpleDropdown
                placeholder="Seleccionar consultor"
                value={selectedConsultant}
                options={profiles}
                isLoading={profilesLoading}
                onChange={setSelectedConsultant}
                getOptionLabel={(p) => p.fullName || p.email}
                getOptionValue={(p) => p.id}
              />
              )}
            </div>

            {/* KAM Evaluator (auto-filled, not for onboarding) */}
            {!isOnboarding && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                KAM evaluador
              </label>
              <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                {kamName || <span className="text-gray-400">Se cargará de la compañía</span>}
              </div>
            </div>
            )}

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
        </div>{/* end scrollable content */}
      </div>
    </div>
  );
}
