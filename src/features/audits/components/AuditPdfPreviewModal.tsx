import { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateAuditPdfBlob, type AuditExportData } from '@/utils/export';

interface AuditPdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  exportData: AuditExportData | null;
  onDownload: () => void;
}

export function AuditPdfPreviewModal({ open, onClose, exportData, onDownload }: AuditPdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && exportData) {
      let isCancelled = false;
      generateAuditPdfBlob(exportData).then((blob) => {
        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      });
      return () => {
        isCancelled = true;
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      };
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
