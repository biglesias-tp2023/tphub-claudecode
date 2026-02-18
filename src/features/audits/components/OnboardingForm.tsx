import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  ONBOARDING_SECTIONS,
  DAYS,
  MEAL_PERIODS,
  calculateOnboardingCompletion,
  getOnboardingSectionCompletion,
  type OnboardingSection,
  type OnboardingField,
} from '../config/onboardingSchema';

interface OnboardingFormProps {
  fieldData: Record<string, unknown>;
  onChange: (fieldData: Record<string, unknown>) => void;
  disabled?: boolean;
  autoSave?: boolean;
  onAutoSave?: () => void;
}

export function OnboardingForm({
  fieldData,
  onChange,
  disabled,
  autoSave,
  onAutoSave,
}: OnboardingFormProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['contact'])
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

  const completion = calculateOnboardingCompletion(fieldData);

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
      {ONBOARDING_SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          fieldData={fieldData}
          expanded={expandedSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          onFieldChange={handleFieldChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

// ============================================
// SECTION CARD
// ============================================

interface SectionCardProps {
  section: OnboardingSection;
  fieldData: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
}

function SectionCard({
  section,
  fieldData,
  expanded,
  onToggle,
  onFieldChange,
  disabled,
}: SectionCardProps) {
  const { completed, total } = getOnboardingSectionCompletion(section, fieldData);
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
          {section.id === 'schedule' ? (
            <ScheduleGrid
              fieldData={fieldData}
              onFieldChange={onFieldChange}
              disabled={disabled}
            />
          ) : (
            section.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={fieldData[field.key]}
                onChange={(value) => onFieldChange(field.key, value)}
                disabled={disabled}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// SCHEDULE GRID (Special rendering for Horarios)
// ============================================

interface ScheduleGridProps {
  fieldData: Record<string, unknown>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
}

function ScheduleGrid({ fieldData, onFieldChange, disabled }: ScheduleGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 pr-3 font-medium text-gray-700 whitespace-nowrap" />
            {DAYS.map((day) => (
              <th
                key={day.key}
                className="text-center py-2 px-1 font-medium text-gray-700 whitespace-nowrap min-w-[48px]"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEAL_PERIODS.map((period) => (
            <tr key={period.key} className="border-t border-gray-100">
              <td className="py-3 pr-3 font-medium text-gray-700 whitespace-nowrap">
                {period.label}
              </td>
              {DAYS.map((day) => {
                const key = `schedule_${period.key}_${day.key}`;
                const checked = !!fieldData[key];
                return (
                  <td key={day.key} className="py-3 px-1 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onFieldChange(key, e.target.checked)}
                      disabled={disabled}
                      className={cn(
                        'w-5 h-5 rounded border-gray-300 text-primary-600',
                        'focus:ring-2 focus:ring-primary-300 focus:ring-offset-0',
                        disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// FIELD RENDERER
// ============================================

interface FieldRendererProps {
  field: OnboardingField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function FieldRenderer({ field, value, onChange, disabled }: FieldRendererProps) {
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

    case 'checkbox':
      return wrapWithId(
        <label
          className={cn(
            'flex items-center gap-3 py-1 cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className={cn(
              'w-5 h-5 rounded border-gray-300 text-primary-600',
              'focus:ring-2 focus:ring-primary-300 focus:ring-offset-0'
            )}
          />
          <span className="text-sm text-gray-700">{field.label}</span>
        </label>
      );

    default:
      return wrapWithId(
        <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-500">
          Campo no soportado: {field.type}
        </div>
      );
  }
}

// ============================================
// MULTI SELECT FIELD
// ============================================

interface MultiSelectFieldProps {
  field: OnboardingField;
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
