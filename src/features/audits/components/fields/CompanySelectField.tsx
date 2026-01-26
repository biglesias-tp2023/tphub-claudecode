import { useState, useRef, useEffect } from 'react';
import { Building2, Search, X, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCompanies } from '@/features/clients/hooks/useCompanies';
import type { AuditField } from '@/types';

interface CompanySelectFieldProps {
  field: AuditField;
  value: string | null; // company ID
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CompanySelectField({ field, value, onChange, disabled }: CompanySelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companies = [], isLoading } = useCompanies();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedCompany = companies.find((c) => c.id === value);

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (companyId: string) => {
    onChange(companyId);
    setIsOpen(false);
    setSearch('');
  };

  const clear = () => {
    onChange('');
    setSearch('');
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
            'border border-gray-200 rounded-lg bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            !value && 'text-gray-400'
          )}
        >
          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="flex-1 truncate">
            {selectedCompany?.name || 'Seleccionar empresa'}
          </span>
          {value && !disabled ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar empresa..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  Cargando...
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No se encontraron empresas
                </div>
              ) : (
                filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleSelect(company.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                      value === company.id && 'bg-primary-50 text-primary-600'
                    )}
                  >
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt=""
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    )}
                    <span className="truncate">{company.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
