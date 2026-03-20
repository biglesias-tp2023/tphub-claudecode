import type {
  CampaignPlatform,
  GlovoPromotionType,
  JustEatPromotionType,
  JustEatLoyaltyType,
  UberEatsPromotionType,
  UberEatsAdType,
  GlovoAdType,
  JustEatAdType,
  GoogleAdType,
  CheerfyPromotionType,
  CheerfyCommunicationType,
  CheerfyAutomationType,
} from '@/types';

// ============================================
// PLATFORM CONFIGURATION
// ============================================

export interface PlatformConfig {
  id: CampaignPlatform;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  logoUrl?: string;
}

export const PLATFORMS: Record<CampaignPlatform, PlatformConfig> = {
  glovo: {
    id: 'glovo',
    name: 'Glovo',
    color: '#FFC244',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-400',
    icon: 'glovo',
    logoUrl: '/images/platforms/glovo.png',
  },
  ubereats: {
    id: 'ubereats',
    name: 'Uber Eats',
    color: '#06C167',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500',
    icon: 'ubereats',
    logoUrl: '/images/platforms/ubereats.png',
  },
  justeat: {
    id: 'justeat',
    name: 'Just Eat',
    color: '#FF8000',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-500',
    icon: 'justeat',
    logoUrl: '/images/platforms/justeat.webp',
  },
  google_ads: {
    id: 'google_ads',
    name: 'Google Ads',
    color: '#4285F4',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-500',
    icon: 'google',
    logoUrl: '/images/platforms/google-ads.webp',
  },
  cheerfy: {
    id: 'cheerfy',
    name: 'Cheerfy',
    color: '#6C5CE7',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-500',
    icon: 'cheerfy',
    logoUrl: '/images/platforms/cheerfy.png',
  },
};

// ============================================
// CAMPAIGN TYPE CONFIGURATION
// ============================================

export interface CampaignTypeConfig {
  id: string;
  label: string;
  description: string;
  icon: string;
  isPromotion: boolean; // true = promocion, false = publicidad
  fields: CampaignFieldConfig[];
}

export interface CampaignFieldOption {
  value: string;
  label: string;
  description?: string;
  recommended?: boolean;
}

export interface CampaignFieldConfig {
  key: string;
  label: string;
  type:
    | 'number' | 'percent' | 'currency' | 'text' | 'product' | 'products'
    | 'time' | 'date' | 'keywords' | 'target_customers'
    // Shared field types
    | 'audience' | 'duration_preset' | 'weekly_spend' | 'ad_budget'
    | 'checkbox' | 'flat_off_pairs' | 'percent_radio' | 'currency_radio'
    | 'radio' | 'info_text'
    // Glovo-specific field types
    | 'order_target' | 'prime_toggle' | 'day_selector' | 'budget_limit'
    // Just Eat-specific field types
    | 'stepper_number' | 'schedule_days' | 'schedule_hours';
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
  options?: CampaignFieldOption[];
  /** For duration_preset: 'promos' | 'ads' | 'happy_hour' */
  variant?: string;
  /** For info_text: static text to display */
  infoText?: string;
  /** For flat_off_pairs: predefined pairs [{spend, save}] */
  pairs?: Array<{ spend: number; save: number }>;
  /** Field dependency: only show when sibling field has matching value */
  dependsOn?: string;
  /** Value that dependsOn field must have for this field to show */
  showWhen?: string;
  /** Default value for the field */
  defaultValue?: unknown;
  /** For radio/currency_radio: show custom input when 'custom' is selected */
  customInput?: { type: string; placeholder?: string; min?: number; step?: number; suffix?: string };
}

// ============================================
// GLOVO — SHARED FIELD DEFINITIONS
// ============================================

const GL_CALENDAR_FIELDS: CampaignFieldConfig[] = [
  { key: 'duration', label: 'Duracion', type: 'radio', required: true, options: [
    { value: 'permanent', label: 'Permanente' },
    { value: 'temporary', label: 'Temporal' },
  ]},
  { key: 'startDate', label: 'Fecha de inicio', type: 'date', required: true },
  { key: 'endDate', label: 'Fecha de fin', type: 'date', dependsOn: 'duration', showWhen: 'temporary' },
  { key: 'timeSlot', label: 'Franja horaria', type: 'radio', required: true, options: [
    { value: 'all_day', label: 'Todo el dia' },
    { value: 'breakfast', label: 'Desayuno' },
    { value: 'lunch', label: 'Comida' },
    { value: 'snack', label: 'Merienda' },
    { value: 'dinner', label: 'Cena' },
    { value: 'custom', label: 'Personalizar' },
  ]},
  { key: 'weekDays', label: 'Dias de la semana', type: 'day_selector', required: true,
    defaultValue: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  },
];

const GL_BUDGET_FIELD: CampaignFieldConfig = {
  key: 'budgetLimit', label: 'Presupuesto', type: 'budget_limit', required: true,
};

