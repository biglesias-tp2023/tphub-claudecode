import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import { Search, Building2, Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useCompanies } from '../hooks/useCompanies';
import type { Company } from '@/types';

interface CompanySelectorProps {
  className?: string;
  collapsed?: boolean;
}

type TabType = 'all' | 'selected';

export function CompanySelector({ className, collapsed = false }: CompanySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [kamFilters, setKamFilters] = useState<string[]>([]);

  // Lock body scroll when modal is open
  useScrollLock(isOpen);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const { data: companies = [], isLoading } = useCompanies();
  const { companyIds, toggleCompanyId, setCompanyIds, clearCompanies } = useGlobalFiltersStore();
  const { resetDashboardFilters } = useDashboardFiltersStore();

  // Sort companies alphabetically (immutable order)
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
  }, [companies]);

  // Extract unique status values
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    companies.forEach((c) => {
      if (c.status) statuses.add(c.status);
    });
    return Array.from(statuses).sort();
  }, [companies]);

  // Extract unique KAM values
  const uniqueKams = useMemo(() => {
    const kams = new Set<string>();
    companies.forEach((c) => {
      if (c.keyAccountManager) kams.add(c.keyAccountManager);
    });
    return Array.from(kams).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [companies]);

  // Fuse.js setup for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(sortedCompanies, {
        keys: ['name', 'slug'],
        threshold: 0.3,
        includeScore: true,
      }),
    [sortedCompanies]
  );

  // Filter companies based on search, tab, status, and KAM
  const filteredCompanies = useMemo(() => {
    let result = sortedCompanies;

    // Apply search filter
    if (searchQuery.trim()) {
      result = fuse.search(searchQuery).map((r) => r.item);
      // Re-sort after search to maintain alphabetical order
      result = [...result].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
    }

    // Apply status filter (multiple)
    if (statusFilters.length > 0) {
      result = result.filter((c) => c.status && statusFilters.includes(c.status));
    }

    // Apply KAM filter (multiple)
    if (kamFilters.length > 0) {
      result = result.filter((c) => c.keyAccountManager && kamFilters.includes(c.keyAccountManager));
    }

    // Apply tab filter
    if (activeTab === 'selected') {
      result = result.filter((c) => companyIds.includes(c.id));
    }

    return result;
  }, [searchQuery, sortedCompanies, fuse, activeTab, companyIds, statusFilters, kamFilters]);

  // Get selected companies for display
  const selectedCompanies = useMemo(() => {
    return companyIds
      .map((id) => sortedCompanies.find((c) => c.id === id))
      .filter((c): c is Company => c !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [companyIds, sortedCompanies]);

  // Auto-clean invalid company IDs from store
  useEffect(() => {
    if (sortedCompanies.length > 0 && companyIds.length > 0) {
      const validIds = new Set(sortedCompanies.map((c) => c.id));
      const cleanedIds = companyIds.filter((id) => validIds.has(id));
      if (cleanedIds.length !== companyIds.length) {
        setCompanyIds(cleanedIds);
      }
    }
  }, [sortedCompanies, companyIds, setCompanyIds]);

  // Handle company selection
  const handleToggleCompany = useCallback(
    (company: Company) => {
      toggleCompanyId(company.id);
      resetDashboardFilters();
    },
    [toggleCompanyId, resetDashboardFilters]
  );

  // Handle select all visible
  const handleSelectAll = useCallback(() => {
    const visibleIds = filteredCompanies.map((c) => c.id);
    const newIds = [...new Set([...companyIds, ...visibleIds])];
    setCompanyIds(newIds);
    resetDashboardFilters();
  }, [filteredCompanies, companyIds, setCompanyIds, resetDashboardFilters]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    clearCompanies();
    resetDashboardFilters();
  }, [clearCompanies, resetDashboardFilters]);

  // Compute a bounded highlighted index (must be before handleKeyDown)
  const boundedHighlightedIndex = useMemo(() => {
    if (filteredCompanies.length === 0) return 0;
    return Math.min(highlightedIndex, filteredCompanies.length - 1);
  }, [highlightedIndex, filteredCompanies.length]);

  // Open/close handlers
  const open = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
    setHighlightedIndex(0);
    setActiveTab('all');
    // Note: Don't reset statusFilters and kamFilters to persist between opens
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Keyboard navigation within the modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = filteredCompanies;
      const totalItems = items.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (totalItems > 0) {
            setHighlightedIndex((prev) => (prev + 1) % totalItems);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (totalItems > 0) {
            setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (items[boundedHighlightedIndex]) {
            handleToggleCompany(items[boundedHighlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          close();
          break;
      }
    },
    [filteredCompanies, boundedHighlightedIndex, handleToggleCompany, close]
  );

  // Global keyboard shortcut (Cmd+K to open, ESC to close)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, open, close]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const highlighted = listRef.current.querySelector('[data-highlighted="true"]');
      highlighted?.scrollIntoView({ block: 'nearest' });
    }
  }, [boundedHighlightedIndex]);

  // Reset highlighted index when tab changes
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setHighlightedIndex(0);
  }, []);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        close();
      }
    },
    [close]
  );

  // Display text for trigger button
  const displayText = useMemo(() => {
    if (companyIds.length === 0) {
      return 'Todos los negocios';
    }
    if (companyIds.length === 1) {
      return selectedCompanies[0]?.name || 'Compañía seleccionada';
    }
    return `${companyIds.length} compañías`;
  }, [companyIds.length, selectedCompanies]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={open}
        className={cn(
          'flex items-center gap-2 rounded-lg w-full',
          'bg-gray-100 hover:bg-gray-200 transition-colors',
          collapsed ? 'p-2 justify-center' : 'px-3 py-2.5',
          className
        )}
      >
        <Building2 className={cn('w-5 h-5 text-gray-600 shrink-0', collapsed && 'w-6 h-6')} />
        {!collapsed && (
          <>
            <span className="text-sm font-medium text-gray-900 truncate flex-1 text-left">
              {displayText}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </>
        )}
      </button>

      {/* Command Palette Modal */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={handleBackdropClick}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div
              ref={modalRef}
              className={cn(
                'relative w-full max-w-lg bg-white rounded-xl shadow-2xl',
                'animate-in fade-in zoom-in-95 duration-150',
                'flex flex-col max-h-[60vh]'
              )}
            >
              {/* Search Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar compañía..."
                  className="flex-1 text-sm outline-none placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                <button
                  onClick={close}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Tabs & Filters Row */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
                {/* Tabs */}
                <button
                  onClick={() => handleTabChange('all')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    activeTab === 'all'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Todos ({filteredCompanies.length})
                </button>
                <button
                  onClick={() => handleTabChange('selected')}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                    activeTab === 'selected'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Seleccionados ({selectedCompanies.length})
                </button>

                <div className="flex-1" />

                {/* Status Filter Dropdown */}
                <FilterDropdown
                  label="Status"
                  options={uniqueStatuses}
                  selected={statusFilters}
                  onChange={setStatusFilters}
                  getOptionLabel={(s) => statusLabels[s] || s}
                  getOptionStyle={(s) => statusConfig[s]}
                />

                {/* KAM Filter Dropdown */}
                <FilterDropdown
                  label="KAM"
                  options={uniqueKams}
                  selected={kamFilters}
                  onChange={setKamFilters}
                  getOptionLabel={(k) => k.split(' ')[0]}
                  getOptionTitle={(k) => k}
                />
              </div>

              {/* Content */}
              <div ref={listRef} className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    Cargando compañías...
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    {activeTab === 'selected'
                      ? 'No hay compañías seleccionadas'
                      : `No se encontraron compañías para "${searchQuery}"`}
                  </div>
                ) : (
                  <div className="py-2">
                    {filteredCompanies.map((company, index) => (
                      <CompanyItem
                        key={company.id}
                        company={company}
                        isSelected={companyIds.includes(company.id)}
                        isHighlighted={index === boundedHighlightedIndex}
                        onSelect={() => handleToggleCompany(company)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">↑↓</kbd>
                    navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">↵</kbd>
                    seleccionar
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={companyIds.length === 0}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      companyIds.length > 0
                        ? 'text-error-600 hover:bg-error-50'
                        : 'text-gray-400 cursor-not-allowed'
                    )}
                  >
                    Borrar
                  </button>
                  <button
                    onClick={close}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium',
                      'bg-gradient-to-b from-primary-500 to-primary-600 text-white',
                      'shadow-sm shadow-primary-600/30',
                      'hover:from-primary-600 hover:to-primary-700',
                      'active:from-primary-700 active:to-primary-800',
                      'transition-all duration-150'
                    )}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Status tag styles - with shadow effect
const statusConfig: Record<string, { text: string; bg: string; shadow: string }> = {
  'Cliente Activo': {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    shadow: 'shadow-[0_1px_3px_rgba(16,185,129,0.25)]',
  },
  'Onboarding': {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    shadow: 'shadow-[0_1px_3px_rgba(245,158,11,0.25)]',
  },
  'Stand By': {
    text: 'text-gray-600',
    bg: 'bg-gray-100',
    shadow: 'shadow-[0_1px_3px_rgba(107,114,128,0.25)]',
  },
  'PiP': {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    shadow: 'shadow-[0_1px_3px_rgba(244,63,94,0.25)]',
  },
};

// Status short labels for compact display
const statusLabels: Record<string, string> = {
  'Cliente Activo': 'Activo',
  'Onboarding': 'Onboarding',
  'Stand By': 'Stand By',
  'PiP': 'PiP',
};

// Company Item Component
function CompanyItem({
  company,
  isSelected,
  isHighlighted,
  onSelect,
}: {
  company: Company;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      data-highlighted={isHighlighted}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5',
        'text-left transition-colors',
        isHighlighted ? 'bg-primary-50' : 'hover:bg-gray-50',
        isSelected && !isHighlighted && 'bg-primary-50/50'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          'text-sm font-semibold',
          isSelected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
        )}
      >
        {company.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.name}
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          company.name.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-medium truncate', isSelected && 'text-primary-700')}>
            {company.name}
          </p>
          {company.status && (() => {
            const config = statusConfig[company.status];
            return (
              <span
                className={cn(
                  'text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded',
                  config?.text || 'text-gray-600',
                  config?.bg || 'bg-gray-100',
                  config?.shadow || ''
                )}
              >
                {statusLabels[company.status] || company.status}
              </span>
            );
          })()}
        </div>
        {company.keyAccountManager && (
          <p className="text-[10px] text-gray-400 italic truncate mt-0.5">
            {company.keyAccountManager}
          </p>
        )}
      </div>

      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
          isSelected
            ? 'bg-primary-500 border-primary-500 text-white'
            : 'border-gray-300 bg-white'
        )}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </div>
    </button>
  );
}

