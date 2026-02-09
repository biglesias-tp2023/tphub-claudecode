import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, ClipboardList, Loader2, X, Download, Mail, FileText, FileSpreadsheet, UserSearch, Rocket, BarChart3, ChevronDown, Check, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { AuditCard, AuditCardSkeleton, AuditEditorModal } from '@/features/audits/components';
import { useAuditsWithDetails, useAuditTypes, useCreateAudit } from '@/features/audits/hooks';
import { AUDIT_STATUS_CONFIG, AUDIT_TYPE_CARDS, getAuditScopeLabel, calculateTotalScore, generateAuditNumber } from '@/features/audits/config';
import { fetchAuditWithDetailsById, fetchAuditTypeById, fetchAllProfiles } from '@/services/supabase-data';
import { fetchCrpCompanies, fetchCrpBrands } from '@/services/crp-portal';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import { useProfile } from '@/stores/authStore';
import {
  exportAuditToPDF,
  exportAuditToExcel,
  generateAuditPdfBlob,
  type AuditExportData,
  type AuditExportSection,
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
  };

  const sections: AuditExportSection[] = auditType.fieldSchema.sections.map((section) => ({
    title: section.title,
    icon: section.icon,
    fields: section.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      value: audit.fieldData?.[field.key] ?? null,
      maxScore: field.maxScore,
      scoreLabels: field.scoreLabels,
    })),
  }));

  const totalScore = calculateTotalScore(auditType, audit.fieldData);

  return {
    auditNumber: audit.auditNumber,
    auditType: auditType.name,
    scope: getAuditScopeLabel(audit),
    status: statusLabels[audit.status],
    completedAt: audit.completedAt,
    createdAt: audit.createdAt,
    createdBy: audit.createdByProfile?.fullName || 'Usuario',
    sections,
    totalScore: totalScore.maximum > 0 ? totalScore : undefined,
  };
}

// ============================================
// PDF PREVIEW MODAL
// ============================================

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  exportData: AuditExportData | null;
  onDownload: () => void;
}

