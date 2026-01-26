/**
 * EmailAction - Input de email con acción mailto
 *
 * Usado para: Presentar proveedores (Packaging, Fotos, RRSS, etc.)
 */
import { Mail, Send, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { EmailActionData } from '@/types';

// ============================================
// TYPES
// ============================================

interface EmailActionProps {
  value: EmailActionData;
  onChange: (value: EmailActionData) => void;
  label?: string;
  description?: string;
  subjectTemplate?: string;
}

// ============================================
// COMPONENT
// ============================================

export function EmailAction({
  value,
  onChange,
  label = 'Email de contacto',
  description,
  subjectTemplate = 'Propuesta de servicio - ThinkPaladar',
}: EmailActionProps) {
  const isValidEmail = value.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email);
  const isSent = !!value.sentAt;

  const handleSendEmail = () => {
    if (!isValidEmail) return;

    // Open mailto link
    const subject = encodeURIComponent(subjectTemplate);
    const mailtoLink = `mailto:${value.email}?subject=${subject}`;
    window.open(mailtoLink, '_blank');

    // Mark as sent
    onChange({
      ...value,
      sentAt: new Date().toISOString(),
    });
  };

  const formatSentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl border border-cyan-100">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-cyan-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="space-y-3">
        {/* Email input */}
        <div className="relative">
          <input
            type="email"
            value={value.email || ''}
            onChange={(e) => onChange({ ...value, email: e.target.value, sentAt: undefined })}
            placeholder="email@ejemplo.com"
            className={cn(
              'w-full py-3 px-4 pr-12 border rounded-xl focus:outline-none focus:ring-2 bg-white',
              isValidEmail
                ? 'border-green-300 focus:ring-green-500/20 focus:border-green-400'
                : 'border-gray-200 focus:ring-cyan-500/20 focus:border-cyan-400'
            )}
          />
          {isValidEmail && (
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSendEmail}
          disabled={!isValidEmail}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors',
            isValidEmail
              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
          <span>Abrir cliente de email</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        {/* Sent indicator */}
        {isSent && (
          <div className="p-3 bg-green-100 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm text-green-700">
              Email abierto el {formatSentDate(value.sentAt!)}
            </p>
          </div>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-500 mt-3">{description}</p>
      )}
    </div>
  );
}
