import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Calendar, User, Building2, Store, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuditWithDetails } from '@/features/audits/hooks';
import { AUDIT_STATUS_CONFIG } from '@/features/audits/config';
import { cn } from '@/utils/cn';

export function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: audit, isLoading, error } = useAuditWithDetails(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/audits')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Volver a auditorías
        </Button>
        <Card padding="lg" className="text-center">
          <p className="text-gray-500">No se encontró la auditoría solicitada.</p>
          <Button onClick={() => navigate('/audits')} className="mt-4">
            Volver a auditorías
          </Button>
        </Card>
      </div>
    );
  }

  const statusConfig = AUDIT_STATUS_CONFIG[audit.status];
  const createdDate = new Date(audit.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => navigate('/audits')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">
            {audit.auditType?.name || 'Auditoría'}
          </h1>
          <p className="text-sm text-gray-500">{audit.auditNumber}</p>
        </div>
        <span
          className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            statusConfig.bgColor,
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Info Card */}
      <Card padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Type */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Tipo</p>
              <p className="text-sm font-medium text-gray-900">
                {audit.auditType?.name || 'N/A'}
              </p>
            </div>
          </div>

          {/* Brand */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Marca</p>
              <p className="text-sm font-medium text-gray-900">
                {audit.brand?.name || 'N/A'}
              </p>
            </div>
          </div>

          {/* Company */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Compañía</p>
              <p className="text-sm font-medium text-gray-900">
                {audit.company?.name || 'N/A'}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Creada</p>
              <p className="text-sm font-medium text-gray-900">{createdDate}</p>
            </div>
          </div>
        </div>

        {/* Platform & Consultant Info */}
        {(audit.portalId || audit.consultantUserId) && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            {audit.portalId && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Plataforma</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{audit.portalId}</p>
              </div>
            )}
            {audit.createdByProfile && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Creada por</p>
                  <p className="text-sm font-medium text-gray-900">
                    {audit.createdByProfile.fullName}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Placeholder for Phase 2 */}
      <Card padding="lg" className="border-dashed border-2 border-gray-200 bg-gray-50">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Formulario en construcción
          </h3>
          <p className="text-sm text-gray-500 max-w-md">
            El formulario de Mystery Shopper se implementará en la Fase 2.
            Por ahora, puedes ver la información básica de la auditoría.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Fase 2 incluirá: formulario completo, carga de imágenes, cálculo de puntuación y exportación.
          </p>
        </div>
      </Card>
    </div>
  );
}
