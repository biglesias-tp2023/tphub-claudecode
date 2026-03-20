// ============================================
// CALENDAR & CAMPAIGNS
// ============================================

// Plataformas
export type DeliveryPlatform = 'glovo' | 'ubereats' | 'justeat';
export type CrmPlatform = 'cheerfy';
export type AdvertisingPlatform = 'glovo' | 'google_ads';
export type CampaignPlatform = DeliveryPlatform | 'google_ads' | CrmPlatform;

// Estados de campana
export type CampaignStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

// Tipos de promocion por plataforma
export type GlovoPromotionType =
  | 'flash_offer'
  | 'full_menu'
  | 'selected_products'
  | 'delivery_fee'
  | 'bogof';

export type JustEatPromotionType =
  | 'free_item'
  | 'euro_discount'
  | 'percent_discount'
  | 'bogo';

export type JustEatLoyaltyType = 'stamp_cards';

export type UberEatsPromotionType =
  | 'percent_off'
  | 'flat_off'
  | 'item_discount'
  | 'bogo'
  | 'boga'
  | 'free_item'
  | 'free_delivery'
  | 'happy_hour';

export type UberEatsAdType = 'ads';

// Tipos de publicidad
export type GlovoAdType = 'premium_placement';
export type GoogleAdType = 'search' | 'display' | 'performance_max';
export type JustEatAdType = 'top_rank';

// Cheerfy types
export type CheerfyPromotionType = 'voucher';
export type CheerfyCommunicationType = 'email_campaign' | 'sms_campaign';
export type CheerfyAutomationType = 'on_arrival' | 'on_transaction' | 'on_departure' | 'on_birthday';

// Público objetivo (UberEats)
export type UberEatsAudience =
  | 'todos'
  | 'nuevos'
  | 'recurrentes'
  | 'inactivos'
  | 'uber_one';

// Duración preset (UberEats)
export type UberEatsDurationPreset =
  | '1_año'
  | '6_meses'
  | '30_dias'
  | '45_dias'
  | 'en_curso'
  | 'personalizar';

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

  // UberEats — Audience
  audience?: UberEatsAudience;

  // UberEats — Duration
  durationPreset?: UberEatsDurationPreset;
  scheduleDays?: string[];   // ['Dom','Lun','Mar',...]
  scheduleStartTime?: string; // HH:MM
  scheduleEndTime?: string;   // HH:MM

  // UberEats — Weekly spend
  weeklySpendLimit?: number | null; // null = sin límite

  // UberEats — Ads specific
  adBudgetPerStore?: number;
  adAudience?: 'todos_clientes' | 'clientes_nuevos';
  adDuration?: 'en_curso' | '30_dias' | '45_dias' | 'personalizada';
  adBidMode?: 'automatico' | 'personalizado';
  adBidAmount?: number;
  campaignName?: string;

  // Glovo — Flash offer
  acquisitionTarget?: number;

  // Glovo — Promo details
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  primeBoost?: number | false; // false = off, 5 or 10 = extra %
  weekDays?: string[];         // ['mon','tue',...]
  timeSlot?: string;
  timeSlotStart?: string;      // HH:MM for custom time slot
  timeSlotEnd?: string;        // HH:MM for custom time slot
  budgetLimit?: number | null; // null = unlimited

  // Glovo — Delivery fee
  deliveryDiscount?: 'free' | 'fixed_discount';
  deliveryDiscountAmount?: number;

  // Glovo — Ads (Premium Placement)
  adFormat?: string;
  adSegmentZone?: string;
  adSegmentSchedule?: string;
  totalBudget?: number | null;
  cpcBid?: number | 'auto';

  // Just Eat — Offers
  triggerType?: 'buy_item' | 'min_spend';
  minSpend?: number;
  discountTarget?: string;
  bogoType?: 'free' | '50_off' | '25_off';
  maxRedemptions?: 'unlimited' | 'limited';
  maxRedemptionsCount?: number;

  // Just Eat — Schedule
  jeScheduleDays?: string;     // 'every_day' | 'weekdays' | 'weekends' | 'custom'
  jeCustomDays?: string[];     // ['mon','tue',...]
  jeScheduleHours?: string;    // 'all_hours' | 'selected_hours'
  jeHoursStart?: string;       // HH:MM
  jeHoursEnd?: string;         // HH:MM
  startWhen?: 'now' | 'scheduled';
  endWhen?: 'manual' | 'after_weeks';
  durationWeeks?: number;

  // Just Eat — TopRank
  deliveryArea?: string;
  weeklyBudget?: number;

  // Just Eat — Stamp Cards
  stampCardEnabled?: 'active' | 'inactive';

  // Cheerfy — Voucher
  voucherName?: string;
  posPromotionCode?: string;
  maxUses?: number;

  // Cheerfy — Campaign/Communication
  communicationType?: 'email' | 'sms';
  messageName?: string;
  messageTitle?: string;

  // Cheerfy — Automation
  triggerCondition?: 'on_arrival' | 'on_transaction' | 'on_departure' | 'on_birthday';
  isAutomationActive?: boolean;

  // Cheerfy — Metrics (display only)
  totalSent?: number;
  totalOpened?: number;
  totalClicked?: number;
  totalRedeemed?: number;
  totalVisits?: number;

  // UberEats — Ahorros dinámicos
  dynamicSavings?: boolean;

  // UberEats — Límite de uso
  usageLimit?: number;

  // UberEats — ID externo
  externalId?: string;

  // Allow arbitrary keys for extensibility
  [key: string]: unknown;
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

