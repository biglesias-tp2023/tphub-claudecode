import { useState, useMemo } from 'react';
import { Loader2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SimpleDropdownProps<T> {
  placeholder: string;
  value: T | null;
  options: T[];
  isLoading?: boolean;
  disabled?: boolean;
  onChange: (option: T | null) => void;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
}

export function SimpleDropdown<T>({
  placeholder,
  value,
  options,
  isLoading = false,
  disabled = false,
  onChange,
  getOptionLabel,
  getOptionValue,
}: SimpleDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) =>
      getOptionLabel(opt).toLowerCase().includes(searchLower)
    );
  }, [options, search, getOptionLabel]);

  const selectedLabel = value ? getOptionLabel(value) : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors',
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-gray-400',
          isOpen && 'border-primary-500 ring-1 ring-primary-500'
        )}
      >
        <span className={cn('flex-1 truncate', !selectedLabel && 'text-gray-400')}>
          {isLoading ? 'Cargando...' : selectedLabel || placeholder}
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
            {options.length > 5 && (
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary-500"
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const label = getOptionLabel(option);
                  const optionValue = getOptionValue(option);
                  const isSelected = value ? getOptionValue(value) === optionValue : false;

                  return (
                    <button
                      key={optionValue}
                      type="button"
                      onClick={() => {
                        onChange(option);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                        isSelected && 'bg-primary-50 text-primary-700'
                      )}
                    >
                      <span className="flex-1 truncate">{label}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary-500" />}
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
