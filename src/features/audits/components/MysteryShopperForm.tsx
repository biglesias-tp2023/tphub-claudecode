import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  MYSTERY_SHOPPER_SECTIONS,
  calculateMysteryShopperCompletion,
  getSectionCompletion,
  type MysteryShopperSection,
  type MysteryShopperField,
} from '../config/mysteryShopperSchema';
import { RatingField } from './fields/RatingField';
import { ImageUploadField } from './fields/ImageUploadField';

interface ImageInfo {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface MysteryShopperFormProps {
  fieldData: Record<string, unknown>;
  onChange: (fieldData: Record<string, unknown>) => void;
  disabled?: boolean;
  auditId?: string;
  autoSave?: boolean;
  onAutoSave?: () => void;
}

export function MysteryShopperForm({
  fieldData,
  onChange,
  disabled,
  auditId,
  autoSave,
  onAutoSave,
}: MysteryShopperFormProps) {
  // First section expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general'])
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleFieldChange = useCallback(
    (fieldKey: string, value: unknown) => {
      const newData = { ...fieldData, [fieldKey]: value };
      onChange(newData);

      if (autoSave && onAutoSave) {
        onAutoSave();
      }
    },
    [fieldData, onChange, autoSave, onAutoSave]
  );

  const completion = calculateMysteryShopperCompletion(fieldData);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progreso del formulario
          </span>
          <span className="text-sm font-bold text-primary-600">{completion}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              completion === 100
                ? 'bg-green-500'
                : completion >= 50
                ? 'bg-primary-500'
                : 'bg-amber-500'
            )}
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {MYSTERY_SHOPPER_SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          fieldData={fieldData}
          expanded={expandedSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          onFieldChange={handleFieldChange}
          disabled={disabled}
          auditId={auditId}
        />
      ))}
    </div>
  );
}

interface SectionCardProps {
  section: MysteryShopperSection;
  fieldData: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
  auditId?: string;
}

function SectionCard({
  section,
  fieldData,
  expanded,
  onToggle,
  onFieldChange,
  disabled,
  auditId,
}: SectionCardProps) {
  const { completed, total } = getSectionCompletion(section, fieldData);
  const Icon = section.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left',
          'hover:bg-gray-50 transition-colors',
          'border-l-4 border-l-primary-500'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{section.title}</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Section progress badge */}
          {total > 0 && (
            <span
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-full',
                completed === total
                  ? 'bg-green-100 text-green-700'
                  : completed > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {completed}/{total}
            </span>
          )}

          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Section content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-5">
          {section.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={fieldData[field.key]}
              onChange={(value) => onFieldChange(field.key, value)}
              disabled={disabled || field.readOnly}
              auditId={auditId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FieldRendererProps {
  field: MysteryShopperField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  auditId?: string;
}

function FieldRenderer({ field, value, onChange, disabled, auditId }: FieldRendererProps) {
  const wrapWithId = (children: React.ReactNode) => (
    <div data-field-key={field.key} id={`field-${field.key}`}>
      {children}
    </div>
  );

  switch (field.type) {
    case 'text':
      return wrapWithId(
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </div>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          />
        </div>
      );

    case 'textarea':
      return wrapWithId(
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </div>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
            rows={3}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors resize-y min-h-[80px]',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          />
        </div>
      );

    case 'select':
      return wrapWithId(
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </div>
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
              'bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          >
            <option value="">Seleccionar...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );

    case 'multi_select':
      return wrapWithId(
        <MultiSelectField
          field={field}
          value={(value as string[]) || []}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'tag_input':
      return wrapWithId(
        <TagInputField
          field={field}
          value={(value as string[]) || []}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'number':
      return wrapWithId(
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </div>
          <div className="relative">
            <input
              type="number"
              value={value !== null && value !== undefined ? String(value) : ''}
              onChange={(e) => {
                const val = e.target.value;
                onChange(val === '' ? null : parseFloat(val));
              }}
              disabled={disabled}
              min={field.min}
              placeholder={field.placeholder}
              step="any"
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                field.suffix && 'pr-10',
                disabled
                  ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-white border-gray-200 text-gray-900'
              )}
            />
            {field.suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                {field.suffix}
              </span>
            )}
          </div>
        </div>
      );

    case 'date':
      return wrapWithId(
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </div>
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          />
        </div>
      );

    case 'datetime':
      return wrapWithId(
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            {field.required && <span className="text-red-500 text-xs">*</span>}
          </div>
          <input
            type="datetime-local"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
            disabled={disabled}
            className={cn(
              'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          />
        </div>
      );

    case 'rating':
      return wrapWithId(
        <RatingField
          field={field}
          value={value as number | null}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case 'image_upload':
      return wrapWithId(
        <ImageUploadField
          field={field}
          value={value as ImageInfo[] | null}
          onChange={onChange}
          disabled={disabled}
          auditId={auditId}
        />
      );

    default:
      return wrapWithId(
        <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-500">
          Campo no soportado: {field.type}
        </div>
      );
  }
}

interface MultiSelectFieldProps {
  field: MysteryShopperField;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

function MultiSelectField({ field, value = [], onChange, disabled }: MultiSelectFieldProps) {
  const toggleOption = (option: string) => {
    if (disabled) return;

    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {field.options?.map((option) => {
          const isSelected = value.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              disabled={disabled}
              className={cn(
                'px-3 py-2 rounded-lg border text-sm transition-all',
                isSelected
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <p className="text-xs text-gray-500">
          {value.length} seleccionado{value.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

interface TagInputFieldProps {
  field: MysteryShopperField;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

function TagInputField({ field, value = [], onChange, disabled }: TagInputFieldProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    if (disabled) return;
    onChange(value.filter((v) => v !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors flex flex-wrap gap-1.5 min-h-[42px] cursor-text',
          'focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-400',
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
            : 'bg-white border-gray-200'
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-50 border border-primary-200 text-primary-700 text-xs font-medium"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="text-primary-400 hover:text-primary-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          disabled={disabled}
          placeholder={value.length === 0 ? field.placeholder : 'Añadir restaurante...'}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed py-0.5"
        />
      </div>

      {value.length > 0 && (
        <p className="text-xs text-gray-500">
          {value.length} restaurante{value.length > 1 ? 's' : ''} listado{value.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
