import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorAlertProps {
  error: Error | null;
  title?: string;
  onRetry?: () => void;
}

export function ErrorAlert({ error, title = 'Error al cargar los datos', onRetry }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">{title}</p>
        <p className="text-sm text-red-600 mt-0.5">{error.message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      )}
    </div>
  );
}
