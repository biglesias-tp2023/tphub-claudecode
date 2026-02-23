// ============================================
// CALENDAR & CAMPAIGNS
// ============================================

// Plataformas
export type DeliveryPlatform = 'glovo' | 'ubereats' | 'justeat';
export type AdvertisingPlatform = 'glovo' | 'google_ads';
export type CampaignPlatform = DeliveryPlatform | 'google_ads';

// Estados de campana
export type CampaignStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

// Tipos de promocion por plataforma
export type GlovoPromotionType =
  | 'flash_offer'
  | 'menu_discount'
  | 'selected_products'
  | 'free_delivery'
  | 'bogo';

export type JustEatPromotionType =
  | 'stamp_cards'
  | 'free_item'
  | 'euro_discount'
  | 'percent_discount'
  | 'bogo';

export type UberEatsPromotionType =
  | 'percent_discount'
  | 'bogo'
  | 'free_item';

// Tipos de publicidad
export type GlovoAdType = 'keywords' | 'clicks';
export type GoogleAdType = 'search' | 'display' | 'performance_max';
export type JustEatAdType = 'top_rank';

// Configuracion de campana (varia por tipo)
export interface CampaignConfig {
  // Promociones
  discountPercent?: number;
  discountAmount?: number;
  minimumOrder?: number;
  freeDeliveryThreshold?: number;

  // BOGO
  buyProductId?: string;
  getProductId?: string;

  // Flash offers
  duration?: number; // minutos
  startTime?: string;

  // Stamp cards
  stampsRequired?: number;
  rewardProductId?: string;

  // Advertising
  keywords?: string[];
  dailyBudget?: number;
  costPerClick?: number;
  targetPosition?: number;

  // Segmentation
  targetAudience?: string;
}

// Campana principal
export interface PromotionalCampaign {
  id: string;
  restaurantId: string;
  platform: CampaignPlatform;
  campaignType: string;
  name: string | null;
  config: CampaignConfig;
  productIds: string[];
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  metrics?: CampaignMetrics;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMetrics {
  impressions?: number;
  clicks?: number;
  orders?: number;
  revenue?: number;
  roas?: number;
}

// Input para crear/actualizar campanas
export interface PromotionalCampaignInput {
  restaurantId: string;
  platform: CampaignPlatform;
  campaignType: string;
  name?: string;
  config: CampaignConfig;
  productIds?: string[];
  startDate: string;
  endDate: string;
}

// Database row type
export interface DbPromotionalCampaign {
  id: string;
  restaurant_id: string;
  platform: string;
  campaign_type: string;
  name: string | null;
  config: CampaignConfig;
  product_ids: string[];
  start_date: string;
  end_date: string;
  status: string;
  metrics: CampaignMetrics | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// CALENDAR EVENTS
// ============================================

export type EventCategory = 'holiday' | 'sports' | 'entertainment' | 'commercial';

export interface CalendarEvent {
  id: string;
  category: EventCategory;
  name: string;
  description: string | null;
  icon: string | null;
  eventDate: string;
  endDate: string | null;
  countryCode: string;
  regionCode: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  source: string | null;
  externalId: string | null;
  createdAt: string;
}

export interface DbCalendarEvent {
  id: string;
  category: string;
  name: string;
  description: string | null;
  icon: string | null;
  event_date: string;
  end_date: string | null;
  country_code: string;
  region_code: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  source: string | null;
  external_id: string | null;
  created_at: string;
}

// ============================================
// WEATHER FORECAST
// ============================================

export interface WeatherForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  precipitationProbability: number;
  description: string;
  icon: string;
  /** true = dato real histórico, false = pronóstico */
  isHistorical?: boolean;
}

