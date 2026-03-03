import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { fetchContactsByCompanyId, type HubspotContact } from '@/services/crp-portal';
import type { AuditField } from '@/types';

interface ContactSelectFieldProps {
  field: AuditField;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  companyId?: string;
}

export function ContactSelectField({
  field,
  value,
  onChange,
  disabled,
  companyId,
}: ContactSelectFieldProps) {
  const [contacts, setContacts] = useState<HubspotContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Load contacts when companyId changes
  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      return;
    }

    setIsLoading(true);
    fetchContactsByCompanyId(companyId)
      .then(setContacts)
      .catch((error) => {
        console.warn('[ContactSelectField] fetchContacts failed:', error);
        setContacts([]);
      })
      .finally(() => setIsLoading(false));
  }, [companyId]);

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const searchLower = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
    );
  }, [contacts, search]);

  // Find currently selected contact by fullName match
  const selectedContact = useMemo(
    () => contacts.find((c) => c.fullName === value) ?? null,
    [contacts, value]
  );

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => !isLoading && !disabled && setIsOpen(!isOpen)}
          disabled={isLoading || disabled}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors',
            disabled || isLoading
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-300 hover:border-gray-400',
            isOpen && 'border-primary-500 ring-1 ring-primary-500'
          )}
        >
          <span className={cn('flex-1 truncate', !value && 'text-gray-400')}>
            {isLoading
              ? 'Cargando contactos...'
              : value
              ? selectedContact
                ? `${selectedContact.fullName} (${selectedContact.email})`
                : value
              : field.placeholder || 'Seleccionar contacto'}
          </span>
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-hidden">
              {contacts.length > 5 && (
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar contacto..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary-500"
                    autoFocus
                  />
                </div>
              )}
              <div className="max-h-48 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    No se encontraron contactos
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = value === contact.fullName;
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => {
                          onChange(contact.fullName);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                          isSelected && 'bg-primary-50 text-primary-700'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{contact.fullName}</div>
                          <div className="truncate text-xs text-gray-500">{contact.email}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {!isLoading && contacts.length === 0 && companyId && (
        <p className="text-xs text-gray-400 mt-1">
          No hay contactos HubSpot para esta compañía
        </p>
      )}
    </div>
  );
}
