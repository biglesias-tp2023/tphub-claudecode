import {
  Phone,
  Swords,
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
  | 'checkbox'
  | 'contact_select'
  | 'margin_calculator'
  | 'competitor_card';

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
// COMPETITOR CATEGORIES & EMOJIS
// ============================================

export const COMPETITOR_CATEGORIES: string[] = [
  'Hamburguesa', 'Americana', 'Snacks', 'Desayuno', 'Saludable', 'Pollo',
  'Mediterránea', 'Asiática', 'Pizza', 'Japonesa', 'Mexicana', 'Dulces',
  'Vegetariana', 'Poke', 'Bocadillos', 'Latina', 'Sushi', 'Alta Cocina',
  'Italiana', 'Panadería', 'Internacional', 'Árabe', 'Española', 'Kebab',
  'Tailandesa', 'Vegana', 'Milanesa', 'Peruana', 'Venezolana', 'Sin gluten',
  'Té y café', 'Bebidas', 'India', 'Helado', 'Grill', 'Griega',
  'Comida local', 'Alcohol', 'China', 'Vino', 'Marisco',
];

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Hamburguesa': '🍔', 'Americana': '🌭', 'Snacks': '🍿', 'Desayuno': '🥐',
  'Saludable': '🥗', 'Pollo': '🍗', 'Mediterránea': '🫒', 'Asiática': '🍜',
  'Pizza': '🍕', 'Japonesa': '🍣', 'Mexicana': '🌮', 'Dulces': '🍪',
  'Vegetariana': '🥦', 'Poke': '🥙', 'Bocadillos': '🥖', 'Latina': '🫔',
  'Sushi': '🍱', 'Alta Cocina': '👨‍🍳', 'Italiana': '🍝', 'Panadería': '🥐',
  'Internacional': '🌍', 'Árabe': '🧆', 'Española': '🥘', 'Kebab': '🥙',
  'Tailandesa': '🍛', 'Vegana': '🌱', 'Milanesa': '🥩', 'Peruana': '🐟',
  'Venezolana': '🫓', 'Sin gluten': '🌾', 'Té y café': '☕', 'Bebidas': '🥤',
  'India': '🍛', 'Helado': '🍦', 'Grill': '🔥', 'Griega': '🫒',
  'Comida local': '🏠', 'Alcohol': '🍷', 'China': '🥡', 'Vino': '🍷',
  'Marisco': '🦐',
};

// ============================================
// HELPERS FOR REPETITIVE BLOCKS
// ============================================

export const SALES_CHANNELS = ['Glovo', 'UberEats', 'JustEat'] as const;

export const CHANNEL_LOGOS: Record<string, string> = {
  'Glovo': '/images/platforms/glovo.png',
  'UberEats': '/images/platforms/ubereats.png',
  'JustEat': '/images/platforms/justeat.webp',
};

function createCompetitorFields(n: number): OnboardingField[] {
  return [
    { key: `competitor_${n}_name`, label: 'Nombre', type: 'text', required: false },
    { key: `competitor_${n}_channels`, label: 'Canales de venta', type: 'multi_select', required: false,
      options: [...SALES_CHANNELS] },
    { key: `competitor_${n}_categories`, label: 'Categorías', type: 'multi_select', required: false,
      options: COMPETITOR_CATEGORIES },
    { key: `competitor_${n}_price_min`, label: 'Precio mínimo', type: 'number', required: false, suffix: '€' },
    { key: `competitor_${n}_price_max`, label: 'Precio máximo', type: 'number', required: false, suffix: '€' },
    { key: `competitor_${n}_rating`, label: 'Valoración', type: 'number', required: false },
    { key: `competitor_${n}_reviews`, label: 'Nº reseñas', type: 'number', required: false },
    { key: `competitor_${n}_top_products`, label: 'Top ventas', type: 'text', required: false },
    { key: `competitor_${n}_actions`, label: 'Acciones', type: 'multi_select', required: false,
      options: ['ADS', 'Promos', '2x1', 'Descuento %', 'Envío gratis', 'Happy Hour', 'Producto gratis'] },
    { key: `competitor_${n}_comments`, label: 'Comentarios', type: 'textarea', required: false },
  ];
}

