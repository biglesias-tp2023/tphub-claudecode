/**
 * DeadlineOnly - Solo muestra mensaje de que este objetivo solo tiene deadline
 *
 * Usado para: Packaging, Sesión de fotos, Ampliar catálogo, etc.
 */
import { Calendar, CheckCircle } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface DeadlineOnlyProps {
  label?: string;
  description?: string;
}

// ============================================
// COMPONENT
// ============================================

export function DeadlineOnly({
  label = 'Objetivo basado en fecha',
  description = 'Este objetivo se mide por su fecha de cumplimiento. Establece el deadline arriba.',
}: DeadlineOnlyProps) {
  return (
    <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-pink-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
        <CheckCircle className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-gray-700">{description}</p>
          <p className="text-xs text-gray-500 mt-1">
            El progreso se marca automáticamente cuando cambies el estado a "Completado".
          </p>
        </div>
      </div>
    </div>
  );
}
