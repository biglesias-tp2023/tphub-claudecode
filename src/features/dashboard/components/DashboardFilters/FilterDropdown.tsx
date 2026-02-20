import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FilterOption {
  id: string;
  name: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onSelectAll?: (ids: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  /** When true, empty selectedIds means "all selected" (default: true) */
  treatEmptyAsAll?: boolean;
  /** Show header with title and count display */
  showHeader?: boolean;
  /** Header title (defaults to "Seleccionar {label}") */
  headerTitle?: string;
}

export function FilterDropdown({
  label,
  options,
  selectedIds,
  onToggle,
  onClear,
  onSelectAll,
  placeholder = 'Todos',
  isLoading = false,
  disabled = false,
  className,
  searchable = true,
  treatEmptyAsAll = true,
  showHeader = false,
  headerTitle,
}: FilterDropdownProps) {
  // When treatEmptyAsAll is true and selectedIds is empty, treat as "all selected"
  const isAllSelected = treatEmptyAsAll && selectedIds.length === 0;
  const effectiveSelectedIds = isAllSelected ? options.map((o) => o.id) : selectedIds;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Filter options based on search
  const filteredOptions = searchQuery
    ? options.filter((opt) =>
        opt.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get display text
  const displayText =
    selectedIds.length === 0
      ? placeholder
      : selectedIds.length === 1
        ? options.find((o) => o.id === selectedIds[0])?.name || '1 seleccionado'
        : `${selectedIds.length} seleccionados`;

  const handleToggle = useCallback((id: string) => {
    // If all are selected (empty array) and user unchecks one,
    // we need to select all EXCEPT that one
    if (isAllSelected && onSelectAll) {
      const allExceptThis = options.filter((o) => o.id !== id).map((o) => o.id);
      onSelectAll(allExceptThis);
    } else {
      onToggle(id);
    }
  }, [onToggle, onSelectAll, isAllSelected, options]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  }, [onClear]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between gap-2 w-full min-w-[140px]',
          'px-3 py-2 rounded-lg border bg-white text-sm',
          'transition-colors duration-150',
          disabled
            ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
            : 'border-gray-300 hover:border-gray-400 text-gray-700',
          isOpen && 'border-primary-500 ring-2 ring-primary-500/20'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-gray-500 text-xs font-medium">{label}:</span>
          <span className={cn(
            'truncate',
            selectedIds.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
          )}>
            {isLoading ? 'Cargando...' : displayText}
          </span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedIds.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="p-0.5 hover:bg-gray-100 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[280px] w-max max-w-[400px] bg-white rounded-lg border border-gray-200 shadow-lg">
          {/* Header with count */}
          {showHeader && (
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                {headerTitle || `Seleccionar ${label.toLowerCase()}`}
              </h3>
              {options.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {isAllSelected ? options.length : selectedIds.length} de {options.length} seleccionados
                </p>
              )}
            </div>
          )}
          {/* Search input */}
          {searchable && options.length > 5 && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto overscroll-contain py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {isLoading ? 'Cargando...' : 'Sin resultados'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = effectiveSelectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggle(option.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                      'hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-primary-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isSelected
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-gray-300 bg-white'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className={cn(
                      isSelected && 'text-primary-700 font-medium'
                    )}>
                      {option.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with actions */}
          {options.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => {
                  // Select all = clear selection (empty means all when treatEmptyAsAll)
                  if (treatEmptyAsAll) {
                    onClear();
                  } else if (onSelectAll) {
                    onSelectAll(options.map((o) => o.id));
                  } else {
                    filteredOptions.forEach((opt) => {
                      if (!selectedIds.includes(opt.id)) {
                        onToggle(opt.id);
                      }
                    });
                  }
                }}
                className="px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Seleccionar todos
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  disabled={selectedIds.length === 0}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-lg transition-colors',
                    selectedIds.length > 0
                      ? 'text-error-600 hover:bg-error-50'
                      : 'text-gray-400 cursor-not-allowed'
                  )}
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium',
                    'bg-gradient-to-b from-primary-500 to-primary-600 text-white',
                    'shadow-sm shadow-primary-600/25',
                    'hover:from-primary-600 hover:to-primary-700',
                    'transition-all duration-150'
                  )}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
