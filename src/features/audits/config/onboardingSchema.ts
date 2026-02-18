import {
  Phone,
  Swords,
  Clock,
  Store,
  Globe,
  Megaphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type OnboardingFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multi_select'
  | 'number'
  | 'checkbox';

export interface OnboardingField {
  key: string;
  label: string;
  type: OnboardingFieldType;
  options?: string[];
  required: boolean;
  placeholder?: string;
  suffix?: string;
}

export interface OnboardingSection {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: OnboardingField[];
}

// ============================================
// HELPERS FOR REPETITIVE BLOCKS
// ============================================

function createCompetitorFields(n: number): OnboardingField[] {
  return [
    { key: `competitor_${n}_name`, label: `Competidor ${n} - Nombre`, type: 'text', required: false, placeholder: 'Nombre del competidor' },
    { key: `competitor_${n}_actions`, label: `Competidor ${n} - Acciones`, type: 'multi_select', required: false, options: ['ADS', 'Promos', '2x1', 'Descuento %', 'Envío gratis', 'Happy Hour', 'Producto gratis'] },
    { key: `competitor_${n}_price_range`, label: `Competidor ${n} - Rango de precios`, type: 'text', required: false, placeholder: 'Ej: 8€ - 15€' },
    { key: `competitor_${n}_category`, label: `Competidor ${n} - Categoría`, type: 'text', required: false, placeholder: 'Ej: Hamburguesas, Sushi...' },
    { key: `competitor_${n}_reviews`, label: `Competidor ${n} - Nº reviews`, type: 'number', required: false, placeholder: 'Número de reseñas' },
    { key: `competitor_${n}_top_product`, label: `Competidor ${n} - Top ventas`, type: 'text', required: false, placeholder: 'Producto más vendido' },
  ];
}

function createPlatformProfileFields(prefix: string, platformName: string): OnboardingField[] {
  return [
    { key: `${prefix}_category`, label: 'Categoría', type: 'text', required: false, placeholder: `Categoría en ${platformName}` },
    { key: `${prefix}_logo`, label: 'Logo', type: 'select', required: false, options: ['Sí', 'No', 'N/A'] },
    { key: `${prefix}_logo_quality`, label: 'Calidad del logo', type: 'select', required: false, options: ['Alta', 'Media', 'Baja'] },
    { key: `${prefix}_description`, label: 'Descripción del perfil', type: 'select', required: false, options: ['Completa', 'Falta', 'N/A'] },
    { key: `${prefix}_banner_quality`, label: 'Calidad del banner', type: 'select', required: false, options: ['Alta', 'Media', 'Baja', 'N/A'] },
    { key: `${prefix}_product_photos`, label: 'Fotos de productos', type: 'select', required: false, options: ['Alta', 'Media', 'Baja', 'N/A'] },
    { key: `${prefix}_prices`, label: 'Precios vs competencia', type: 'select', required: false, options: ['Similares competencia', 'Superior', 'Inferior'] },
    { key: `${prefix}_notes`, label: 'Observaciones', type: 'textarea', required: false, placeholder: `Observaciones sobre el perfil en ${platformName}` },
  ];
}

function createCampaignFields(prefix: string, n: number, platformName: string): OnboardingField[] {
  return [
    { key: `${prefix}_campaign_${n}_name`, label: `Campaña ${n} - Nombre`, type: 'text', required: false, placeholder: `Nombre de la campaña ${n} en ${platformName}` },
    { key: `${prefix}_campaign_${n}_dates`, label: `Campaña ${n} - Fechas`, type: 'text', required: false, placeholder: 'Ej: 01/01 - 31/01' },
    { key: `${prefix}_campaign_${n}_status`, label: `Campaña ${n} - Estado`, type: 'select', required: false, options: ['Activa', 'Pausada', 'Finalizada', 'Programada'] },
    { key: `${prefix}_campaign_${n}_daily_budget`, label: `Campaña ${n} - Presupuesto diario`, type: 'number', required: false, suffix: '€' },
    { key: `${prefix}_campaign_${n}_mode`, label: `Campaña ${n} - Modo`, type: 'select', required: false, options: ['CPC', 'CPM', 'CPA', 'Automático'] },
    { key: `${prefix}_campaign_${n}_total_investment`, label: `Campaña ${n} - Inversión total`, type: 'number', required: false, suffix: '€' },
    { key: `${prefix}_campaign_${n}_gross_sales`, label: `Campaña ${n} - Ventas brutas`, type: 'number', required: false, suffix: '€' },
    { key: `${prefix}_campaign_${n}_orders`, label: `Campaña ${n} - Pedidos`, type: 'number', required: false },
    { key: `${prefix}_campaign_${n}_clicks`, label: `Campaña ${n} - Clicks`, type: 'number', required: false },
    { key: `${prefix}_campaign_${n}_impressions`, label: `Campaña ${n} - Impresiones`, type: 'number', required: false },
  ];
}

// ============================================
// SCHEDULE CONSTANTS
// ============================================

const DAYS = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mié' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

const MEAL_PERIODS = [
  { key: 'meal', label: 'Comidas' },
  { key: 'valley', label: 'Horas Valle' },
  { key: 'dinner', label: 'Cenas' },
];

export { DAYS, MEAL_PERIODS };

function createScheduleFields(): OnboardingField[] {
  const fields: OnboardingField[] = [];
  for (const period of MEAL_PERIODS) {
    for (const day of DAYS) {
      fields.push({
        key: `schedule_${period.key}_${day.key}`,
        label: `${period.label} - ${day.label}`,
        type: 'checkbox',
        required: false,
      });
    }
  }
  return fields;
}

// ============================================
// SECTIONS
// ============================================

export const ONBOARDING_SECTIONS: OnboardingSection[] = [
  // ============================================
  // SECTION 1: Información de Contacto
  // ============================================
  {
    id: 'contact',
    title: 'Información de Contacto',
    icon: Phone,
    fields: [
      { key: 'contact_name', label: 'Persona de contacto', type: 'text', required: true, placeholder: 'Nombre del punto de contacto' },
      { key: 'contact_phone', label: 'Teléfono', type: 'text', required: true, placeholder: 'Teléfono de contacto' },
      { key: 'target_margin', label: 'Margen objetivo', type: 'text', required: false, placeholder: 'Ej: 30%' },
      { key: 'commission_glovo', label: 'Comisión Glovo %', type: 'text', required: false, placeholder: 'Ej: 30%' },
      { key: 'commission_ubereats', label: 'Comisión UberEats %', type: 'text', required: false, placeholder: 'Ej: 30%' },
      { key: 'commission_justeat', label: 'Comisión JustEat %', type: 'text', required: false, placeholder: 'Ej: 30%' },
      { key: 'contact_preference', label: 'Preferencia de contacto', type: 'multi_select', required: true, options: ['Llamada', 'Whatsapp', 'Correo', 'Online Meeting', 'Visita Bimensual'] },
      { key: 'weekly_report_preference', label: 'Preferencia de reporte semanal', type: 'multi_select', required: true, options: ['Llamada', 'Correo'] },
      { key: 'mkt_plan_preference', label: 'Preferencia de plan de marketing', type: 'multi_select', required: false, options: ['Llamada', 'Whatsapp', 'Correo', 'Online Meeting'] },
    ],
  },

  // ============================================
  // SECTION 2: Competencia
  // ============================================
  {
    id: 'competition',
    title: 'Competencia',
    icon: Swords,
    fields: [
      { key: 'competitors_map_url', label: 'Link Google Maps', type: 'text', required: false, placeholder: 'https://maps.google.com/...' },
      ...createCompetitorFields(1),
      ...createCompetitorFields(2),
      ...createCompetitorFields(3),
      ...createCompetitorFields(4),
      ...createCompetitorFields(5),
    ],
  },

  // ============================================
  // SECTION 3: Horarios
  // ============================================
  {
    id: 'schedule',
    title: 'Horarios',
    icon: Clock,
    fields: createScheduleFields(),
  },

  // ============================================
  // SECTION 4: Perfil Glovo
  // ============================================
  {
    id: 'profile_glovo',
    title: 'Perfil Glovo',
    icon: Store,
    fields: createPlatformProfileFields('glovo', 'Glovo'),
  },

  // ============================================
  // SECTION 5: Perfil UberEats
  // ============================================
  {
    id: 'profile_ubereats',
    title: 'Perfil UberEats',
    icon: Store,
    fields: createPlatformProfileFields('ubereats', 'UberEats'),
  },

  // ============================================
  // SECTION 6: Perfil JustEat
  // ============================================
  {
    id: 'profile_justeat',
    title: 'Perfil JustEat',
    icon: Store,
    fields: createPlatformProfileFields('justeat', 'JustEat'),
  },

  // ============================================
  // SECTION 7: La Marca (Presencia Digital)
  // ============================================
  {
    id: 'brand_presence',
    title: 'La Marca',
    icon: Globe,
    fields: [
      { key: 'instagram', label: 'Instagram', type: 'text', required: false, placeholder: '@handle o N/A' },
      { key: 'tiktok', label: 'TikTok', type: 'text', required: false, placeholder: '@handle o N/A' },
      { key: 'website', label: 'Página web', type: 'text', required: false, placeholder: 'URL o N/A' },
      { key: 'google_my_business', label: 'Google My Business', type: 'text', required: false, placeholder: 'URL o N/A' },
      { key: 'ecommerce', label: 'E-commerce propio', type: 'select', required: false, options: ['Sí', 'No'] },
      { key: 'loyalty_program', label: 'Programa de fidelización', type: 'select', required: false, options: ['Sí', 'No'] },
    ],
  },

  // ============================================
  // SECTION 8: Marketing
  // ============================================
  {
    id: 'marketing',
    title: 'Marketing',
    icon: Megaphone,
    fields: [
      // --- Campañas Glovo ---
      ...createCampaignFields('glovo', 1, 'Glovo'),
      ...createCampaignFields('glovo', 2, 'Glovo'),
      ...createCampaignFields('glovo', 3, 'Glovo'),

      // --- Campañas UberEats ---
      ...createCampaignFields('ubereats', 1, 'UberEats'),
      ...createCampaignFields('ubereats', 2, 'UberEats'),
      ...createCampaignFields('ubereats', 3, 'UberEats'),

      // --- Resumen ---
      { key: 'total_spend', label: 'Inversión total', type: 'number', required: false, suffix: '€' },
      { key: 'total_ad_sales', label: 'Ventas por ads totales', type: 'number', required: false, suffix: '€' },
      { key: 'roas', label: 'ROAS', type: 'number', required: false },
      { key: 'conversion_rate', label: 'Tasa de conversión', type: 'number', required: false, suffix: '%' },

      // --- Acciones validadas Glovo ---
      { key: 'validated_glovo_ads', label: 'Glovo - ADS validados', type: 'checkbox', required: false },
      { key: 'validated_glovo_2x1', label: 'Glovo - 2x1 validado', type: 'checkbox', required: false },
      { key: 'validated_glovo_discount', label: 'Glovo - Descuento validado', type: 'checkbox', required: false },
      { key: 'validated_glovo_free_delivery', label: 'Glovo - Envío gratis validado', type: 'checkbox', required: false },
      { key: 'validated_glovo_valley_hours', label: 'Glovo - Horas valle validado', type: 'checkbox', required: false },
      { key: 'validated_glovo_free_item', label: 'Glovo - Producto gratis validado', type: 'checkbox', required: false },

      // --- Acciones validadas UberEats ---
      { key: 'validated_ubereats_ads', label: 'UberEats - ADS validados', type: 'checkbox', required: false },
      { key: 'validated_ubereats_2x1', label: 'UberEats - 2x1 validado', type: 'checkbox', required: false },
      { key: 'validated_ubereats_discount', label: 'UberEats - Descuento validado', type: 'checkbox', required: false },
      { key: 'validated_ubereats_free_delivery', label: 'UberEats - Envío gratis validado', type: 'checkbox', required: false },
      { key: 'validated_ubereats_valley_hours', label: 'UberEats - Horas valle validado', type: 'checkbox', required: false },
      { key: 'validated_ubereats_free_item', label: 'UberEats - Producto gratis validado', type: 'checkbox', required: false },

      // --- Acciones validadas JustEat ---
      { key: 'validated_justeat_ads', label: 'JustEat - ADS validados', type: 'checkbox', required: false },
      { key: 'validated_justeat_2x1', label: 'JustEat - 2x1 validado', type: 'checkbox', required: false },
      { key: 'validated_justeat_discount', label: 'JustEat - Descuento validado', type: 'checkbox', required: false },
      { key: 'validated_justeat_free_delivery', label: 'JustEat - Envío gratis validado', type: 'checkbox', required: false },
      { key: 'validated_justeat_valley_hours', label: 'JustEat - Horas valle validado', type: 'checkbox', required: false },
      { key: 'validated_justeat_free_item', label: 'JustEat - Producto gratis validado', type: 'checkbox', required: false },

      // --- Promociones y próximos pasos ---
      { key: 'active_promos', label: 'Promociones activas', type: 'textarea', required: false, placeholder: 'Describe las promociones activas actualmente' },
      { key: 'next_steps', label: 'Próximos pasos', type: 'textarea', required: false, placeholder: 'Próximos pasos a seguir con el cliente' },
    ],
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all required fields (non-readonly) from the onboarding form
 */
export function getOnboardingRequiredFields(): OnboardingField[] {
  return ONBOARDING_SECTIONS.flatMap((section) =>
    section.fields.filter((field) => field.required)
  );
}

/**
 * Calculate completion percentage for the onboarding form
 */
export function calculateOnboardingCompletion(
  fieldData: Record<string, unknown>
): number {
  const requiredFields = getOnboardingRequiredFields();
  if (requiredFields.length === 0) return 100;

  const completedCount = requiredFields.filter((field) => {
    const value = fieldData[field.key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  return Math.round((completedCount / requiredFields.length) * 100);
}

/**
 * Get section completion stats
 */
export function getOnboardingSectionCompletion(
  section: OnboardingSection,
  fieldData: Record<string, unknown>
): { completed: number; total: number } {
  const requiredFields = section.fields.filter((f) => f.required);
  const total = requiredFields.length;

  const completed = requiredFields.filter((field) => {
    const value = fieldData[field.key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;

  return { completed, total };
}

/**
 * Validate all required fields are filled
 */
export function validateOnboardingForm(
  fieldData: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const requiredFields = getOnboardingRequiredFields();
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = fieldData[field.key];
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      missingFields.push(field.key);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
