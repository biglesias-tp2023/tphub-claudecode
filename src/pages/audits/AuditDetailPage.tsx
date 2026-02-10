import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuditWithDetails, useUpdateAudit, useCompleteAudit, useDeleteAudit } from '@/features/audits/hooks';
import { DeleteAuditModal } from '@/features/audits/components';
import { AUDIT_STATUS_CONFIG } from '@/features/audits/config';
import { MysteryShopperForm } from '@/features/audits/components/MysteryShopperForm';
import {
  calculateMysteryShopperCompletion,
  validateMysteryShopperForm,
} from '@/features/audits/config/mysteryShopperSchema';
import { cn } from '@/utils/cn';

export function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch audit data
  const {
    data: audit,
    isLoading: auditLoading,
    refetch: refetchAudit,
  } = useAuditWithDetails(id);

  // Mutations
  const updateAudit = useUpdateAudit();
  const completeAudit = useCompleteAudit();
  const deleteAudit = useDeleteAudit();

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form state - use audit ID as part of the key to reset on audit change
  const auditId = audit?.pkIdAudit;

  // Initialize field data from audit
  // Read-only fields prefer CRP-fetched data, falling back to desFieldData values
  const initialFieldData = useMemo(() => {
    if (!audit) return {};
    const saved = (audit.desFieldData || {}) as Record<string, string>;
    return {
      ...saved,
      general_brand: audit.brand?.name || saved.general_brand || '',
      general_platform: audit.portal?.name || saved.general_platform || audit.pfkIdPortal || '',
      general_consultant: audit.desConsultant || saved.general_consultant || '',
      general_kam: audit.desKamEvaluator || saved.general_kam || '',
    };
  }, [audit]);

  // Strip consultant/KAM from saves (reliably available from audit record).
  // Keep general_brand and general_platform as persistent fallbacks
  // in case the CRP Portal lookup fails on future loads.
  const stripReadOnlyFields = useCallback((data: Record<string, unknown>) => {
    const cleaned = { ...data };
    delete cleaned.general_consultant;
    delete cleaned.general_kam;
    return cleaned;
  }, []);

  const [fieldData, setFieldData] = useState<Record<string, unknown>>(initialFieldData);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Reset field data when audit loads/changes - this is intentional
  // to sync state with fetched data. We use auditId as the only dependency
  // to prevent re-running on every initialFieldData reference change.
  useEffect(() => {
    if (audit && Object.keys(initialFieldData).length > 0) {
      setFieldData(initialFieldData);
      setHasChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run when audit ID changes
  }, [auditId]);

  // Handle field data changes
  const handleFieldDataChange = useCallback((newFieldData: Record<string, unknown>) => {
    setFieldData(newFieldData);
    setHasChanges(true);
    setSaveStatus('idle');
  }, []);

  // Auto-save with debounce
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback((data: Record<string, unknown>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      if (!audit || !id) return;
      setSaveStatus('saving');
      try {
        await updateAudit.mutateAsync({
          id: audit.pkIdAudit,
          updates: {
            desFieldData: stripReadOnlyFields(data),
          },
        });
        setSaveStatus('saved');
        setHasChanges(false);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 2000);
  }, [audit, id, updateAudit, stripReadOnlyFields]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Trigger auto-save
  const handleAutoSave = useCallback(() => {
    debouncedSave(fieldData);
  }, [debouncedSave, fieldData]);

  // Manual save
  const handleSave = useCallback(async () => {
    if (!audit || !id) return;

    setSaveStatus('saving');
    try {
      await updateAudit.mutateAsync({
        id: audit.pkIdAudit,
        updates: {
          desFieldData: stripReadOnlyFields(fieldData),
        },
      });
      await refetchAudit();
      setSaveStatus('saved');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [audit, id, fieldData, updateAudit, refetchAudit, stripReadOnlyFields]);

  // Scroll to field
  const scrollToField = useCallback((fieldKey: string) => {
    const fieldElement =
      document.querySelector(`[data-field-key="${fieldKey}"]`) ||
      document.getElementById(`field-${fieldKey}`);
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldElement.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', 'rounded-lg');
      setTimeout(() => {
        fieldElement.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2', 'rounded-lg');
      }, 3000);
    }
  }, []);

  // Complete audit
  const handleComplete = useCallback(async () => {
    if (!audit || !id) return;

    // Validate required fields
    const validation = validateMysteryShopperForm(fieldData);
    if (!validation.valid) {
      // Scroll to first missing field
      if (validation.missingFields.length > 0) {
        scrollToField(validation.missingFields[0]);
      }
      return;
    }

    // Save first if there are changes
    if (hasChanges) {
      await handleSave();
    }

    // Then complete
    try {
      // Get final_score for amt_score_total
      const finalScore = fieldData.final_score as number | undefined;

      await updateAudit.mutateAsync({
        id: audit.pkIdAudit,
        updates: {
          desFieldData: stripReadOnlyFields(fieldData),
          desStatus: 'completed',
          tdCompletedAt: new Date().toISOString(),
          amtScoreTotal: finalScore ?? null,
        },
      });

      navigate('/audits');
    } catch {
      setSaveStatus('error');
    }
  }, [audit, id, fieldData, hasChanges, handleSave, scrollToField, updateAudit, navigate]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!audit) return;
    await deleteAudit.mutateAsync(audit.pkIdAudit);
    navigate('/audits');
  }, [audit, deleteAudit, navigate]);

  // Calculate completion
  const completion = calculateMysteryShopperCompletion(fieldData);
  const canComplete = completion === 100;

  // Loading state
  if (auditLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Error state
  if (!audit) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/audits')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Volver a auditorías
        </Button>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">No se encontró la auditoría solicitada.</p>
          <Button onClick={() => navigate('/audits')} className="mt-4">
            Volver a auditorías
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = AUDIT_STATUS_CONFIG[audit.desStatus];
  const isReadOnly = audit.desStatus === 'completed' || audit.desStatus === 'delivered';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back button and title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/audits')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {audit.desAuditNumber}
                  </h1>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full flex-shrink-0',
                      statusConfig.bgColor,
                      statusConfig.color
                    )}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  Mystery Shopper · {audit.desConsultant || 'Sin consultor'}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Save status indicator */}
              {saveStatus === 'saving' && (
                <span className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden md:inline">Guardando...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="hidden sm:flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden md:inline">Guardado</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="hidden sm:flex items-center gap-1.5 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden md:inline">Error</span>
                </span>
              )}

              {/* Save button */}
              {!isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || saveStatus === 'saving'}
                  className="gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Guardar</span>
                </Button>
              )}

              {/* Complete button */}
              {!isReadOnly && (
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={!canComplete || completeAudit.isPending}
                  className="gap-1.5"
                  title={
                    !canComplete
                      ? 'Completa todos los campos obligatorios para finalizar'
                      : undefined
                  }
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Completar</span>
                </Button>
              )}

              {/* Delete button */}
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 hover:bg-red-50 gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Eliminar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Form content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <MysteryShopperForm
          fieldData={fieldData}
          onChange={handleFieldDataChange}
          disabled={isReadOnly}
          auditId={audit.pkIdAudit}
          autoSave={!isReadOnly}
          onAutoSave={handleAutoSave}
        />
      </main>

      {/* Unsaved changes warning (mobile-friendly) */}
      {hasChanges && !isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 px-4 py-3 z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Cambios sin guardar</span>
            </div>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saveStatus === 'saving'}>
              Guardar ahora
            </Button>
          </div>
        </div>
      )}

      {/* Delete Audit Modal */}
      <DeleteAuditModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        auditNumber={audit.desAuditNumber}
      />
    </div>
  );
}
