import type { ChannelId } from '@/types';

// ============================================
// MAP RESTAURANT TYPES
// ============================================

/**
 * KPIs for a single restaurant on the map
 */
export interface MapRestaurantKPIs {
  /** Total sales in euros */
  ventas: number;
  /** Sales change percentage vs previous period */
  ventasChange: number;
  /** Total number of orders */
  pedidos: number;
  /** Average ticket value in euros */
  ticketMedio: number;
  /** Number of new customers */
  nuevosClientes: number;
  /** Percentage of new customers */
  porcentajeNuevos: number;
  /** Average wait time formatted (e.g., "6m") */
  tiempoEspera: string;
  /** Wait time in minutes (for calculations) */
  tiempoEsperaMin: number;
  /** Average rating (1-5 scale) */
  valoraciones: number;
  /** KPIs breakdown by channel */
  channelBreakdown: ChannelKPI[];
}

/**
 * KPIs for a specific channel
 */
export interface ChannelKPI {
  channelId: ChannelId;
  channelName: string;
  color: string;
  ventas: number;
  pedidos: number;
  percentage: number;
}

/**
 * Geographic coordinates
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Restaurant data for map display
 */
export interface MapRestaurant {
  /** Unique identifier */
  id: string;
  /** Restaurant name (e.g., "Gran Vía 42") */
  name: string;
  /** Full address */
  address: string;
  /** Brand name */
  brandName: string;
  /** Brand ID for filtering */
  brandId: string;
  /** Area/city name */
  areaName: string;
  /** Area ID for filtering */
  areaId: string;
  /** Company name */
  companyName: string;
  /** Company ID for filtering */
  companyId: string;
  /** GPS coordinates */
  coordinates: Coordinates;
  /** Delivery radius in kilometers */
  deliveryRadiusKm: number;
  /** Active delivery channels */
  activeChannels: ChannelId[];
  /** Performance KPIs */
  kpis: MapRestaurantKPIs;
}

// ============================================
// DELIVERY POINT (ORDER) TYPES
// ============================================

/**
 * A delivery point represents a completed order delivery location
 */
export interface DeliveryPoint {
  /** Unique order ID */
  id: string;
  /** Restaurant that fulfilled the order */
  restaurantId: string;
  /** Restaurant name */
  restaurantName: string;
  /** Delivery channel */
  channel: ChannelId;
  /** Delivery coordinates */
  coordinates: Coordinates;
  /** Order value in euros */
  orderValue: number;
  /** Customer rating (1-5, null if not rated) */
  rating: number | null;
  /** Delivery time in minutes */
  deliveryTimeMin: number;
  /** Whether it was a new customer */
  isNewCustomer: boolean;
  /** Order timestamp */
  timestamp: Date;
  /** Whether there was an incidence with the order */
  hasIncidence: boolean;
  /** Type of incidence if exists */
  incidenceType?: string;
}

/**
 * A point for the heatmap layer
 */
export interface HeatmapPoint {
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Intensity value (0-1) based on selected metric */
  intensity: number;
}

// ============================================
// MAP CONTROL TYPES
// ============================================

/**
 * Available metrics for marker coloring
 */
export type MapMetric = 'ventas' | 'pedidos' | 'rating' | 'tiempoEspera';

/**
 * Map control panel state
 */
export interface MapControlState {
  /** Show heatmap layer (primary visualization) */
  showHeatmap: boolean;
  /** Show restaurant markers (optional toggle) */
  showRestaurants: boolean;
  /** Show delivery radius circles */
  showDeliveryRadius: boolean;
  /** Show individual delivery point markers */
  showDeliveryPoints: boolean;
  /** Current metric for heatmap coloring */
  selectedMetric: MapMetric;
  /** Currently selected restaurant ID (for highlighting) */
  selectedRestaurantId: string | null;
}

// ============================================
// MAP DATA TYPES
// ============================================

/**
 * Map data response
 */
export interface MapData {
  restaurants: MapRestaurant[];
}

/**
 * Map bounds for auto-fit
 */
export interface MapBounds {
  center: Coordinates;
  zoom: number;
  bounds: [[number, number], [number, number]] | null;
}

// ============================================
// METRIC CONFIG
// ============================================

/**
 * Configuration for a map metric
 */
export interface MetricConfig {
  id: MapMetric;
  label: string;
  shortLabel: string;
  format: (value: number) => string;
  getValue: (kpis: MapRestaurantKPIs) => number;
  /** Higher is better? (false for tiempoEspera) */
  ascending: boolean;
}
