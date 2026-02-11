import { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DeleteAuditModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  auditNumber: string;
}

export function DeleteAuditModal({
  open,
  onClose,
  onConfirm,
  auditNumber,
}: DeleteAuditModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setConfirmationInput('');
      setIsDeleting(false);
      setError(null);
    }
  }, [open]);

  const handleContinue = useCallback(() => {
    setStep(2);
  }, []);

  const handleDelete = useCallback(async () => {
    if (confirmationInput !== auditNumber) {
      setError('El número de auditoría no coincide');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la auditoría');
      setIsDeleting(false);
    }
  }, [confirmationInput, auditNumber, onConfirm, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 1 ? 'Eliminar auditoría' : 'Confirmar eliminación'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" iconOnly onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                Estás a punto de eliminar la auditoría <strong>{auditNumber}</strong>.
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Advertencia:</strong> Esta acción eliminará permanentemente los datos de rendimiento de la marca y puede afectar el trabajo de otros compañeros.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700">
                Para confirmar, escribe el número de auditoría:
              </p>
              <div className="p-3 bg-gray-100 rounded-lg text-center">
                <code className="text-sm font-mono font-semibold text-gray-900">
                  {auditNumber}
                </code>
              </div>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => {
                  setConfirmationInput(e.target.value);
                  setError(null);
                }}
                placeholder="Escribe el número de auditoría"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          {step === 1 ? (
            <Button
              onClick={handleContinue}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={handleDelete}
              disabled={isDeleting || confirmationInput !== auditNumber}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Eliminar definitivamente
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
