/**
 * Shared helper functions for export utilities.
 *
 * @module utils/export/helpers
 */

import type { AuditExportField } from './types';

export const formatDate = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};

export const formatNumber = (n: number): string => {
  if (!n || isNaN(n)) return '0';
  return n.toLocaleString('es-ES');
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export function formatFieldValue(field: AuditExportField): string {
  const { value, type, maxScore, scoreLabels } = field;

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  switch (type) {
    case 'checkbox':
      return value ? 'Si' : 'No';
    case 'score':
    case 'rating':
      if (typeof value === 'number') {
        const label = scoreLabels?.[value - 1] || '';
        return `${value}/${maxScore || 5}${label ? ` (${label})` : ''}`;
      }
      return '-';
    case 'number':
      return typeof value === 'number' ? formatNumber(value) : String(value);
    case 'multiselect':
    case 'multi_select':
    case 'tag_input':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'datetime':
      if (typeof value === 'string') {
        try {
          const date = new Date(value);
          return date.toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
        } catch {
          return String(value);
        }
      }
      return '-';
    case 'time':
      return typeof value === 'string' ? value : '-';
    case 'company_select':
    case 'user_select':
      return typeof value === 'string' ? value : '-';
    case 'file':
    case 'image_upload':
      if (Array.isArray(value) && value.length > 0) {
        const files = value as { name: string }[];
        return `${files.length} archivo(s): ${files.map((f) => f.name).join(', ')}`;
      }
      return '-';
    case 'text':
    case 'textarea':
    case 'select':
    default:
      return String(value);
  }
}
