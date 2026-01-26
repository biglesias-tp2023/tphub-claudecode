/**
 * FreeText - Campo de texto libre para objetivos personalizados
 *
 * Usado para: "Otros" en todas las categorías
 */
import { FileText } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface FreeTextProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  rows?: number;
}

// ============================================
// COMPONENT
// ============================================

export function FreeText({
  value,
  onChange,
  label = 'Descripción del objetivo',
  description,
  placeholder = 'Describe el objetivo personalizado...',
  rows = 4,
}: FreeTextProps) {
  const charCount = value?.length || 0;
  const maxChars = 500;

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="space-y-2">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxChars}
          className="w-full py-3 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-400 bg-white resize-none"
        />

        {/* Character count */}
        <div className="flex justify-end">
          <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
}
