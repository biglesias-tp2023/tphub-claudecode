import {
  ClipboardList,
  Eye,
  Image,
  MousePointerClick,
  DollarSign,
  Megaphone,
  Receipt,
  Clock,
  ShoppingBag,
  Beef,
  Package,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type MysteryShopperFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multi_select'
  | 'tag_input'
  | 'number'
  | 'date'
  | 'datetime'
  | 'time'
  | 'rating'
  | 'image_upload';

export interface MysteryShopperField {
  key: string;
  label: string;
  type: MysteryShopperFieldType;
  options?: string[];
  required: boolean;
  readOnly?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  maxFiles?: number;
  multiple?: boolean;
  suffix?: string;
}

export interface MysteryShopperSection {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: MysteryShopperField[];
}

export const MYSTERY_SHOPPER_SECTIONS: MysteryShopperSection[] = [
  // ============================================
  // SECTION 1: Información General
  // ============================================
  {
    id: 'general',
    title: 'Información General',
    icon: ClipboardList,
    fields: [
      {
        key: 'general_brand',
        label: 'Marca a Evaluar',
        type: 'text',
        required: true,
        readOnly: true,
      },
      {
        key: 'general_consultant',
        label: 'Consultor que Evalúa',
        type: 'text',
        required: true,
        readOnly: true,
      },
      {
        key: 'general_kam',
        label: 'KAM que gestiona la marca',
        type: 'text',
        required: true,
        readOnly: true,
      },
      {
        key: 'general_platform',
        label: 'Plataforma en la que has realizado el pedido',
        type: 'text',
        required: true,
        readOnly: true,
      },
    ],
  },

  // ============================================
  // SECTION 2: Visibilidad en Feed
  // ============================================
  {
    id: 'feed_visibility',
    title: 'Visibilidad en Feed',
    icon: Eye,
    fields: [
      {
        key: 'feed_position',
        label: '¿Qué tan visible aparece el restaurante en el feed?',
        type: 'select',
        required: true,
        options: [
          'Primera pantalla',
          'Segunda Pantalla',
          'Tercera Pantalla',
          'Últimas posiciones',
          'No aparece',
        ],
      },
      {
        key: 'feed_competitors',
        label: '¿Qué competidores aparecen cerca del feed?',
        type: 'tag_input',
        required: true,
        placeholder: 'Lista los restaurantes que aparecen antes y/o después del cliente en el feed',
      },
    ],
  },

  // ============================================
  // SECTION 3: Evaluación Visual del Perfil
  // ============================================
  {
    id: 'visual_profile',
    title: 'Evaluación Visual del Perfil',
    icon: Image,
    fields: [
      {
        key: 'visual_cover_photo',
        label: 'Evalúa el atractivo visual de la foto de portada',
        type: 'select',
        required: true,
        options: [
          '1 - Es foto de archivo',
          '2 - Poco atractiva',
          '3 - Correcta',
          '4 - Atractiva',
          '5 - Calidad Profesional',
        ],
      },
      {
        key: 'visual_menu_photos',
        label: 'Evalúa el atractivo visual de las fotos del menú',
        type: 'select',
        required: true,
        options: [
          '1 - No apetecibles',
          '2 - Mejorables',
          '3 - Estándar',
          '4 - Atractivas',
          '5 - Foto Profesionales',
        ],
      },
      {
        key: 'visual_problems',
        label: '¿Qué problemas visuales detectas en el perfil?',
        type: 'multi_select',
        required: true,
        options: [
          'Iluminación deficiente',
          'Falta de coherencia en el menú',
          'Imágenes duplicadas',
          'Mala lógica de Modificadores',
          'Mal tamaño respecto al pedido',
          'Categorías desordenadas',
          'TAGS no coinciden con el tipo de producto',
          'Las imágenes son borrosas',
          'Sobran TAGS en el perfil',
          'Falta foto de Logo',
          'Falta descriptivo en el perfil',
          'No detecto ningún problema visual',
        ],
      },
      {
        key: 'visual_brand_coherence',
        label: 'Evalúa la coherencia visual y de marca (colores, tono, naming)',
        type: 'select',
        required: true,
        options: [
          '1 - Sin coherencia',
          '2 - Coherencia baja',
          '3 - Normal',
          '4 - Buena',
          '5 - Excelente',
        ],
      },
      {
        key: 'visual_seo_naming',
        label: 'Evalúa el SEO/naming de los productos',
        type: 'select',
        required: true,
        options: [
          '1 - No hay SEO/naming',
          '2 - SEO/Naming pobre',
          '3 - Adecuado',
          '4 - Bueno',
          '5 - SEO/naming excelente',
        ],
      },
      {
        key: 'visual_cover_image',
        label: 'Adjunta la imagen de portada',
        type: 'image_upload',
        required: true,
        multiple: true,
        maxFiles: 10,
      },
    ],
  },

  // ============================================
  // SECTION 4: Navegación / UX
  // ============================================
  {
    id: 'navigation_ux',
    title: 'Navegación / UX',
    icon: MousePointerClick,
    fields: [
      {
        key: 'nav_friction',
        label: 'Dificultad o fricción al realizar el pedido',
        type: 'multi_select',
        required: true,
        options: [
          'Menú lento al cargar',
          'Modificadores confusos',
          'Precios poco visibles',
          'Fotos no cargan',
          'Orden de categoría ilógico',
          'Falta de detalle en la descripción que dan lugar a confusión',
          'No hay ningún detalle o fricción al realizar el pedido',
        ],
      },
      {
        key: 'nav_modifiers_quality',
        label: 'Calidad y profundidad de los modificadores/extras (0–5)',
        type: 'select',
        required: true,
        options: [
          '0 - No existe ningún modificador',
          '1 - Modificadores mínimos (1-2 opciones genéricas)',
          '2 - Modificadores disponibles pero incompletos (faltan opciones/no están asociados)',
          '3 - Modificadores correctos pero mejorables (exceso/desorden/faltan opciones/productos sin extras)',
          '4 - Sistema profesional y completo (claros/organizados/completos)',
          '5 - Sistema avanzado con modificadores personalizados por producto',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 5: Precios
  // ============================================
  {
    id: 'pricing',
    title: 'Precios',
    icon: DollarSign,
    fields: [
      {
        key: 'price_clarity',
        label: '¿Los precios son coherentes y claros?',
        type: 'select',
        required: true,
        options: [
          '1 - Muy confusos',
          '2 - Poco claros',
          '3 - Normal',
          '4 - Claros',
          '5 - Muy claros y coherentes',
        ],
      },
      {
        key: 'price_vs_competition',
        label: '¿Cómo son los precios respecto a la competencia?',
        type: 'select',
        required: true,
        options: ['Más bajos', 'Similares', 'Más altos'],
      },
    ],
  },

  // ============================================
  // SECTION 6: Promociones
  // ============================================
  {
    id: 'promotions',
    title: 'Promociones',
    icon: Megaphone,
    fields: [
      {
        key: 'promo_active',
        label: '¿Has visto promociones activas antes de entrar al restaurante?',
        type: 'multi_select',
        required: true,
        options: [
          'Sí (Descuento directo)',
          'Sí (Envío gratis)',
          'Sí (2x1 / Combo Especial)',
          'Sí (banner promocional)',
          'Sí (otras)',
          'No he visto ninguna promoción activa',
        ],
      },
      {
        key: 'promo_influence',
        label: '¿La decisión de compra estuvo influida por la promoción?',
        type: 'select',
        required: true,
        options: [
          '1 - No influyó nada',
          '2 - Influyó poco',
          '3 - Influyó parcialmente',
          '4 - Influyó bastante',
          '5 - Fue determinante para comprar',
          'No había promoción',
        ],
      },
      {
        key: 'promo_dependency',
        label: '¿Percibes que el restaurante depende excesivamente de las promociones?',
        type: 'select',
        required: true,
        options: [
          '1 - Nada promocionero',
          '2 - Poco promocionero',
          '3 - Moderado',
          '4 - Bastante promocionero',
          '5 - Muy promocionero / Siempre con descuentos',
        ],
      },
      {
        key: 'promo_return_without_discount',
        label: 'Si tu pedido iba con descuento, ¿volverías a pedir sin descuento?',
        type: 'select',
        required: true,
        options: [
          '1 - No volvería a pedir sin descuento',
          '2 - Volvería a pedir si hay promoción',
          '3 - Quizá',
          '4 - Sí que volvería',
          '5 - Seguro que sí',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 7: Datos del Pedido
  // ============================================
  {
    id: 'order_data',
    title: 'Datos del Pedido',
    icon: Receipt,
    fields: [
      {
        key: 'order_date',
        label: 'Fecha y hora en la que se ha realizado el pedido',
        type: 'datetime',
        required: true,
      },
      {
        key: 'order_estimated_time',
        label: 'Hora estimada de entrega (según app)',
        type: 'text',
        required: true,
        placeholder: 'Ejemplo: 20-30min',
      },
      {
        key: 'order_price',
        label: 'Precio del pedido',
        type: 'number',
        required: true,
        min: 0,
        placeholder: 'Ejemplo: 12.90',
        suffix: '€',
      },
      {
        key: 'order_persons',
        label: 'El pedido, ¿para cuántas personas es?',
        type: 'number',
        required: true,
        min: 1,
      },
      {
        key: 'order_ticket',
        label: 'Adjunta el ticket del Pedido',
        type: 'image_upload',
        required: true,
        multiple: true,
        maxFiles: 10,
      },
    ],
  },

  // ============================================
  // SECTION 8: Rendimiento Operativo
  // ============================================
  {
    id: 'operations',
    title: 'Rendimiento Operativo',
    icon: Clock,
    fields: [
      {
        key: 'ops_actual_time',
        label: 'Hora exacta de entrega del pedido',
        type: 'time',
        required: true,
      },
      {
        key: 'ops_time_diff',
        label: 'Diferencia total (minutos)',
        type: 'number',
        required: true,
      },
      {
        key: 'ops_time_reasonable',
        label: '¿El tiempo total fue razonable?',
        type: 'select',
        required: true,
        options: [
          '1 - Nada razonable',
          '2 - Poco Razonable',
          '3 - Estándar',
          '4 - Más rápido de lo esperado',
          '5 - Mucho más rápido de lo esperado',
        ],
      },
      {
        key: 'ops_comment',
        label: 'Comentario sobre el rendimiento operativo',
        type: 'textarea',
        required: true,
        placeholder: 'Explica si hubo retrasos, incidencias, riders mal asignados o paradas largas',
      },
    ],
  },

  // ============================================
  // SECTION 9: Selección de Producto
  // ============================================
  {
    id: 'product_selection',
    title: 'Selección de Producto',
    icon: ShoppingBag,
    fields: [
      {
        key: 'selection_product_types',
        label: '¿Qué tipos de productos has pedido?',
        type: 'multi_select',
        required: true,
        options: [
          'Plato Top Ventas',
          'Plato recomendado por la app',
          'Nuevo lanzamiento / edición limitada',
          'Plato secundario / no prioritario',
          'Producto por curiosidad',
          'Menú del Día',
          'Otros',
        ],
      },
      {
        key: 'selection_reasons',
        label: '¿Por qué elegiste este/s producto/s en concreto?',
        type: 'multi_select',
        required: true,
        options: [
          'Foto Atractiva',
          'Precio competitivo',
          'Descripción convincente',
          'Recomendado por la app',
          'Antojo / Impulso / Me apetecía',
          'Es el que pido siempre',
          'Tenía promoción',
          'Packaging atractivo',
          'Curiosidad por probar algo nuevo',
        ],
      },
      {
        key: 'selection_photo_influence',
        label: '¿Consideras que la foto del producto influyó en tu decisión?',
        type: 'select',
        required: true,
        options: [
          '1 - Nada',
          '2 - Poco',
          '3 - Neutral',
          '4 - Bastante',
          '5 - Decisivo',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 10: Producto / Comida
  // ============================================
  {
    id: 'product',
    title: 'Producto / Comida',
    icon: Beef,
    fields: [
      {
        key: 'product_visual_match',
        label: 'Coincidencia visual del producto con la foto del menú',
        type: 'select',
        required: true,
        options: [
          '1 - No coincide nada',
          '2 - Coincide poco',
          '3 - Coincide parcialmente',
          '4 - Coincide',
          '5 - Coincidencia exacta',
        ],
      },
      {
        key: 'product_visual_comment',
        label: 'Añade un comentario sobre la coherencia visual',
        type: 'textarea',
        required: true,
        placeholder: 'Si no tienes nada que añadir, escribe "SC"',
      },
      {
        key: 'product_temperature',
        label: 'Temperatura al recibir el pedido',
        type: 'select',
        required: true,
        options: [
          '1 - Muy fría',
          '2 - Fría',
          '3 - Templado',
          '4 - Caliente',
          '5 - Muy Caliente',
        ],
      },
      {
        key: 'product_temp_comment',
        label: 'Añade un comentario para más detalle sobre la temperatura',
        type: 'textarea',
        required: true,
        placeholder: 'Expón si el producto perdió calidad por temperatura. "SC" si no hay nada que añadir',
      },
      {
        key: 'product_value',
        label: 'Relación Calidad Precio',
        type: 'select',
        required: true,
        options: [
          '1 - Muy baja',
          '2 - Baja',
          '3 - Aceptable',
          '4 - Alta',
          '5 - Muy alta',
        ],
      },
      {
        key: 'product_value_comment',
        label: 'Añade un comentario para más detalle sobre la relación calidad-precio',
        type: 'textarea',
        required: true,
        placeholder: 'Explica si la experiencia justifica el precio pagado. "SC" si es neutro',
      },
      {
        key: 'product_organoleptic',
        label: 'Calidad organoléptica',
        type: 'select',
        required: true,
        options: [
          '1 - Muy deficiente: sabor plano o desagradable, ingredientes resecos, fríos o con mal aroma',
          '2 - Baja: producto comestible pero sin armonía; textura o temperatura poco lograda',
          '3 - Aceptable: correcto pero sin destacar; cumple la promesa básica del plato',
          '4 - Buena: buen equilibrio entre sabor, temperatura y textura; cumple expectativas',
          '5 - Excelente: sabor potente y coherente con la marca; temperatura óptima y sensación "recién hecho"',
        ],
      },
      {
        key: 'product_tasting_comment',
        label: 'Comentario breve de la cata',
        type: 'textarea',
        required: true,
        placeholder: 'Describe tu experiencia con el producto...',
      },
      {
        key: 'product_photos',
        label: 'Adjunta foto del producto recibido',
        type: 'image_upload',
        required: false,
        multiple: true,
        maxFiles: 10,
      },
    ],
  },

  // ============================================
  // SECTION 11: Packaging
  // ============================================
  {
    id: 'packaging',
    title: 'Packaging',
    icon: Package,
    fields: [
      {
        key: 'pack_general',
        label: 'Estado general del packaging',
        type: 'select',
        required: true,
        options: [
          '1 - Muy deficiente: packaging sucio, abierto o dañado',
          '2 - Bajo: correcto pero con desperfectos o fugas',
          '3 - Aceptable: cumple su función sin destacar',
          '4 - Bueno: limpio, cerrado, resistente',
          '5 - Excelente: impecable, sólido, transmite cuidado y profesionalidad',
        ],
      },
      {
        key: 'pack_branding',
        label: 'Personalización de marca',
        type: 'select',
        required: true,
        options: [
          '1 - Nula: sin logotipo ni identidad visible',
          '2 - Baja: branding parcial o confuso',
          '3 - Correcta: logotipo presente pero diseño genérico',
          '4 - Buena: branding claro, coherente con la marca',
          '5 - Excelente: diseño distintivo, memorable y alineado con la marca',
        ],
      },
      {
        key: 'pack_functionality',
        label: 'Funcionalidad y usabilidad',
        type: 'select',
        required: true,
        options: [
          '1 - Muy deficiente: difícil de abrir o manipular; fugas o deformaciones',
          '2 - Baja: usable con dificultad; se deforma o derrama',
          '3 - Aceptable: cumple su función básica',
          '4 - Buena: práctica, segura y funcional',
          '5 - Excelente: diseño cómodo, resistente y pensado para delivery',
        ],
      },
      {
        key: 'pack_extras',
        label: 'Elementos complementarios',
        type: 'multi_select',
        required: true,
        options: [
          'Cubiertos',
          'Servilletas',
          'Salsas y condimentos',
          'Nota de agradecimiento/Flyer de marca',
          'Producto Extra/Detalle sorpresa',
          'No había Servilletas',
          'No había Cubiertos',
          'Otros',
        ],
      },
      {
        key: 'pack_branding_comment',
        label: 'Comentario sobre la presentación y branding',
        type: 'textarea',
        required: true,
        placeholder: 'Explica cómo impacta el packaging en la percepción de profesionalidad y marca',
      },
      {
        key: 'pack_media',
        label: 'Archivos multimedia',
        type: 'image_upload',
        required: true,
        multiple: true,
        maxFiles: 10,
      },
    ],
  },

  // ============================================
  // SECTION 12: Valoración Final
  // ============================================
  {
    id: 'final',
    title: 'Valoración Final',
    icon: Star,
    fields: [
      {
        key: 'final_positives',
        label: 'Aspectos positivos destacados',
        type: 'textarea',
        required: true,
        placeholder: 'Enumera los puntos fuertes de la experiencia. En viñetas, claros y directos',
      },
      {
        key: 'final_negatives',
        label: 'Aspectos negativos destacados',
        type: 'textarea',
        required: true,
        placeholder: 'Enumera las principales debilidades detectadas. Sé específico y constructivo',
      },
      {
        key: 'final_priority_actions',
        label: 'Acciones prioritarias sugeridas',
        type: 'textarea',
        required: true,
        placeholder: 'Indica 2-3 acciones con alto impacto y dificultad baja o media',
      },
      {
        key: 'final_score',
        label: 'Valoración global (1-10)',
        type: 'rating',
        required: true,
        min: 1,
        max: 10,
      },
      {
        key: 'final_nps',
        label: '¿Recomendarías este restaurante a un amigo? (0-10)',
        type: 'rating',
        required: true,
        min: 0,
        max: 10,
      },
    ],
  },
];

/**
 * Calculate the number of required fields in the Mystery Shopper form
 */
export function getMysteryShopperRequiredFields(): MysteryShopperField[] {
  return MYSTERY_SHOPPER_SECTIONS.flatMap((section) =>
    section.fields.filter((field) => field.required && !field.readOnly)
  );
}

/**
 * Calculate completion percentage for the Mystery Shopper form
 */
export function calculateMysteryShopperCompletion(
  fieldData: Record<string, unknown>
): number {
  const requiredFields = getMysteryShopperRequiredFields();
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
export function getSectionCompletion(
  section: MysteryShopperSection,
  fieldData: Record<string, unknown>
): { completed: number; total: number } {
  const requiredFields = section.fields.filter((f) => f.required && !f.readOnly);
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
export function validateMysteryShopperForm(
  fieldData: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const requiredFields = getMysteryShopperRequiredFields();
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
