import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Download, Mail, Loader2, Send, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { generateAuditPdfBlob, exportAuditToPDF, type AuditExportData } from '@/utils/export';
import { fetchContactsByCompanyId, type HubspotContact } from '@/services/crp-portal';
import { supabase } from '@/services/supabase';

interface AuditPreviewModalProps {
  open: boolean;
  onClose: () => void;
  exportData: AuditExportData | null;
  companyId: string | null;
  auditNumber: string;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

function ContactDropdown({
  contacts,
  selectedContact,
  isLoading,
  onChange,
}: {
  contacts: HubspotContact[];
  selectedContact: HubspotContact | null;
  isLoading: boolean;
  onChange: (contact: HubspotContact | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const searchLower = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
    );
  }, [contacts, search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
          isLoading
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-gray-400',
          isOpen && 'border-primary-500 ring-1 ring-primary-500'
        )}
      >
        <span className={cn('flex-1 truncate', !selectedContact && 'text-gray-400')}>
          {isLoading
            ? 'Cargando contactos...'
            : selectedContact
            ? `${selectedContact.fullName} (${selectedContact.email})`
            : 'Seleccionar contacto'}
        </span>
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
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
                  const isSelected = selectedContact?.id === contact.id;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => {
                        onChange(contact);
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
  );
}

export function AuditPreviewModal({
  open,
  onClose,
  exportData,
  companyId,
  auditNumber,
  onToast,
}: AuditPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [contacts, setContacts] = useState<HubspotContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<HubspotContact | null>(null);
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Generate default email body
  const getDefaultEmailBody = useCallback(
    (contactName?: string) => {
      if (!exportData) return '';
      return `Estimado/a ${contactName || ''},

Adjuntamos el informe de ${exportData.auditType} correspondiente a ${exportData.scope}.

Puede consultar el informe completo en el documento adjunto.

Un saludo,
${exportData.createdBy}
ThinkPaladar`;
    },
    [exportData]
  );

  // Load PDF blob for preview
  useEffect(() => {
    if (open && exportData) {
      let isCancelled = false;
      generateAuditPdfBlob(exportData).then((blob) => {
        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      });
      return () => {
        isCancelled = true;
      };
    }
    return undefined;
  }, [open, exportData]);

  // Load contacts
  useEffect(() => {
    if (open && companyId) {
      setContactsLoading(true);
      fetchContactsByCompanyId(companyId)
        .then(setContacts)
        .catch(() => setContacts([]))
        .finally(() => setContactsLoading(false));
    }
  }, [open, companyId]);

  // Set default email body
  useEffect(() => {
    if (open && exportData) {
      setEmailBody(getDefaultEmailBody());
    }
  }, [open, exportData, getDefaultEmailBody]);

  // Update email body when contact changes
  useEffect(() => {
    if (selectedContact) {
      setEmailBody(getDefaultEmailBody(selectedContact.fullName));
    }
  }, [selectedContact, getDefaultEmailBody]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setContacts([]);
      setSelectedContact(null);
      setEmailBody('');
      setIsSending(false);
    }
  }, [open]);

  const handleDownloadPdf = useCallback(() => {
    if (exportData) {
      exportAuditToPDF(exportData);
    }
  }, [exportData]);

  const handleSendEmail = useCallback(async () => {
    if (!exportData || !selectedContact) return;

    setIsSending(true);
    try {
      // Generate PDF blob and convert to base64
      const pdfBlob = await generateAuditPdfBlob(exportData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const pdfBase64 = btoa(binary);

      const subject = `${exportData.auditType} - ${exportData.scope} (${auditNumber})`;
      const fileName = `${auditNumber}.pdf`;

      const { error } = await supabase.functions.invoke('send-audit-email', {
        body: {
          to: selectedContact.email,
          subject,
          body: emailBody,
          pdfBase64,
          fileName,
        },
      });

      if (error) throw error;

      onToast?.('Email enviado correctamente', 'success');
      onClose();
    } catch (err) {
      console.error('Error sending email:', err);
      onToast?.('Error al enviar el email. Inténtalo de nuevo.', 'error');
    } finally {
      setIsSending(false);
    }
  }, [exportData, selectedContact, emailBody, auditNumber, onClose, onToast]);

  if (!open || !exportData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Preview — {auditNumber}
          </h2>
          <Button variant="ghost" size="sm" iconOnly onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body: 2 columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: PDF Preview (70%) */}
          <div className="w-[70%] p-4 bg-gray-100 overflow-hidden">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full rounded-lg border border-gray-200"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            )}
          </div>

          {/* Right: Actions panel (30%) */}
          <div className="w-[30%] border-l border-gray-200 flex flex-col overflow-y-auto">
            {/* Download PDF */}
            <div className="p-4 border-b border-gray-100">
              <Button
                onClick={handleDownloadPdf}
                leftIcon={<Download className="w-4 h-4" />}
                className="w-full"
              >
                Descargar PDF
              </Button>
            </div>

            {/* Send by Email */}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Enviar por email</h3>
              </div>

              {/* Contact selector */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Destinatario
                </label>
                <ContactDropdown
                  contacts={contacts}
                  selectedContact={selectedContact}
                  isLoading={contactsLoading}
                  onChange={setSelectedContact}
                />
                {!contactsLoading && contacts.length === 0 && companyId && (
                  <p className="text-xs text-gray-400 mt-1">
                    No hay contactos HubSpot para esta compañía
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="mb-4 flex-1 flex flex-col">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Mensaje
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="flex-1 min-h-[120px] w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Send button */}
              <Button
                onClick={handleSendEmail}
                disabled={!selectedContact || isSending || !emailBody.trim()}
                leftIcon={
                  isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )
                }
                className="w-full"
              >
                {isSending ? 'Enviando...' : 'Enviar email'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