const GL_DISCOUNT_FIELDS: CampaignFieldConfig[] = [
  { key: 'discountType', label: 'Tipo de descuento', type: 'radio', required: true, options: [
    { value: 'percentage', label: 'Porcentaje (%)' },
    { value: 'fixed', label: 'Cantidad fija (€)' },
  ]},
  { key: 'discountValue', label: 'Valor del descuento', type: 'percent_radio', required: true,
    dependsOn: 'discountType', showWhen: 'percentage',
    options: [
      { value: '10', label: '10%' }, { value: '15', label: '15%' },
      { value: '20', label: '20%' }, { value: '25', label: '25%' },
      { value: '30', label: '30%' }, { value: '35', label: '35%' },
      { value: '40', label: '40%' }, { value: '45', label: '45%' },
      { value: '50', label: '50%' },
    ],
  },
  { key: 'discountValue', label: 'Valor del descuento', type: 'currency_radio', required: true,
    dependsOn: 'discountType', showWhen: 'fixed',
    options: [
      { value: '2', label: '2 €' }, { value: '3', label: '3 €' },
      { value: '5', label: '5 €' }, { value: '8', label: '8 €' },
      { value: '10', label: '10 €' },
    ],
  },
  { key: 'primeBoost', label: 'Descuento extra Prime', type: 'prime_toggle',
    options: [
      { value: '5', label: '+5% extra para usuarios Prime' },
      { value: '10', label: '+10% extra para usuarios Prime' },
    ],
  },
  { key: 'minimumOrder', label: 'Importe minimo de pedido', type: 'currency_radio', required: true,
    options: [
      { value: '10', label: '10 €' }, { value: '15', label: '15 €' },
      { value: '20', label: '20 €' }, { value: '25', label: '25 €' },
      { value: '30', label: '30 €' }, { value: '35', label: '35 €' },
      { value: '40', label: '40 €' },
    ],
  },
];

// ============================================
// GLOVO CAMPAIGN TYPES
// ============================================

export const GLOVO_PROMOTION_TYPES: Record<GlovoPromotionType, CampaignTypeConfig> = {
  flash_offer: {
    id: 'flash_offer',
    label: 'Ofertas Flash',
    description: 'Atrae nuevos clientes con un objetivo de adquisicion de pedidos',
    icon: 'Zap',
    isPromotion: true,
    fields: [
      { key: 'acquisitionTarget', label: 'Objetivo de adquisicion', type: 'order_target', required: true,
        options: [
          { value: '4', label: '4 pedidos' },
          { value: '5', label: '5 pedidos' },
          { value: '15', label: '15 pedidos' },
        ],
      },
    ],
  },

  full_menu: {
    id: 'full_menu',
    label: 'Todo el Menu',
    description: 'Aplica un descuento a todo tu menu para aumentar pedidos',
    icon: 'UtensilsCrossed',
    isPromotion: true,
    fields: [
      ...GL_DISCOUNT_FIELDS,
      ...GL_CALENDAR_FIELDS,
      GL_BUDGET_FIELD,
    ],
  },

  selected_products: {
    id: 'selected_products',
    label: 'Productos Seleccionados',
    description: 'Aplica descuentos solo a productos especificos de tu catalogo',
    icon: 'ShoppingBag',
    isPromotion: true,
    fields: [
      { key: 'productIds', label: 'Productos', type: 'products', required: true },
      ...GL_DISCOUNT_FIELDS,
      ...GL_CALENDAR_FIELDS,
      GL_BUDGET_FIELD,
    ],
  },

  delivery_fee: {
    id: 'delivery_fee',
    label: 'Gastos de Envio',
    description: 'Ofrece envio gratis o con descuento para atraer mas pedidos',
    icon: 'Truck',
    isPromotion: true,
    fields: [
      { key: 'deliveryDiscount', label: 'Descuento en envio', type: 'radio', required: true, options: [
        { value: 'free', label: 'Envio gratis' },
        { value: 'fixed_discount', label: 'Descuento fijo en envio' },
      ]},
      { key: 'deliveryDiscountAmount', label: 'Descuento en gastos de envio', type: 'currency_radio',
        dependsOn: 'deliveryDiscount', showWhen: 'fixed_discount',
        options: [
          { value: '1', label: '1 €' }, { value: '1.5', label: '1,50 €' },
          { value: '2', label: '2 €' },
        ],
      },
      { key: 'deliveryInfo', label: '', type: 'info_text',
        infoText: 'El coste de envio medio es de ~2,50 €. Si ofreces envio gratis, asumes el 100% del coste.',
      },
      ...GL_CALENDAR_FIELDS,
      GL_BUDGET_FIELD,
    ],
  },

  bogof: {
    id: 'bogof',
    label: '2x1',
    description: 'Compra uno y llevate otro gratis — ideal para productos de alto margen',
    icon: 'Gift',
    isPromotion: true,
    fields: [
      { key: 'productIds', label: 'Productos elegibles', type: 'products', required: true },
      { key: 'bogofInfo', label: '', type: 'info_text',
        infoText: 'El cliente compra uno de los productos seleccionados y recibe el segundo gratis. Asegurate de que los margenes lo permiten.',
      },
      ...GL_CALENDAR_FIELDS,
      GL_BUDGET_FIELD,
    ],
  },
};

