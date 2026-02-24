import { useState, useMemo, useCallback } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Card, ToastContainer } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import {
  DeleteAuditModal,
  AuditPreviewModal,
  NewAuditModal,
  AuditEmptyState,
  AuditFilterBar,
  AuditsList,
} from '@/features/audits/components';
import type { AuditFilters } from '@/features/audits/components';
import { useAuditsWithDetails, useAuditTypes, useDeleteAudit } from '@/features/audits/hooks';
import { getAuditScopeLabel, calculateTotalScore } from '@/features/audits/config';
import { MYSTERY_SHOPPER_SECTIONS } from '@/features/audits/config/mysteryShopperSchema';
import { fetchAuditWithDetailsById, fetchAuditTypeById, fetchAllProfiles } from '@/services/supabase-data';
import { useGlobalFiltersStore } from '@/stores/filtersStore';
import type {
  AuditExportData,
  AuditExportSection,
  AuditExportField,
} from '@/utils/export';
import type { AuditStatus, AuditWithDetails, AuditType } from '@/types';

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

// ============================================
// MAIN PAGE
// ============================================

export function AuditsPage() {
  // Toast notifications
  const { toasts, closeToast, success: showSuccess, error: showError } = useToast();

  // State
  const [filters, setFilters] = useSessionState<AuditFilters>('tphub-audits-filters', {
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
          <AuditEmptyState onCreateClick={() => setIsNewAuditModalOpen(true)} />
        </Card>
      ) : (
        <Card padding="md" className="border-gray-100">
          {/* Filters */}
          <div className="mb-6">
            <AuditFilterBar
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
