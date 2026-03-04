import { useState, useCallback } from 'react';
import { Pencil, Check, X, Search, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { COMPETITOR_CATEGORIES, CATEGORY_EMOJIS } from '../../config/onboardingSchema';

interface CompetitorCardFieldProps {
  fieldData: Record<string, unknown>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
}

const COMPETITOR_ACTIONS = ['ADS', 'Promos', '2x1', 'Descuento %', 'Envío gratis', 'Happy Hour', 'Producto gratis'];

const ACTION_COLORS: Record<string, string> = {
  'ADS': 'bg-blue-50 text-blue-700 border-blue-200',
  'Promos': 'bg-purple-50 text-purple-700 border-purple-200',
  '2x1': 'bg-green-50 text-green-700 border-green-200',
  'Descuento %': 'bg-amber-50 text-amber-700 border-amber-200',
  'Envío gratis': 'bg-teal-50 text-teal-700 border-teal-200',
  'Happy Hour': 'bg-orange-50 text-orange-700 border-orange-200',
  'Producto gratis': 'bg-pink-50 text-pink-700 border-pink-200',
};

export function CompetitorCardField({
  fieldData,
  onFieldChange,
  disabled,
}: CompetitorCardFieldProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((n) => (
        <CompetitorCard
          key={n}
          index={n}
          fieldData={fieldData}
          onFieldChange={onFieldChange}
          disabled={disabled}
          isEditing={editingIndex === n}
          onEdit={() => setEditingIndex(n)}
          onSave={() => setEditingIndex(null)}
        />
      ))}
    </div>
  );
}

// ============================================
// SINGLE COMPETITOR CARD
// ============================================

interface CompetitorCardProps {
  index: number;
  fieldData: Record<string, unknown>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
}