function createPlatformProfileFields(prefix: string, platformName: string): OnboardingField[] {
  return [
    { key: `${prefix}_status`, label: 'Estado', type: 'select', required: false, options: ['Activo', 'Inactivo', 'Pendiente de cambio'] },
    { key: `${prefix}_logo`, label: 'Logo', type: 'select', required: false, options: ['Sí', 'No', 'N/A'] },
    { key: `${prefix}_logo_quality`, label: 'Calidad del logo', type: 'select', required: false, options: ['Alta', 'Media', 'Baja', 'Sin Logo'] },
    { key: `${prefix}_description`, label: 'Descripción del perfil', type: 'select', required: false, options: ['Activa', 'Inactiva', 'Pendiente de cambio'] },
    { key: `${prefix}_banner_quality`, label: 'Calidad del banner / Foto de portada', type: 'select', required: false, options: ['Profesional', 'Alta', 'Media', 'Pendiente de cambio'] },
    { key: `${prefix}_product_photos`, label: 'Fotos de productos', type: 'select', required: false, options: ['Profesional', 'Alta', 'Media', 'Pendiente de cambio'] },
    { key: `${prefix}_prices`, label: 'Precios vs competencia', type: 'select', required: false, options: ['Superiores', 'Inferiores', 'Similares'] },
    { key: `${prefix}_notes`, label: 'Observaciones', type: 'textarea', required: false, placeholder: `Observaciones sobre el perfil en ${platformName}` },
    { key: `${prefix}_suggested_categories`, label: 'Categorías a incorporar', type: 'multi_select', required: false, options: COMPETITOR_CATEGORIES },
  ];
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
      { key: 'contact_name', label: 'Persona de contacto', type: 'contact_select', required: true, placeholder: 'Seleccionar contacto' },
      { key: 'margin_calculator', label: 'Comisiones y Margen', type: 'margin_calculator', required: false },
      { key: 'contact_comments', label: 'Comentarios adicionales', type: 'textarea', required: false },
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
      ...createCompetitorFields(1),
      ...createCompetitorFields(2),
      ...createCompetitorFields(3),
      ...createCompetitorFields(4),
      ...createCompetitorFields(5),
    ],
  },

  // ============================================
  // SECTION 3: Perfil Glovo
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
  // SECTION 7: Marketing y Publicidad
  // ============================================
  {
    id: 'marketing',
    title: 'Marketing y Publicidad',
    icon: Megaphone,
    fields: [
      { key: 'promo_discount_pct', label: '% de descuento', type: 'checkbox', required: false },
      { key: 'promo_discount_pct_max', label: '% de descuento - Hasta cuánto', type: 'text', required: false, placeholder: 'Ej: hasta 30%' },
      { key: 'promo_2x1', label: '2x1', type: 'checkbox', required: false },
      { key: 'promo_free_delivery', label: 'Free delivery', type: 'checkbox', required: false },
      { key: 'promo_full_menu_discount', label: 'Descuento en toda la carta', type: 'checkbox', required: false },
      { key: 'promo_full_menu_discount_max', label: 'Descuento en toda la carta - Hasta cuánto', type: 'text', required: false, placeholder: 'Ej: hasta 20%' },
      { key: 'promo_other', label: 'Otros', type: 'checkbox', required: false },
      { key: 'promo_other_detail', label: 'Otros - Detalle', type: 'text', required: false, placeholder: 'Especificar otras promociones' },
      { key: 'marketing_comments', label: 'Comentarios adicionales', type: 'textarea', required: false, placeholder: 'Comentarios sobre marketing y publicidad' },
    ],
  },

  // ============================================
  // SECTION 8: La Marca (Presencia Digital)
  // ============================================
  {
    id: 'brand_presence',
    title: 'La Marca',
    icon: Globe,
    fields: [
      { key: 'google_my_business', label: 'Google My Business', type: 'text', required: false, placeholder: 'URL o N/A' },
      { key: 'google_ads_interest', label: 'Google ADS', type: 'select', required: false, options: ['Activo', 'Inactivo', 'Interesado en activarlo'] },
      { key: 'instagram', label: 'Instagram', type: 'text', required: false, placeholder: '@handle o N/A' },
      { key: 'instagram_meta_ads', label: 'Meta ADS', type: 'select', required: false, options: ['Activo', 'Inactivo', 'Interesado en activarlo'] },
      { key: 'tiktok', label: 'TikTok', type: 'text', required: false, placeholder: '@handle o N/A' },
      { key: 'tiktok_ads', label: 'TikTok ADS', type: 'select', required: false, options: ['Activo', 'Inactivo', 'Interesado en activarlo'] },
      { key: 'website', label: 'Página web', type: 'text', required: false, placeholder: 'URL o N/A' },
      { key: 'ecommerce', label: 'Canal de venta propio', type: 'select', required: false, options: ['Activo', 'Inactivo', 'Interesado a futuro'] },
      { key: 'loyalty_program', label: 'Programa de fidelización', type: 'select', required: false, options: ['Activo', 'Inactivo', 'Interesado a futuro'] },
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

// Field types that are virtual/container and should not count for completion
const EXCLUDED_FIELD_TYPES: Set<OnboardingFieldType> = new Set([
  'margin_calculator', 'competitor_card', 'contact_select',
]);

function isFieldFilled(fieldData: Record<string, unknown>, key: string): boolean {
  const value = fieldData[key];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Calculate completion percentage for the onboarding form.
 * Counts ALL fillable fields (not just required ones).
 */
export function calculateOnboardingCompletion(
  fieldData: Record<string, unknown>
): number {
  const allFields = ONBOARDING_SECTIONS.flatMap((s) =>
    s.fields.filter((f) => !EXCLUDED_FIELD_TYPES.has(f.type))
  );
  if (allFields.length === 0) return 100;

  const filled = allFields.filter((f) => isFieldFilled(fieldData, f.key)).length;
  return Math.round((filled / allFields.length) * 100);
}

/**
 * Get section completion stats.
 * Counts ALL fillable fields in the section.
 */
export function getOnboardingSectionCompletion(
  section: OnboardingSection,
  fieldData: Record<string, unknown>
): { completed: number; total: number } {
  const fields = section.fields.filter((f) => !EXCLUDED_FIELD_TYPES.has(f.type));
  const total = fields.length;
  const completed = fields.filter((f) => isFieldFilled(fieldData, f.key)).length;
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