// Multi-select Filter Dropdown Component
function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  getOptionLabel,
  getOptionTitle,
  getOptionStyle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  getOptionLabel?: (option: string) => string;
  getOptionTitle?: (option: string) => string;
  getOptionStyle?: (option: string) => { text: string; bg: string; shadow: string } | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  };

  const displayLabel = selected.length === 0
    ? label
    : selected.length === 1
      ? (getOptionLabel?.(selected[0]) || selected[0])
      : `${label} (${selected.length})`;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors',
          selected.length > 0
            ? 'bg-primary-50 text-primary-700 border border-primary-200'
            : 'text-gray-600 hover:bg-gray-100 border border-transparent'
        )}
      >
        <span className="max-w-[80px] truncate">{displayLabel}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-10 min-w-[140px] py-1">
          {options.map((option) => {
            const isActive = selected.includes(option);
            const style = getOptionStyle?.(option);
            return (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                title={getOptionTitle?.(option)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
                  'hover:bg-gray-50'
                )}
              >
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                    isActive
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-gray-300 bg-white'
                  )}
                >
                  {isActive && <Check className="w-2.5 h-2.5" />}
                </div>
                <span
                  className={cn(
                    'truncate',
                    style && isActive ? style.text : 'text-gray-700'
                  )}
                >
                  {getOptionLabel?.(option) || option}
                </span>
              </button>
            );
          })}
          {selected.length > 0 && (
            <>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => onChange([])}
                className="w-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 text-left"
              >
                Limpiar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
