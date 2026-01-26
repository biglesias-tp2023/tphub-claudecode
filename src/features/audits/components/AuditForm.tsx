import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/utils/cn';
import { FieldRenderer } from './fields';
import { calculateAuditCompletion } from '../config';
import type { AuditType, AuditSection } from '@/types';

interface AuditFormProps {
  auditType: AuditType;
  fieldData: Record<string, unknown>;
  onChange: (fieldData: Record<string, unknown>) => void;
  disabled?: boolean;
  autoSave?: boolean;
  onAutoSave?: () => void;
}

export function AuditForm({
  auditType,
  fieldData,
  onChange,
  disabled,
  autoSave,
  onAutoSave,
}: AuditFormProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(auditType.fieldSchema.sections.map((s) => s.key))
  );

  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  }, []);

  const handleFieldChange = useCallback(
    (fieldKey: string, value: unknown) => {
      const newData = { ...fieldData, [fieldKey]: value };
      onChange(newData);

      // Trigger autosave if enabled
      if (autoSave && onAutoSave) {
        onAutoSave();
      }
    },
    [fieldData, onChange, autoSave, onAutoSave]
  );

  const completion = calculateAuditCompletion(auditType, fieldData);

  // Get icon component by name
  const getIconComponent = (iconName: string | undefined) => {
    if (!iconName) return null;
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progreso del formulario</span>
          <span className="text-sm font-bold text-primary-600">{completion}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {auditType.fieldSchema.sections.map((section) => (
        <SectionCard
          key={section.key}
          section={section}
          fieldData={fieldData}
          expanded={expandedSections.has(section.key)}
          onToggle={() => toggleSection(section.key)}
          onFieldChange={handleFieldChange}
          disabled={disabled}
          getIconComponent={getIconComponent}
        />
      ))}
    </div>
  );
}

interface SectionCardProps {
  section: AuditSection;
  fieldData: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
  getIconComponent: (iconName: string | undefined) => React.ReactNode;
}

function SectionCard({
  section,
  fieldData,
  expanded,
  onToggle,
  onFieldChange,
  disabled,
  getIconComponent,
}: SectionCardProps) {
  // Calculate section completion
  const completedFields = section.fields.filter((field) => {
    const value = fieldData[field.key];
    return value !== undefined && value !== null && value !== '';
  }).length;
  const totalFields = section.fields.length;
  const sectionCompletion = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left',
          'hover:bg-gray-50 transition-colors'
        )}
      >
        <div className="flex items-center gap-3">
          {section.icon && (
            <div className="text-primary-500">
              {getIconComponent(section.icon)}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-gray-500">{section.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Section progress badge */}
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              sectionCompletion === 100
                ? 'bg-green-100 text-green-700'
                : sectionCompletion > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
            )}
          >
            {completedFields}/{totalFields}
          </span>

          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Section content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {section.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={fieldData[field.key]}
              onChange={(value) => onFieldChange(field.key, value)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
