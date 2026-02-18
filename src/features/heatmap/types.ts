export type HeatmapMetric = 'revenue' | 'orders' | 'avgTicket';

export interface HeatmapCell {
  /** Hour of day (0-23) */
  hour: number;
  /** Day of week, ISO convention (0=Mon, 6=Sun) */
  dayOfWeek: number;
  revenue: number;
  orders: number;
  avgTicket: number;
}

/** 24 rows (hours) × 7 columns (days). matrix[hour][dayOfWeek] */
export type HeatmapMatrix = HeatmapCell[][];