export const GLOVO_AD_TYPES: Record<GlovoAdType, CampaignTypeConfig> = {
  premium_placement: {
    id: 'premium_placement',
    label: 'Campana Publicitaria',
    description: 'Aumenta la visibilidad con posiciones destacadas — modelo CPC',
    icon: 'Megaphone',
    isPromotion: false,
    fields: [
      { key: 'adFormat', label: 'Formato de anuncio', type: 'radio', required: true, options: [
        { value: 'sponsored_search', label: 'Busqueda Patrocinada', description: 'Tu tienda aparece arriba en los resultados de busqueda' },
        { value: 'home_banner', label: 'Home / Banner', description: 'Posicion destacada en la pagina principal de Glovo' },
        { value: 'premium_category', label: 'Ubicacion Premium', description: 'Posicion destacada dentro de tu categoria' },
        { value: 'in_order', label: 'Pedido en Curso', description: 'Banner visible mientras el cliente espera su pedido' },
      ]},
      { key: 'adSegmentZone', label: 'Zona de segmentacion', type: 'text', placeholder: 'Ej: Madrid Centro, Barcelona Eixample' },
      { key: 'adSegmentSchedule', label: 'Horario de segmentacion', type: 'radio', required: true, options: [
        { value: 'all_day', label: 'Todo el dia' },
        { value: 'breakfast', label: 'Desayuno' },
        { value: 'lunch', label: 'Comida' },
        { value: 'snack', label: 'Merienda' },
        { value: 'dinner', label: 'Cena' },
        { value: 'custom', label: 'Personalizar' },
      ]},
      { key: 'productIds', label: 'Productos a destacar (opcional)', type: 'products' },
      { key: 'dailyBudget', label: 'Presupuesto diario', type: 'ad_budget', required: true, options: [
        { value: '5', label: '5 €/dia' },
        { value: '10', label: '10 €/dia' },
        { value: '15', label: '15 €/dia', recommended: true },
        { value: '25', label: '25 €/dia' },
      ]},
      { key: 'totalBudget', label: 'Presupuesto total', type: 'budget_limit' },
      { key: 'cpcBid', label: 'Puja CPC', type: 'radio', required: true, options: [
        { value: 'auto', label: 'Automatica (recomendado)', description: 'Glovo optimiza tu puja automaticamente', recommended: true },
        { value: 'custom', label: 'Personalizar' },
      ], customInput: { type: 'number', placeholder: 'Puja por clic (€)', min: 0.05, step: 0.01, suffix: '€/clic' }},
      { key: 'cpcInfo', label: '', type: 'info_text',
        infoText: 'Solo pagas cuando un cliente hace clic en tu anuncio. El CPC medio en Glovo oscila entre 0,15 € y 0,50 € dependiendo de la zona y categoria.',
      },
      { key: 'startDate', label: 'Fecha de inicio', type: 'date', required: true },
      { key: 'endDate', label: 'Fecha de fin', type: 'date' },
      { key: 'campaignName', label: 'Nombre de la campana', type: 'text', placeholder: 'Ej: Campana Primavera 2026' },
    ],
  },
};

// ============================================
// JUSTEAT — SHARED FIELD DEFINITIONS
// ============================================

const JE_AUDIENCE_FIELD: CampaignFieldConfig = {
  key: 'audience', label: 'A quien va dirigida?', type: 'radio', required: true,
  options: [
    { value: 'all', label: 'Todos los clientes' },
    { value: 'new_only', label: 'Solo clientes nuevos' },
    { value: 'returning_only', label: 'Solo clientes que vuelven' },
  ],
};

const JE_SCHEDULE_FIELDS: CampaignFieldConfig[] = [
  { key: 'jeScheduleDays', label: 'Cuando se ejecutara la oferta?', type: 'schedule_days', required: true,
    options: [
      { value: 'every_day', label: 'Todos los dias' },
      { value: 'weekdays', label: 'Solo entre semana (L-V)' },
      { value: 'weekends', label: 'Solo fines de semana (S-D)' },
      { value: 'custom', label: 'Dias especificos' },
    ],
  },
  { key: 'jeScheduleHours', label: 'A que horas?', type: 'schedule_hours', required: true,
    options: [
      { value: 'all_hours', label: 'Todo el horario de apertura' },
      { value: 'selected_hours', label: 'Solo horas seleccionadas' },
    ],
  },
  { key: 'startWhen', label: 'Cuando empieza?', type: 'radio', required: true, options: [
    { value: 'now', label: 'Ahora' },
    { value: 'scheduled', label: 'En una fecha establecida' },
  ]},
  { key: 'startDate', label: 'Fecha de inicio', type: 'date', dependsOn: 'startWhen', showWhen: 'scheduled' },
  { key: 'endWhen', label: 'Cuando termina?', type: 'radio', required: true, options: [
    { value: 'manual', label: 'Manualmente (cuando tu decidas)' },
    { value: 'after_weeks', label: 'Despues de un numero de semanas' },
  ]},
  { key: 'durationWeeks', label: 'Cuantas semanas?', type: 'stepper_number',
    dependsOn: 'endWhen', showWhen: 'after_weeks',
    defaultValue: 2, min: 1, max: 52, step: 1, suffix: 'semanas',
  },
  { key: 'maxRedemptions', label: 'Cuantas veces se puede usar?', type: 'radio', required: true, options: [
    { value: 'unlimited', label: 'Sin limite' },
    { value: 'limited', label: 'Limitar usos' },
  ]},
  { key: 'maxRedemptionsCount', label: 'Numero maximo de usos', type: 'stepper_number',
    dependsOn: 'maxRedemptions', showWhen: 'limited',
    defaultValue: 100, min: 1, step: 1,
  },
];

