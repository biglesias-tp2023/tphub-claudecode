import { X, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AuditExportData } from '@/utils/export';

interface AuditEmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  exportData: AuditExportData | null;
  onSend: () => void;
}

export function AuditEmailPreviewModal({ open, onClose, exportData, onSend }: AuditEmailPreviewModalProps) {
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
            <p className="text-gray-700 mb-4">Estimado cliente,</p>
            <p className="text-gray-700 mb-4">
              Adjuntamos el informe de la auditoría <strong>{exportData.auditType}</strong> realizada para{' '}
              <strong>{exportData.scope}</strong>.
            </p>
            {exportData.totalScore && (
              <p className="text-gray-700 mb-4">
                La puntuación obtenida es de{' '}
                <strong>
                  {exportData.totalScore.obtained}/{exportData.totalScore.maximum} ({exportData.totalScore.percentage}%)
                </strong>
                .
              </p>
            )}
            <p className="text-gray-700 mb-4">
              Quedamos a su disposición para cualquier consulta.
            </p>
            <p className="text-gray-700">
              Saludos,
              <br />
              <strong>Equipo ThinkPaladar</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
