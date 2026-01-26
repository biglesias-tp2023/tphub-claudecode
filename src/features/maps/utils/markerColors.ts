import type { MapMetric, MapRestaurantKPIs, MetricConfig, DeliveryPoint } from '../types/maps.types';

// ============================================
// COLOR SCALES
// ============================================

const COLORS = {
  high: '#22c55e',   // green-500
  mid: '#eab308',    // yellow-500
  low: '#ef4444',    // red-500
  neutral: '#6b7280', // gray-500
} as const;

// ============================================
// METRIC CONFIGURATIONS
// ============================================

/**
 * Format currency in euros
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with locale
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

/**
 * Format rating with star
 */
function formatRating(value: number): string {
  return `${value.toFixed(1)}`;
}

/**
 * Format time in minutes
 */
function formatTime(value: number): string {
  return `${Math.round(value)}m`;
}

/**
 * Metric configurations with formatting and value extraction
 */
export const METRIC_CONFIGS: Record<MapMetric, MetricConfig> = {
  ventas: {
    id: 'ventas',
    label: 'Ventas',
    shortLabel: 'Ventas',
    format: formatCurrency,
    getValue: (kpis) => kpis.ventas,
    ascending: true, // higher is better
  },
  pedidos: {
    id: 'pedidos',
    label: 'Pedidos',
    shortLabel: 'Pedidos',
    format: formatNumber,
    getValue: (kpis) => kpis.pedidos,
    ascending: true,
  },
  rating: {
    id: 'rating',
    label: 'Valoraciones',
    shortLabel: 'Rating',
    format: formatRating,
    getValue: (kpis) => kpis.valoraciones,
    ascending: true,
  },
  tiempoEspera: {
    id: 'tiempoEspera',
    label: 'Tiempo de espera',
    shortLabel: 'Tiempo',
    format: formatTime,
    getValue: (kpis) => kpis.tiempoEsperaMin,
    ascending: false, // lower is better
  },
};

// ============================================
// THRESHOLDS BY METRIC
// ============================================

/**
 * Thresholds for determining color bands
 * Values are percentiles: [lowThreshold, highThreshold]
 */
const METRIC_THRESHOLDS: Record<MapMetric, { low: number; high: number }> = {
  ventas: { low: 8000, high: 15000 },      // Below 8k = low, above 15k = high
  pedidos: { low: 300, high: 600 },        // Below 300 = low, above 600 = high
  rating: { low: 4.0, high: 4.5 },         // Below 4.0 = low, above 4.5 = high
  tiempoEspera: { low: 5, high: 10 },      // Above 10m = bad, below 5m = good
};

// ============================================
// COLOR CALCULATION
// ============================================

/**
 * Get marker color based on KPIs and selected metric
 */
export function getMarkerColor(kpis: MapRestaurantKPIs, metric: MapMetric): string {
  const config = METRIC_CONFIGS[metric];
  const thresholds = METRIC_THRESHOLDS[metric];
  const value = config.getValue(kpis);

  // For tiempoEspera, lower is better (inverted logic)
  if (!config.ascending) {
    if (value <= thresholds.low) return COLORS.high;  // Fast = green
    if (value >= thresholds.high) return COLORS.low;  // Slow = red
    return COLORS.mid;
  }

  // For other metrics, higher is better
  if (value >= thresholds.high) return COLORS.high;
  if (value <= thresholds.low) return COLORS.low;
  return COLORS.mid;
}

/**
 * Get color level name for accessibility
 */
export function getColorLevel(kpis: MapRestaurantKPIs, metric: MapMetric): 'high' | 'mid' | 'low' {
  const config = METRIC_CONFIGS[metric];
  const thresholds = METRIC_THRESHOLDS[metric];
  const value = config.getValue(kpis);

  if (!config.ascending) {
    if (value <= thresholds.low) return 'high';
    if (value >= thresholds.high) return 'low';
    return 'mid';
  }

  if (value >= thresholds.high) return 'high';
  if (value <= thresholds.low) return 'low';
  return 'mid';
}

/**
 * Get legend items for the current metric
 */
export function getLegendItems(metric: MapMetric): Array<{ color: string; label: string }> {
  const config = METRIC_CONFIGS[metric];
  const thresholds = METRIC_THRESHOLDS[metric];

  if (!config.ascending) {
    // Inverted for time-based metrics
    return [
      { color: COLORS.high, label: `< ${config.format(thresholds.low)}` },
      { color: COLORS.mid, label: `${config.format(thresholds.low)} - ${config.format(thresholds.high)}` },
      { color: COLORS.low, label: `> ${config.format(thresholds.high)}` },
    ];
  }

  return [
    { color: COLORS.high, label: `> ${config.format(thresholds.high)}` },
    { color: COLORS.mid, label: `${config.format(thresholds.low)} - ${config.format(thresholds.high)}` },
    { color: COLORS.low, label: `< ${config.format(thresholds.low)}` },
  ];
}

export { COLORS };

// ============================================
// HEATMAP INTENSITY
// ============================================

/**
 * Calculate heatmap intensity (0-1) for a delivery point based on selected metric
 */
export function getHeatmapIntensity(point: DeliveryPoint, metric: MapMetric): number {
  switch (metric) {
    case 'ventas':
      // 0-1 based on €0-50 order value
      return Math.min(point.orderValue / 50, 1);

    case 'pedidos':
      // Each order contributes equally
      return 0.5;

    case 'rating':
      // Rating 3-5 maps to 0-1 (lower ratings = lower intensity)
      if (point.rating === null) return 0.3; // Unrated orders get medium-low intensity
      return Math.max(0, Math.min((point.rating - 3) / 2, 1));

    case 'tiempoEspera':
      // Inverted: faster delivery = higher intensity
      // 15min = high intensity, 55min = low intensity
      return Math.max(0, Math.min(1 - (point.deliveryTimeMin - 15) / 40, 1));

    default:
      return 0.5;
  }
}
