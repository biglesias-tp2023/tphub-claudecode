// ============================================
// AUDITS (Sistema de Auditorías)
// ============================================

import type { Company, Brand, Restaurant, Area } from './entity';

export type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'delivered';

export type AuditTypeSlug = 'mystery_shopper' | 'onboarding' | 'google_ads';

export type AuditFieldType =
  | 'checkbox'
  | 'score'
  | 'text'
  | 'select'
  | 'number'
  | 'multiselect'
  | 'datetime'        // Date and time picker
  | 'time'            // Time picker only
  | 'company_select'  // Dropdown from companies table
  | 'user_select'     // Dropdown from profiles table
  | 'file';           // File/image upload

/**
 * Configuration for a single field in an audit form
 */
export interface AuditField {
  key: string;
  label: string;
  type: AuditFieldType;
  required?: boolean;
  options?: string[];           // For select/multiselect
  maxScore?: number;            // For score (default 5)
  scoreLabels?: string[];       // Labels for each score level
  placeholder?: string;
}

/**
 * Section within an audit form
 */
export interface AuditSection {
  key: string;
  title: string;
  description?: string;
  icon?: string;                // Lucide icon name
  fields: AuditField[];
}

/**
 * Schema defining the structure of an audit form
 */
export interface AuditFieldSchema {
  sections: AuditSection[];
}

/**
 * Audit type definition (e.g., Delivery, Google Ads, Mystery Shopper)
 */
export interface AuditType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  fieldSchema: AuditFieldSchema;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

/**
 * Main audit record - CRP nomenclature
 */
export interface Audit {
  pkIdAudit: string;            // Primary key
  pfkIdCompany: string | null;  // Company ID (CRP Portal)
  pfkIdStore: string | null;    // Brand/Store ID (CRP Portal)
  pfkIdPortal: string | null;   // Platform (glovo, ubereats, justeat)
  pfkIdAuditType: string;       // Audit type FK
  desAuditNumber: string;       // Audit reference number (MS-YYYYMMDD-Client)
  desStatus: AuditStatus;       // Status (draft, in_progress, completed, delivered)
  desTitle: string | null;      // Title
  desNotes: string | null;      // Notes
  desConsultant: string | null; // Consultant name (text)
  desKamEvaluator: string | null; // KAM name (text)
  desFieldData: Record<string, unknown> | null; // Form field data
  amtScoreTotal: number | null; // Total score
  tdCreatedAt: string;          // Created timestamp
  tdUpdatedAt: string;          // Updated timestamp
  tdScheduledDate: string | null; // Scheduled date
  tdCompletedAt: string | null; // Completed timestamp
  tdDeliveredAt: string | null; // Delivered timestamp
  pfkCreatedBy: string | null;  // Created by user
  pfkUpdatedBy: string | null;  // Updated by user
}

/**
 * Individual field response in an audit - CRP nomenclature
 */
export type AuditResponseFieldType = 'rating' | 'text' | 'select' | 'multi_select' | 'number' | 'date' | 'time' | 'image';

export interface AuditResponse {
  pkIdResponse: string;         // Primary key
  pfkIdAudit: string;           // Audit FK
  desSection: string;           // Section name
  desFieldKey: string;          // Field key
  desFieldType: AuditResponseFieldType; // Field type
  desValueText: string | null;  // Text value
  amtValueNumber: number | null; // Number value
  tdCreatedAt: string;          // Created timestamp
  tdUpdatedAt: string;          // Updated timestamp
}

/**
 * Image uploaded in an audit - CRP nomenclature
 */
export interface AuditImage {
  pkIdImage: string;            // Primary key
  pfkIdAudit: string;           // Audit FK
  desFieldKey: string;          // Field key
  desStoragePath: string;       // Storage path
  desFileName: string;          // File name
  desMimeType: string | null;   // MIME type
  numFileSize: number | null;   // File size in bytes
  numSortOrder: number;         // Sort order
  tdCreatedAt: string;          // Created timestamp
}

/**
 * Audit with joined details for display
 */
export interface AuditWithDetails extends Audit {
  auditType?: AuditType;
  company?: Company;
  brand?: Brand;
  address?: Restaurant;  // Using Restaurant type for address data
  area?: Area;
  portal?: { id: string; name: string };
  createdByProfile?: { fullName: string; avatarUrl: string | null };
}

/**
 * Input type for creating/updating audits - CRP nomenclature
 */
export interface AuditInput {
  pfkIdCompany?: string;        // Company ID (CRP Portal)
  pfkIdStore?: string;          // Brand/Store ID (CRP Portal)
  pfkIdPortal?: string;         // Platform (glovo, ubereats, justeat)
  pfkIdAuditType: string;       // Audit type FK
  desAuditNumber?: string;      // Audit reference number
  desTitle?: string;            // Title
  desNotes?: string;            // Notes
  desConsultant?: string;       // Consultant name (text)
  desKamEvaluator?: string;     // KAM name (text)
  desFieldData?: Record<string, unknown>; // Form field data
  desStatus?: AuditStatus;      // Status
  tdScheduledDate?: string;     // Scheduled date
}

/**
 * Database row type for audit_types
 */
export interface DbAuditType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  field_schema: AuditFieldSchema;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

/**
 * Database row type for audits - CRP nomenclature
 */
export interface DbAudit {
  pk_id_audit: string;
  pfk_id_company: string | null;
  pfk_id_store: string | null;
  pfk_id_portal: string | null;
  pfk_id_audit_type: string;
  des_audit_number: string;
  des_status: string;
  des_title: string | null;
  des_notes: string | null;
  des_consultant: string | null;
  des_kam_evaluator: string | null;
  des_field_data: Record<string, unknown> | null;
  amt_score_total: number | null;
  td_created_at: string;
  td_updated_at: string;
  td_scheduled_date: string | null;
  td_completed_at: string | null;
  td_delivered_at: string | null;
  pfk_created_by: string | null;
  pfk_updated_by: string | null;
}

/**
 * Database row type for audit_responses - CRP nomenclature
 */
export interface DbAuditResponse {
  pk_id_response: string;
  pfk_id_audit: string;
  des_section: string;
  des_field_key: string;
  des_field_type: string;
  des_value_text: string | null;
  amt_value_number: number | null;
  td_created_at: string;
  td_updated_at: string;
}

/**
 * Database row type for audit_images - CRP nomenclature
 */
export interface DbAuditImage {
  pk_id_image: string;
  pfk_id_audit: string;
  des_field_key: string;
  des_storage_path: string;
  des_file_name: string;
  des_mime_type: string | null;
  num_file_size: number | null;
  num_sort_order: number;
  td_created_at: string;
}
