import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface AuditEmptyStateProps {
  onCreateClick: () => void;
}

export function AuditEmptyState({ onCreateClick }: AuditEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-6">
        <ClipboardList className="w-8 h-8 text-primary-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        No hay auditorías todavía
      </h2>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
        Crea tu primera auditoría para comenzar a evaluar el rendimiento de tus clientes.
      </p>
      <Button onClick={onCreateClick} className="gap-2">
        <Plus className="w-4 h-4" />
        Nueva auditoría
      </Button>
    </div>
  );
}