// ============================================
// JUSTEAT CAMPAIGN TYPES
// ============================================

export const JUSTEAT_PROMOTION_TYPES: Record<JustEatPromotionType, CampaignTypeConfig> = {
  free_item: {
    id: 'free_item',
    label: 'Articulo gratuito',
    description: 'Ofrece un articulo gratis al comprar otro articulo o al gastar un importe minimo',
    icon: 'Gift',
    isPromotion: true,
    fields: [
      { key: 'triggerType', label: 'Como obtiene el cliente un articulo gratuito?', type: 'radio', required: true, options: [
        { value: 'buy_item', label: 'Al comprar otro articulo', description: 'Ej: compra una pizza y obten un postre gratis' },
        { value: 'min_spend', label: 'Al gastar un importe minimo', description: 'Ej: gasta 20 € y obten una bebida gratis' },
      ]},
      JE_AUDIENCE_FIELD,
      { key: 'triggerProducts', label: 'Articulos que activan la oferta', type: 'products',
        dependsOn: 'triggerType', showWhen: 'buy_item',
      },
      { key: 'minSpend', label: 'Gasto minimo', type: 'stepper_number',
        dependsOn: 'triggerType', showWhen: 'min_spend',
        defaultValue: 15, min: 1, step: 0.5, suffix: '€',
      },
      { key: 'freeProducts', label: 'Articulos gratuitos', type: 'products', required: true },
      ...JE_SCHEDULE_FIELDS,
    ],
  },

  percent_discount: {
    id: 'percent_discount',
    label: '% de descuento',
    description: 'Porcentaje de descuento en el pedido total o en articulos seleccionados',
    icon: 'Percent',
    isPromotion: true,
    fields: [
      { key: 'discountTarget', label: '% de descuento en que?', type: 'radio', required: true, options: [
        { value: 'total_order', label: 'Valor total del pedido' },
        { value: 'selected_items', label: 'Articulos seleccionados' },
      ]},
      JE_AUDIENCE_FIELD,
      { key: 'minSpend', label: 'Gasto minimo', type: 'stepper_number',
        dependsOn: 'discountTarget', showWhen: 'total_order',
        defaultValue: 15, min: 1, step: 0.5, suffix: '€',
      },
      { key: 'discountPercent', label: '% de descuento', type: 'stepper_number', required: true,
        defaultValue: 10, min: 5, max: 50, step: 5, suffix: '%',
      },
      { key: 'discountProducts', label: 'Articulos con descuento', type: 'products',
        dependsOn: 'discountTarget', showWhen: 'selected_items',
      },
      ...JE_SCHEDULE_FIELDS,
    ],
  },

  euro_discount: {
    id: 'euro_discount',
    label: '€ de descuento',
    description: 'Cantidad fija de descuento en euros sobre articulos seleccionados',
    icon: 'BadgeEuro',
    isPromotion: true,
    fields: [
      { key: 'discountTargetInfo', label: '', type: 'info_text',
        infoText: 'El descuento en € se aplica sobre articulos seleccionados de tu menu.',
      },
      JE_AUDIENCE_FIELD,
      { key: 'discountAmount', label: 'Importe de descuento', type: 'stepper_number', required: true,
        defaultValue: 2.50, min: 0.50, step: 0.50, suffix: '€',
      },
      { key: 'discountProducts', label: 'Articulos con descuento', type: 'products', required: true },
      ...JE_SCHEDULE_FIELDS,
    ],
  },

  bogo: {
    id: 'bogo',
    label: 'Compra 1 y llevate 1...',
    description: 'El cliente compra un articulo y obtiene el segundo gratis o con descuento',
    icon: 'Copy',
    isPromotion: true,
    fields: [
      { key: 'bogoType', label: 'Que descuento al segundo articulo?', type: 'radio', required: true, options: [
        { value: 'free', label: 'Compra 1 y llevate 1 gratis' },
        { value: '50_off', label: 'Compra 1 y llevate el 2o al 50%' },
        { value: '25_off', label: 'Compra 1 y llevate el 2o al 25%' },
      ]},
      JE_AUDIENCE_FIELD,
      { key: 'bogoProducts', label: 'Articulos de la oferta', type: 'products', required: true },
      ...JE_SCHEDULE_FIELDS,
    ],
  },
};

