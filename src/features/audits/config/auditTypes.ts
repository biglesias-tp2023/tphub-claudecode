/**
 * Audit Types Configuration
 *
 * Helper functions and constants for working with audit types
 */

import type { AuditStatus, AuditType } from '@/types';

// ============================================
// AUDIT STATUS CONFIG
// ============================================

export interface AuditStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const AUDIT_STATUS_CONFIG: Record<AuditStatus, AuditStatusConfig> = {
  draft: {
    label: 'Borrador',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: 'FileEdit',
  },
  in_progress: {
    label: 'En progreso',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: 'Clock',
  },
  completed: {
    label: 'Completada',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'CheckCircle',
  },
  delivered: {
    label: 'Entregada',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'Send',
  },
};

// ============================================
// AUDIT TYPE ICONS
// ============================================

export const AUDIT_TYPE_ICONS: Record<string, string> = {
  onboarding: 'Rocket',
  google_ads: 'BarChart3',
  mystery_shopper: 'UserSearch',
  packaging: 'Package',
  presencia_digital: 'Globe',
};

// Type card configurations for the new audit modal
export interface AuditTypeCardConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  color: string;
  bgColor: string;
}

export const AUDIT_TYPE_CARDS: AuditTypeCardConfig[] = [
  {
    slug: 'mystery_shopper',
    name: 'Mystery Shopper',
    description: 'Evalúa producto y experiencia de compra',
    icon: 'UserSearch',
    isActive: true,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    slug: 'onboarding',
    name: 'Onboarding',
    description: 'Ficha de cliente: competencia, horarios, perfiles y marketing',
    icon: 'Rocket',
    isActive: true,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    slug: 'google_ads',
    name: 'Google Ads',
    description: 'Auditoría de campañas de ads',
    icon: 'BarChart3',
    isActive: false,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    slug: 'packaging',
    name: 'Packaging',
    description: 'Evaluación de packaging y presentación de producto',
    icon: 'Package',
    isActive: false,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  {
    slug: 'presencia_digital',
    name: 'Presencia Digital',
    description: 'Auditoría de presencia en plataformas digitales',
    icon: 'Globe',
    isActive: false,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the status configuration for an audit status
 */
export function getAuditStatusConfig(status: AuditStatus): AuditStatusConfig {
  return AUDIT_STATUS_CONFIG[status] || AUDIT_STATUS_CONFIG.draft;
}

/**
 * Format audit number for display
 */
export function formatAuditNumber(auditNumber: string): string {
  return auditNumber;
}

/**
 * Type codes for audit nomenclature
 */
export const AUDIT_TYPE_CODES: Record<string, string> = {
  onboarding: 'OB',
  google_ads: 'GADS',
  mystery_shopper: 'MS',
};

/**
 * Generate audit number with new nomenclature: TYPE-YYYYMMDD-CLIENT
 * e.g., MS-20260122-Burmet
 */
export function generateAuditNumber(typeSlug: string, clientName: string): string {
  const typeCode = AUDIT_TYPE_CODES[typeSlug] || typeSlug.toUpperCase().slice(0, 4);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // Clean client name: remove special characters, limit to 15 chars
  const cleanClient = clientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars
    .slice(0, 15) || 'NA';

  return `${typeCode}-${dateStr}-${cleanClient}`;
}

/**
 * Get the scope label for an audit (Address, Brand, Company, or Area name)
 */
export function getAuditScopeLabel(audit: {
  company?: { name: string } | null;
  brand?: { name: string } | null;
  address?: { name: string } | null;
  area?: { name: string } | null;
}): string {
  if (audit.address?.name) return audit.address.name;
  if (audit.brand?.name) return audit.brand.name;
  if (audit.company?.name) return audit.company.name;
  if (audit.area?.name) return audit.area.name;
  return 'Sin asignar';
}

/**
 * Calculate audit completion percentage based on field data
 */
export function calculateAuditCompletion(
  auditType: AuditType,
  fieldData: Record<string, unknown> | null
): number {
  if (!fieldData) return 0;

  let totalRequired = 0;
  let completedRequired = 0;

  for (const section of auditType.fieldSchema.sections) {
    for (const field of section.fields) {
      if (field.required) {
        totalRequired++;
        const value = fieldData[field.key];
        if (value !== undefined && value !== null && value !== '') {
          completedRequired++;
        }
      }
    }
  }

  if (totalRequired === 0) return 100;
  return Math.round((completedRequired / totalRequired) * 100);
}

/**
 * Validate if all required fields are filled
 * Returns missingFields (labels) and firstMissingFieldKey for scrolling
 */
export function validateAuditFields(
  auditType: AuditType,
  fieldData: Record<string, unknown> | null
): { valid: boolean; missingFields: string[]; firstMissingFieldKey: string | null } {
  const missingFields: string[] = [];
  let firstMissingFieldKey: string | null = null;

  if (!fieldData) {
    for (const section of auditType.fieldSchema.sections) {
      for (const field of section.fields) {
        if (field.required) {
          missingFields.push(field.label);
          if (!firstMissingFieldKey) {
            firstMissingFieldKey = field.key;
          }
        }
      }
    }
    return { valid: missingFields.length === 0, missingFields, firstMissingFieldKey };
  }

  for (const section of auditType.fieldSchema.sections) {
    for (const field of section.fields) {
      if (field.required) {
        const value = fieldData[field.key];
        // Handle arrays (multiselect, file) - check if empty
        const isEmpty = Array.isArray(value)
          ? value.length === 0
          : value === undefined || value === null || value === '';

        if (isEmpty) {
          missingFields.push(field.label);
          if (!firstMissingFieldKey) {
            firstMissingFieldKey = field.key;
          }
        }
      }
    }
  }

  return { valid: missingFields.length === 0, missingFields, firstMissingFieldKey };
}

/**
 * Get a flat list of all fields from an audit type
 */
export function getAllFields(auditType: AuditType) {
  return auditType.fieldSchema.sections.flatMap((section) =>
    section.fields.map((field) => ({
      ...field,
      sectionKey: section.key,
      sectionTitle: section.title,
    }))
  );
}

/**
 * Get field value with proper type handling
 */
export function getFieldValue(
  fieldData: Record<string, unknown> | null,
  fieldKey: string,
  defaultValue: unknown = null
): unknown {
  if (!fieldData) return defaultValue;
  return fieldData[fieldKey] ?? defaultValue;
}

/**
 * Calculate total score from all score fields in an audit
 */
export function calculateTotalScore(
  auditType: AuditType,
  fieldData: Record<string, unknown> | null
): { obtained: number; maximum: number; percentage: number } {
  if (!fieldData) return { obtained: 0, maximum: 0, percentage: 0 };

  let obtained = 0;
  let maximum = 0;

  for (const section of auditType.fieldSchema.sections) {
    for (const field of section.fields) {
      if (field.type === 'score') {
        const maxScore = field.maxScore || 5;
        const value = fieldData[field.key];
        if (typeof value === 'number') {
          obtained += value;
          maximum += maxScore;
        }
      }
    }
  }

  return {
    obtained,
    maximum,
    percentage: maximum > 0 ? Math.round((obtained / maximum) * 100) : 0,
  };
}
