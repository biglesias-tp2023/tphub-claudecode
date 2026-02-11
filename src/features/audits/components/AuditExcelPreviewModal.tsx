import { X, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AuditExportData } from '@/utils/export';

interface AuditExcelPreviewModalProps {
  open: boolean;
  onClose: () => void;
  exportData: AuditExportData | null;
  onDownload: () => void;
}

export function AuditExcelPreviewModal({ open, onClose, exportData, onDownload }: AuditExcelPreviewModalProps) {
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
