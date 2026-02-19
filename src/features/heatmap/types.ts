export type HeatmapMetric = 'revenue' | 'orders' | 'avgTicket' | 'newCustomers';

export interface HeatmapCell {
  /** Hour of day (0-23) */
  hour: number;
  /** Day of week, ISO convention (0=Mon, 6=Sun) */
  dayOfWeek: number;
  revenue: number;
  orders: number;
  avgTicket: number;
  /** Unique customers in this cell */
  uniqueCustomers: number;
  /** Customers with no orders in the 90-day lookback before the period */
  newCustomers: number;
  /** newCustomers / uniqueCustomers * 100 */
  newCustomerPct: number;
}

/** 24 rows (hours) × 7 columns (days). matrix[hour][dayOfWeek] */
export type HeatmapMatrix = HeatmapCell[][];
