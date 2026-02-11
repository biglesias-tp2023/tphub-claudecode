import { useState, useRef } from 'react';
import { Upload, X, ChevronLeft, ChevronRight, Loader2, ZoomIn } from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/services/supabase';
import type { MysteryShopperField } from '../../config/mysteryShopperSchema';

interface ImageInfo {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface ImageUploadFieldProps {
  field: MysteryShopperField;
  value: ImageInfo[] | null;
  onChange: (value: ImageInfo[]) => void;
  disabled?: boolean;
  auditId?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUploadField({
  field,
  value = [],
  onChange,
  disabled,
  auditId,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const images = value || [];
  const maxFiles = field.maxFiles ?? 10;
  const multiple = field.multiple ?? true;

  const uploadFile = async (file: File): Promise<ImageInfo | null> => {
    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Tipo de archivo no permitido: ${file.name}`);
      return null;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(`Archivo demasiado grande (máx 10MB): ${file.name}`);
      return null;
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const folder = auditId || 'temp';
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `audits/${folder}/${field.key}/${timestamp}-${cleanName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('audit-images')
        .upload(path, file);

      if (uploadError) {
        // Fallback to base64 if bucket doesn't exist
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              name: file.name,
              url: e.target?.result as string,
              type: file.type,
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audit-images')
        .getPublicUrl(data.path);

      return {
        name: file.name,
        url: urlData.publicUrl,
        type: file.type,
        size: file.size,
      };
    } catch {
      setError(`Error al subir: ${file.name}`);
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled || isUploading) return;

    setError(null);
    setIsUploading(true);

    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - images.length;
    const filesToUpload = fileArray.slice(0, remainingSlots);

    if (fileArray.length > remainingSlots) {
      setError(`Solo puedes subir ${remainingSlots} imagen(es) más`);
    }

    const uploadPromises = filesToUpload.map(uploadFile);
    const results = await Promise.all(uploadPromises);
    const newImages = results.filter((img): img is ImageInfo => img !== null);

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }

    setIsUploading(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
    if (lightboxIndex === index) {
      setLightboxIndex(null);
    } else if (lightboxIndex !== null && lightboxIndex > index) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;
    if (direction === 'prev') {
      setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : images.length - 1);
    } else {
      setLightboxIndex(lightboxIndex < images.length - 1 ? lightboxIndex + 1 : 0);
    }
  };

  const canUploadMore = images.length < maxFiles;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          {field.required && <span className="text-red-500 text-xs">*</span>}
        </div>
        <span className="text-xs text-gray-400">
          {images.length}/{maxFiles} {multiple ? 'fotos' : 'foto'}
        </span>
      </div>

      {/* Upload area */}
      {canUploadMore && (
        <div
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
            isDragging
              ? 'border-primary-400 bg-primary-50'
              : disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30',
            isUploading && 'pointer-events-none opacity-50'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <span className="text-sm text-gray-500">Subiendo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-sm text-gray-600">
                Arrastra imágenes aquí o haz clic
              </span>
              <span className="text-xs text-gray-400">
                JPG, PNG, WebP, GIF (máx 10MB)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Thumbnail carousel */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 group"
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => openLightbox(index)}
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/90 rounded-full transition-opacity"
                >
                  <ZoomIn className="w-4 h-4 text-gray-700" />
                </button>
              </div>
              {/* Delete button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('prev');
                }}
                className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox('next');
                }}
                className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={images[lightboxIndex].url}
            alt={images[lightboxIndex].name}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
