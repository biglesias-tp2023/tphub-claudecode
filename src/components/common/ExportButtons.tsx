/**
 * ExportButtons - Botones de exportación con preview
 *
 * Componente que permite exportar datos a PDF, Excel o CSV.
 * Soporta dos variantes:
 * - `dropdown`: Un único botón "Exportar" con menú desplegable
 * - `inline`: Tres botones separados (PDF, Excel, CSV)
 *
 * Si se proporciona `getPreviewData`, muestra un modal de preview antes de descargar.
 * Si además se proporciona `generatePdfBlob`, el preview de PDF mostrará el documento real.
 *
 * @module components/common/ExportButtons
 *
 * @example
 * // Uso básico con dropdown
 * <ExportButtons
 *   onExport={(format) => handleExport(format)}
 *   getPreviewData={() => ({ headers: [...], rows: [...] })}
 *   generatePdfBlob={() => generateMyPdfBlob(data)}
 *   previewTitle="Mi Reporte"
 *   previewSubtitle="Enero 2026"
 * />
 *
 * @example
 * // Uso inline sin preview
 * <ExportButtons
 *   onExport={handleExport}
 *   variant="inline"
 *   size="md"
 * />
 */
import { useState } from 'react';
import { FileText, FileSpreadsheet, FileDown, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ExportPreviewModal, type PreviewTableData } from './ExportPreviewModal';

/** Formatos de exportación soportados */
export type ExportFormat = 'pdf' | 'excel' | 'csv';

/**
 * Props del componente ExportButtons
 */
interface ExportButtonsProps {
  /** Callback al confirmar exportación */
  onExport: (format: ExportFormat) => void;
  /** Función que retorna datos para el preview (habilita modal de preview) */
  getPreviewData?: () => PreviewTableData;
  /** Función que genera blob PDF para preview real (requiere getPreviewData) */
  generatePdfBlob?: () => Blob;
  /** Título del modal de preview */
  previewTitle?: string;
  /** Subtítulo del modal de preview */
  previewSubtitle?: string;
  /** Muestra spinner y deshabilita botones */
  loading?: boolean;
  /** Deshabilita todos los botones */
  disabled?: boolean;
  /** Variante visual: dropdown (por defecto) o inline */
  variant?: 'dropdown' | 'inline' | 'ghost';
  /** Tamaño de los botones */
  size?: 'sm' | 'md';
  /** Clases CSS adicionales */
  className?: string;
}

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: typeof FileText; color: string }> = {
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-600 hover:bg-red-50' },
  excel: { label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600 hover:bg-green-50' },
  csv: { label: 'CSV', icon: FileDown, color: 'text-primary-600 hover:bg-primary-50' },
};

export function ExportButtons({
  onExport,
  getPreviewData,
  generatePdfBlob,
  previewTitle = 'Exportación',
  previewSubtitle,
  loading = false,
  disabled = false,
  variant = 'dropdown',
  size = 'sm',
  className,
}: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat | null>(null);
  const [previewData, setPreviewData] = useState<PreviewTableData | null>(null);

  const handleFormatClick = (format: ExportFormat) => {
    setIsOpen(false);

    // If getPreviewData is provided, show preview first
    if (getPreviewData) {
      const data = getPreviewData();
      setPreviewData(data);
      setPreviewFormat(format);
    } else {
      // Direct export without preview
      onExport(format);
    }
  };

  const handleConfirmExport = (format: ExportFormat) => {
    onExport(format);
    setPreviewFormat(null);
    setPreviewData(null);
  };

  const handleClosePreview = () => {
    setPreviewFormat(null);
    setPreviewData(null);
  };

  const buttonSize = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  // Ghost variant - subtle dropdown
  const isGhost = variant === 'ghost';

  if (variant === 'inline') {
    return (
      <>
        <div className={cn('flex items-center gap-1', className)}>
          {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((format) => {
            const config = FORMAT_CONFIG[format];
            return (
              <button
                key={format}
                onClick={() => handleFormatClick(format)}
                disabled={disabled || loading}
                className={cn(
                  'flex items-center gap-1 rounded-lg border border-gray-200 font-medium transition-colors',
                  buttonSize,
                  config.color,
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                title={`Descargar ${config.label}`}
              >
                <config.icon className={iconSize} />
                {size === 'md' && config.label}
              </button>
            );
          })}
        </div>

        {/* Preview Modal */}
        {previewFormat && previewData && (
          <ExportPreviewModal
            isOpen={true}
            onClose={handleClosePreview}
            onConfirm={handleConfirmExport}
            format={previewFormat}
            title={previewTitle}
            subtitle={previewSubtitle}
            generatePdfBlob={generatePdfBlob}
            previewData={previewData}
            loading={loading}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={cn(
            'flex items-center gap-1.5 rounded-lg font-medium transition-colors',
            isGhost
              ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              : 'text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800',
            buttonSize,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <FileDown className={iconSize} />
          <span>Exportar</span>
          <ChevronDown className={cn(iconSize, 'transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 min-w-[140px]">
              {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((format) => {
                const config = FORMAT_CONFIG[format];
                return (
                  <button
                    key={format}
                    onClick={() => handleFormatClick(format)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors',
                      config.color
                    )}
                  >
                    <config.icon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewFormat && previewData && (
        <ExportPreviewModal
          isOpen={true}
          onClose={handleClosePreview}
          onConfirm={handleConfirmExport}
          format={previewFormat}
          title={previewTitle}
          subtitle={previewSubtitle}
          generatePdfBlob={generatePdfBlob}
          previewData={previewData}
          loading={loading}
        />
      )}
    </>
  );
}
