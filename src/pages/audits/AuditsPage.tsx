import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, Filter, ClipboardList, Loader2, X, Download, Mail, FileText, FileSpreadsheet } from 'lucide-react';
import { Card, Spinner } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { DashboardFilters } from '@/features/dashboard';
import { cn } from '@/utils/cn';
import { AuditCard, AuditCardSkeleton, AuditEditorModal } from '@/features/audits/components';
import { useAuditsWithDetails, useAuditTypes, useCreateAudit } from '@/features/audits/hooks';
import { AUDIT_STATUS_CONFIG, getAuditScopeLabel, calculateTotalScore } from '@/features/audits/config';
import { fetchAuditWithDetailsById, fetchAuditTypeById } from '@/services/supabase-data';
import {
  exportAuditToPDF,
  exportAuditToExcel,
  generateAuditPdfBlob,
  type AuditExportData,
  type AuditExportSection,
} from '@/utils/export';
import type { AuditStatus, AuditWithDetails, AuditType } from '@/types';

// ============================================
// TYPES
// ============================================

interface AuditFilters {
  search: string;
  type: string | null;
  status: AuditStatus | null;
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
            <Button onClick={onDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
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
            <Button onClick={onDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Descargar Excel
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
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
            <Button onClick={onSend} className="gap-2">
              <Mail className="w-4 h-4" />
              Enviar Email
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
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
// NEW AUDIT MODAL
// ============================================

interface NewAuditModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (auditId: string) => void;
}

function NewAuditModal({ open, onClose, onCreated }: NewAuditModalProps) {
  const { data: auditTypes = [], isLoading: typesLoading } = useAuditTypes();
  const createAudit = useCreateAudit();

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedTypeId) return;

    setIsCreating(true);
    try {
      const newAudit = await createAudit.mutateAsync({
        auditTypeId: selectedTypeId,
      });
      onCreated(newAudit.id);
      onClose();
    } catch (error) {
      console.error('Error creating audit:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva Auditoría</h2>

        {typesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona el tipo de auditoría que deseas crear:
            </p>

            <div className="grid gap-3">
              {auditTypes.filter((t) => t.isActive).map((auditType) => (
                <button
                  key={auditType.id}
                  type="button"
                  onClick={() => setSelectedTypeId(auditType.id)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border text-left transition-all',
                    selectedTypeId === auditType.id
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      selectedTypeId === auditType.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{auditType.name}</p>
                    {auditType.description && (
                      <p className="text-sm text-gray-500">{auditType.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedTypeId || isCreating}
                className="gap-2"
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear auditoría
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
}

function FilterBar({ filters, onFiltersChange, auditTypes }: FilterBarProps) {
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
          <option value="">Todos los tipos</option>
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
          <option value="">Todos los estados</option>
          {Object.entries(AUDIT_STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
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
          audit.restaurant?.name.toLowerCase().includes(searchLower);

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

      return true;
    });
  }, [audits, filters]);

  // Handlers
  const handleAuditCreated = useCallback((auditId: string) => {
    setEditingAuditId(auditId);
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
    } catch (error) {
      console.error('Error loading export data:', error);
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

      {/* Filters */}
      <DashboardFilters />

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