export const JUSTEAT_AD_TYPES: Record<JustEatAdType, CampaignTypeConfig> = {
  top_rank: {
    id: 'top_rank',
    label: 'TopRank',
    description: 'Primeras posiciones en Just Eat — modelo CPO (Coste Por Pedido)',
    icon: 'TrendingUp',
    isPromotion: false,
    fields: [
      { key: 'toprankInfo', label: '', type: 'info_text',
        infoText: 'Solo pagas cuando recibes un pedido (CPO). Just Eat optimiza tu posicion automaticamente.',
      },
      { key: 'deliveryArea', label: 'Area de entrega', type: 'radio', required: true, options: [
        { value: 'all_zones', label: 'Todas las zonas' },
        { value: 'selected_zones', label: 'Zonas seleccionadas' },
      ]},
      { key: 'weeklyBudget', label: 'Presupuesto semanal', type: 'ad_budget', required: true, options: [
        { value: '20', label: '20 €/sem' },
        { value: '35', label: '35 €/sem' },
        { value: '50', label: '50 €/sem', recommended: true },
        { value: '75', label: '75 €/sem' },
        { value: '100', label: '100 €/sem' },
      ]},
      { key: 'jeScheduleDays', label: 'Dias activos', type: 'schedule_days', required: true,
        options: [
          { value: 'every_day', label: 'Todos los dias' },
          { value: 'custom', label: 'Dias especificos' },
        ],
      },
      { key: 'jeScheduleHours', label: 'Franjas horarias', type: 'schedule_hours', required: true,
        options: [
          { value: 'all_hours', label: 'Todo el dia' },
          { value: 'selected_hours', label: 'Horas seleccionadas' },
        ],
      },
    ],
  },
};

export const JUSTEAT_LOYALTY_TYPES: Record<JustEatLoyaltyType, CampaignTypeConfig> = {
  stamp_cards: {
    id: 'stamp_cards',
    label: 'Stamp Cards (Tarjetas de sellos)',
    description: '5 sellos = 1 recompensa. Programa de fidelizacion gestionado por Just Eat.',
    icon: 'Stamp',
    isPromotion: true,
    fields: [
      { key: 'stampCardInfo', label: '', type: 'info_text',
        infoText: 'El cliente obtiene 1 sello por cada pedido. Al completar 5 sellos, recibe una recompensa. La recompensa es fija y esta gestionada por Just Eat.',
      },
      { key: 'stampCardEnabled', label: 'Estado', type: 'radio', required: true, options: [
        { value: 'active', label: 'Activar Stamp Cards' },
        { value: 'inactive', label: 'Desactivar Stamp Cards' },
      ]},
      { key: 'stampCardRules', label: '', type: 'info_text',
        infoText: '1 sello por pedido. La recompensa la define Just Eat automaticamente. No se puede personalizar el numero de sellos ni la recompensa.',
      },
    ],
  },
};

// ============================================
// CHEERFY CAMPAIGN TYPES
// ============================================

export const CHEERFY_PROMOTION_TYPES: Record<CheerfyPromotionType, CampaignTypeConfig> = {
  voucher: {
    id: 'voucher',
    label: 'Cupon / Codigo Promocional',
    description: 'Codigo de descuento activo para clientes — visible en el calendario como rango de fechas',
    icon: 'Ticket',
    isPromotion: true,
    fields: [
      { key: 'voucherName', label: 'Nombre del cupon', type: 'text', required: true, placeholder: 'Ej: PRIMAVERA10, BIENVENIDO15' },
      { key: 'posPromotionCode', label: 'Codigo TPV', type: 'text', placeholder: 'Codigo en el sistema de cobro (opcional)' },
      { key: 'discountType', label: 'Tipo de descuento', type: 'radio', required: true, options: [
        { value: 'percentage', label: 'Porcentaje (%)' },
        { value: 'fixed', label: 'Cantidad fija (€)' },
        { value: 'free_item', label: 'Articulo gratis' },
      ]},
      { key: 'discountValue', label: 'Valor del descuento', type: 'stepper_number',
        dependsOn: 'discountType', showWhen: 'percentage',
        defaultValue: 10, min: 5, max: 100, step: 5, suffix: '%',
      },
      { key: 'discountValue', label: 'Valor del descuento', type: 'stepper_number',
        dependsOn: 'discountType', showWhen: 'fixed',
        defaultValue: 5, min: 1, step: 1, suffix: '€',
      },
      { key: 'maxUses', label: 'Usos maximos por cliente', type: 'radio', required: true, options: [
        { value: 'unlimited', label: 'Sin limite' },
        { value: '1', label: '1 uso' },
        { value: '3', label: '3 usos' },
        { value: '5', label: '5 usos' },
      ]},
      { key: 'audience', label: 'Publico objetivo', type: 'radio', required: true, options: [
        { value: 'all', label: 'Todos los clientes' },
        { value: 'new_only', label: 'Solo clientes nuevos' },
        { value: 'returning_only', label: 'Solo clientes que vuelven' },
      ]},
    ],
  },
};

