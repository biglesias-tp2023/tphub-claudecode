/**
 * PendingInvitations
 *
 * Table showing pending user invitations with actions
 * to resend or cancel.
 */

import { useState } from 'react';
import {
  Mail,
  MoreVertical,
  RefreshCw,
  XCircle,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Spinner } from '@/components/ui';
import {
  useInvitations,
  useCancelInvitation,
  useResendInvitation,
  useDeleteInvitation,
  type InvitationStatus,
} from '../hooks/useInvitations';
import type { InvitationWithInviter } from '@/services/invitations';

// Status badge styling
const STATUS_CONFIG: Record<
  InvitationStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  accepted: {
    label: 'Aceptada',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Expirada',
    color: 'bg-gray-100 text-gray-700',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

interface InvitationRowProps {
  invitation: InvitationWithInviter;
  onResend: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  isActioning: boolean;
}

function InvitationRow({
  invitation,
  onResend,
  onCancel,
  onDelete,
  isActioning,
}: InvitationRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const config = STATUS_CONFIG[invitation.status];
  const StatusIcon = config.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpiringSoon = () => {
    if (invitation.status !== 'pending') return false;
    const expiresAt = new Date(invitation.expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24;
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
            <Mail className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{invitation.email}</div>
            {invitation.inviterName && (
              <div className="text-xs text-gray-500">
                Invitado por {invitation.inviterName}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600 capitalize">{invitation.role}</span>
      </td>
      <td className="px-4 py-3">
        {invitation.assignedCompanyIds.length > 0 ? (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Building2 className="w-4 h-4" />
            <span>{invitation.assignedCompanyIds.length}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
        >
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
        {isExpiringSoon() && (
          <div className="text-xs text-amber-600 mt-1">
            Expira pronto
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatDate(invitation.invitedAt)}
      </td>
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isActioning}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            {isActioning ? (
              <Spinner size="sm" />
            ) : (
              <MoreVertical className="w-4 h-4" />
            )}
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {invitation.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        onResend(invitation.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reenviar
                    </button>
                    <button
                      onClick={() => {
                        onCancel(invitation.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar
                    </button>
                  </>
                )}
                {(invitation.status === 'cancelled' ||
                  invitation.status === 'expired') && (
                  <button
                    onClick={() => {
                      onDelete(invitation.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

interface PendingInvitationsProps {
  showAll?: boolean;
}

export function PendingInvitations({ showAll = false }: PendingInvitationsProps) {
  const [actioningId, setActioningId] = useState<string | null>(null);

  const { data: invitations = [], isLoading, error } = useInvitations(
    showAll ? {} : { status: 'pending' }
  );

  const cancelMutation = useCancelInvitation();
  const resendMutation = useResendInvitation();
  const deleteMutation = useDeleteInvitation();

  const handleResend = async (id: string) => {
    setActioningId(id);
    try {
      await resendMutation.mutateAsync(id);
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActioningId(id);
    try {
      await cancelMutation.mutateAsync(id);
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActioningId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setActioningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="w-5 h-5" />
        <span>Error al cargar invitaciones</span>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          {showAll
            ? 'No hay invitaciones registradas'
            : 'No hay invitaciones pendientes'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Compañías</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              onResend={handleResend}
              onCancel={handleCancel}
              onDelete={handleDelete}
              isActioning={actioningId === invitation.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
