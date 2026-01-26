/**
 * ExportPreviewModal - Modal de preview real del documento antes de exportar
 *
 * Muestra una vista previa del documento que se va a descargar:
 * - Para PDF: Renderiza el PDF real en un iframe usando blob URL
 * - Para Excel/CSV: Muestra una tabla con los primeros registros
 *
 * Incluye controles de zoom para el preview de PDF y cleanup automático
 * de blob URLs al cerrar el modal.
 *
 * @module components/common/ExportPreviewModal
 *
 * @example
 * <ExportPreviewModal
 *   isOpen={showPreview}
 *   onClose={() => setShowPreview(false)}
 *   onConfirm={(format) => handleExport(format)}
 *   format="pdf"
 *   title="Reputación"
 *   subtitle="Enero 2026 vs. Diciembre 2025"
 *   generatePdfBlob={() => generateReputationPdfBlob(data)}
 *   previewData={{ headers: [...], rows: [...] }}
 * />
 */
import { useState, useEffect, useCallback } from 'react';
import { X, FileText, FileSpreadsheet, FileDown, Download, Eye, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Formatos de exportación soportados */
export type ExportFormat = 'pdf' | 'excel' | 'csv';

/**
 * Props del componente ExportPreviewModal
 */
interface ExportPreviewModalProps {
  /** Controla si el modal está abierto */
  isOpen: boolean;
  /** Callback al cerrar el modal */
  onClose: () => void;
  /** Callback al confirmar la descarga */
  onConfirm: (format: ExportFormat) => void;
  /** Formato seleccionado para exportar */
  format: ExportFormat;
  /** Título del documento (ej: "Reputación") */
  title: string;
  /** Subtítulo opcional (ej: rango de fechas) */
  subtitle?: string;
  /** Función que genera el blob del PDF para preview real */
  generatePdfBlob?: () => Promise<Blob> | Blob;
  /** Datos de tabla para preview de Excel/CSV */
  previewData: PreviewTableData;
  /** Estado de carga durante la exportación */
  loading?: boolean;
}

/**
 * Datos para la vista previa en formato tabla
 */
export interface PreviewTableData {
  /** Cabeceras de la tabla */
  headers: string[];
  /** Filas de datos */
  rows: (string | number)[][];
  /** Total de filas en el documento (para mostrar indicador de "más filas") */
  totalRows?: number;
}

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: typeof FileText; color: string; bgColor: string }> = {
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-600', bgColor: 'bg-red-50' },
  excel: { label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600', bgColor: 'bg-green-50' },
  csv: { label: 'CSV', icon: FileDown, color: 'text-primary-600', bgColor: 'bg-primary-50' },
};

export function ExportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  format,
  title,
  subtitle,
  generatePdfBlob,
  previewData,
  loading = false,
}: ExportPreviewModalProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Generate PDF blob when modal opens for PDF format
  useEffect(() => {
    if (!isOpen) {
      // Cleanup blob URL when modal closes
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      setZoom(100);
      return;
    }

    if (format === 'pdf' && generatePdfBlob && !pdfBlobUrl) {
      setIsGenerating(true);
      Promise.resolve(generatePdfBlob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        })
        .catch((err) => {
          console.error('Error generating PDF preview:', err);
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, [isOpen, format, generatePdfBlob, pdfBlobUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 25, 50));
  }, []);

  if (!isOpen) return null;

  const config = FORMAT_CONFIG[format];
  const Icon = config.icon;
  const showPdfPreview = format === 'pdf' && generatePdfBlob;
  const displayRows = previewData.rows.slice(0, 10);
  const hasMoreRows = previewData.totalRows ? previewData.totalRows > 10 : previewData.rows.length > 10;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden',
            showPdfPreview ? 'w-full max-w-6xl h-[90vh]' : 'w-full max-w-4xl max-h-[85vh]'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bgColor)}>
                <Icon className={cn('w-5 h-5', config.color)} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Exportar a {config.label}
                </h2>
                <p className="text-sm text-gray-500">{title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom controls for PDF */}
              {showPdfPreview && pdfBlobUrl && (
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                    title="Alejar"
                  >
                    <ZoomOut className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="text-xs text-gray-500 w-10 text-center">{zoom}%</span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                    title="Acercar"
                  >
                    <ZoomIn className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Preview Info */}
          <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              <span>Vista previa del documento</span>
              {subtitle && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">{subtitle}</span>
                </>
              )}
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto bg-gray-100">
            {showPdfPreview ? (
              // PDF Preview with iframe
              <div className="h-full flex items-center justify-center p-4">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm">Generando vista previa...</span>
                  </div>
                ) : pdfBlobUrl ? (
                  <div
                    className="bg-white shadow-lg rounded-lg overflow-hidden"
                    style={{
                      width: `${zoom}%`,
                      maxWidth: '100%',
                      height: '100%',
                      transition: 'width 0.2s ease'
                    }}
                  >
                    <iframe
                      src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full"
                      title="Vista previa del PDF"
                    />
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    No se pudo generar la vista previa
                  </div>
                )}
              </div>
            ) : (
              // Table Preview for Excel/CSV
              <div className="p-6">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {previewData.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={cn(
                            'border-b border-gray-100 last:border-b-0',
                            rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          )}
                        >
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="py-2.5 px-4 text-gray-700 truncate max-w-[200px]"
                              title={String(cell)}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* More rows indicator */}
                {hasMoreRows && (
                  <div className="mt-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-full border border-gray-200">
                      + {(previewData.totalRows || previewData.rows.length) - 10} filas más en el documento
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white shrink-0">
            <div className="text-sm text-gray-500">
              {previewData.totalRows || previewData.rows.length} registros totales
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirm(format)}
                disabled={loading || isGenerating}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-sm',
                  format === 'pdf' && 'bg-red-600 hover:bg-red-700',
                  format === 'excel' && 'bg-green-600 hover:bg-green-700',
                  format === 'csv' && 'bg-blue-600 hover:bg-blue-700',
                  (loading || isGenerating) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Download className="w-4 h-4" />
                Descargar {config.label}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
