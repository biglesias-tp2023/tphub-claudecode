import { AuditCard, AuditCardSkeleton } from './AuditCard';
import type { AuditWithDetails } from '@/types';

export interface AuditsListProps {
  audits: AuditWithDetails[];
  isLoading: boolean;
  onEdit: (auditId: string) => void;
  onPreview?: (auditId: string) => void;
  onDelete?: (auditId: string, auditNumber: string) => void;
}

export function AuditsList({
  audits,
  isLoading,
  onEdit,
  onPreview,
  onDelete,
}: AuditsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <AuditCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">No se encontraron auditorías con los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {audits.map((audit) => (
        <AuditCard
          key={audit.pkIdAudit}
          audit={audit}
          onEdit={onEdit}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
