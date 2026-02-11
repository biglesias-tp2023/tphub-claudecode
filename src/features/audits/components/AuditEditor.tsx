import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Save, CheckCircle, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { AuditForm } from './AuditForm';
import {
  useAuditWithDetails,
  useAuditType,
  useUpdateAudit,
  useCompleteAudit,
} from '../hooks';
import { getAuditStatusConfig, validateAuditFields, getAuditScopeLabel, generateAuditNumber } from '../config';
import { useCompanies } from '@/features/clients/hooks/useCompanies';

interface AuditEditorProps {
  auditId: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function AuditEditor({ auditId, onClose, onSaved }: AuditEditorProps) {
  const { data: audit, isLoading: auditLoading, refetch: refetchAudit } = useAuditWithDetails(auditId);
  const { data: auditType, isLoading: typeLoading } = useAuditType(audit?.pfkIdAuditType);
  const { data: companies = [] } = useCompanies();
  const updateAudit = useUpdateAudit();
  const completeAudit = useCompleteAudit();

  const [fieldData, setFieldData] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentAuditNumber, setCurrentAuditNumber] = useState<string | null>(null);

  // Track current audit number
  useEffect(() => {
    if (audit?.desAuditNumber) {
      setCurrentAuditNumber(audit.desAuditNumber);
    }
  }, [audit?.desAuditNumber]);

  // Initialize field data from audit
  useEffect(() => {
    if (audit?.desFieldData) {
      setFieldData(audit.desFieldData);
    }
  }, [audit]);

  // Handle field data changes
  const handleFieldDataChange = useCallback((newFieldData: Record<string, unknown>) => {
    setFieldData(newFieldData);
    setHasChanges(true);
    setSaveStatus('idle');
  }, []);

  // Get company name from field data (for nomenclature)
  const getClientNameFromFieldData = useCallback(() => {
    // Look for company_select field value (marca_evaluar)
    const companyId = fieldData.marca_evaluar as string | undefined;
    if (companyId) {
      const company = companies.find(c => c.id === companyId);
      if (company) return company.name;
    }
    return null;
  }, [fieldData, companies]);

  // Check if audit number needs to be updated
  const shouldUpdateAuditNumber = useCallback(() => {
    if (!audit || !auditType) return false;
    // If current number starts with AUD- (old format), we should update
    if (audit.desAuditNumber.startsWith('AUD-')) return true;
    return false;
  }, [audit, auditType]);

  // Save audit
  const handleSave = useCallback(async () => {
    if (!audit || !auditType) return;

    setSaveStatus('saving');
    try {
      const updates: Record<string, unknown> = { desFieldData: fieldData };

      // Check if we need to update the audit number (new nomenclature)
      if (shouldUpdateAuditNumber()) {
        const clientName = getClientNameFromFieldData();
        if (clientName) {
          const newAuditNumber = generateAuditNumber(auditType.slug, clientName);
          updates.desAuditNumber = newAuditNumber;
          setCurrentAuditNumber(newAuditNumber);
        }
      }

      await updateAudit.mutateAsync({
        id: audit.pkIdAudit,
        updates,
      });

      // Refetch to get updated data
      await refetchAudit();

      setSaveStatus('saved');
      setHasChanges(false);
      onSaved?.();

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [audit, auditType, fieldData, updateAudit, onSaved, shouldUpdateAuditNumber, getClientNameFromFieldData, refetchAudit]);

  // Scroll to field element
  const scrollToField = useCallback((fieldKey: string) => {
    // Find the field element by data-field-key or id
    const fieldElement = document.querySelector(`[data-field-key="${fieldKey}"]`) ||
                        document.getElementById(`field-${fieldKey}`);
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a highlight effect
      fieldElement.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', 'rounded-lg');
      setTimeout(() => {
        fieldElement.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2', 'rounded-lg');
      }, 2000);
    }
  }, []);

  // Complete audit
  const handleComplete = useCallback(async () => {
    if (!audit || !auditType) return;

    // Validate required fields
    const validation = validateAuditFields(auditType, fieldData);
    if (!validation.valid) {
      // Scroll to first missing field
      if (validation.firstMissingFieldKey) {
        scrollToField(validation.firstMissingFieldKey);
      }
      return;
    }

    // Save first if there are changes
    if (hasChanges) {
      await handleSave();
    }

    // Then complete
    try {
      await completeAudit.mutateAsync(audit.pkIdAudit);
      onSaved?.();
      onClose();
    } catch {
      setSaveStatus('error');
    }
  }, [audit, auditType, fieldData, hasChanges, handleSave, completeAudit, onSaved, onClose, scrollToField]);

  // Auto-save debounce
  const handleAutoSave = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleSave();
      }, 3000);
    };
  }, [handleSave]);

  const isLoading = auditLoading || typeLoading;
  const statusConfig = audit ? getAuditStatusConfig(audit.desStatus) : null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!audit || !auditType) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <p className="text-gray-600">No se encontró la auditoría</p>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentAuditNumber || audit.desAuditNumber}
                </h1>
                {statusConfig && (
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full',
                      statusConfig.bgColor,
                      statusConfig.color
                    )}
                  >
                    {statusConfig.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {auditType.name} · {getAuditScopeLabel(audit)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Guardado
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                Error al guardar
              </span>
            )}

            {/* Save button */}
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!hasChanges || saveStatus === 'saving'}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar
            </Button>

            {/* Complete button (only for non-completed audits) */}
            {audit.desStatus !== 'completed' && audit.desStatus !== 'delivered' && (
              <Button
                onClick={handleComplete}
                disabled={completeAudit.isPending}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Completar
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6 px-6">
          <AuditForm
            auditType={auditType}
            fieldData={fieldData}
            onChange={handleFieldDataChange}
            disabled={audit.desStatus === 'completed' || audit.desStatus === 'delivered'}
            autoSave={audit.desStatus !== 'completed' && audit.desStatus !== 'delivered'}
            onAutoSave={handleAutoSave}
          />
        </div>
      </main>

      {/* Unsaved changes warning */}
      {hasChanges && (
        <div className="bg-amber-50 border-t border-amber-200 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            Tienes cambios sin guardar
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component for modal use
interface AuditEditorModalProps {
  auditId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AuditEditorModal({ auditId, open, onClose, onSaved }: AuditEditorModalProps) {
  if (!open || !auditId) return null;

  return <AuditEditor auditId={auditId} onClose={onClose} onSaved={onSaved} />;
}