function CompetitorCard({
  index,
  fieldData,
  onFieldChange,
  disabled,
  isEditing,
  onEdit,
  onSave,
}: CompetitorCardProps) {
  const prefix = `competitor_${index}`;
  const name = (fieldData[`${prefix}_name`] as string) || '';
  const categories = (fieldData[`${prefix}_categories`] as string[]) || [];
  const priceMin = fieldData[`${prefix}_price_min`] as number | null | undefined;
  const priceMax = fieldData[`${prefix}_price_max`] as number | null | undefined;
  const rating = fieldData[`${prefix}_rating`] as number | null | undefined;
  const reviews = fieldData[`${prefix}_reviews`] as number | null | undefined;
  const topProducts = (fieldData[`${prefix}_top_products`] as string) || '';
  const actions = (fieldData[`${prefix}_actions`] as string[]) || [];

  const firstCategoryEmoji = categories.length > 0
    ? CATEGORY_EMOJIS[categories[0]] || '🏪'
    : '🏪';

  const hasData = name || categories.length > 0 || priceMin != null || priceMax != null;

  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-primary-200 bg-white p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">
            {firstCategoryEmoji} Competidor {index}
          </h4>
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Guardar
          </button>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onFieldChange(`${prefix}_name`, e.target.value)}
            disabled={disabled}
            placeholder="Nombre del competidor"
            className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          />
        </div>

        {/* Categories */}
        <CategoryMultiSelect
          value={categories}
          onChange={(val) => onFieldChange(`${prefix}_categories`, val)}
          disabled={disabled}
        />

        {/* Price range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Precio mínimo</label>
            <div className="relative">
              <input
                type="number"
                value={priceMin != null ? String(priceMin) : ''}
                onChange={(e) => onFieldChange(`${prefix}_price_min`, e.target.value === '' ? null : parseFloat(e.target.value))}
                disabled={disabled}
                placeholder="0"
                step="any"
                className={cn(
                  'w-full px-3 py-2 pr-8 rounded-lg border text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  disabled
                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-200 text-gray-900'
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">€</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Precio máximo</label>
            <div className="relative">
              <input
                type="number"
                value={priceMax != null ? String(priceMax) : ''}
                onChange={(e) => onFieldChange(`${prefix}_price_max`, e.target.value === '' ? null : parseFloat(e.target.value))}
                disabled={disabled}
                placeholder="0"
                step="any"
                className={cn(
                  'w-full px-3 py-2 pr-8 rounded-lg border text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  disabled
                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-white border-gray-200 text-gray-900'
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">€</span>
            </div>
          </div>
        </div>

        {/* Rating & Reviews */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Valoración (0-5)</label>
            <input
              type="number"
              value={rating != null ? String(rating) : ''}
              onChange={(e) => onFieldChange(`${prefix}_rating`, e.target.value === '' ? null : parseFloat(e.target.value))}
              disabled={disabled}
              placeholder="4.5"
              min="0"
              max="5"
              step="0.1"
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                disabled
                  ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-900'
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Nº reseñas</label>
            <input
              type="number"
              value={reviews != null ? String(reviews) : ''}
              onChange={(e) => onFieldChange(`${prefix}_reviews`, e.target.value === '' ? null : parseFloat(e.target.value))}
              disabled={disabled}
              placeholder="422"
              step="1"
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                disabled
                  ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-900'
              )}
            />
          </div>
        </div>

        {/* Top Products */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Top ventas</label>
          <input
            type="text"
            value={topProducts}
            onChange={(e) => onFieldChange(`${prefix}_top_products`, e.target.value)}
            disabled={disabled}
            placeholder="Smash Cookie (4.5€), Batido (6€)"
            className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          />
          <p className="text-xs text-gray-400">Formato: Producto (precio), Producto (precio)</p>
        </div>

        {/* Actions */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Acciones</label>
          <div className="flex flex-wrap gap-1.5">
            {COMPETITOR_ACTIONS.map((action) => {
              const isSelected = actions.includes(action);
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    const next = isSelected
                      ? actions.filter((a) => a !== action)
                      : [...actions, action];
                    onFieldChange(`${prefix}_actions`, next);
                  }}
                  disabled={disabled}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    isSelected
                      ? ACTION_COLORS[action] || 'bg-primary-50 text-primary-700 border-primary-200'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {action}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // COLLAPSED / VIEW MODE
  // ============================================

  return (
    <div
      className={cn(
        'rounded-xl border bg-white transition-all',
        hasData
          ? 'border-gray-200 shadow-sm'
          : 'border-dashed border-gray-300'
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{firstCategoryEmoji}</span>
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {name || `Competidor ${index}`}
            </h4>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!hasData ? (
          <button
            type="button"
            onClick={disabled ? undefined : onEdit}
            disabled={disabled}
            className="w-full py-3 text-xs text-gray-400 hover:text-primary-600 transition-colors"
          >
            Click para añadir competidor
          </button>
        ) : (
          <>
            {/* Categories as hashtags */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="text-xs text-primary-600 font-medium"
                  >
                    #{cat}
                  </span>
                ))}
              </div>
            )}

            {/* Metrics row */}
            {(priceMin != null || priceMax != null || rating != null || reviews != null) && (
              <div className="flex items-center gap-3 text-xs text-gray-600 mb-3 flex-wrap">
                {(priceMin != null || priceMax != null) && (
                  <span className="flex items-center gap-1">
                    <span>💰</span>
                    {priceMin != null && priceMax != null
                      ? `${priceMin}€ - ${priceMax}€`
                      : priceMin != null
                      ? `${priceMin}€`
                      : `${priceMax}€`
                    }
                  </span>
                )}
                {rating != null && (
                  <span className="flex items-center gap-1">
                    <span>⭐</span>
                    {rating}
                  </span>
                )}
                {reviews != null && (
                  <span className="flex items-center gap-1">
                    <span>💬</span>
                    {reviews}
                  </span>
                )}
              </div>
            )}

            {/* Top products */}
            {topProducts && (
              <div className="mb-3">
                <span className="text-xs text-gray-500 block mb-1">Top ventas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {parseTopProducts(topProducts).map((product, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-700"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action badges */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {actions.map((action) => (
                  <span
                    key={action}
                    className={cn(
                      'inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium',
                      ACTION_COLORS[action] || 'bg-gray-50 text-gray-600 border-gray-200'
                    )}
                  >
                    {action}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// CATEGORY MULTI-SELECT WITH SEARCH
// ============================================

interface CategoryMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

function CategoryMultiSelect({ value, onChange, disabled }: CategoryMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');

  const filtered = COMPETITOR_CATEGORIES.filter((cat) =>
    cat.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCategory = useCallback(
    (cat: string) => {
      if (disabled) return;
      if (value.includes(cat)) {
        onChange(value.filter((v) => v !== cat));
      } else {
        onChange([...value, cat]);
      }
    },
    [value, onChange, disabled]
  );

  const addCustom = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setCustomInput('');
  }, [customInput, value, onChange]);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">Categorías</label>

      {/* Selected categories */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {value.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 border border-primary-200 text-xs text-primary-700"
            >
              {CATEGORY_EMOJIS[cat] && <span>{CATEGORY_EMOJIS[cat]}</span>}
              {cat}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="ml-0.5 hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Toggle dropdown */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-xs text-left transition-colors',
          'flex items-center gap-2',
          isOpen
            ? 'border-primary-400 ring-2 ring-primary-300'
            : 'border-gray-200 hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-400">Buscar o añadir categoría...</span>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {/* Search input */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar categoría..."
              autoFocus
              className="w-full px-2.5 py-1.5 rounded-md border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>

          {/* Category options */}
          <div className="p-1.5">
            {filtered.map((cat) => {
              const isSelected = value.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
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
                <p className="text-xs text-gray-500 mb-2">No se encontró "{search}"</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!value.includes(search.trim())) {
                      onChange([...value, search.trim()]);
                    }
                    setSearch('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Añadir "{search.trim()}"
                </button>
              </div>
            )}
          </div>

          {/* Custom input */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-2 flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Categoría custom..."
              className="flex-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customInput.trim()}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                customInput.trim()
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function parseTopProducts(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