export const CHEERFY_COMMUNICATION_TYPES: Record<CheerfyCommunicationType, CampaignTypeConfig> = {
  email_campaign: {
    id: 'email_campaign',
    label: 'Campana Email',
    description: 'Campana de email marketing puntual — envio masivo a la base de clientes',
    icon: 'Mail',
    isPromotion: true,
    fields: [
      { key: 'messageName', label: 'Nombre de la campana', type: 'text', required: true, placeholder: 'Ej: Newsletter Marzo, Promo Semana Santa' },
      { key: 'messageTitle', label: 'Asunto del email', type: 'text', required: true, placeholder: 'Ej: 20% de descuento este fin de semana' },
      { key: 'audience', label: 'Publico objetivo', type: 'radio', required: true, options: [
        { value: 'all', label: 'Toda la base de datos' },
        { value: 'new_only', label: 'Solo clientes nuevos' },
        { value: 'returning_only', label: 'Solo clientes recurrentes' },
        { value: 'inactive', label: 'Clientes inactivos (+30 dias)' },
      ]},
      { key: 'cheerfyEmailInfo', label: '', type: 'info_text',
        infoText: 'La campana se registra en el calendario como referencia. El envio real se gestiona desde Cheerfy.',
      },
    ],
  },

  sms_campaign: {
    id: 'sms_campaign',
    label: 'Campana SMS',
    description: 'Campana de SMS marketing puntual — envio masivo a la base de clientes',
    icon: 'MessageSquare',
    isPromotion: true,
    fields: [
      { key: 'messageName', label: 'Nombre de la campana', type: 'text', required: true, placeholder: 'Ej: Flash Sale Viernes' },
      { key: 'messageTitle', label: 'Texto del SMS (referencia)', type: 'text', required: true, placeholder: 'Ej: Hoy -20% en todos los pedidos. Usa codigo VIERNES20' },
      { key: 'audience', label: 'Publico objetivo', type: 'radio', required: true, options: [
        { value: 'all', label: 'Toda la base de datos' },
        { value: 'new_only', label: 'Solo clientes nuevos' },
        { value: 'returning_only', label: 'Solo clientes recurrentes' },
        { value: 'inactive', label: 'Clientes inactivos (+30 dias)' },
      ]},
      { key: 'cheerfySmsInfo', label: '', type: 'info_text',
        infoText: 'La campana se registra en el calendario como referencia. El envio real se gestiona desde Cheerfy.',
      },
    ],
  },
};

export const CHEERFY_AUTOMATION_TYPES: Record<CheerfyAutomationType, CampaignTypeConfig> = {
  on_arrival: {
    id: 'on_arrival',
    label: 'Auto: Al llegar',
    description: 'Mensaje automatico que se envia cuando el cliente llega al local',
    icon: 'MapPin',
    isPromotion: true,
    fields: [
      { key: 'communicationType', label: 'Canal', type: 'radio', required: true, options: [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
      ]},
      { key: 'messageName', label: 'Nombre del mensaje', type: 'text', required: true },
      { key: 'isAutomationActive', label: 'Estado', type: 'radio', required: true, options: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Pausado' },
      ]},
    ],
  },

  on_transaction: {
    id: 'on_transaction',
    label: 'Auto: Al comprar',
    description: 'Mensaje automatico tras completar una compra',
    icon: 'ShoppingBag',
    isPromotion: true,
    fields: [
      { key: 'communicationType', label: 'Canal', type: 'radio', required: true, options: [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
      ]},
      { key: 'messageName', label: 'Nombre del mensaje', type: 'text', required: true },
      { key: 'isAutomationActive', label: 'Estado', type: 'radio', required: true, options: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Pausado' },
      ]},
    ],
  },

  on_departure: {
    id: 'on_departure',
    label: 'Auto: Al irse',
    description: 'Mensaje automatico cuando el cliente se va del local',
    icon: 'LogOut',
    isPromotion: true,
    fields: [
      { key: 'communicationType', label: 'Canal', type: 'radio', required: true, options: [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
      ]},
      { key: 'messageName', label: 'Nombre del mensaje', type: 'text', required: true },
      { key: 'isAutomationActive', label: 'Estado', type: 'radio', required: true, options: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Pausado' },
      ]},
    ],
  },

  on_birthday: {
    id: 'on_birthday',
    label: 'Auto: Cumpleanos',
    description: 'Mensaje automatico en el cumpleanos del cliente',
    icon: 'Cake',
    isPromotion: true,
    fields: [
      { key: 'communicationType', label: 'Canal', type: 'radio', required: true, options: [
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
      ]},
      { key: 'messageName', label: 'Nombre del mensaje', type: 'text', required: true },
      { key: 'isAutomationActive', label: 'Estado', type: 'radio', required: true, options: [
        { value: 'true', label: 'Activo' },
        { value: 'false', label: 'Pausado' },
      ]},
    ],
  },
};

// ============================================
// UBEREATS — SHARED FIELD DEFINITIONS
// ============================================

const UE_AUDIENCE_FIELD: CampaignFieldConfig = {
  key: 'audience',
  label: 'Publico',
  type: 'audience',
  required: true,
  options: [
    { value: 'todos', label: 'Todos los clientes', description: 'Clientes nuevos y existentes', recommended: true },
    { value: 'nuevos', label: 'Clientes nuevos', description: 'Nunca han pedido en tu restaurante' },
    { value: 'recurrentes', label: 'Clientes recurrentes', description: 'Han pedido mas de una vez' },
    { value: 'inactivos', label: 'Clientes inactivos', description: 'No han pedido en los ultimos 30 dias' },
    { value: 'uber_one', label: 'Miembros Uber One', description: 'Suscriptores del programa de fidelidad' },
  ],
};

const UE_DURATION_FIELD: CampaignFieldConfig = {
  key: 'durationPreset',
  label: 'Duracion',
  type: 'duration_preset',
  required: true,
  variant: 'promos',
};

const UE_WEEKLY_SPEND_FIELD: CampaignFieldConfig = {
  key: 'weeklySpendLimit',
  label: 'Gasto semanal',
  type: 'weekly_spend',
};

