/**
 * Share Calendar Modal
 *
 * Modal for generating shareable links and sending calendar views via email.
 * Supports client mode (read-only) sharing.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, Link2, Mail, Copy, Check, Send, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: string; // YYYY-MM-DD
  filters: {
    brandIds?: string[];
    restaurantIds?: string[];
    platformFilters?: string[];
    categoryFilters?: string[];
    statusFilters?: string[];
    region?: string;
  };
}

export function ShareCalendarModal({
  isOpen,
  onClose,
  weekStart,
  filters,
}: ShareCalendarModalProps) {
  const [copied, setCopied] = useState(false);
  const [emails, setEmails] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Refs for timeout cleanup to prevent memory leaks
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailSentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      if (emailSentTimeoutRef.current) clearTimeout(emailSentTimeoutRef.current);
    };
  }, []);

  // Generate shareable link
  const shareLink = useMemo(() => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();

    params.set('view', 'week');
    params.set('weekStart', weekStart);
    params.set('mode', 'client');

    // Add filters if present
    if (filters.brandIds?.length) {
      params.set('brandIds', filters.brandIds.join(','));
    }
    if (filters.restaurantIds?.length) {
      params.set('restaurantIds', filters.restaurantIds.join(','));
    }
    if (filters.platformFilters?.length) {
      params.set('platforms', filters.platformFilters.join(','));
    }
    if (filters.categoryFilters?.length) {
      params.set('categories', filters.categoryFilters.join(','));
    }
    if (filters.statusFilters?.length) {
      params.set('statuses', filters.statusFilters.join(','));
    }
    if (filters.region) {
      params.set('region', filters.region);
    }

    // Generate a simple token (in production, this would be a secure token from backend)
    const token = btoa(`share_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    params.set('token', token);

    return `${baseUrl}/calendar?${params.toString()}`;
  }, [weekStart, filters]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      // Clear previous timeout if exists
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [shareLink]);

  const handleSendEmail = useCallback(async () => {
    if (!emails.trim()) return;

    setIsSending(true);

    // Parse email addresses
    const emailList = emails
      .split(/[,;\s]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));

    if (emailList.length === 0) {
      setIsSending(false);
      return;
    }

    // In production, this would call an API endpoint to send emails
    // For now, we'll simulate the email sending and open mailto as fallback
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fallback: Open mailto link
      const subject = encodeURIComponent('Calendario de Campañas - ThinkPaladar');
      const body = encodeURIComponent(
        `${emailMessage ? emailMessage + '\n\n' : ''}` +
        `Accede al calendario de campañas:\n${shareLink}\n\n` +
        `Este enlace te permite ver las campañas programadas en modo lectura.`
      );

      window.open(`mailto:${emailList.join(',')}?subject=${subject}&body=${body}`);

      setEmailSent(true);
      // Clear previous timeout if exists
      if (emailSentTimeoutRef.current) clearTimeout(emailSentTimeoutRef.current);
      emailSentTimeoutRef.current = setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      console.error('Failed to send email:', err);
    } finally {
      setIsSending(false);
    }
  }, [emails, emailMessage, shareLink]);

  const handleClose = useCallback(() => {
    setCopied(false);
    setEmails('');
    setEmailMessage('');
    setEmailSent(false);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Compartir Calendario</h2>
            <p className="text-sm text-gray-500 mt-1">
              Comparte la vista semanal con tus clientes en modo solo lectura
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Link section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Link2 className="w-4 h-4 inline mr-2" />
              Enlace para compartir
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate"
              />
              <Button
                variant={copied ? 'primary' : 'outline'}
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              El cliente podrá ver las campañas pero no editarlas
            </p>
          </div>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o enviar por email</span>
            </div>
          </div>

          {/* Email section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Enviar por email
            </label>
            <input
              type="text"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="cliente@empresa.com, otro@empresa.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separa múltiples direcciones con comas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje (opcional)
            </label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Hola, te comparto el calendario de campañas..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <Button
            onClick={handleSendEmail}
            disabled={!emails.trim() || isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : emailSent ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Enviado
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar enlace
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Modo cliente:</strong> Los destinatarios podrán ver las campañas,
            fechas y detalles, pero no podrán crear, editar ni eliminar campañas.
          </p>
        </div>
      </div>
    </Modal>
  );
}
