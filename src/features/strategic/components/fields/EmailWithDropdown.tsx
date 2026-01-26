/**
 * EmailWithDropdown - Email + Selector de proveedor
 *
 * Usado para: Presentar proveedor de Tech/Stack
 */
import { Mail, Send, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { EmailActionData } from '@/types';

// ============================================
// TYPES
// ============================================

interface EmailWithDropdownProps {
  value: EmailActionData;
  onChange: (value: EmailActionData) => void;
  providers: string[];
  label?: string;
  description?: string;
  dropdownLabel?: string;
}

// ============================================
// COMPONENT
// ============================================

export function EmailWithDropdown({
  value,
  onChange,
  providers,
  label = 'Presentar Proveedor',
  description,
  dropdownLabel = 'Seleccionar proveedor',
}: EmailWithDropdownProps) {
  const isValidEmail = value.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email);
  const hasProvider = !!value.provider;
  const isSent = !!value.sentAt;

  const handleSendEmail = () => {
    if (!isValidEmail || !hasProvider) return;

    // Open mailto link with provider info
    const subject = encodeURIComponent(`Propuesta ${value.provider} - ThinkPaladar`);
    const body = encodeURIComponent(`Hola,\n\nMe pongo en contacto para presentarles la solución ${value.provider}.\n\nSaludos,\nThinkPaladar`);
    const mailtoLink = `mailto:${value.email}?subject=${subject}&body=${body}`;
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
    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-indigo-600" />
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
      </div>

      <div className="space-y-3">
        {/* Provider dropdown */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            {dropdownLabel}
          </label>
          <div className="relative">
            <select
              value={value.provider || ''}
              onChange={(e) => onChange({ ...value, provider: e.target.value, sentAt: undefined })}
              className={cn(
                'w-full py-3 px-4 pr-10 border rounded-xl focus:outline-none focus:ring-2 bg-white appearance-none cursor-pointer',
                hasProvider
                  ? 'border-indigo-300 focus:ring-indigo-500/20 focus:border-indigo-400'
                  : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-400'
              )}
            >
              <option value="">Seleccionar...</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Selected provider badge */}
        {hasProvider && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {value.provider}
            </span>
          </div>
        )}

        {/* Email input */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">
            Email del cliente
          </label>
          <div className="relative">
            <input
              type="email"
              value={value.email || ''}
              onChange={(e) => onChange({ ...value, email: e.target.value, sentAt: undefined })}
              placeholder="email@cliente.com"
              className={cn(
                'w-full py-3 px-4 pr-12 border rounded-xl focus:outline-none focus:ring-2 bg-white',
                isValidEmail
                  ? 'border-green-300 focus:ring-green-500/20 focus:border-green-400'
                  : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-400'
              )}
            />
            {isValidEmail && (
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSendEmail}
          disabled={!isValidEmail || !hasProvider}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors',
            isValidEmail && hasProvider
              ? 'bg-indigo-500 text-white hover:bg-indigo-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
          <span>Enviar propuesta de {value.provider || 'proveedor'}</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        {/* Sent indicator */}
        {isSent && (
          <div className="p-3 bg-green-100 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm text-green-700">
              Propuesta de <span className="font-semibold">{value.provider}</span> enviada el {formatSentDate(value.sentAt!)}
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
