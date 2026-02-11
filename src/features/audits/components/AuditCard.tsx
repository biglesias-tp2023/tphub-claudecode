import { Calendar, User, Eye } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { getAuditStatusConfig, getAuditScopeLabel, AUDIT_TYPE_ICONS } from '../config';
import type { AuditWithDetails } from '@/types';

interface AuditCardProps {
  audit: AuditWithDetails;
  onEdit: (auditId: string) => void;
  onPreview?: (auditId: string) => void;
}

export function AuditCard({
  audit,
  onEdit,
  onPreview,
}: AuditCardProps) {
  const statusConfig = getAuditStatusConfig(audit.desStatus);
  const scopeLabel = getAuditScopeLabel(audit);
  const typeName = audit.auditType?.name || 'Auditoría';
  const typeSlug = audit.auditType?.slug || '';
  const typeIcon = AUDIT_TYPE_ICONS[typeSlug] || 'ClipboardList';

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const displayDate = audit.tdCompletedAt || audit.tdScheduledDate || audit.tdCreatedAt;
  const consultantName = audit.desConsultant || audit.createdByProfile?.fullName || 'Usuario';

  const isCompleted = audit.desStatus === 'completed' || audit.desStatus === 'delivered';

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => onEdit(audit.pkIdAudit)}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left section: Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Type icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
            {getIconComponent(typeIcon)}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">
                {audit.desAuditNumber}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{typeName}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600 truncate">{scopeLabel}</span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(displayDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {consultantName}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                  statusConfig.bgColor,
                  statusConfig.color
                )}
              >
                {getIconComponent(statusConfig.icon)}
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right section: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {isCompleted && onPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(audit.pkIdAudit)}
              className="gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function AuditCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}
