import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ContactSelectField } from './fields/ContactSelectField';
import { MarginCalculatorField } from './fields/MarginCalculatorField';
import { CompetitorCardField } from './fields/CompetitorCardField';
import { PlatformCategoriesField } from './fields/PlatformCategoriesField';
import {
  ONBOARDING_SECTIONS,
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
  companyId?: string;
  companyCommissions?: { glovo: number | null; ubereats: number | null };
}

export function OnboardingForm({
  fieldData,
  onChange,
  disabled,
  autoSave,
  onAutoSave,
  companyId,
  companyCommissions,
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
          companyId={companyId}
          companyCommissions={companyCommissions}
        />
      ))}
    </div>
  );
}

// ============================================
// SECTION CARD
// ============================================

const SECTION_LOGOS: Record<string, string> = {
  profile_glovo: '/images/platforms/glovo.png',
  profile_ubereats: '/images/platforms/ubereats.png',
  profile_justeat: '/images/platforms/justeat.webp',
};

const PLATFORM_PREFIXES: Record<string, string> = {
  profile_glovo: 'glovo',
  profile_ubereats: 'ubereats',
  profile_justeat: 'justeat',
};

interface SectionCardProps {
  section: OnboardingSection;
  fieldData: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
  companyId?: string;
  companyCommissions?: { glovo: number | null; ubereats: number | null };
}

