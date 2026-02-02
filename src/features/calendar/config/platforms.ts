import type {
  CampaignPlatform,
  GlovoPromotionType,
  JustEatPromotionType,
  UberEatsPromotionType,
  GlovoAdType,
  JustEatAdType,
  GoogleAdType,
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

export interface CampaignFieldConfig {
  key: string;
  label: string;
  type: 'number' | 'percent' | 'currency' | 'text' | 'product' | 'products' | 'time' | 'keywords' | 'target_customers';
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  suffix?: string;
}

// ============================================
// GLOVO CAMPAIGN TYPES
// ============================================

export const GLOVO_PROMOTION_TYPES: Record<GlovoPromotionType, CampaignTypeConfig> = {
  flash_offer: {
    id: 'flash_offer',
    label: 'Oferta Flash',
    description: '30% de descuento para nuevos clientes',
    icon: 'Zap',
    isPromotion: true,
    fields: [
      { key: 'targetNewCustomers', label: 'Target nuevos clientes/dia', type: 'target_customers', required: true, min: 3, max: 15 },
    ],
  },
  menu_discount: {
    id: 'menu_discount',
    label: 'Descuento en Menu',
    description: 'Descuento en todo el menu',
    icon: 'Percent',
    isPromotion: true,
    fields: [
      { key: 'discountPercent', label: 'Descuento', type: 'percent', required: true, min: 5, max: 30 },
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency', min: 0, placeholder: '0 = sin minimo' },
    ],
  },
  selected_products: {
    id: 'selected_products',
    label: 'Productos Seleccionados',
    description: 'Descuento en productos especificos',
    icon: 'Tag',
    isPromotion: true,
    fields: [
      { key: 'discountPercent', label: 'Descuento', type: 'percent', required: true, min: 5, max: 50 },
      { key: 'productIds', label: 'Productos', type: 'products', required: true },
    ],
  },
  free_delivery: {
    id: 'free_delivery',
    label: 'Envio Gratis',
    description: 'Gastos de envio gratuitos',
    icon: 'Truck',
    isPromotion: true,
    fields: [
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency', min: 0, placeholder: '0 = sin minimo' },
    ],
  },
  bogo: {
    id: 'bogo',
    label: '2x1',
    description: 'Compra uno, lleva otro gratis',
    icon: 'Gift',
    isPromotion: true,
    fields: [
      { key: 'productIds', label: 'Productos en 2x1', type: 'products', required: true },
    ],
  },
};

export const GLOVO_AD_TYPES: Record<GlovoAdType, CampaignTypeConfig> = {
  keywords: {
    id: 'keywords',
    label: 'Keywords',
    description: 'Posicionamiento por palabras clave',
    icon: 'Search',
    isPromotion: false,
    fields: [
      { key: 'keywords', label: 'Palabras clave', type: 'keywords', required: true },
      { key: 'dailyBudget', label: 'Presupuesto diario', type: 'currency', required: true, min: 5 },
    ],
  },
  clicks: {
    id: 'clicks',
    label: 'Pago por Clic',
    description: 'Publicidad de pago por clic',
    icon: 'MousePointerClick',
    isPromotion: false,
    fields: [
      { key: 'dailyBudget', label: 'Presupuesto diario', type: 'currency', required: true, min: 5 },
      { key: 'costPerClick', label: 'Coste por clic', type: 'currency', required: true, min: 0.1 },
    ],
  },
};

// ============================================
// JUSTEAT CAMPAIGN TYPES
// ============================================

export const JUSTEAT_PROMOTION_TYPES: Record<JustEatPromotionType, CampaignTypeConfig> = {
  stamp_cards: {
    id: 'stamp_cards',
    label: 'Tarjeta de Sellos',
    description: 'Programa de fidelidad con sellos',
    icon: 'Stamp',
    isPromotion: true,
    fields: [
      { key: 'stampsRequired', label: 'Sellos requeridos', type: 'number', required: true, min: 3, max: 10 },
      { key: 'rewardProductId', label: 'Producto recompensa', type: 'product', required: true },
    ],
  },
  free_item: {
    id: 'free_item',
    label: 'Articulo Gratuito',
    description: 'Articulo gratis con pedido minimo',
    icon: 'Gift',
    isPromotion: true,
    fields: [
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency', required: true, min: 10 },
      { key: 'rewardProductId', label: 'Articulo gratuito', type: 'product', required: true },
    ],
  },
  euro_discount: {
    id: 'euro_discount',
    label: 'Descuento en Euros',
    description: 'Descuento fijo en euros',
    icon: 'Euro',
    isPromotion: true,
    fields: [
      { key: 'discountAmount', label: 'Descuento', type: 'currency', required: true, min: 1 },
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency', min: 0 },
    ],
  },
  percent_discount: {
    id: 'percent_discount',
    label: 'Descuento Porcentual',
    description: 'Descuento en porcentaje',
    icon: 'Percent',
    isPromotion: true,
    fields: [
      { key: 'discountPercent', label: 'Descuento', type: 'percent', required: true, min: 5, max: 50 },
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency', min: 0 },
    ],
  },
  bogo: {
    id: 'bogo',
    label: 'BOGO',
    description: 'Compra uno y lleva otro',
    icon: 'Copy',
    isPromotion: true,
    fields: [
      { key: 'buyProductId', label: 'Producto a comprar', type: 'product', required: true },
      { key: 'getProductId', label: 'Producto gratis', type: 'product', required: true },
    ],
  },
};

export const JUSTEAT_AD_TYPES: Record<JustEatAdType, CampaignTypeConfig> = {
  top_rank: {
    id: 'top_rank',
    label: 'Top Rank',
    description: 'Posicionamiento premium en el feed',
    icon: 'TrendingUp',
    isPromotion: false,
    fields: [
      { key: 'targetPosition', label: 'Posicion objetivo', type: 'number', required: true, min: 1, max: 10 },
      { key: 'dailyBudget', label: 'Presupuesto diario', type: 'currency', required: true, min: 10 },
    ],
  },
};

// ============================================
// UBEREATS CAMPAIGN TYPES
// ============================================

export const UBEREATS_PROMOTION_TYPES: Record<UberEatsPromotionType, CampaignTypeConfig> = {
  percent_discount: {
    id: 'percent_discount',
    label: 'Descuento Porcentual',
    description: 'Descuento en porcentaje sobre el pedido',
    icon: 'Percent',
    isPromotion: true,
    fields: [
      { key: 'discountPercent', label: 'Descuento', type: 'percent', required: true, min: 5, max: 50 },
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency', min: 0 },
    ],
  },
  bogo: {
    id: 'bogo',
    label: 'BOGO',
    description: 'Compra uno y lleva otro',
    icon: 'Copy',
    isPromotion: true,
    fields: [
      { key: 'buyProductId', label: 'Producto a comprar', type: 'product', required: true },
      { key: 'getProductId', label: 'Producto gratis', type: 'product', required: true },
    ],
  },
  free_item: {
    id: 'free_item',
    label: 'Articulo Gratuito',
    description: 'Articulo gratis con pedido minimo',
    icon: 'Gift',
    isPromotion: true,
    fields: [
      { key: 'minimumOrder', label: 'Pedido minimo', type: 'currency', required: true, min: 10 },
      { key: 'rewardProductId', label: 'Articulo gratuito', type: 'product', required: true },
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
      ];
    case 'ubereats':
      return Object.values(UBEREATS_PROMOTION_TYPES);
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
