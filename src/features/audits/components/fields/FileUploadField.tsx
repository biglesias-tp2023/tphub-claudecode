import { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/services/supabase';
import type { AuditField } from '@/types';

interface FileInfo {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface FileUploadFieldProps {
  field: AuditField;
  value: FileInfo[] | null;
  onChange: (value: FileInfo[]) => void;
  disabled?: boolean;
  auditId?: string; // Para organizar archivos por auditoría
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadField({
  field,
  value = [],
  onChange,
  disabled,
  auditId,
}: FileUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const files = value || [];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError(null);
    setIsUploading(true);

    const newFiles: FileInfo[] = [];

    for (const file of Array.from(selectedFiles)) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Tipo de archivo no permitido: ${file.name}`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setError(`Archivo demasiado grande (máx 10MB): ${file.name}`);
        continue;
      }

      try {
        // Generate unique filename
        const timestamp = Date.now();
        const folder = auditId || 'temp';
        const path = `audits/${folder}/${timestamp}-${file.name}`;

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('audit-attachments')
          .upload(path, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          // Si el bucket no existe, guardar localmente como base64
          const reader = new FileReader();
          reader.onload = (e) => {
            newFiles.push({
              name: file.name,
              url: e.target?.result as string,
              type: file.type,
              size: file.size,
            });
            onChange([...files, ...newFiles]);
          };
          reader.readAsDataURL(file);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('audit-attachments')
          .getPublicUrl(data.path);

        newFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        });
      } catch (err) {
        console.error('Error uploading file:', err);
        setError(`Error al subir: ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }

    setIsUploading(false);
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      {/* Upload area */}
      <div
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            <span className="text-sm text-gray-500">Subiendo...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-sm text-gray-600">
              Click para subir o arrastra archivos
            </span>
            <span className="text-xs text-gray-400">
              Imágenes, PDF, Word (máx 10MB)
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group"
            >
              {/* Preview */}
              {isImage(file.type) ? (
                <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(file.size)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Ver archivo"
                >
                  <Eye className="w-4 h-4 text-gray-500" />
                </a>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-1.5 hover:bg-red-100 rounded transition-colors"
                    title="Eliminar"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
