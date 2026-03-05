import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, X, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { COMPETITOR_CATEGORIES, CATEGORY_EMOJIS } from '../../config/onboardingSchema';

interface PlatformCategoriesFieldProps {
  prefix: string;
  fieldData: Record<string, unknown>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
}

export function PlatformCategoriesField({
  prefix,
  fieldData,
  onFieldChange,
  disabled,
}: PlatformCategoriesFieldProps) {
  // Gather all competitor categories into a deduplicated set
  const competitorCategories = useMemo(() => {
    const cats = new Set<string>();
    for (let n = 1; n <= 5; n++) {
      const arr = fieldData[`competitor_${n}_categories`];
      if (Array.isArray(arr)) {
        for (const cat of arr) {
          if (typeof cat === 'string') cats.add(cat);
        }
      }
    }
    return Array.from(cats).sort();
  }, [fieldData]);

  const suggestedKey = `${prefix}_suggested_categories`;
  const suggested = (fieldData[suggestedKey] as string[]) || [];

  const removeSuggested = useCallback(
    (cat: string) => {
      if (disabled) return;
      onFieldChange(suggestedKey, suggested.filter((c) => c !== cat));
    },
    [suggested, suggestedKey, onFieldChange, disabled]
  );

  const addSuggested = useCallback(
    (cat: string) => {
      if (disabled || suggested.includes(cat)) return;
      onFieldChange(suggestedKey, [...suggested, cat]);
    },
    [suggested, suggestedKey, onFieldChange, disabled]
  );

  return (
    <div className="space-y-4 pt-2 border-t border-gray-100">
      {/* Competitor categories (read-only) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Categorías de la competencia
        </label>
        {competitorCategories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {competitorCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-600"
              >
                {CATEGORY_EMOJIS[cat] && <span>{CATEGORY_EMOJIS[cat]}</span>}
                {cat}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            No hay categorías de competidores registradas aún
          </p>
        )}
      </div>

      {/* Suggested categories (editable) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Categorías a incorporar
        </label>

        {suggested.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-100 border border-primary-300 text-xs text-primary-700 font-medium"
              >
                {CATEGORY_EMOJIS[cat] && <span>{CATEGORY_EMOJIS[cat]}</span>}
                {cat}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeSuggested(cat)}
                    className="ml-0.5 hover:text-primary-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {!disabled && (
          <CategoryPicker
            selected={suggested}
            onSelect={addSuggested}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// CATEGORY PICKER (dropdown with search)
// ============================================

interface CategoryPickerProps {
  selected: string[];
  onSelect: (cat: string) => void;
}

function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const filtered = COMPETITOR_CATEGORIES.filter((cat) =>
    cat.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen(!isOpen);
    if (isOpen) setSearch('');
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-xs text-left transition-colors',
          'flex items-center gap-2',
          isOpen
            ? 'border-primary-400 ring-2 ring-primary-300'
            : 'border-gray-200 hover:border-gray-300'
        )}
      >
        <Plus className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-400">Añadir categoría a incorporar...</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoría..."
                autoFocus
                className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>
          </div>

          <div className="p-1.5">
            {filtered.map((cat) => {
              const isSelected = selected.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    if (!isSelected) {
                      onSelect(cat);
                    }
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2',
                    isSelected
                      ? 'bg-primary-50 text-primary-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <span>{CATEGORY_EMOJIS[cat] || '🏪'}</span>
                  <span className="flex-1">{cat}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-600" />}
                </button>
              );
            })}

            {filtered.length === 0 && search && (
              <div className="px-2.5 py-3 text-center">
                <p className="text-xs text-gray-500 mb-2">No se encontró &quot;{search}&quot;</p>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(search.trim());
                    setSearch('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Añadir &quot;{search.trim()}&quot;
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
