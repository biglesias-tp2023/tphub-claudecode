/**
 * ShareLinkModal Component
 *
 * Modal for creating and managing share links for objectives.
 * Allows consultants to share objectives with clients via public URLs.
 *
 * Features:
 * - Create share link with one click
 * - Copy link to clipboard
 * - Set expiration date
 * - Restrict access to specific emails
 * - View analytics (view count, last accessed)
 * - Regenerate token for security
 * - Disable/enable sharing
 */

import { useState, useCallback } from 'react';
import {
  X,
  Link2,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  Eye,
  Calendar,
  Mail,
  Shield,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button, Input, Card } from '@/components/ui';
import { useShareLinkManager } from '../hooks/useShareLinks';
import type { StrategicObjective } from '@/types';

// ============================================
// TYPES
// ============================================

interface ShareLinkModalProps {
  objective: StrategicObjective;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Expirado';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days < 7) return `En ${days} días`;
  if (days < 30) return `En ${Math.ceil(days / 7)} semanas`;
  return `En ${Math.ceil(days / 30)} meses`;
}

// ============================================
// COMPONENT
// ============================================

export function ShareLinkModal({ objective, isOpen, onClose }: ShareLinkModalProps) {
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    shareLink,
    isLoading,
    hasLink,
    url,
    isActive,
    viewCount,
    create,
    toggleActive,
    setExpiration,
    setAllowedEmails,
    regenerate,
    remove,
    copyToClipboard,
    isCreating,
    isMutating,
  } = useShareLinkManager(objective.id);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyToClipboard]);

  const handleAddEmail = useCallback(() => {
    if (!emailInput.trim() || !shareLink) return;

    const email = emailInput.trim().toLowerCase();
    const currentEmails = shareLink.allowedEmails || [];

    if (!currentEmails.includes(email)) {
      setAllowedEmails([...currentEmails, email]);
    }

    setEmailInput('');
    setShowEmailInput(false);
  }, [emailInput, shareLink, setAllowedEmails]);

  const handleRemoveEmail = useCallback(
    (email: string) => {
      if (!shareLink) return;
      const currentEmails = shareLink.allowedEmails || [];
      setAllowedEmails(currentEmails.filter((e) => e !== email));
    },
    [shareLink, setAllowedEmails]
  );

  const handleSetExpiration = useCallback(
    (days: number | null) => {
      if (days === null) {
        setExpiration(null);
      } else {
        const date = new Date();
        date.setDate(date.getDate() + days);
        setExpiration(date.toISOString());
      }
      setShowExpirationPicker(false);
    },
    [setExpiration]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50">
              <Link2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Compartir objetivo
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {objective.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Cargando...</p>
            </div>
          ) : !hasLink ? (
            /* No link yet - Create prompt */
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
                <Link2 className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Comparte este objetivo con tu cliente
              </h3>
              <p className="text-xs text-gray-500 mb-5 max-w-xs mx-auto">
                Genera un enlace único que permite ver el progreso del objetivo
                sin necesidad de iniciar sesión.
              </p>
              <Button
                onClick={() => create()}
                isLoading={isCreating}
                leftIcon={<Link2 className="w-4 h-4" />}
              >
                Crear enlace de compartir
              </Button>
            </div>
          ) : (
            /* Link exists - Management UI */
            <div className="space-y-5">
              {/* Link URL with copy */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Enlace para compartir
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={url || ''}
                      readOnly
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-lg border bg-gray-50',
                        'text-gray-600 font-mono text-xs',
                        !isActive && 'opacity-50'
                      )}
                    />
                    {!isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 rounded-lg">
                        <span className="text-xs text-gray-500 font-medium">
                          Enlace desactivado
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!isActive}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => url && window.open(url, '_blank')}
                    disabled={!isActive}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Status and analytics */}
              <div className="flex items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isActive ? 'bg-emerald-500' : 'bg-gray-300'
                    )}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {isActive ? 'Activo' : 'Desactivado'}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {viewCount} {viewCount === 1 ? 'visita' : 'visitas'}
                  </span>
                </div>
                {shareLink?.lastAccessedAt && (
                  <>
                    <div className="h-4 w-px bg-gray-200" />
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Último acceso: {formatDate(shareLink.lastAccessedAt)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-3">
                {/* Expiration */}
                <Card padding="sm" className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Expiración
                        </p>
                        <p className="text-xs text-gray-500">
                          {shareLink?.expiresAt
                            ? formatRelativeDate(shareLink.expiresAt)
                            : 'Sin fecha límite'}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExpirationPicker(!showExpirationPicker)}
                        disabled={isMutating}
                      >
                        Cambiar
                      </Button>
                      {showExpirationPicker && (
                        <div className="absolute right-0 top-full mt-1 z-10 py-1 bg-white rounded-lg shadow-lg border border-gray-100 min-w-[140px]">
                          {[
                            { label: 'Sin límite', days: null },
                            { label: '7 días', days: 7 },
                            { label: '30 días', days: 30 },
                            { label: '90 días', days: 90 },
                          ].map((option) => (
                            <button
                              key={option.label}
                              onClick={() => handleSetExpiration(option.days)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Email restrictions */}
                <Card padding="sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Restringir por email
                        </p>
                        <p className="text-xs text-gray-500 mb-2">
                          {shareLink?.allowedEmails?.length
                            ? `${shareLink.allowedEmails.length} email(s) permitido(s)`
                            : 'Cualquiera con el enlace puede acceder'}
                        </p>
                        {shareLink?.allowedEmails && shareLink.allowedEmails.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {shareLink.allowedEmails.map((email) => (
                              <span
                                key={email}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                              >
                                {email}
                                <button
                                  onClick={() => handleRemoveEmail(email)}
                                  className="hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {showEmailInput && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              size="sm"
                              type="email"
                              placeholder="email@ejemplo.com"
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={handleAddEmail}>
                              Añadir
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {!showEmailInput && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmailInput(true)}
                        disabled={isMutating}
                      >
                        Añadir
                      </Button>
                    )}
                  </div>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleActive}
                    disabled={isMutating}
                    className={!isActive ? 'text-emerald-600 hover:text-emerald-700' : ''}
                  >
                    <Shield className="w-4 h-4 mr-1.5" />
                    {isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={regenerate}
                    disabled={isMutating}
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Regenerar
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={remove}
                  disabled={isMutating}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Eliminar
                </Button>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Cualquier persona con este enlace podrá ver el objetivo y su
                  progreso. No compartas información sensible.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
