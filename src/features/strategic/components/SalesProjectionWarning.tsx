/**
 * SalesProjectionWarning - Popup de aviso cuando faltan menos de 60 días
 *
 * Muestra un modal que indica que es momento de crear nuevos objetivos
 */
import { AlertTriangle, Calendar, Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SalesProjectionWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  daysRemaining: number;
  endDate: string;
}

export function SalesProjectionWarning({
  isOpen,
  onClose,
  onCreateNew,
  daysRemaining,
  endDate,
}: SalesProjectionWarningProps) {
  if (!isOpen) return null;

  const isUrgent = daysRemaining <= 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with gradient */}
        <div className={cn(
          'px-6 pt-8 pb-6 text-center',
          isUrgent
            ? 'bg-gradient-to-br from-red-500 to-orange-500'
            : 'bg-gradient-to-br from-amber-400 to-orange-500'
        )}>
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isUrgent ? '¡Tiempo de planificar!' : 'Próximo periodo'}
          </h2>
          <p className="text-white/90 text-sm">
            Tu proyección actual finaliza pronto
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Days counter */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className={cn(
                'text-4xl font-bold tabular-nums',
                isUrgent ? 'text-red-600' : 'text-amber-600'
              )}>
                {daysRemaining}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">días restantes</div>
            </div>
            <div className="w-px h-12 bg-gray-200" />
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{new Date(endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">fecha fin</div>
            </div>
          </div>

          {/* Message */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600 text-center">
              {isUrgent
                ? 'Es urgente configurar los objetivos del próximo periodo para mantener la continuidad de tu estrategia.'
                : 'Te recomendamos empezar a planificar los objetivos del siguiente periodo para tener todo listo a tiempo.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Recordar luego
            </button>
            <button
              onClick={onCreateNew}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors',
                isUrgent
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-500 hover:bg-amber-600'
              )}
            >
              <Plus className="w-4 h-4" />
              Crear nuevos objetivos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