const UE_EXTERNAL_ID_FIELD: CampaignFieldConfig = {
  key: 'externalId',
  label: 'ID externo (opcional)',
  type: 'text',
  placeholder: 'Referencia externa para seguimiento',
};

const UE_DYNAMIC_SAVINGS_FIELD: CampaignFieldConfig = {
  key: 'dynamicSavings',
  label: 'Ahorros dinamicos',
  type: 'checkbox',
};

// ============================================
// UBEREATS CAMPAIGN TYPES
// ============================================

export const UBEREATS_PROMOTION_TYPES: Record<UberEatsPromotionType, CampaignTypeConfig> = {
  bogo: {
    id: 'bogo',
    label: 'BOGO (2x1)',
    description: 'Compra un articulo y lleva otro igual gratis',
    icon: 'Copy',
    isPromotion: true,
    fields: [
      { key: 'productIds', label: 'Articulos en 2x1', type: 'products', required: true },
      UE_AUDIENCE_FIELD,
      UE_DURATION_FIELD,
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },

  item_discount: {
    id: 'item_discount',
    label: 'Descuento en Articulos',
    description: 'Descuento en articulos o categorias seleccionadas',
    icon: 'Tag',
    isPromotion: true,
    fields: [
      { key: 'discountTarget', label: 'Aplicar a', type: 'radio', required: true, options: [
        { value: 'items', label: 'Articulos especificos' },
        { value: 'category', label: 'Categoria completa' },
      ]},
      { key: 'productIds', label: 'Articulos', type: 'products', required: true },
      UE_AUDIENCE_FIELD,
      UE_DURATION_FIELD,
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },

  percent_off: {
    id: 'percent_off',
    label: 'Descuento Porcentual',
    description: 'Porcentaje de descuento sobre el pedido',
    icon: 'Percent',
    isPromotion: true,
    fields: [
      { key: 'discountPercent', label: 'Descuento', type: 'percent_radio', required: true, options: [
        { value: '20', label: '20%' },
        { value: '30', label: '30%', recommended: true },
        { value: '40', label: '40%' },
        { value: '50', label: '50%' },
      ]},
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency_radio', required: true, options: [
        { value: '15', label: '15 €' },
        { value: '20', label: '20 €', recommended: true },
        { value: '25', label: '25 €' },
        { value: '30', label: '30 €' },
      ]},
      { key: 'usageLimit', label: 'Limite de uso por cliente', type: 'number', placeholder: 'Sin limite', min: 1 },
      UE_DYNAMIC_SAVINGS_FIELD,
      UE_AUDIENCE_FIELD,
      UE_DURATION_FIELD,
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },

  flat_off: {
    id: 'flat_off',
    label: 'Descuento Fijo (Gasta X, Ahorra Y)',
    description: 'Descuento fijo en euros al alcanzar un minimo',
    icon: 'Euro',
    isPromotion: true,
    fields: [
      { key: 'flatOffPair', label: 'Oferta', type: 'flat_off_pairs', required: true, pairs: [
        { spend: 10, save: 3 },
        { spend: 15, save: 6 },
        { spend: 20, save: 10 },
        { spend: 25, save: 15 },
      ]},
      UE_DYNAMIC_SAVINGS_FIELD,
      UE_AUDIENCE_FIELD,
      UE_DURATION_FIELD,
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },

  free_item: {
    id: 'free_item',
    label: 'Articulo Gratuito',
    description: '1 articulo gratis con el pedido',
    icon: 'Gift',
    isPromotion: true,
    fields: [
      { key: 'rewardProductId', label: 'Articulo gratuito', type: 'product', required: true },
      UE_DYNAMIC_SAVINGS_FIELD,
      UE_AUDIENCE_FIELD,
      UE_DURATION_FIELD,
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },

  boga: {
    id: 'boga',
    label: 'BOGA (Compra A, Lleva B)',
    description: 'Compra un articulo y lleva otro distinto gratis',
    icon: 'ArrowRightLeft',
    isPromotion: true,
    fields: [
      { key: 'buyProductId', label: 'Articulo a comprar', type: 'product', required: true },
      { key: 'getProductId', label: 'Articulo gratis', type: 'product', required: true },
      UE_AUDIENCE_FIELD,
      UE_DURATION_FIELD,
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },

  free_delivery: {
    id: 'free_delivery',
    label: 'Envio Gratis',
    description: 'Gastos de envio gratuitos para el cliente',
    icon: 'Truck',
    isPromotion: true,
    fields: [
      { key: 'deliveryInfo', label: '', type: 'info_text', infoText: 'Precio de envio medio: 2,40 €. Maximo subsidiado: 6,00 €. Se te cobrara el coste real del envio por cada pedido.' },
      UE_AUDIENCE_FIELD,
      UE_DURATION_FIELD,
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },

  happy_hour: {
    id: 'happy_hour',
    label: 'Happy Hour',
    description: 'Descuento por franja horaria (ej. 14:00-17:00)',
    icon: 'Clock',
    isPromotion: true,
    fields: [
      { key: 'discountPercent', label: 'Descuento', type: 'percent_radio', required: true, options: [
        { value: '25', label: '25%' },
        { value: '30', label: '30%' },
        { value: '35', label: '35%' },
        { value: '40', label: '40%', recommended: true },
        { value: '45', label: '45%' },
        { value: '50', label: '50%' },
      ]},
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency_radio', required: true, options: [
        { value: '15', label: '15 €' },
        { value: '20', label: '20 €', recommended: true },
        { value: '25', label: '25 €' },
        { value: '30', label: '30 €' },
      ]},
      { key: 'usageLimit', label: 'Limite de uso por cliente', type: 'number', placeholder: 'Sin limite', min: 1 },
      UE_DYNAMIC_SAVINGS_FIELD,
      UE_AUDIENCE_FIELD,
      { key: 'durationPreset', label: 'Duracion', type: 'duration_preset', required: true, variant: 'happy_hour' },
      UE_WEEKLY_SPEND_FIELD,
      UE_EXTERNAL_ID_FIELD,
    ],
  },
};

export const UBEREATS_AD_TYPES: Record<UberEatsAdType, CampaignTypeConfig> = {
  ads: {
    id: 'ads',
    label: 'Campana Publicitaria',
    description: 'Aumenta la visibilidad en el feed y busquedas de Uber Eats',
    icon: 'Megaphone',
    isPromotion: false,
    fields: [
      { key: 'adAudience', label: 'Publico', type: 'radio', required: true, options: [
        { value: 'todos_clientes', label: 'Todos los clientes', recommended: true },
        { value: 'clientes_nuevos', label: 'Solo clientes nuevos' },
      ]},
      { key: 'adBudgetPerStore', label: 'Presupuesto diario por establecimiento', type: 'ad_budget', required: true, options: [
        { value: '8', label: '8 €/dia' },
        { value: '13', label: '13 €/dia' },
        { value: '18', label: '18 €/dia', recommended: true },
        { value: '27', label: '27 €/dia' },
      ]},
      { key: 'durationPreset', label: 'Duracion', type: 'duration_preset', required: true, variant: 'ads' },
      { key: 'campaignName', label: 'Nombre de la campana', type: 'text', placeholder: 'Nombre para identificar esta campana' },
      { key: 'adBidMode', label: 'Modo de puja', type: 'radio', required: true, options: [
        { value: 'automatico', label: 'Automatico', description: 'Uber Eats optimiza la puja', recommended: true },
        { value: 'personalizado', label: 'Personalizado', description: 'Establece tu propia puja' },
      ]},
    ],
  },
};

// ============================================
// GOOGLE ADS CAMPAIGN TYPES
// ============================================

export const GOOGLE_AD_TYPES: Record<GoogleAdType, CampaignTypeConfig> = {
  search: {
    id: 'search',
    label: 'Busqueda',
    description: 'Anuncios en resultados de busqueda',
    icon: 'Search',
    isPromotion: false,
    fields: [
      { key: 'keywords', label: 'Palabras clave', type: 'keywords', required: true },
      { key: 'dailyBudget', label: 'Presupuesto diario', type: 'currency', required: true, min: 5 },
    ],
  },
  display: {
    id: 'display',
    label: 'Display',
    description: 'Anuncios graficos en la red de display',
    icon: 'Image',
    isPromotion: false,
    fields: [
      { key: 'dailyBudget', label: 'Presupuesto diario', type: 'currency', required: true, min: 10 },
    ],
  },
  performance_max: {
    id: 'performance_max',
    label: 'Performance Max',
    description: 'Campanas automatizadas multicanal',
    icon: 'Rocket',
    isPromotion: false,
    fields: [
      { key: 'dailyBudget', label: 'Presupuesto diario', type: 'currency', required: true, min: 20 },
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCampaignTypesForPlatform(platform: CampaignPlatform): CampaignTypeConfig[] {
  switch (platform) {
    case 'glovo':
      return [
        ...Object.values(GLOVO_PROMOTION_TYPES),
        ...Object.values(GLOVO_AD_TYPES),
      ];
    case 'justeat':
      return [
        ...Object.values(JUSTEAT_PROMOTION_TYPES),
        ...Object.values(JUSTEAT_AD_TYPES),
        ...Object.values(JUSTEAT_LOYALTY_TYPES),
      ];
    case 'ubereats':
      return [
        ...Object.values(UBEREATS_PROMOTION_TYPES),
        ...Object.values(UBEREATS_AD_TYPES),
      ];
    case 'cheerfy':
      return [
        ...Object.values(CHEERFY_PROMOTION_TYPES),
        ...Object.values(CHEERFY_COMMUNICATION_TYPES),
        ...Object.values(CHEERFY_AUTOMATION_TYPES),
      ];
    case 'google_ads':
      return Object.values(GOOGLE_AD_TYPES);
    default:
      return [];
  }
}

export function getCampaignTypeConfig(platform: CampaignPlatform, typeId: string): CampaignTypeConfig | undefined {
  const types = getCampaignTypesForPlatform(platform);
  return types.find(t => t.id === typeId);
}

export function getPromotionsForPlatform(platform: CampaignPlatform): CampaignTypeConfig[] {
  return getCampaignTypesForPlatform(platform).filter(t => t.isPromotion);
}

export function getAdsForPlatform(platform: CampaignPlatform): CampaignTypeConfig[] {
  return getCampaignTypesForPlatform(platform).filter(t => !t.isPromotion);
}