function SectionCard({
  section,
  fieldData,
  expanded,
  onToggle,
  onFieldChange,
  disabled,
  companyId,
  companyCommissions,
}: SectionCardProps) {
  const { completed, total } = getOnboardingSectionCompletion(section, fieldData);
  const Icon = section.icon;
  const logo = SECTION_LOGOS[section.id];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
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
          {logo ? (
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
              <img src={logo} alt={section.title} className="w-7 h-7 object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
          )}
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
          {section.id === 'competition' ? (
            <CompetitorCardField
              fieldData={fieldData}
              onFieldChange={onFieldChange}
              disabled={disabled}
            />
          ) : section.id === 'brand_presence' ? (
            <BrandPresenceFields
              section={section}
              fieldData={fieldData}
              onFieldChange={onFieldChange}
              disabled={disabled}
              companyId={companyId}
            />
          ) : (
            <>
              {(() => {
                const platformPrefix = PLATFORM_PREFIXES[section.id];
                const logoKey = platformPrefix ? `${platformPrefix}_logo` : '';
                const logoQualityKey = platformPrefix ? `${platformPrefix}_logo_quality` : '';
                const suggestedKey = platformPrefix ? `${platformPrefix}_suggested_categories` : '';
                const fields = section.fields.filter(
                  (f) => f.key !== logoKey && f.key !== logoQualityKey && f.key !== suggestedKey
                );

                return (
                  <>
                    {fields.map((field) =>
                      field.type === 'margin_calculator' ? (
                        <MarginCalculatorField
                          key={field.key}
                          fieldData={fieldData}
                          onFieldChange={onFieldChange}
                          disabled={disabled}
                          companyCommissions={companyCommissions ?? { glovo: null, ubereats: null }}
                        />
                      ) : field.key === (platformPrefix ? `${platformPrefix}_description` : '') ? (
                        <React.Fragment key={field.key}>
                          {/* Logo + Logo quality side by side */}
                          {platformPrefix && (() => {
                            const logoField = section.fields.find((f) => f.key === logoKey);
                            const qualityField = section.fields.find((f) => f.key === logoQualityKey);
                            if (!logoField || !qualityField) return null;
                            return (
                              <div className="grid grid-cols-2 gap-4">
                                <FieldRenderer
                                  field={logoField}
                                  value={fieldData[logoField.key]}
                                  onChange={(value) => onFieldChange(logoField.key, value)}
                                  disabled={disabled}
                                  companyId={companyId}
                                />
                                <FieldRenderer
                                  field={qualityField}
                                  value={fieldData[qualityField.key]}
                                  onChange={(value) => onFieldChange(qualityField.key, value)}
                                  disabled={disabled}
                                  companyId={companyId}
                                />
                              </div>
                            );
                          })()}
                          {/* Description field */}
                          <FieldRenderer
                            field={field}
                            value={fieldData[field.key]}
                            onChange={(value) => onFieldChange(field.key, value)}
                            disabled={disabled}
                            companyId={companyId}
                          />
                        </React.Fragment>
                      ) : (
                        <FieldRenderer
                          key={field.key}
                          field={field}
                          value={fieldData[field.key]}
                          onChange={(value) => onFieldChange(field.key, value)}
                          disabled={disabled}
                          companyId={companyId}
                        />
                      )
                    )}
                  </>
                );
              })()}
              {PLATFORM_PREFIXES[section.id] && (
                <PlatformCategoriesField
                  prefix={PLATFORM_PREFIXES[section.id]}
                  fieldData={fieldData}
                  onFieldChange={onFieldChange}
                  disabled={disabled}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// BRAND PRESENCE SECTION (La Marca)
// ============================================

const ADS_STATES = ['Inactivo', 'Activo', 'Interesado en activarlo'] as const;

const ADS_STATE_STYLES: Record<string, string> = {
  'Activo': 'bg-green-500 text-white',
  'Inactivo': 'bg-gray-200 text-gray-700',
  'Interesado en activarlo': 'bg-amber-400 text-white',
};

interface BrandRowConfig {
  textKey: string;
  adsKey: string;
  icon: string;
  adsIcon: string;
  adsLabel: string;
}

const BRAND_ROWS: BrandRowConfig[] = [
  {
    textKey: 'google_my_business',
    adsKey: 'google_ads_interest',
    icon: '/images/platforms/google-my-business.png',
    adsIcon: '/images/platforms/google-ads.png',
    adsLabel: 'Google ADS',
  },
  {
    textKey: 'instagram',
    adsKey: 'instagram_meta_ads',
    icon: '/images/platforms/instagram.png',
    adsIcon: '/images/platforms/meta-ads.png',
    adsLabel: 'Meta ADS',
  },
  {
    textKey: 'tiktok',
    adsKey: 'tiktok_ads',
    icon: '/images/platforms/tiktok.webp',
    adsIcon: '/images/platforms/tiktok.webp',
    adsLabel: 'TikTok ADS',
  },
];

const BRAND_CUSTOM_KEYS = new Set([
  'google_my_business', 'google_ads_interest',
  'instagram', 'instagram_meta_ads',
  'tiktok', 'tiktok_ads',
  'website',
]);

interface BrandPresenceFieldsProps {
  section: OnboardingSection;
  fieldData: Record<string, unknown>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
  disabled?: boolean;
  companyId?: string;
}

function BrandPresenceFields({
  section,
  fieldData,
  onFieldChange,
  disabled,
  companyId,
}: BrandPresenceFieldsProps) {
  const remainingFields = section.fields.filter((f) => !BRAND_CUSTOM_KEYS.has(f.key));

  return (
    <>
      {/* GMB + Google ADS / Instagram + Meta ADS / TikTok + TikTok ADS */}
      {BRAND_ROWS.map(({ textKey, adsKey, icon, adsIcon, adsLabel }) => {
        const textField = section.fields.find((f) => f.key === textKey);
        if (!textField) return null;
        const adsValue = (fieldData[adsKey] as string) || 'Inactivo';

        return (
          <div key={textKey} className="flex items-end gap-3">
            <div className="flex-1">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <img src={icon} alt="" className="w-4 h-4 object-contain" />
                  <label className="text-sm font-medium text-gray-700">{textField.label}</label>
                </div>
                <input
                  type="text"
                  value={(fieldData[textKey] as string) || ''}
                  onChange={(e) => onFieldChange(textKey, e.target.value)}
                  disabled={disabled}
                  placeholder={textField.placeholder}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
                    disabled
                      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-white border-gray-200 text-gray-900'
                  )}
                />
              </div>
            </div>
            <div className="space-y-1 flex-shrink-0">
              <div className="flex items-center gap-1.5 justify-end">
                <img src={adsIcon} alt="" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[11px] font-medium text-gray-500">{adsLabel}</span>
              </div>
              <div className="inline-flex rounded-lg overflow-hidden border border-gray-200">
                {ADS_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => { if (!disabled) onFieldChange(adsKey, state); }}
                    disabled={disabled}
                    className={cn(
                      'px-2 py-1.5 text-[10px] font-medium transition-all whitespace-nowrap',
                      adsValue === state
                        ? ADS_STATE_STYLES[state]
                        : 'bg-white text-gray-300 hover:bg-gray-50',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {state === 'Interesado en activarlo' ? 'Interesado' : state}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Página web */}
      {(() => {
        const webField = section.fields.find((f) => f.key === 'website');
        if (!webField) return null;
        return (
          <FieldRenderer
            field={webField}
            value={fieldData[webField.key]}
            onChange={(value) => onFieldChange(webField.key, value)}
            disabled={disabled}
            companyId={companyId}
          />
        );
      })()}

      {/* Remaining fields: ecommerce, loyalty_program */}
      {remainingFields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={fieldData[field.key]}
          onChange={(value) => onFieldChange(field.key, value)}
          disabled={disabled}
          companyId={companyId}
        />
      ))}
    </>
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
  companyId?: string;
}

function FieldRenderer({ field, value, onChange, disabled, companyId }: FieldRendererProps) {
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

    case 'contact_select':
      return wrapWithId(
        <ContactSelectField
          field={{ key: field.key, label: field.label, type: 'contact_select', required: field.required, placeholder: field.placeholder }}
          value={value as string | null}
          onChange={onChange}
          disabled={disabled}
          companyId={companyId}
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