function PdfPreviewModal({ open, onClose, exportData, onDownload }: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && exportData) {
      const blob = generateAuditPdfBlob(exportData);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [open, exportData]);

  if (!open || !exportData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">Preview PDF</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onDownload} leftIcon={<Download className="w-4 h-4" />}>
              Descargar PDF
            </Button>
            <Button variant="ghost" size="sm" iconOnly onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 p-4 bg-gray-100 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg border border-gray-200"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXCEL PREVIEW MODAL
// ============================================

interface ExcelPreviewModalProps {
  open: boolean;
  onClose: () => void;
  exportData: AuditExportData | null;
  onDownload: () => void;
}

function ExcelPreviewModal({ open, onClose, exportData, onDownload }: ExcelPreviewModalProps) {
  if (!open || !exportData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Preview Excel</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onDownload} leftIcon={<Download className="w-4 h-4" />}>
              Descargar Excel
            </Button>
            <Button variant="ghost" size="sm" iconOnly onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Excel Preview (Table format) */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Metadata */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Información General</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Referencia:</span> {exportData.auditNumber}</div>
              <div><span className="text-gray-500">Tipo:</span> {exportData.auditType}</div>
              <div><span className="text-gray-500">Alcance:</span> {exportData.scope}</div>
              <div><span className="text-gray-500">Estado:</span> {exportData.status}</div>
              <div><span className="text-gray-500">Creado por:</span> {exportData.createdBy}</div>
              {exportData.totalScore && (
                <div><span className="text-gray-500">Puntuación:</span> {exportData.totalScore.obtained}/{exportData.totalScore.maximum} ({exportData.totalScore.percentage}%)</div>
              )}
            </div>
          </div>

          {/* Sections */}
          {exportData.sections.map((section, sIdx) => (
            <div key={sIdx} className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">{section.title}</h3>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Campo</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700 border-b">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {section.fields.map((field, fIdx) => (
                    <tr key={fIdx} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-600">{field.label}</td>
                      <td className="px-4 py-2 text-gray-900">
                        {field.value === null || field.value === undefined || field.value === ''
                          ? '-'
                          : field.type === 'checkbox'
                          ? (field.value ? 'Sí' : 'No')
                          : field.type === 'score'
                          ? `${field.value}/${field.maxScore || 5}`
                          : field.type === 'multiselect' && Array.isArray(field.value)
                          ? (field.value as string[]).join(', ')
                          : String(field.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EMAIL PREVIEW MODAL
// ============================================

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  exportData: AuditExportData | null;
  onSend: () => void;
}

function EmailPreviewModal({ open, onClose, exportData, onSend }: EmailPreviewModalProps) {
  if (!open || !exportData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Preview Email</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSend} leftIcon={<Mail className="w-4 h-4" />}>
              Enviar Email
            </Button>
            <Button variant="ghost" size="sm" iconOnly onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Email Preview */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Email Header */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500 w-16">Para:</span>
              <span className="text-gray-400 italic">cliente@empresa.com</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500 w-16">Asunto:</span>
              <span className="text-gray-900 font-medium">
                {exportData.auditType} - {exportData.scope} ({exportData.auditNumber})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-16">Adjunto:</span>
              <span className="text-primary-600">📎 {exportData.auditNumber}.pdf</span>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                TP
              </div>
              <div>
                <p className="font-semibold text-gray-900">ThinkPaladar</p>
                <p className="text-sm text-gray-500">Consultoría de Delivery</p>
              </div>
            </div>

            {/* Content */}
            <p className="text-gray-700 mb-4">
              Estimado cliente,
            </p>
            <p className="text-gray-700 mb-4">
              Adjuntamos el informe de <strong>{exportData.auditType}</strong> correspondiente a <strong>{exportData.scope}</strong>.
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Resumen</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Referencia: {exportData.auditNumber}</li>
                <li>• Fecha: {new Date(exportData.createdAt).toLocaleDateString('es-ES')}</li>
                <li>• Estado: {exportData.status}</li>
                {exportData.totalScore && (
                  <li>• Puntuación: {exportData.totalScore.obtained}/{exportData.totalScore.maximum} ({exportData.totalScore.percentage}%)</li>
                )}
              </ul>
            </div>

            <p className="text-gray-700 mb-4">
              Puede consultar el informe completo en el documento adjunto.
            </p>

            <p className="text-gray-700">
              Un saludo,<br />
              <strong>{exportData.createdBy}</strong><br />
              <span className="text-gray-500 text-sm">ThinkPaladar</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PLATFORM OPTIONS
// ============================================

const PLATFORM_OPTIONS = [
  { id: 'glovo', name: 'Glovo' },
  { id: 'ubereats', name: 'Uber Eats' },
  { id: 'justeat', name: 'Just Eat' },
];

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
// MULTI-SELECT DROPDOWN COMPONENT
// ============================================

interface MultiSelectDropdownProps<T> {
  placeholder: string;
  values: T[];
  options: T[];
  isLoading?: boolean;
  disabled?: boolean;
  onChange: (options: T[]) => void;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
}

function MultiSelectDropdown<T>({
  placeholder,
  values,
  options,
  isLoading = false,
  disabled = false,
  onChange,
  getOptionLabel,
  getOptionValue,
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) =>
      getOptionLabel(opt).toLowerCase().includes(searchLower)
    );
  }, [options, search, getOptionLabel]);

  const selectedValues = useMemo(() => {
    return new Set(values.map(getOptionValue));
  }, [values, getOptionValue]);

  const toggleOption = (option: T) => {
    const optionValue = getOptionValue(option);
    if (selectedValues.has(optionValue)) {
      onChange(values.filter((v) => getOptionValue(v) !== optionValue));
    } else {
      onChange([...values, option]);
    }
  };

  const displayLabel = useMemo(() => {
    if (values.length === 0) return null;
    if (values.length === 1) return getOptionLabel(values[0]);
    return `${values.length} seleccionados`;
  }, [values, getOptionLabel]);

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
        <span className={cn('flex-1 truncate', !displayLabel && 'text-gray-400')}>
          {isLoading ? 'Cargando...' : displayLabel || placeholder}
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
                  const isSelected = selectedValues.has(optionValue);

                  return (
                    <button
                      key={optionValue}
                      type="button"
                      onClick={() => toggleOption(option)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                        isSelected && 'bg-primary-50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center',
                          isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-gray-300'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="flex-1 truncate">{label}</span>
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
  onCreated: (auditId: string) => void;
}

function NewAuditModal({ open, onClose, onCreated }: NewAuditModalProps) {
  const navigate = useNavigate();
  const { data: auditTypes = [] } = useAuditTypes();
  const createAudit = useCreateAudit();

  // Global filters and current user profile
  const globalCompanyIds = useGlobalFiltersStore((s) => s.companyIds);
  const currentUserProfile = useProfile();

  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedTypeSlug, setSelectedTypeSlug] = useState<AuditTypeSlug | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string; companyId: string } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<{ id: string; name: string } | null>(null);
  const [selectedConsultants, setSelectedConsultants] = useState<Profile[]>([]);
  const [selectedKam, setSelectedKam] = useState<Profile | null>(null);
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

  // Fetch all profiles for consultant/KAM selection
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

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('type');
      setSelectedTypeSlug(null);
      setSelectedCompany(null);
      setSelectedBrand(null);
      setSelectedPlatform(null);
      setSelectedConsultants([]);
      setSelectedKam(null);
    }
  }, [open]);

  // Auto-fill KAM with logged-in user when entering form step
  useEffect(() => {
    if (open && step === 'form' && currentUserProfile && !selectedKam) {
      setSelectedKam(currentUserProfile);
    }
  }, [open, step, currentUserProfile, selectedKam]);

  // Auto-set locked company when entering form step
  useEffect(() => {
    if (open && step === 'form' && lockedCompany && !selectedCompany) {
      setSelectedCompany({ id: lockedCompany.id, name: lockedCompany.name });
    }
  }, [open, step, lockedCompany, selectedCompany]);

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
    setSelectedConsultants([]);
    setSelectedKam(null);
  };

  const handleCreate = async () => {
    if (!selectedTypeSlug || !selectedCompany || !selectedBrand || !selectedPlatform || selectedConsultants.length === 0 || !selectedKam) return;

    // Find the audit type ID by slug
    const auditType = auditTypes.find((t) => t.slug === selectedTypeSlug);
    if (!auditType) return;

    setIsCreating(true);
    try {
      // Generate audit number: MS-YYYYMMDD-BrandName
      const auditNumber = generateAuditNumber(selectedTypeSlug, selectedBrand.name);

      const newAudit = await createAudit.mutateAsync({
        auditTypeId: auditType.id,
        companyId: selectedCompany.id,
        brandId: selectedBrand.id,
        storeId: selectedBrand.id,
        portalId: selectedPlatform.id,
        consultantUserId: selectedConsultants[0].id, // Primary consultant
        kamUserId: selectedKam.id,
        auditNumber,
      });

      onClose();
      // Navigate to the audit detail page
      navigate(`/audits/${newAudit.id}`);
    } catch {
      // Error handled by React Query
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = selectedCompany && selectedBrand && selectedPlatform && selectedConsultants.length > 0 && selectedKam;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
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
              <SimpleDropdown
                placeholder={selectedCompany ? 'Seleccionar marca' : 'Primero selecciona una compañía'}
                value={selectedBrand}
                options={filteredBrands}
                isLoading={brandsLoading}
                disabled={!selectedCompany}
                onChange={setSelectedBrand}
                getOptionLabel={(b) => b.displayName}
                getOptionValue={(b) => b.id}
              />
            </div>

            {/* Platform Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Plataforma <span className="text-red-500">*</span>
              </label>
              <SimpleDropdown
                placeholder="Seleccionar plataforma"
                value={selectedPlatform}
                options={PLATFORM_OPTIONS}
                onChange={setSelectedPlatform}
                getOptionLabel={(p) => p.name}
                getOptionValue={(p) => p.id}
              />
            </div>

            {/* Consultant Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Consultor que gestiona la cuenta <span className="text-red-500">*</span>
              </label>
              <MultiSelectDropdown
                placeholder="Seleccionar consultor"
                values={selectedConsultants}
                options={profiles}
                isLoading={profilesLoading}
                onChange={setSelectedConsultants}
                getOptionLabel={(p) => p.fullName || p.email}
                getOptionValue={(p) => p.id}
              />
            </div>

            {/* KAM Evaluator Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                KAM evaluador <span className="text-red-500">*</span>
              </label>
              <SimpleDropdown
                placeholder="Seleccionar KAM evaluador"
                value={selectedKam}
                options={profiles}
                isLoading={profilesLoading}
                onChange={setSelectedKam}
                getOptionLabel={(p) => p.fullName || p.email}
                getOptionValue={(p) => p.id}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!isFormValid || isCreating}
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
  onExportPdf?: (auditId: string) => void;
  onExportExcel?: (auditId: string) => void;
  onSendEmail?: (auditId: string) => void;
}

function AuditsList({
  audits,
  isLoading,
  onEdit,
  onExportPdf,
  onExportExcel,
  onSendEmail,
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
          key={audit.id}
          audit={audit}
          onEdit={onEdit}
          onExportPdf={onExportPdf}
          onExportExcel={onExportExcel}
          onSendEmail={onSendEmail}
        />
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export function AuditsPage() {
  // State
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    type: null,
    status: null,
    consultantId: null,
  });
  const [isNewAuditModalOpen, setIsNewAuditModalOpen] = useState(false);
  const [editingAuditId, setEditingAuditId] = useState<string | null>(null);

  // Preview modal state
  const [previewModal, setPreviewModal] = useState<{
    type: 'pdf' | 'excel' | 'email' | null;
    data: AuditExportData | null;
  }>({ type: null, data: null });

  // Data
  const { data: audits = [], isLoading: auditsLoading } = useAuditsWithDetails();
  const { data: auditTypes = [] } = useAuditTypes();

  // Fetch profiles for consultant filter
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', 'all'],
    queryFn: fetchAllProfiles,
    staleTime: 5 * 60 * 1000,
  });

  // Filter audits
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesNumber = audit.auditNumber.toLowerCase().includes(searchLower);
        const matchesType = audit.auditType?.name.toLowerCase().includes(searchLower);
        const matchesScope =
          audit.company?.name.toLowerCase().includes(searchLower) ||
          audit.brand?.name.toLowerCase().includes(searchLower) ||
          audit.address?.name.toLowerCase().includes(searchLower);

        if (!matchesNumber && !matchesType && !matchesScope) {
          return false;
        }
      }

      // Type filter
      if (filters.type && audit.auditTypeId !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status && audit.status !== filters.status) {
        return false;
      }

      // Consultant filter
      if (filters.consultantId && audit.consultantUserId !== filters.consultantId) {
        return false;
      }

      return true;
    });
  }, [audits, filters]);

  // Handlers
  const handleAuditCreated = useCallback((_auditId: string) => {
    // The modal now handles navigation internally
    // This callback is kept for potential future use
  }, []);

  const handleEditAudit = useCallback((auditId: string) => {
    setEditingAuditId(auditId);
  }, []);

  // Helper to load export data
  const loadExportData = useCallback(async (auditId: string): Promise<AuditExportData | null> => {
    try {
      const audit = await fetchAuditWithDetailsById(auditId);
      if (!audit) return null;
      const auditType = await fetchAuditTypeById(audit.auditTypeId);
      if (!auditType) return null;
      return buildAuditExportData(audit, auditType);
    } catch {
      return null;
    }
  }, []);

  const handleExportPdf = useCallback(async (auditId: string) => {
    const data = await loadExportData(auditId);
    if (data) {
      setPreviewModal({ type: 'pdf', data });
    }
  }, [loadExportData]);

  const handleExportExcel = useCallback(async (auditId: string) => {
    const data = await loadExportData(auditId);
    if (data) {
      setPreviewModal({ type: 'excel', data });
    }
  }, [loadExportData]);

  const handleSendEmail = useCallback(async (auditId: string) => {
    const data = await loadExportData(auditId);
    if (data) {
      setPreviewModal({ type: 'email', data });
    }
  }, [loadExportData]);

  const closePreviewModal = useCallback(() => {
    setPreviewModal({ type: null, data: null });
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (previewModal.data) {
      exportAuditToPDF(previewModal.data);
    }
  }, [previewModal.data]);

  const handleDownloadExcel = useCallback(() => {
    if (previewModal.data) {
      exportAuditToExcel(previewModal.data);
    }
  }, [previewModal.data]);

  const handleSendEmailAction = useCallback(() => {
    // TODO: Implement actual email sending
    alert('Funcionalidad de envío por email próximamente disponible');
    closePreviewModal();
  }, [closePreviewModal]);

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
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            onSendEmail={handleSendEmail}
          />
        </Card>
      )}

      {/* New Audit Modal */}
      <NewAuditModal
        open={isNewAuditModalOpen}
        onClose={() => setIsNewAuditModalOpen(false)}
        onCreated={handleAuditCreated}
      />

      {/* Audit Editor Modal */}
      <AuditEditorModal
        auditId={editingAuditId}
        open={!!editingAuditId}
        onClose={() => setEditingAuditId(null)}
        onSaved={() => {
          // Refresh will happen automatically via React Query
        }}
      />

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={previewModal.type === 'pdf'}
        onClose={closePreviewModal}
        exportData={previewModal.data}
        onDownload={handleDownloadPdf}
      />

      {/* Excel Preview Modal */}
      <ExcelPreviewModal
        open={previewModal.type === 'excel'}
        onClose={closePreviewModal}
        exportData={previewModal.data}
        onDownload={handleDownloadExcel}
      />

      {/* Email Preview Modal */}
      <EmailPreviewModal
        open={previewModal.type === 'email'}
        onClose={closePreviewModal}
        exportData={previewModal.data}
        onSend={handleSendEmailAction}
      />
    </div>
  );
}
